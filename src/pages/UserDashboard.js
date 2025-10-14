import React, { useState, useEffect } from "react";
import { 
  Box, Typography, Grid, Card, CardContent, List, ListItem, ListItemAvatar, 
  ListItemText, Avatar, Chip, Button, CircularProgress, useTheme
} from "@mui/material";
import { CheckCircle, Warning, Announcement, EventNote, Report, Event, Campaign, People } from "@mui/icons-material";
import { Link } from "react-router-dom";
import { db, auth, logActivity } from "../firebase";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, where, query, onSnapshot, orderBy, setDoc, getDoc, limit } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// User Overview Component
function UserOverview({ currentUser }) {
  const theme = useTheme();
  const [userViolations, setUserViolations] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [activities, setActivities] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [stats, setStats] = useState({
    totalViolations: 0,
    pendingViolations: 0,
    resolvedViolations: 0,
    unreadNotifications: 0
  });

  useEffect(() => {
    if (!currentUser) return;

    // Fetch user profile from Firestore
    const fetchUserProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          setUserProfile(userDoc.data());
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    fetchUserProfile();

    // Fetch user violations from admin records
    const violationsQuery = query(
      collection(db, "violations"),
      where("studentEmail", "==", currentUser.email)
    );

    // Fetch announcements from admin records
    const announcementsQuery = query(
      collection(db, "announcements"),
      orderBy("createdAt", "desc"),
      limit(5)
    );

    // Fetch notifications from admin records
    const notificationsQuery = query(
      collection(db, "notifications"),
      where("recipientEmail", "==", currentUser.email),
      orderBy("createdAt", "desc")
    );
    // Fetch recent activities
    const activitiesQuery = query(
      collection(db, "activities"),
      orderBy("createdAt", "desc"),
      limit(5)
    );
    const unsubActivities = onSnapshot(activitiesQuery, (snap) => {
      const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setActivities(items);
    });


    const unsubViolations = onSnapshot(violationsQuery, (snap) => {
      console.log("Dashboard - Firebase query result:", snap.docs.length, "violations");
      const violations = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sort by createdAt in descending order (newest first) in JavaScript
      const sortedViolations = violations.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return dateB - dateA; // Descending order (newest first)
      });
      
      setUserViolations(sortedViolations);
      
      // Calculate violation statistics
      const totalViolations = sortedViolations.length;
      const pendingViolations = sortedViolations.filter(v => v.status === 'Pending').length;
      const resolvedViolations = sortedViolations.filter(v => v.status === 'Solved').length;
      
      setStats(prev => ({
        ...prev,
        totalViolations,
        pendingViolations,
        resolvedViolations
      }));
    }, (error) => {
      console.error("Dashboard - Firebase query error:", error);
    });

    const unsubAnnouncements = onSnapshot(announcementsQuery, (snap) => {
      const announcements = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAnnouncements(announcements);
    });

    const unsubNotifications = onSnapshot(notificationsQuery, (snap) => {
      const allNotifications = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Filter out enrollment/joining related notifications for students
      const filteredNotifications = allNotifications.filter(notification => {
        // Exclude notifications related to student enrollment, joining, or registration
        const title = notification.title?.toLowerCase() || '';
        const message = notification.message?.toLowerCase() || '';
        const type = notification.type?.toLowerCase() || '';
        
        // Keywords to exclude
        const excludeKeywords = [
          'enrollment', 'enroll', 'joining', 'joined', 'registration', 'register',
          'student added', 'new student', 'student created', 'account created',
          'welcome new student', 'student registration', 'enrolled student'
        ];
        
        // Check if notification contains any exclusion keywords
        const shouldExclude = excludeKeywords.some(keyword => 
          title.includes(keyword) || message.includes(keyword) || type.includes(keyword)
        );
        
        // Only show lost and found, announcements, and other non-enrollment notifications
        return !shouldExclude;
      });
      
      setNotifications(filteredNotifications);
      
      // Calculate unread notifications from filtered list
      const unreadCount = filteredNotifications.filter(n => !n.read).length;
      setStats(prev => ({
        ...prev,
        unreadNotifications: unreadCount
      }));
    });

    return () => {
      unsubViolations();
      unsubAnnouncements();
      unsubNotifications();
      unsubActivities();
    };
  }, [currentUser]);

  const recentViolations = userViolations?.slice(0, 3) || [];
  const recentNotifications = notifications?.slice(0, 5) || [];

  // Get user display info
  const getUserDisplayInfo = () => {
    if (userProfile) {
      return {
        name: userProfile.fullName || currentUser?.displayName || 'Student',
        email: userProfile.email || currentUser?.email,
        photo: userProfile.profilePic || currentUser?.photoURL,
        role: userProfile.role || 'Student'
      };
    }
    return {
      name: currentUser?.displayName || 'Student',
      email: currentUser?.email,
      photo: currentUser?.photoURL,
      role: 'Student'
    };
  };

  const userInfo = getUserDisplayInfo();

  return (
    <Box>
      {/* User Profile Section */}
      <Card sx={{ 
        mb: 4, 
        bgcolor: theme.palette.mode === 'dark' ? '#2d2d2d' : 'white', 
        border: 'none',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
        borderRadius: 2
      }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 3 }}>
            <Avatar 
              src={userInfo.photo} 
              sx={{ 
                width: 80, 
                height: 80, 
                bgcolor: userInfo.photo ? 'transparent' : '#1976d2',
                fontSize: '2rem',
                border: '3px solid #1976d2'
              }}
            >
              {!userInfo.photo && (userInfo.name?.charAt(0) || userInfo.email?.charAt(0))}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <Typography variant="h4" sx={{ 
                fontWeight: 700, 
                color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000', 
                mb: 1 
              }}>
                {userInfo.name}
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                {userInfo.email}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip 
                  label={userInfo.role} 
                  sx={{ 
                    fontWeight: 600,
                    bgcolor: '#1976d2',
                    color: 'white'
                  }}
                />
                <Chip 
                  label="Active" 
                  sx={{ 
                    fontWeight: 600,
                    bgcolor: '#2e7d32',
                    color: 'white'
                  }}
                />
              </Box>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Quick Stats
              </Typography>
              <Typography variant="h4" color="#1976d2" fontWeight={700}>
                {stats.totalViolations}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Violations
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            p: 2, 
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
            borderRadius: 2,
            background: 'white',
            border: 'none',
            cursor: 'pointer',
            transition: 'box-shadow 0.2s, transform 0.2s',
            '&:hover': {
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)',
              transform: 'translateY(-2px)',
            },
          }}>
            <Box sx={{ mr: 2 }}>
              <Report fontSize="large" sx={{ color: '#d32f2f' }} />
            </Box>
            <CardContent sx={{ flex: 1, p: '8px !important' }}>
              <Typography variant="h4" fontWeight={700} sx={{ 
                color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' 
              }}>
                {stats.totalViolations.toLocaleString()}
              </Typography>
              <Typography sx={{ 
                color: theme.palette.mode === 'dark' ? '#ffffff' : 'text.secondary' 
              }} variant="body2">
                Total Violations
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            p: 2, 
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
            borderRadius: 2,
            background: 'white',
            border: 'none',
            cursor: 'pointer',
            transition: 'box-shadow 0.2s, transform 0.2s',
            '&:hover': {
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)',
              transform: 'translateY(-2px)',
            },
          }}>
            <Box sx={{ mr: 2 }}>
              <Warning fontSize="large" sx={{ color: '#ed6c02' }} />
            </Box>
            <CardContent sx={{ flex: 1, p: '8px !important' }}>
              <Typography variant="h4" fontWeight={700} sx={{ 
                color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' 
              }}>
                {stats.pendingViolations.toLocaleString()}
              </Typography>
              <Typography sx={{ 
                color: theme.palette.mode === 'dark' ? '#ffffff' : 'text.secondary' 
              }} variant="body2">
                Pending
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            p: 2, 
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
            borderRadius: 2,
            background: 'white',
            border: 'none',
            cursor: 'pointer',
            transition: 'box-shadow 0.2s, transform 0.2s',
            '&:hover': {
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)',
              transform: 'translateY(-2px)',
            },
          }}>
            <Box sx={{ mr: 2 }}>
              <CheckCircle fontSize="large" sx={{ color: '#2e7d32' }} />
            </Box>
            <CardContent sx={{ flex: 1, p: '8px !important' }}>
              <Typography variant="h4" fontWeight={700} sx={{ 
                color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' 
              }}>
                {stats.resolvedViolations.toLocaleString()}
              </Typography>
              <Typography sx={{ 
                color: theme.palette.mode === 'dark' ? '#ffffff' : 'text.secondary' 
              }} variant="body2">
                Resolved
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Notifications Section */}
      {recentNotifications.length > 0 && (
        <Card sx={{ 
          mb: 4, 
          border: theme.palette.mode === 'dark' ? '1px solid #404040' : '1px solid #800000',
          borderLeft: theme.palette.mode === 'dark' ? '4px solid #404040' : '4px solid #800000',
          boxShadow: 3,
          bgcolor: theme.palette.mode === 'dark' ? '#2d2d2d' : '#80000015',
          borderRadius: 2
        }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Campaign sx={{ mr: 1, fontSize: 28, color: '#800000' }} />
              <Typography variant="h6" sx={{ 
                color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000', 
                fontWeight: 700 
              }}>
                Recent Notifications 
                {stats.unreadNotifications > 0 && (
                  <Chip 
                    label={`${stats.unreadNotifications} UNREAD`} 
                    sx={{ 
                      ml: 2, 
                      fontWeight: 600,
                      bgcolor: '#d32f2f',
                      color: 'white'
                    }}
                  />
                )}
              </Typography>
            </Box>
            <List>
              {recentNotifications.map((notification, index) => (
                <ListItem key={notification.id} sx={{ 
                  px: 0,
                  bgcolor: !notification.read ? '#fff3e0' : 'transparent',
                  borderRadius: 2,
                  mb: 1,
                  border: !notification.read ? '1px solid #ffcc02' : 'none'
                }}>
                  <ListItemAvatar>
                    <Avatar sx={{ 
                      bgcolor: notification.read ? 'grey.300' : 
                               notification.type === 'violation' ? 'error.main' : 'primary.main',
                      border: !notification.read ? '2px solid #ff9800' : 'none'
                    }}>
                      {notification.type === 'violation' ? <Warning /> : <Announcement />}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1" fontWeight={notification.read ? 400 : 700}>
                          {notification.title}
                        </Typography>
                        {!notification.read && (
                          <Chip label="NEW" size="small" color="error" sx={{ fontWeight: 600 }} />
                        )}
                        {notification.type && (
                          <Chip 
                            label={notification.type.toUpperCase()} 
                            size="small" 
                            color={notification.type === 'violation' ? 'error' : 'primary'}
                            variant="outlined"
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {notification.message && notification.message.length > 150 
                            ? `${notification.message.substring(0, 150)}...` 
                            : notification.message
                          }
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(notification.createdAt).toLocaleString()}
                        </Typography>
                        {notification.sender && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            From: {notification.sender}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
            {notifications && notifications.length > 5 && (
              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Button 
                  variant="contained" 
                  color="warning" 
                  component={Link} 
                  to="/notifications"
                  sx={{ fontWeight: 600 }}
                >
                  View All Notifications
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Violations Section */}
      {recentViolations.length > 0 && (
        <Card sx={{ 
          mb: 4,
          bgcolor: theme.palette.mode === 'dark' ? '#2d2d2d' : 'inherit'
        }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ 
              color: theme.palette.mode === 'dark' ? '#ffffff' : 'error.main' 
            }}>
              Recent Violations
            </Typography>
            <List>
              {recentViolations.map((violation) => (
                <ListItem key={violation.id} sx={{ px: 0 }}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'error.main' }}>
                      <Warning />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={violation.violation}
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Date: {violation.date} • Classification: {violation.classification}
                          {violation.severity && ` • Severity: ${violation.severity}`}
                          {violation.status && ` • Status: ${violation.status}`}
                        </Typography>
                        {violation.description && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            {violation.description.length > 100 
                              ? `${violation.description.substring(0, 100)}...` 
                              : violation.description
                            }
                          </Typography>
                        )}
                        {violation.createdAt && (
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                            Recorded: {new Date(violation.createdAt).toLocaleString()}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
            {userViolations && userViolations.length > 3 && (
              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Button 
                  variant="outlined" 
                  color="error" 
                  component={Link} 
                  to="/violations"
                >
                  View All Violations
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Combined Announcements & Activities Section */}
      {(announcements?.length > 0 || activities?.length > 0) && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom color="primary.main">
              Announcements & Activities
            </Typography>
            <List>
              {[
                ...announcements.map(a => ({ ...a, __type: 'announcement', __date: new Date(a.createdAt || a.timestamp || 0) })),
                ...activities.map(a => ({ ...a, __type: 'activity', __date: new Date(a.date || a.createdAt || 0) }))
              ]
              .sort((x, y) => (y.__date - x.__date))
              .slice(0, 10)
              .map((item) => (
                <ListItem key={`${item.__type}-${item.id}`} sx={{ px: 0 }}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: item.__type === 'announcement' ? 'primary.main' : 'secondary.main' }}>
                      {item.__type === 'announcement' ? <Announcement /> : <EventNote />}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1" fontWeight={600}>
                          {item.title}
                        </Typography>
                        <Chip 
                          label={item.__type === 'announcement' ? 'Announcement' : 'Activity'} 
                          size="small" 
                          color={item.__type === 'announcement' ? 'primary' : 'info'}
                          variant="outlined"
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {item.__type === 'announcement'
                            ? (item.content && item.content.length > 100 ? `${item.content.substring(0, 100)}...` : item.content)
                            : (item.description && item.description.length > 100 ? `${item.description.substring(0, 100)}...` : (item.description || ''))}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.__type === 'announcement'
                            ? new Date(item.createdAt).toLocaleString()
                            : (item.date ? new Date(item.date).toLocaleString() : (item.createdAt ? new Date(item.createdAt).toLocaleString() : ''))}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Button 
                variant="outlined" 
                color="primary" 
                component={Link} 
                to="/announcements"
              >
                View All
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

// Main User Dashboard Component
export default function UserDashboard() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Removed full-page loading spinner per requirements

  if (!currentUser) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Typography>Please log in to access the dashboard.</Typography>
      </Box>
    );
  }

  return <UserOverview currentUser={currentUser} />;
} 