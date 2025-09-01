import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Grid, 
  Chip, 
  Avatar, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemAvatar,
  Divider,
  Paper,
  CircularProgress,
  Alert
} from '@mui/material';
import { 
  Schedule, 
  Event, 
  LocationOn, 
  People, 
  AccessTime,
  CalendarToday
} from '@mui/icons-material';
import { auth, db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';

export default function TeacherSchedule() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        fetchTeacherMeetings(user.email);
      }
    });

    return unsubscribe;
  }, []);

  const fetchTeacherMeetings = (teacherEmail) => {
    if (!teacherEmail) return;

    try {
      // Query meetings where the teacher is involved (either as organizer or participant)
      const meetingsQuery = query(
        collection(db, 'meetings'),
        where('participants', 'array-contains', teacherEmail),
        orderBy('date', 'asc')
      );

      const unsubscribe = onSnapshot(meetingsQuery, (snapshot) => {
        const meetingsData = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        }));
        setMeetings(meetingsData);
        setLoading(false);
      }, (error) => {
        console.error('Error fetching meetings:', error);
        setError('Failed to load meetings');
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up meetings query:', error);
      setError('Failed to load meetings');
      setLoading(false);
    }
  };

  const getMeetingStatus = (meeting) => {
    const now = new Date();
    const meetingDate = new Date(meeting.date);
    
    if (meetingDate < now) {
      return { status: 'Past', color: 'default' };
    } else if (meetingDate.getTime() - now.getTime() < 24 * 60 * 60 * 1000) {
      return { status: 'Today', color: 'warning' };
    } else {
      return { status: 'Upcoming', color: 'success' };
    }
  };

  const formatMeetingTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  const upcomingMeetings = meetings.filter(m => new Date(m.date) > new Date());
  const pastMeetings = meetings.filter(m => new Date(m.date) <= new Date());

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, bgcolor: '#f5f6fa', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700} color="#2d3436" gutterBottom>
          My Schedule
        </Typography>
        <Typography variant="body1" color="text.secondary">
          View all meetings and events you're involved in
        </Typography>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            bgcolor: '#e3f2fd', 
            border: '1px solid #2196f3',
            borderRadius: 3,
            boxShadow: '0 4px 12px rgba(33, 150, 243, 0.15)'
          }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Avatar sx={{ bgcolor: '#1976d2', width: 56, height: 56, mx: 'auto', mb: 2 }}>
                <Schedule sx={{ fontSize: 28 }} />
              </Avatar>
              <Typography variant="h4" fontWeight={700} color="#1976d2">
                {meetings.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Meetings
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            bgcolor: '#e8f5e8', 
            border: '1px solid #4caf50',
            borderRadius: 3,
            boxShadow: '0 4px 12px rgba(76, 175, 80, 0.15)'
          }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Avatar sx={{ bgcolor: '#4caf50', width: 56, height: 56, mx: 'auto', mb: 2 }}>
                <Event sx={{ fontSize: 28 }} />
              </Avatar>
              <Typography variant="h4" fontWeight={700} color="#388e3c">
                {upcomingMeetings.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Upcoming
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            bgcolor: '#fff3e0', 
            border: '1px solid #ff9800',
            borderRadius: 3,
            boxShadow: '0 4px 12px rgba(255, 152, 0, 0.15)'
          }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Avatar sx={{ bgcolor: '#ff9800', width: 56, height: 56, mx: 'auto', mb: 2 }}>
                <AccessTime sx={{ fontSize: 28 }} />
              </Avatar>
              <Typography variant="h4" fontWeight={700} color="#f57c00">
                {meetings.filter(m => {
                  const now = new Date();
                  const meetingDate = new Date(m.date);
                  return meetingDate.getTime() - now.getTime() < 24 * 60 * 60 * 1000 && meetingDate > now;
                }).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Today
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            bgcolor: '#fce4ec', 
            border: '1px solid #e91e63',
            borderRadius: 3,
            boxShadow: '0 4px 12px rgba(233, 25, 99, 0.15)'
          }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Avatar sx={{ bgcolor: '#e91e63', width: 56, height: 56, mx: 'auto', mb: 2 }}>
                <CalendarToday sx={{ fontSize: 28 }} />
              </Avatar>
              <Typography variant="h4" fontWeight={700} color="#e91e63">
                {pastMeetings.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Past
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Upcoming Meetings */}
      {upcomingMeetings.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" fontWeight={600} color="#2d3436" sx={{ mb: 2 }}>
            Upcoming Meetings
          </Typography>
          <Grid container spacing={2}>
            {upcomingMeetings.map((meeting) => {
              const status = getMeetingStatus(meeting);
              return (
                <Grid item xs={12} md={6} key={meeting.id}>
                  <Card sx={{ 
                    borderLeft: `4px solid ${status.color === 'warning' ? '#ff9800' : '#4caf50'}`,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    '&:hover': { boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }
                  }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Typography variant="h6" fontWeight={600} color="#2d3436">
                          {meeting.title}
                        </Typography>
                        <Chip 
                          label={status.status} 
                          color={status.color} 
                          size="small" 
                          variant="outlined"
                        />
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <AccessTime sx={{ fontSize: 16, color: 'text.secondary', mr: 1 }} />
                        <Typography variant="body2" color="text.secondary">
                          {formatMeetingTime(meeting.date)}
                        </Typography>
                      </Box>

                      {meeting.location && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <LocationOn sx={{ fontSize: 16, color: 'text.secondary', mr: 1 }} />
                          <Typography variant="body2" color="text.secondary">
                            {meeting.location}
                          </Typography>
                        </Box>
                      )}

                      {meeting.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {meeting.description}
                        </Typography>
                      )}

                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <People sx={{ fontSize: 16, color: 'text.secondary', mr: 1 }} />
                          <Typography variant="body2" color="text.secondary">
                            {meeting.participants?.length || 0} participants
                          </Typography>
                        </Box>
                        
                        {meeting.organizer && (
                          <Chip 
                            label={`Organized by: ${meeting.organizer}`}
                            size="small"
                            variant="outlined"
                            color="primary"
                          />
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}

      {/* Past Meetings */}
      {pastMeetings.length > 0 && (
        <Box>
          <Typography variant="h5" fontWeight={600} color="#2d3436" sx={{ mb: 2 }}>
            Past Meetings
          </Typography>
          <Paper sx={{ maxHeight: 400, overflow: 'auto' }}>
            <List>
              {pastMeetings.map((meeting, index) => (
                <React.Fragment key={meeting.id}>
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: '#9e9e9e' }}>
                        <Event />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={meeting.title}
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {formatMeetingTime(meeting.date)}
                          </Typography>
                          {meeting.location && (
                            <Typography variant="body2" color="text.secondary">
                              Location: {meeting.location}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                    <Chip label="Completed" color="default" size="small" />
                  </ListItem>
                  {index < pastMeetings.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        </Box>
      )}

      {/* No Meetings Message */}
      {meetings.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Event sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No meetings scheduled
          </Typography>
          <Typography variant="body2" color="text.secondary">
            You don't have any meetings or events scheduled at the moment.
          </Typography>
        </Box>
      )}
    </Box>
  );
}

