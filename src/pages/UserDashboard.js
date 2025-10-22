import React, { useState, useEffect } from "react";
import { 
  Box, Typography, Grid, Card, CardContent, List, ListItem, ListItemAvatar, 
  ListItemText, Avatar, Chip, Button, CircularProgress, useTheme, Divider
} from "@mui/material";
import { CheckCircle, Warning, Announcement, EventNote, Report, Event, Campaign, People } from "@mui/icons-material";
import { Link, useNavigate } from "react-router-dom";
import { db, auth, logActivity } from "../firebase";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, where, query, onSnapshot, orderBy, setDoc, getDoc, limit } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// User Overview Component
function UserOverview({ currentUser }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const [userViolations, setUserViolations] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [announcementCount, setAnnouncementCount] = useState(0);
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
      orderBy("createdAt", "desc")
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
      const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAnnouncements(items);
      setAnnouncementCount(items.length);
    });

    const unsubNotifications = onSnapshot(notificationsQuery, (snap) => {
      const allNotifications = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
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
          return true;
        }
        
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
    <Box sx={{ p: { xs: 2, sm: 3 }, bgcolor: '#f5f6fa', minHeight: '100vh' }}>
      {/* Welcome Section */}
      <Box sx={{ mb: 4, pt: { xs: 1, sm: 2 }, px: { xs: 1, sm: 0 } }}>
        <Typography 
          variant="h4" 
          fontWeight={700} 
          color="#800000" 
          gutterBottom 
          sx={{ 
            wordBreak: 'break-word',
            fontSize: { xs: '1.75rem', sm: '2.125rem' },
            lineHeight: 1.2
          }}
        >
          Hi {userInfo.name}
        </Typography>
        <Typography 
          variant="body1" 
          color="text.secondary" 
          sx={{ 
            fontSize: { xs: 16, sm: 18 },
            wordBreak: 'break-word',
            lineHeight: 1.4
          }}
        >
          Welcome back, {userInfo.name}! Here's your student dashboard overview
        </Typography>
      </Box>

      {/* Classroom Access Section */}
      {userProfile && userProfile.course && userProfile.year && userProfile.section && (
        <Card sx={{ 
          mb: 4, 
          bgcolor: theme.palette.mode === 'dark' ? '#2d2d2d' : '#f0f8ff', 
          border: '2px solid #1976d2',
          boxShadow: '0 4px 20px rgba(25, 118, 210, 0.1)',
          borderRadius: 2
        }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ 
                  bgcolor: '#1976d2', 
                  borderRadius: '50%', 
                  p: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <People sx={{ color: 'white', fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ 
                    fontWeight: 700, 
                    color: theme.palette.mode === 'dark' ? '#ffffff' : '#1976d2',
                    mb: 0.5
                  }}>
                    Your Classroom
                  </Typography>
                  <Typography variant="body1" sx={{ 
                    color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                    fontWeight: 500
                  }}>
                    {userProfile.course} - {userProfile.year} - {userProfile.section}
                  </Typography>
                  {userProfile.studentId && (
                    <Typography variant="body2" color="text.secondary">
                      Student ID: {userProfile.studentId}
                    </Typography>
                  )}
                </Box>
              </Box>
              <Button
                variant="contained"
                size="large"
                startIcon={<People />}
                onClick={() => {
                  const classroomLink = `/classroom/${encodeURIComponent(userProfile.course)}/${encodeURIComponent(userProfile.year)}/${encodeURIComponent(userProfile.section)}`;
                  navigate(classroomLink);
                }}
                sx={{
                  bgcolor: '#1976d2',
                  color: 'white',
                  fontWeight: 600,
                  px: 4,
                  py: 1.5,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontSize: '1rem',
                  '&:hover': {
                    bgcolor: '#1565c0',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)'
                  },
                  transition: 'all 0.2s ease'
                }}
              >
                Go to Classroom
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            p: 2, 
            boxShadow: 3, 
            borderRadius: 2,
            borderLeft: '4px solid #800000',
            background: 'transparent',
            cursor: 'pointer',
            transition: 'box-shadow 0.2s, background 0.2s',
            '&:hover': {
              boxShadow: 6,
              background: 'transparent',
            },
          }}>
            <CardContent sx={{ flex: 1, p: '8px !important', textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={700} color="#000000">
                {stats.totalViolations.toLocaleString()}
              </Typography>
              <Typography color="text.secondary" variant="body2">
                Total Violations
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card onClick={() => navigate('/announcements')} sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            p: 2, 
            boxShadow: 3, 
            borderRadius: 2,
            borderLeft: '4px solid #800000',
            background: 'transparent',
            cursor: 'pointer',
            transition: 'box-shadow 0.2s, background 0.2s',
            '&:hover': {
              boxShadow: 6,
              background: 'transparent',
            },
          }}>
            <CardContent sx={{ flex: 1, p: '8px !important', textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={700} color="#000000">
                {announcementCount.toLocaleString()}
              </Typography>
              <Typography color="text.secondary" variant="body2">
                Announcements
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            p: 2, 
            boxShadow: 3, 
            borderRadius: 2,
            borderLeft: '4px solid #800000',
            background: 'transparent',
            cursor: 'pointer',
            transition: 'box-shadow 0.2s, background 0.2s',
            '&:hover': {
              boxShadow: 6,
              background: 'transparent',
            },
          }}>
            <CardContent sx={{ flex: 1, p: '8px !important', textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={700} color="#000000">
                {stats.pendingViolations.toLocaleString()}
              </Typography>
              <Typography color="text.secondary" variant="body2">
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
            boxShadow: 3, 
            borderRadius: 2,
            borderLeft: '4px solid #800000',
            background: 'transparent',
            cursor: 'pointer',
            transition: 'box-shadow 0.2s, background 0.2s',
            '&:hover': {
              boxShadow: 6,
              background: 'transparent',
            },
          }}>
            <CardContent sx={{ flex: 1, p: '8px !important', textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={700} color="#000000">
                {stats.unreadNotifications.toLocaleString()}
              </Typography>
              <Typography color="text.secondary" variant="body2">
                Unread Notifications
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Recent Notifications */}
        <Grid item xs={12} lg={6}>
          <Card sx={{ 
            borderLeft: '4px solid #800000',
            boxShadow: 3,
            bgcolor: 'transparent',
            borderRadius: 2,
            height: 'fit-content'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" fontWeight={700} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000' }}>
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
                <Button 
                  size="small" 
                  sx={{ 
                    textTransform: 'none',
                    color: '#800000',
                    borderColor: '#800000',
                    '&:hover': {
                      borderColor: '#6b0000',
                      backgroundColor: '#80000010'
                    }
                  }}
                  variant="outlined"
                  component={Link} 
                  to="/notifications"
                >
                  View All
                </Button>
              </Box>
              
              {recentNotifications.length > 0 ? (
                <List>
                  {recentNotifications.map((notification, index) => (
                    <React.Fragment key={notification.id}>
                      <ListItem sx={{ px: 0, py: 1 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ 
                            bgcolor: notification.read ? 'grey.300' : 
                                     notification.type === 'violation' ? 'error.main' : 'primary.main',
                            border: !notification.read ? '2px solid #ff9800' : 'none',
                            width: 40, 
                            height: 40
                          }}>
                            {notification.type === 'violation' ? <Warning sx={{ fontSize: 20 }} /> : <Announcement sx={{ fontSize: 20 }} />}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                              <Typography variant="subtitle2" fontWeight={notification.read ? 400 : 700}>
                                {notification.title}
                              </Typography>
                              {!notification.read && (
                                <Chip label="NEW" size="small" color="error" sx={{ fontWeight: 600 }} />
                              )}
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                {notification.message && notification.message.length > 100 
                                  ? `${notification.message.substring(0, 100)}...` 
                                  : notification.message
                                }
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {new Date(notification.createdAt).toLocaleDateString()}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < recentNotifications.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <Campaign sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    No notifications yet
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Violations */}
        <Grid item xs={12} lg={6}>
          <Card sx={{ 
            borderRadius: 2,
            boxShadow: 3,
            height: 'fit-content',
            borderLeft: '4px solid #800000',
            background: 'transparent'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" fontWeight={600} color="#2d3436">
                  Recent Violations
                </Typography>
                <Button 
                  size="small" 
                  component={Link} 
                  to="/violations"
                  sx={{ 
                    textTransform: 'none',
                    color: '#800000',
                    borderColor: '#800000',
                    '&:hover': {
                      borderColor: '#6b0000',
                      backgroundColor: '#80000010'
                    }
                  }}
                  variant="outlined"
                >
                  View All
                </Button>
              </Box>
              
              {recentViolations.length > 0 ? (
                <List>
                  {recentViolations.map((violation, index) => (
                    <React.Fragment key={violation.id}>
                      <ListItem sx={{ px: 0, py: 1 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'error.main', width: 40, height: 40 }}>
                            <Warning sx={{ fontSize: 20 }} />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Typography variant="subtitle2" fontWeight={600}>
                              {violation.violation}
                            </Typography>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                Date: {violation.date} • Classification: {violation.classification}
                                {violation.severity && ` • Severity: ${violation.severity}`}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {violation.createdAt ? new Date(violation.createdAt).toLocaleDateString() : violation.date}
                              </Typography>
                            </Box>
                          }
                        />
                        <Chip 
                          label={violation.status || 'Pending'} 
                          size="small"
                          color={violation.status === 'Solved' ? 'success' : 
                                 violation.status === 'Denied' ? 'error' : 'warning'}
                          sx={{ fontWeight: 500 }}
                        />
                      </ListItem>
                      {index < recentViolations.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <Warning sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    No violations recorded yet
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

// Main User Dashboard Component
export default function UserDashboard({ currentUser, userProfile }) {
  const theme = useTheme();
  const navigate = useNavigate();

  // Remove conflicting auth listener - App.js handles authentication state
  // UserDashboard now receives currentUser and userProfile as props from App.js

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