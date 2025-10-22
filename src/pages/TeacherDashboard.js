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
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
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
import { collection, query, where, getDocs, onSnapshot, orderBy } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

export default function TeacherDashboard() {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [violations, setViolations] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [mySchedulesCount, setMySchedulesCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
  const [meetingsCount, setMeetingsCount] = useState(0);
  const [reportsModalOpen, setReportsModalOpen] = useState(false);
  

  
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
    const announcementsQuery = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
    const announcementsUnsubscribe = onSnapshot(announcementsQuery, (snapshot) => {
      const announcementsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Fallback sort by whichever date field is present
      announcementsData.sort((a, b) => {
        const ad = new Date(a.timestamp || a.createdAt || 0).getTime();
        const bd = new Date(b.timestamp || b.createdAt || 0).getTime();
        return bd - ad;
      });
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
    let unsubMySchedules = null;
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
      // My schedules/bookings created by this teacher
      try {
        if (currentUser?.uid) {
          const qMySchedules = query(
            collection(db, 'activity_bookings'),
            where('teacherId', '==', currentUser.uid)
          );
          unsubMySchedules = onSnapshot(qMySchedules, (snapshot) => {
            const countById = snapshot.size;
            if (countById > 0) {
              setMySchedulesCount(countById);
              return;
            }
            // Fallback by email if legacy data
            if (currentUser?.email) {
              const qByEmail = query(
                collection(db, 'activity_bookings'),
                where('teacherEmail', '==', currentUser.email)
              );
              getDocs(qByEmail)
                .then((s) => setMySchedulesCount(s.size))
                .catch(() => setMySchedulesCount(0));
            } else {
              setMySchedulesCount(0);
            }
          });
        } else {
          setMySchedulesCount(0);
        }
      } catch (err) {
        console.error('Error setting up my schedules listener:', err);
        setMySchedulesCount(0);
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
      if (unsubMySchedules) unsubMySchedules();
    };
  }, [currentUser]);

  // No additional computation required for total announcements (use announcements.length)



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

  const getMyReports = () => {
    return violations.filter(v => (
      v.reportedBy === currentUser?.uid || v.reportedByEmail === currentUser?.email
    ));
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

      {/* Statistics Cards - styled to match Admin Students list cards */}
      <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            onClick={() => setReportsModalOpen(true)}
            sx={{
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
            }}
          >
            <CardContent sx={{ flex: 1, p: '8px !important', textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={700} color="#000000">
                {myReportsCount.toLocaleString()}
              </Typography>
              <Typography color="text.secondary" variant="body2">
                My Reports
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            onClick={() => navigate('/teacher-violation-records')}
            sx={{
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
            }}
          >
            <CardContent sx={{ flex: 1, p: '8px !important', textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={700} color="#000000">
                {meetingsCount.toLocaleString()}
              </Typography>
              <Typography color="text.secondary" variant="body2">
                Meetings
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        

        <Grid item xs={12} sm={6} md={3}>
          <Card
            onClick={() => navigate('/teacher-activity-scheduler')}
            sx={{
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
            }}
          >
            <CardContent sx={{ flex: 1, p: '8px !important', textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={700} color="#000000">
                {mySchedulesCount.toLocaleString()}
              </Typography>
              <Typography color="text.secondary" variant="body2">
                My Schedules
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            onClick={() => navigate('/teacher-announcements')}
            sx={{
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
            }}
          >
            <CardContent sx={{ flex: 1, p: '8px !important', textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={700} color="#000000">
                {announcements.length.toLocaleString()}
              </Typography>
              <Typography color="text.secondary" variant="body2">
                Announcements
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
            border: 'none',
            boxShadow: 3,
            bgcolor: 'transparent',
            borderRadius: 2,
            height: 'fit-content'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" fontWeight={700} color="#000000">
                  Recent Violations
                </Typography>
                <Button 
                  size="small" 
                  variant="outlined"
                  onClick={() => navigate('/teacher-reports')}
                  sx={{ 
                    textTransform: 'none',
                    bgcolor: '#fff', 
                    color: '#000', 
                    borderColor: '#000', 
                    '&:hover': { 
                      bgcolor: '#800000', 
                      color: '#fff', 
                      borderColor: '#800000' 
                    }
                  }}
                >
                  View All
                </Button>
              </Box>
              
              {getRecentViolations().length > 0 ? (
                <List>
                  {getRecentViolations().map((violation, index) => (
                    <React.Fragment key={violation.id}>
                      <ListItem sx={{ px: 0, py: 1, '&:hover': { backgroundColor: 'transparent' } }}>
                        <ListItemAvatar>
                          <Avatar sx={{ width: 40, height: 40 }}>
                            <Warning sx={{ fontSize: 20, color: '#ff9800' }} />
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
                          sx={{ 
                            fontWeight: 500,
                            backgroundColor: 'transparent',
                            color: (violation.status || 'Pending') === 'Approved' ? '#4caf50' : 
                                   (violation.status || 'Pending') === 'Pending' ? '#ff9800' : '#666666',
                            border: 'none',
                            '& .MuiChip-label': {
                              color: (violation.status || 'Pending') === 'Approved' ? '#4caf50' : 
                                     (violation.status || 'Pending') === 'Pending' ? '#ff9800' : '#666666'
                            }
                          }}
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
            border: 'none',
            borderRadius: 3, 
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            bgcolor: 'transparent',
            height: 'fit-content'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" fontWeight={600} color="#2d3436">
                  Recent Announcements
                </Typography>
                <Button 
                  size="small" 
                  onClick={() => navigate('/teacher-announcements')}
                  variant="outlined"
                  sx={{ 
                    textTransform: 'none',
                    bgcolor: '#fff', 
                    color: '#000', 
                    borderColor: '#000', 
                    '&:hover': { 
                      bgcolor: '#800000', 
                      color: '#fff', 
                      borderColor: '#800000' 
                    }
                  }}
                >
                  View All
                </Button>
              </Box>
              
              {getRecentAnnouncements().length > 0 ? (
                <List>
                  {getRecentAnnouncements().map((announcement, index) => (
                    <React.Fragment key={announcement.id}>
                      <ListItem sx={{ px: 0, py: 1, '&:hover': { backgroundColor: 'transparent' } }}>
                        <ListItemAvatar>
                          <Avatar sx={{ width: 40, height: 40 }}>
                            <Info sx={{ fontSize: 20, color: '#1976d2' }} />
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
                          sx={{ 
                            fontWeight: 500,
                            backgroundColor: 'transparent',
                            color: (announcement.status || 'Pending') === 'Approved' ? '#4caf50' : 
                                   (announcement.status || 'Pending') === 'Pending' ? '#ff9800' : '#666666',
                            border: 'none',
                            '& .MuiChip-label': {
                              color: (announcement.status || 'Pending') === 'Approved' ? '#4caf50' : 
                                     (announcement.status || 'Pending') === 'Pending' ? '#ff9800' : '#666666'
                            }
                          }}
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

      
      {/* My Reports Modal */}
      <Dialog 
        open={reportsModalOpen} 
        onClose={() => setReportsModalOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            maxHeight: '80vh'
          }
        }}
      >
        <DialogTitle sx={{ 
          fontWeight: 600,
          color: '#800000'
        }}>
          My Reports ({myReportsCount})
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {getMyReports().length > 0 ? (
            <List sx={{ maxHeight: '60vh', overflow: 'auto' }}>
              {getMyReports().map((report, index) => (
                <React.Fragment key={report.id}>
                  <ListItem sx={{ px: 3, py: 2 }}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: '#ff9800', width: 40, height: 40 }}>
                        <Warning sx={{ fontSize: 20 }} />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography variant="subtitle1" fontWeight={600}>
                          {report.studentName || report.studentId || 'Unknown Student'}
                        </Typography>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            <strong>Violation:</strong> {report.violationType || report.violation || 'Not specified'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            <strong>Description:</strong> {report.description || report.details || 'No description provided'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            <strong>Date:</strong> {new Date(report.date || report.createdAt).toLocaleDateString()}
                          </Typography>
                        </Box>
                      }
                    />
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                      <Chip 
                        label={report.status || 'Pending'} 
                        size="small"
                        color={report.status === 'Approved' ? 'success' : 
                               report.status === 'Denied' ? 'error' : 'warning'}
                        sx={{ fontWeight: 500 }}
                      />
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          setReportsModalOpen(false);
                          navigate('/teacher-reports');
                        }}
                        sx={{ 
                          textTransform: 'none',
                          bgcolor: '#fff', 
                          color: '#000', 
                          borderColor: '#000', 
                          '&:hover': { 
                            bgcolor: '#800000', 
                            color: '#fff', 
                            borderColor: '#800000' 
                          }
                        }}
                      >
                        View Details
                      </Button>
                    </Box>
                  </ListItem>
                  {index < getMyReports().length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Warning sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                No Reports Found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                You haven't submitted any violation reports yet.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: '#f5f5f5' }}>
          <Button 
            onClick={() => setReportsModalOpen(false)}
            variant="outlined"
            sx={{ 
              textTransform: 'none',
              bgcolor: '#fff', 
              color: '#000', 
              borderColor: '#000', 
              '&:hover': { 
                bgcolor: '#800000', 
                color: '#fff', 
                borderColor: '#800000' 
              }
            }}
          >
            Close
          </Button>
          <Button 
            onClick={() => {
              setReportsModalOpen(false);
              navigate('/teacher-reports');
            }}
            variant="outlined"
            sx={{ 
              textTransform: 'none',
              bgcolor: '#fff', 
              color: '#000', 
              borderColor: '#000', 
              '&:hover': { 
                bgcolor: '#800000', 
                color: '#fff', 
                borderColor: '#800000' 
              }
            }}
          >
            View All Reports
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 