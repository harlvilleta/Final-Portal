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
  CalendarToday,
  CheckCircle,
  Warning,
  Info,
  Report,
  Campaign,
  People
} from '@mui/icons-material';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

export default function TeacherDashboard() {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [violations, setViolations] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
  const [meetingsCount, setMeetingsCount] = useState(0);
  

  
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

    // Fetch violations
    const violationsQuery = query(collection(db, 'violations'));
    const violationsUnsubscribe = onSnapshot(violationsQuery, (snapshot) => {
      const violationsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setViolations(violationsData);
    }, (error) => {
      console.error('Error fetching violations:', error);
    });

    // Fetch announcements
    const announcementsQuery = query(collection(db, 'announcements'));
    const announcementsUnsubscribe = onSnapshot(announcementsQuery, (snapshot) => {
      const announcementsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAnnouncements(announcementsData);
    }, (error) => {
      console.error('Error fetching announcements:', error);
    });

    // Fetch notifications
    const notificationsQuery = query(
      collection(db, 'notifications'), 
      where('recipientEmail', '==', currentUser.email)
    );
    const notificationsUnsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const notificationsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotifications(notificationsData);
    }, (error) => {
      console.error('Error fetching notifications:', error);
    });

    // Meetings count where teacher is involved
    const idSet = new Set();
    let unsubMeetingsA = null;
    let unsubMeetingsB = null;
    try {
      const participantsValues = [currentUser.email, currentUser.uid].filter(Boolean);
      if (participantsValues.length > 0) {
        const qParticipants = query(
          collection(db, 'meetings'),
          where('participants', 'array-contains-any', participantsValues)
        );
        unsubMeetingsA = onSnapshot(qParticipants, (snapshot) => {
          const local = new Set(idSet);
          snapshot.docs.forEach(d => local.add(d.id));
          idSet.clear();
          local.forEach(id => idSet.add(id));
          setMeetingsCount(idSet.size);
        });
      }

      const organizersValues = [currentUser.email, currentUser.uid].filter(Boolean);
      if (organizersValues.length > 0) {
        const qOrganizer = query(
          collection(db, 'meetings'),
          where('organizer', 'in', organizersValues)
        );
        unsubMeetingsB = onSnapshot(qOrganizer, (snapshot) => {
          const local = new Set(idSet);
          snapshot.docs.forEach(d => local.add(d.id));
          idSet.clear();
          local.forEach(id => idSet.add(id));
          setMeetingsCount(idSet.size);
        });
      }
    } catch (e) {
      console.error('Error setting up meetings listeners:', e);
    }

    setLoading(false);

    return () => {
      violationsUnsubscribe();
      announcementsUnsubscribe();
      notificationsUnsubscribe();
      if (unsubMeetingsA) unsubMeetingsA();
      if (unsubMeetingsB) unsubMeetingsB();
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

  const myReportsCount = violations.filter(v => (
    v.reportedBy === currentUser?.uid || v.reportedByEmail === currentUser?.email
  )).length;

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
          Hi Teacher {userInfo.name}
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
          Welcome back, {userInfo.name}! Here's what's happening in your classroom today
        </Typography>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            p: 2, 
            boxShadow: 3, 
            borderRadius: 2,
            borderLeft: '4px solid #d32f2f',
            background: '#d32f2f20',
            cursor: 'pointer',
            transition: 'box-shadow 0.2s, background 0.2s',
            '&:hover': {
              boxShadow: 6,
              background: '#d32f2f22',
            },
          }}>
            <Box sx={{ mr: 2 }}>
              <Report fontSize="large" sx={{ color: '#d32f2f' }} />
            </Box>
            <CardContent sx={{ flex: 1, p: '8px !important' }}>
              <Typography variant="h4" fontWeight={700} color="#d32f2f">
                {myReportsCount.toLocaleString()}
              </Typography>
              <Typography color="text.secondary" variant="body2">
                My Reports
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
            borderLeft: '4px solid #ed6c02',
            background: '#ed6c0220',
            cursor: 'pointer',
            transition: 'box-shadow 0.2s, background 0.2s',
            '&:hover': {
              boxShadow: 6,
              background: '#ed6c0222',
            },
          }}>
            <Box sx={{ mr: 2 }}>
              <Warning fontSize="large" sx={{ color: '#ed6c02' }} />
            </Box>
            <CardContent sx={{ flex: 1, p: '8px !important' }}>
              <Typography variant="h4" fontWeight={700} color="#ed6c02">
                {meetingsCount.toLocaleString()}
              </Typography>
              <Typography color="text.secondary" variant="body2">
                Meetings
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
            borderLeft: '4px solid #2e7d32',
            background: '#2e7d3220',
            cursor: 'pointer',
            transition: 'box-shadow 0.2s, background 0.2s',
            '&:hover': {
              boxShadow: 6,
              background: '#2e7d3222',
            },
          }}>
            <Box sx={{ mr: 2 }}>
              <Campaign fontSize="large" sx={{ color: '#2e7d32' }} />
            </Box>
            <CardContent sx={{ flex: 1, p: '8px !important' }}>
              <Typography variant="h4" fontWeight={700} color="#2e7d32">
                {announcements.length.toLocaleString()}
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
            background: '#80000020',
            cursor: 'pointer',
            transition: 'box-shadow 0.2s, background 0.2s',
            '&:hover': {
              boxShadow: 6,
              background: '#80000022',
            },
          }}>
            <Box sx={{ mr: 2 }}>
              <Notifications fontSize="large" sx={{ color: '#800000' }} />
            </Box>
            <CardContent sx={{ flex: 1, p: '8px !important' }}>
              <Typography variant="h4" fontWeight={700} color="#800000">
                {getUnreadNotificationsCount().toLocaleString()}
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
        {/* Recent Violations */}
        <Grid item xs={12} lg={6}>
          <Card sx={{ 
            border: '1px solid #800000',
            borderLeft: '4px solid #800000',
            boxShadow: 3,
            bgcolor: '#80000015',
            borderRadius: 2,
            height: 'fit-content'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" fontWeight={700} color="#800000">
                  Recent Violations
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
                  onClick={() => navigate('/teacher-reports')}
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