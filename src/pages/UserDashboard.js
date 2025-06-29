import React, { useState, useEffect } from "react";
import { 
  Box, Typography, Grid, Card, CardContent, List, ListItem, ListItemAvatar, 
  ListItemText, Avatar, Chip, Button, CircularProgress
} from "@mui/material";
import { CheckCircle, Warning, Announcement } from "@mui/icons-material";
import { Link } from "react-router-dom";
import { db, auth, logActivity } from "../firebase";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, where, query, onSnapshot, orderBy, setDoc, getDoc, limit } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// User Overview Component
function UserOverview({ currentUser }) {
  const [userViolations, setUserViolations] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
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
      const notifications = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotifications(notifications);
      
      // Calculate unread notifications
      const unreadCount = notifications.filter(n => !n.read).length;
      setStats(prev => ({
        ...prev,
        unreadNotifications: unreadCount
      }));
    });

    return () => {
      unsubViolations();
      unsubAnnouncements();
      unsubNotifications();
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
      <Card sx={{ mb: 4, bgcolor: '#f8f9fa', border: '2px solid #1976d2' }}>
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
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#1976d2', mb: 1 }}>
                {userInfo.name}
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                {userInfo.email}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip 
                  label={userInfo.role} 
                  color="primary" 
                  variant="outlined"
                  sx={{ fontWeight: 600 }}
                />
                <Chip 
                  label="Active" 
                  color="success" 
                  variant="outlined"
                  sx={{ fontWeight: 600 }}
                />
              </Box>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Quick Stats
              </Typography>
              <Typography variant="h4" color="primary.main" fontWeight={700}>
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
            bgcolor: '#e3f2fd', 
            border: '1px solid #1976d2',
            boxShadow: 2,
            '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' },
            transition: 'all 0.3s ease'
          }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom fontWeight={600}>Total Violations</Typography>
              <Typography variant="h4" color="primary.main" fontWeight={700}>{stats.totalViolations}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            bgcolor: '#fff3e0', 
            border: '1px solid #ff9800',
            boxShadow: 2,
            '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' },
            transition: 'all 0.3s ease'
          }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom fontWeight={600}>Pending</Typography>
              <Typography variant="h4" color="warning.main" fontWeight={700}>{stats.pendingViolations}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            bgcolor: '#e8f5e8', 
            border: '1px solid #4caf50',
            boxShadow: 2,
            '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' },
            transition: 'all 0.3s ease'
          }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom fontWeight={600}>Resolved</Typography>
              <Typography variant="h4" color="success.main" fontWeight={700}>{stats.resolvedViolations}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            bgcolor: '#fce4ec', 
            border: '1px solid #e91e63',
            boxShadow: stats.unreadNotifications > 0 ? 4 : 2,
            '&:hover': { boxShadow: 6, transform: 'translateY(-2px)' },
            transition: 'all 0.3s ease',
            animation: stats.unreadNotifications > 0 ? 'pulse 2s infinite' : 'none',
            '@keyframes pulse': {
              '0%': { boxShadow: '0 0 0 0 rgba(233, 30, 99, 0.7)' },
              '70%': { boxShadow: '0 0 0 10px rgba(233, 30, 99, 0)' },
              '100%': { boxShadow: '0 0 0 0 rgba(233, 30, 99, 0)' }
            }
          }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom fontWeight={600}>Notifications</Typography>
              <Typography variant="h4" color="error.main" fontWeight={700}>{stats.unreadNotifications}</Typography>
              {stats.unreadNotifications > 0 && (
                <Chip 
                  label="NEW" 
                  size="small" 
                  color="error" 
                  sx={{ mt: 1, fontWeight: 600 }}
                />
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Notifications Section */}
      {recentNotifications.length > 0 && (
        <Card sx={{ 
          mb: 4, 
          border: stats.unreadNotifications > 0 ? '1px solid #ff9800' : '1px solid #ff9800',
          boxShadow: stats.unreadNotifications > 0 ? 4 : 2,
          bgcolor: stats.unreadNotifications > 0 ? '#fff8e1' : '#fff',
          animation: stats.unreadNotifications > 0 ? 'glow 2s ease-in-out infinite alternate' : 'none',
          '@keyframes glow': {
            '0%': { boxShadow: '0 0 5px rgba(255, 152, 0, 0.5)' },
            '100%': { boxShadow: '0 0 20px rgba(255, 152, 0, 0.8)' }
          }
        }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Warning color="warning" sx={{ mr: 1, fontSize: 28 }} />
              <Typography variant="h6" color="warning.main" fontWeight={700}>
                Recent Notifications 
                {stats.unreadNotifications > 0 && (
                  <Chip 
                    label={`${stats.unreadNotifications} UNREAD`} 
                    color="error" 
                    size="small" 
                    sx={{ ml: 2, fontWeight: 600 }}
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
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom color="error.main">
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

      {/* Recent Announcements Section */}
      {announcements && announcements.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom color="primary.main">
              Recent Announcements
            </Typography>
            <List>
              {announcements.map((announcement) => (
                <ListItem key={announcement.id} sx={{ px: 0 }}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      <Announcement />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={announcement.title}
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {announcement.content && announcement.content.length > 100 
                            ? `${announcement.content.substring(0, 100)}...` 
                            : announcement.content
                          }
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(announcement.createdAt).toLocaleString()}
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
                View All Announcements
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!currentUser) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Typography>Please log in to access the dashboard.</Typography>
      </Box>
    );
  }

  return <UserOverview currentUser={currentUser} />;
} 