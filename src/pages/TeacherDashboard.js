import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  CardActions, 
  Button, 
  Avatar, 
  Chip, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemAvatar, 
  Divider,
  Paper,
  IconButton,
  Badge
} from '@mui/material';
import { 
  Dashboard, 
  People, 
  Assignment, 
  Announcement, 
  Event, 
  Assessment, 
  Notifications,
  School,
  Book,
  Grade,
  Schedule,
  TrendingUp,
  Person,
  CalendarToday,
  CheckCircle,
  Warning,
  Info
} from '@mui/icons-material';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';

export default function TeacherDashboard() {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [students, setStudents] = useState([]);
  const [violations, setViolations] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      
      if (user) {
        try {
          // Fetch user profile
          const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', user.uid)));
          if (!userDoc.empty) {
            setUserProfile(userDoc.docs[0].data());
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!currentUser?.email) return;

    // Fetch students
    const studentsQuery = query(collection(db, 'users'), where('role', '==', 'Student'));
    const studentsUnsubscribe = onSnapshot(studentsQuery, (snapshot) => {
      const studentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStudents(studentsData);
    });

    // Fetch violations
    const violationsQuery = query(collection(db, 'violations'));
    const violationsUnsubscribe = onSnapshot(violationsQuery, (snapshot) => {
      const violationsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setViolations(violationsData);
    });

    // Fetch announcements
    const announcementsQuery = query(collection(db, 'announcements'));
    const announcementsUnsubscribe = onSnapshot(announcementsQuery, (snapshot) => {
      const announcementsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAnnouncements(announcementsData);
    });

    // Fetch notifications
    const notificationsQuery = query(
      collection(db, 'notifications'), 
      where('recipientEmail', '==', currentUser.email)
    );
    const notificationsUnsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const notificationsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotifications(notificationsData);
    });

    setLoading(false);

    return () => {
      studentsUnsubscribe();
      violationsUnsubscribe();
      announcementsUnsubscribe();
      notificationsUnsubscribe();
    };
  }, [currentUser]);

  const getUserDisplayInfo = () => {
    if (userProfile) {
      return {
        name: userProfile.fullName || currentUser?.displayName || 'Teacher',
        email: userProfile.email || currentUser?.email,
        photo: userProfile.profilePic || currentUser?.photoURL,
        role: userProfile.role || 'Teacher'
      };
    }
    return {
      name: currentUser?.displayName || 'Teacher',
      email: currentUser?.email,
      photo: currentUser?.photoURL,
      role: 'Teacher'
    };
  };

  const userInfo = getUserDisplayInfo();

  const getUnreadNotificationsCount = () => {
    return notifications.filter(notification => !notification.read).length;
  };

  const getRecentViolations = () => {
    return violations.slice(0, 5);
  };

  const getRecentAnnouncements = () => {
    return announcements.slice(0, 3);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Typography>Loading Teacher Dashboard...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, bgcolor: '#f5f6fa', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700} color="primary" gutterBottom>
          Teacher Dashboard
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Welcome back, {userInfo.name}! Here's what's happening today.
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#e3f2fd', border: '1px solid #1976d2' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" fontWeight={700} color="primary">
                    {students.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Students
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#1976d2', width: 56, height: 56 }}>
                  <People sx={{ fontSize: 28 }} />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#fff3e0', border: '1px solid #ff9800' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" fontWeight={700} color="#ff9800">
                    {violations.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Violations Recorded
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#ff9800', width: 56, height: 56 }}>
                  <Warning sx={{ fontSize: 28 }} />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#e8f5e8', border: '1px solid #4caf50' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" fontWeight={700} color="#4caf50">
                    {announcements.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Announcements
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#4caf50', width: 56, height: 56 }}>
                  <Announcement sx={{ fontSize: 28 }} />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#fce4ec', border: '1px solid #e91e63' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" fontWeight={700} color="#e91e63">
                    {getUnreadNotificationsCount()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Unread Notifications
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#e91e63', width: 56, height: 56 }}>
                  <Badge badgeContent={getUnreadNotificationsCount()} color="error">
                    <Notifications sx={{ fontSize: 28 }} />
                  </Badge>
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Recent Violations */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Assignment sx={{ color: '#d32f2f', mr: 1 }} />
                <Typography variant="h6" fontWeight={600}>
                  Recent Violations
                </Typography>
              </Box>
              <List>
                {getRecentViolations().map((violation, index) => (
                  <React.Fragment key={violation.id}>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: '#d32f2f' }}>
                          <Warning />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={violation.studentName || 'Unknown Student'}
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {violation.violationType} - {violation.description}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(violation.timestamp).toLocaleDateString()}
                            </Typography>
                          </Box>
                        }
                      />
                      <Chip 
                        label={violation.status || 'Pending'} 
                        color={violation.status === 'Resolved' ? 'success' : 'warning'}
                        size="small"
                      />
                    </ListItem>
                    {index < getRecentViolations().length - 1 && <Divider />}
                  </React.Fragment>
                ))}
                {getRecentViolations().length === 0 && (
                  <ListItem>
                    <ListItemText
                      primary="No recent violations"
                      secondary="All students are following the rules!"
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
            <CardActions>
              <Button size="small" color="primary">
                View All Violations
              </Button>
            </CardActions>
          </Card>
        </Grid>

        {/* Recent Announcements */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Announcement sx={{ color: '#1976d2', mr: 1 }} />
                <Typography variant="h6" fontWeight={600}>
                  Recent Announcements
                </Typography>
              </Box>
              <List>
                {getRecentAnnouncements().map((announcement, index) => (
                  <React.Fragment key={announcement.id}>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: '#1976d2' }}>
                          <Info />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={announcement.title}
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {announcement.content}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(announcement.timestamp).toLocaleDateString()}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < getRecentAnnouncements().length - 1 && <Divider />}
                  </React.Fragment>
                ))}
                {getRecentAnnouncements().length === 0 && (
                  <ListItem>
                    <ListItemText
                      primary="No recent announcements"
                      secondary="Check back later for updates"
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
            <CardActions>
              <Button size="small" color="primary">
                View All Announcements
              </Button>
            </CardActions>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Quick Actions
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<Assignment />}
                    sx={{ py: 2, justifyContent: 'flex-start' }}
                  >
                    Record Violation
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<Announcement />}
                    sx={{ py: 2, justifyContent: 'flex-start' }}
                  >
                    Create Announcement
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<Assessment />}
                    sx={{ py: 2, justifyContent: 'flex-start' }}
                  >
                    View Reports
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<Schedule />}
                    sx={{ py: 2, justifyContent: 'flex-start' }}
                  >
                    Schedule Meeting
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
} 