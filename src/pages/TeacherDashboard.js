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
import { useNavigate } from 'react-router-dom';

export default function TeacherDashboard() {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [students, setStudents] = useState([]);
  const [violations, setViolations] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

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
      {/* Welcome Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700} color="#2d3436" gutterBottom>
          Welcome back, {userInfo.name}! 👋
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ fontSize: 18 }}>
          Here's what's happening in your classroom today
        </Typography>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            bgcolor: '#e3f2fd', 
            border: '1px solid #2196f3',
            borderRadius: 3,
            boxShadow: '0 4px 12px rgba(33, 150, 243, 0.15)',
            transition: 'transform 0.2s, box-shadow 0.2s',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 8px 24px rgba(33, 150, 243, 0.25)'
            }
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" fontWeight={700} color="#1976d2">
                    {students.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
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
          <Card sx={{ 
            bgcolor: '#fff3e0', 
            border: '1px solid #ff9800',
            borderRadius: 3,
            boxShadow: '0 4px 12px rgba(255, 152, 0, 0.15)',
            transition: 'transform 0.2s, box-shadow 0.2s',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 8px 24px rgba(255, 152, 0, 0.25)'
            }
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" fontWeight={700} color="#f57c00">
                    {violations.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                    Total Violations
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
          <Card sx={{ 
            bgcolor: '#e8f5e8', 
            border: '1px solid #4caf50',
            borderRadius: 3,
            boxShadow: '0 4px 12px rgba(76, 175, 80, 0.15)',
            transition: 'transform 0.2s, box-shadow 0.2s',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 8px 24px rgba(76, 175, 80, 0.25)'
            }
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" fontWeight={700} color="#388e3c">
                    {announcements.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
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
          <Card sx={{ 
            bgcolor: '#fce4ec', 
            border: '1px solid #e91e63',
            borderRadius: 3,
            boxShadow: '0 4px 12px rgba(233, 25, 99, 0.15)',
            transition: 'transform 0.2s, box-shadow 0.2s',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 8px 24px rgba(233, 25, 99, 0.25)'
            }
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" fontWeight={700} color="#e91e63">
                    {getUnreadNotificationsCount()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
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
        <Grid item xs={12} lg={6}>
          <Card sx={{ 
            borderRadius: 3, 
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            height: 'fit-content'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" fontWeight={600} color="#2d3436">
                  Recent Violations
                </Typography>
                <Button 
                  size="small" 
                  color="primary" 
                  onClick={() => navigate('/teacher-reports')}
                  sx={{ textTransform: 'none' }}
                >
                  View All
                </Button>
              </Box>
              
              {getRecentViolations().length > 0 ? (
                <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                  {getRecentViolations().map((violation, index) => (
                    <React.Fragment key={violation.id}>
                      <ListItem sx={{ px: 0, py: 1 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: '#ff9800', width: 40, height: 40 }}>
                            <Warning sx={{ fontSize: 20 }} />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Typography variant="subtitle2" fontWeight={600}>
                              {violation.studentName || violation.studentId}
                            </Typography>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                {violation.violationType || violation.violation}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {new Date(violation.date || violation.createdAt).toLocaleDateString()}
                              </Typography>
                            </Box>
                          }
                        />
                        <Chip 
                          label={violation.status || 'Pending'} 
                          size="small"
                          color={violation.status === 'Approved' ? 'success' : 
                                 violation.status === 'Denied' ? 'error' : 'warning'}
                          sx={{ fontWeight: 500 }}
                        />
                      </ListItem>
                      {index < getRecentViolations().length - 1 && <Divider />}
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

        {/* Recent Announcements */}
        <Grid item xs={12} lg={6}>
          <Card sx={{ 
            borderRadius: 3, 
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            height: 'fit-content'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" fontWeight={600} color="#2d3436">
                  Recent Announcements
                </Typography>
                <Button 
                  size="small" 
                  color="primary" 
                  onClick={() => navigate('/teacher-announcements')}
                  sx={{ textTransform: 'none' }}
                >
                  View All
                </Button>
              </Box>
              
              {getRecentAnnouncements().length > 0 ? (
                <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                  {getRecentAnnouncements().map((announcement, index) => (
                    <React.Fragment key={announcement.id}>
                      <ListItem sx={{ px: 0, py: 1 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: '#1976d2', width: 40, height: 40 }}>
                            <Info sx={{ fontSize: 20 }} />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Typography variant="subtitle2" fontWeight={600}>
                              {announcement.title}
                            </Typography>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                {announcement.content}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {new Date(announcement.timestamp || announcement.createdAt).toLocaleDateString()}
                              </Typography>
                            </Box>
                          }
                        />
                        <Chip 
                          label={announcement.status || 'Pending'} 
                          size="small"
                          color={announcement.status === 'Approved' ? 'success' : 
                                 announcement.status === 'Denied' ? 'error' : 'warning'}
                          sx={{ fontWeight: 500 }}
                        />
                      </ListItem>
                      {index < getRecentAnnouncements().length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <Info sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    No announcements yet
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