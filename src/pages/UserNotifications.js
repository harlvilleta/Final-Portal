import React, { useState, useEffect } from "react";
import { 
  Box, Grid, Card, CardContent, Typography, Paper, Avatar, Button, List, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, Divider, Stack, Alert, IconButton
} from "@mui/material";
import { 
  Warning, Announcement, Search, Info, NotificationsActive, 
  CalendarToday, AccessTime, LocationOn, Person, Description, 
  PriorityHigh, Close, Visibility, Share
} from "@mui/icons-material";
import { db } from "../firebase";
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function UserNotifications({ currentUser }) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [openDetailDialog, setOpenDetailDialog] = useState(false);


  useEffect(() => {
    if (!currentUser?.email) {
      setLoading(false);
      return;
    }

    const notificationsQuery = query(
      collection(db, "notifications"),
      where("recipientEmail", "==", currentUser.email)
      // Removed orderBy to avoid composite index requirement - sorting client-side instead
    );
    
    const unsubscribe = onSnapshot(notificationsQuery, (snap) => {
      const allNotifications = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => {
          // Sort by createdAt in descending order (newest first)
          const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
          const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
          return dateB - dateA;
        });
      
      console.log('📊 All notifications received for student:', {
        email: currentUser.email,
        totalCount: allNotifications.length,
        notifications: allNotifications.map(n => ({
          id: n.id,
          title: n.title,
          type: n.type,
          recipientEmail: n.recipientEmail,
          createdAt: n.createdAt
        }))
      });
      
      // Filter out enrollment/joining related notifications for students
      const filteredNotifications = allNotifications.filter(notification => {
        // Exclude notifications related to student enrollment, joining, or registration
        const title = notification.title?.toLowerCase() || '';
        const message = notification.message?.toLowerCase() || '';
        const type = notification.type?.toLowerCase() || '';
        
        // Keywords to exclude (but allow classroom_addition notifications)
        const excludeKeywords = [
          'enrollment', 'enroll', 'joining', 'joined', 'registration', 'register',
          'student added', 'new student', 'student created', 'account created',
          'welcome new student', 'student registration', 'enrolled student'
        ];
        
        // Allow classroom_addition notifications
        if (type === 'classroom_addition') {
          console.log('✅ Allowing classroom_addition notification:', notification.title);
          return true;
        }
        
        // Check if notification contains any exclusion keywords
        const shouldExclude = excludeKeywords.some(keyword => 
          title.includes(keyword) || message.includes(keyword) || type.includes(keyword)
        );
        
        if (shouldExclude) {
          console.log('❌ Excluding notification:', notification.title, 'reason: contains exclusion keyword');
        }
        
        // Only show lost and found, announcements, and other non-enrollment notifications
        return !shouldExclude;
      });
      
      console.log('📊 Filtered notifications for student:', {
        email: currentUser.email,
        filteredCount: filteredNotifications.length,
        filteredNotifications: filteredNotifications.map(n => ({
          id: n.id,
          title: n.title,
          type: n.type,
          recipientEmail: n.recipientEmail
        }))
      });
      
      setNotifications(filteredNotifications);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching notifications:', error);
      setLoading(false);
    });

    return unsubscribe;
  }, [currentUser]);

  const markAsRead = async (notificationId) => {
    try {
      await updateDoc(doc(db, "notifications", notificationId), {
        read: true
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getNotificationIcon = (type, severity) => {
    switch (type) {
      case 'violation': 
        return severity === 'Critical' || severity === 'High' ? 
          <Warning color="error" /> : <Warning color="warning" />;
      case 'announcement': return <Announcement color="primary" />;
      case 'lost_found': return <Search color="info" />;
      case 'post_shared': return <Share color="info" />;
      default: return <Info color="default" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'Critical': return 'error';
      case 'High': return 'error';
      case 'Medium': return 'warning';
      case 'Low': return 'info';
      default: return 'default';
    }
  };

  const handleViewDetails = (notification) => {
    // Always mark as read when clicked
    if (!notification.read) {
      markAsRead(notification.id);
    }

    // Navigate based on notification type
    switch (notification.type) {
      case 'violation':
        navigate('/user-violations');
        break;
      case 'announcement':
        navigate('/announcements');
        break;
      case 'lost_found':
        navigate('/lost-found');
        break;
      default:
        // For other notification types, show details dialog
        setSelectedNotification(notification);
        setOpenDetailDialog(true);
        break;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const renderViolationDetails = (notification) => {
    if (notification.type !== 'violation' || !notification.violationDetails) {
      return null;
    }

    const details = notification.violationDetails;
    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6" gutterBottom color="error">
          🚨 Violation Details
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Stack spacing={1}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Warning color="error" fontSize="small" />
                <Typography variant="body2" fontWeight="bold">Type:</Typography>
                <Typography variant="body2">{details.type}</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PriorityHigh color="warning" fontSize="small" />
                <Typography variant="body2" fontWeight="bold">Classification:</Typography>
                <Typography variant="body2">{details.classification}</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PriorityHigh color="error" fontSize="small" />
                <Typography variant="body2" fontWeight="bold">Severity:</Typography>
                <Chip 
                  label={details.severity || 'Not specified'} 
                  size="small" 
                  color={getSeverityColor(details.severity)}
                  variant="outlined"
                />
              </Box>
            </Stack>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Stack spacing={1}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalendarToday fontSize="small" />
                <Typography variant="body2" fontWeight="bold">Date:</Typography>
                <Typography variant="body2">{details.date}</Typography>
              </Box>
              {details.time && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AccessTime fontSize="small" />
                  <Typography variant="body2" fontWeight="bold">Time:</Typography>
                  <Typography variant="body2">{details.time}</Typography>
                </Box>
              )}
              {details.location && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LocationOn fontSize="small" />
                  <Typography variant="body2" fontWeight="bold">Location:</Typography>
                  <Typography variant="body2">{details.location}</Typography>
                </Box>
              )}
            </Stack>
          </Grid>
          {details.description && (
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <Description fontSize="small" sx={{ mt: 0.5 }} />
                <Box>
                  <Typography variant="body2" fontWeight="bold">Description:</Typography>
                  <Typography variant="body2">{details.description}</Typography>
                </Box>
              </Box>
            </Grid>
          )}
          {(details.witnesses || details.reportedBy || details.actionTaken) && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Additional Information:
              </Typography>
              <Stack spacing={1}>
                {details.witnesses && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Person fontSize="small" />
                    <Typography variant="body2" fontWeight="bold">Witnesses:</Typography>
                    <Typography variant="body2">{details.witnesses}</Typography>
                  </Box>
                )}
                {details.reportedBy && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Person fontSize="small" />
                    <Typography variant="body2" fontWeight="bold">Reported By:</Typography>
                    <Typography variant="body2">{details.reportedBy}</Typography>
                  </Box>
                )}
                {details.actionTaken && (
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <Warning fontSize="small" sx={{ mt: 0.5 }} />
                    <Box>
                      <Typography variant="body2" fontWeight="bold">Action Taken:</Typography>
                      <Typography variant="body2">{details.actionTaken}</Typography>
                    </Box>
                  </Box>
                )}
              </Stack>
            </Grid>
          )}
        </Grid>
      </Box>
    );
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" gutterBottom>Notifications</Typography>
          <Typography variant="body2" color="text.secondary">
            Stay updated with your latest notifications
          </Typography>
        </Box>
        {unreadCount > 0 && (
          <Chip 
            icon={<NotificationsActive />} 
            label={`${unreadCount} unread`} 
            color="error" 
            variant="outlined"
          />
        )}
      </Box>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
          <Typography>Loading notifications...</Typography>
        </Box>
      ) : !currentUser ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="textSecondary">Not authenticated</Typography>
            <Typography variant="body2" color="textSecondary">Please log in to view notifications</Typography>
          </CardContent>
        </Card>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="textSecondary">No notifications</Typography>
            <Typography variant="body2" color="textSecondary">You're all caught up!</Typography>
          </CardContent>
        </Card>
      ) : (
        <List>
          {notifications.map((notification) => (
            <Card key={notification.id} sx={{ mb: 2, border: notification.read ? '1px solid #e0e0e0' : '2px solid #1976d2' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <Avatar sx={{ bgcolor: notification.read ? 'grey.300' : 'primary.main' }}>
                    {getNotificationIcon(notification.type, notification.severity)}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography variant="h6" gutterBottom>
                        {notification.title}
                      </Typography>
                      <Stack direction="row" spacing={1}>
                        {notification.priority && (
                          <Chip 
                            label={notification.priority.toUpperCase()} 
                            size="small" 
                            color={getPriorityColor(notification.priority)}
                            variant="outlined"
                          />
                        )}
                        {notification.severity && notification.type === 'violation' && (
                          <Chip 
                            label={notification.severity} 
                            size="small" 
                            color={getSeverityColor(notification.severity)}
                            variant="outlined"
                          />
                        )}
                      </Stack>
                    </Box>
                    
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                      {notification.message}
                    </Typography>
                    
                    {/* Classroom Link for classroom_addition notifications */}
                    {notification.type === 'classroom_addition' && notification.classroomLink && (
                      <Box sx={{ mt: 2, mb: 1 }}>
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={() => {
                            // Extract the path from the full URL
                            const url = new URL(notification.classroomLink);
                            const path = url.pathname;
                            // Close any open dialogs first
                            setOpenDetailDialog(false);
                            // Navigate to classroom
                            navigate(path);
                          }}
                          sx={{ 
                            fontWeight: 600,
                            textTransform: 'none'
                          }}
                        >
                          🎓 Access Classroom Dashboard
                        </Button>
                      </Box>
                    )}
                    
                    {notification.type === 'violation' && notification.violationDetails && (
                      <Alert severity="warning" sx={{ mb: 2 }}>
                        <Typography variant="body2">
                          This violation requires your attention. Click "View Details" for complete information.
                        </Typography>
                      </Alert>
                    )}
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                      <Stack direction="row" spacing={1}>
                        {!notification.read && (
                          <Button 
                            size="small" 
                            onClick={() => markAsRead(notification.id)}
                            variant="contained"
                          >
                            Mark as Read
                          </Button>
                        )}
                        {notification.type === 'violation' && notification.violationDetails && (
                          <Button 
                            size="small" 
                            onClick={() => handleViewDetails(notification)}
                            variant="outlined"
                          >
                            View Details
                          </Button>
                        )}
                      </Stack>
                      <Typography variant="caption" color="textSecondary">
                        {new Date(notification.createdAt).toLocaleString()}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </List>
      )}

      {/* Detailed Violation Dialog */}
      <Dialog 
        open={openDetailDialog} 
        onClose={() => setOpenDetailDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              {selectedNotification?.title}
            </Typography>
            <IconButton onClick={() => setOpenDetailDialog(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedNotification && (
            <Box>
              <Typography variant="body1" sx={{ mb: 2, whiteSpace: 'pre-line' }}>
                {selectedNotification.message}
              </Typography>
              {renderViolationDetails(selectedNotification)}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDetailDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 