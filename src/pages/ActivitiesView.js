import React, { useEffect, useState } from 'react';
import { 
  Box, Typography, Grid, Card, CardContent, CardHeader, Chip, TextField, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Paper, FormControl,
  InputLabel, Select, MenuItem, Alert, Snackbar, IconButton
} from '@mui/material';
import { Add, Event, ChevronLeft, ChevronRight } from '@mui/icons-material';
import { collection, getDocs, orderBy, query, addDoc, where } from 'firebase/firestore';
import { db, auth } from '../firebase';

export default function ActivitiesView() {
  const [activities, setActivities] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewActivity, setViewActivity] = useState(null);
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [conflictCheck, setConflictCheck] = useState(null);
  // Mini-calendar state
  const [miniMonthDate, setMiniMonthDate] = useState(new Date());
  const [miniBookedDates, setMiniBookedDates] = useState(new Set());
  
  const [requestForm, setRequestForm] = useState({
    teacherName: '',
    department: '',
    activity: '',
    resource: '',
    date: '',
    startTime: '',
    endTime: '',
    notes: ''
  });

  // Use courses list for department dropdown
  const departments = [
    'BSIT', 'BSBA', 'BSCRIM', 'BSHTM', 'BEED', 'BSED', 'BSHM'
  ];

  const resources = [
    'Main Auditorium',
    'Conference Room A',
    'Conference Room B',
    'Library',
    'Gymnasium',
    'Cafeteria',
    'Outdoor Field',
    'Computer Lab 1',
    'Computer Lab 2',
    'Other'
  ];

  const timeSlots = [
    '12:00 AM', '12:30 AM', '01:00 AM', '01:30 AM', '02:00 AM', '02:30 AM', '03:00 AM', '03:30 AM',
    '04:00 AM', '04:30 AM', '05:00 AM', '05:30 AM', '06:00 AM', '06:30 AM', '07:00 AM', '07:30 AM',
    '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
    '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM',
    '08:00 PM', '08:30 PM', '09:00 PM', '09:30 PM', '10:00 PM', '10:30 PM', '11:00 PM', '11:30 PM'
  ];

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const userQuery = query(collection(db, 'users'), where('uid', '==', user.uid));
          const userSnapshot = await getDocs(userQuery);
          if (!userSnapshot.empty) {
            const userData = userSnapshot.docs[0].data();
            setUserProfile(userData);
            setRequestForm(prev => ({
              ...prev,
              teacherName: userData.fullName || user.displayName || user.email
            }));
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const q = query(collection(db, 'activities'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        setActivities(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        setActivities([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);


  const handleFormChange = (field, value) => {
    setRequestForm(prev => ({ ...prev, [field]: value }));
    if (['resource', 'date', 'startTime', 'endTime'].includes(field)) {
      setConflictCheck(null);
    }
  };

  const checkAvailability = async () => {
    try {
      const { resource, date, startTime, endTime } = requestForm;
      if (!resource || !date || !startTime || !endTime) {
        setSnackbar({ open: true, message: 'Please select resource, date, start and end time to check availability.', severity: 'warning' });
        return;
      }

      // Check teacher requests
      const reqQ = query(collection(db, 'activity_requests'), where('resource', '==', resource), where('date', '==', date));
      const reqSnap = await getDocs(reqQ);
      const requests = reqSnap.docs.map(d => d.data()).filter(r => r.status !== 'rejected');

      // Check admin bookings (approved and pending block the slot)
      const bookQ = query(collection(db, 'activity_bookings'), where('resource', '==', resource), where('date', '==', date));
      const bookSnap = await getDocs(bookQ);
      const bookings = bookSnap.docs.map(d => d.data()).filter(b => b.status !== 'rejected');

      const toMinutes = (t) => {
        if (!t) return 0;
        // Support formats: 'HH:MM' (24h) and 'HH:MM AM/PM'
        const ampmMatch = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
        if (ampmMatch) {
          let hours = parseInt(ampmMatch[1], 10);
          const minutes = parseInt(ampmMatch[2], 10);
          const period = ampmMatch[3].toUpperCase();
          if (period === 'AM') {
            if (hours === 12) hours = 0;
          } else {
            if (hours !== 12) hours += 12;
          }
          return hours * 60 + minutes;
        }
        const parts = t.split(':');
        const hours = parseInt(parts[0], 10) || 0;
        const minutes = parseInt(parts[1], 10) || 0;
        return hours * 60 + minutes;
      };
      const newStart = toMinutes(startTime);
      const newEnd = toMinutes(endTime);

      const conflictInRequests = requests.find(r => {
        const existingStart = toMinutes(r.startTime);
        const existingEnd = toMinutes(r.endTime);
        return newStart < existingEnd && newEnd > existingStart;
      });

      const conflictInBookings = bookings.find(b => {
        const existingStart = toMinutes(b.startTime);
        const existingEnd = toMinutes(b.endTime);
        return newStart < existingEnd && newEnd > existingStart;
      });

      const conflict = conflictInRequests || conflictInBookings;

      if (conflict) {
        setConflictCheck({ hasConflict: true, message: `Not available: ${resource} is booked/requested from ${conflict.startTime} to ${conflict.endTime}.` });
        setSnackbar({ open: true, message: 'Not available: conflicting schedule found.', severity: 'error' });
      } else {
        setConflictCheck({ hasConflict: false, message: 'This time slot is available. You can proceed to submit.' });
        setSnackbar({ open: true, message: 'Time slot is available.', severity: 'success' });
      }
    } catch (e) {
      console.error('Error checking availability:', e);
      setSnackbar({ open: true, message: 'Error checking availability. Try again.', severity: 'error' });
    }
  };

  // Load month bookings for mini calendar when resource or month changes
  useEffect(() => {
    const loadMiniMonth = async () => {
      try {
        if (!requestForm.resource) {
          setMiniBookedDates(new Set());
          return;
        }
        const year = miniMonthDate.getFullYear();
        const month = miniMonthDate.getMonth();
        const first = new Date(year, month, 1);
        const last = new Date(year, month + 1, 0);
        const pad = (n) => String(n).padStart(2, '0');
        const firstStr = `${year}-${pad(month + 1)}-${pad(1)}`;
        const lastStr = `${year}-${pad(month + 1)}-${pad(last.getDate())}`;

        // Teacher requests within month
        const reqRef = query(
          collection(db, 'activity_requests'),
          where('resource', '==', requestForm.resource),
          where('date', '>=', firstStr),
          where('date', '<=', lastStr)
        );
        const reqSnap = await getDocs(reqRef);

        // Admin bookings within month
        const bookRef = query(
          collection(db, 'activity_bookings'),
          where('resource', '==', requestForm.resource),
          where('date', '>=', firstStr),
          where('date', '<=', lastStr)
        );
        const bookSnap = await getDocs(bookRef);

        const setBooked = new Set();
        reqSnap.docs.forEach((d) => {
          const r = d.data();
          if (r.status !== 'rejected' && typeof r.date === 'string') setBooked.add(r.date);
        });
        bookSnap.docs.forEach((d) => {
          const b = d.data();
          if (b.status !== 'rejected' && typeof b.date === 'string') setBooked.add(b.date);
        });
        setMiniBookedDates(setBooked);
      } catch (e) {
        console.error('Error loading mini calendar bookings:', e);
        setMiniBookedDates(new Set());
      }
    };
    loadMiniMonth();
  }, [requestForm.resource, miniMonthDate]);

  const handleSubmitRequest = async () => {
    try {
      if (!requestForm.department || !requestForm.activity || 
          !requestForm.resource || !requestForm.date || !requestForm.startTime || !requestForm.endTime) {
        setSnackbar({
          open: true,
          message: 'Please fill in all required fields.',
          severity: 'error'
        });
        return;
      }

      const requestData = {
        teacherName: userProfile?.fullName || currentUser?.displayName || currentUser?.email || 'Unknown',
        department: requestForm.department,
        activity: requestForm.activity,
        resource: requestForm.resource,
        date: requestForm.date,
        startTime: requestForm.startTime,
        endTime: requestForm.endTime,
        time: `${requestForm.startTime} - ${requestForm.endTime}`,
        notes: requestForm.notes || '',
        teacherId: currentUser.uid,
        teacherEmail: currentUser.email,
        status: 'pending',
        createdAt: new Date().toISOString(),
        createdBy: currentUser.uid,
        type: 'activity_request'
      };

      const requestRef = await addDoc(collection(db, 'activity_requests'), requestData);

      // Create notification for admin
      await addDoc(collection(db, 'notifications'), {
        title: 'New Activity Request',
        message: `${(userProfile?.fullName || currentUser?.displayName || currentUser?.email || 'A teacher')} from ${requestForm.department} has requested to book ${requestForm.resource} for ${requestForm.activity} on ${new Date(requestForm.date).toLocaleDateString()} at ${requestForm.startTime} - ${requestForm.endTime}.`,
        type: 'activity_request',
        senderId: currentUser.uid,
        senderName: userProfile?.fullName || currentUser?.displayName || currentUser?.email || 'Unknown',
        senderRole: 'Teacher',
        recipientRole: 'Admin',
        requestId: requestRef.id,
        status: 'pending',
        read: false,
        createdAt: new Date().toISOString(),
        priority: 'medium'
      });

      setSnackbar({
        open: true,
        message: 'Activity request submitted successfully! Admin will review your request.',
        severity: 'success'
      });

      // Reset form
      setRequestForm({
        department: '',
        activity: '',
        resource: '',
        date: '',
        startTime: '',
        endTime: '',
        notes: ''
      });
      setRequestDialogOpen(false);

    } catch (error) {
      console.error('Error submitting request:', error);
      setSnackbar({
        open: true,
        message: 'Error submitting request. Please try again.',
        severity: 'error'
      });
    }
  };

  const filtered = activities.filter(a =>
    (a.title || '').toLowerCase().includes(search.toLowerCase()) ||
    (a.organizer || '').toLowerCase().includes(search.toLowerCase()) ||
    (a.category || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box sx={{ p: { xs: 0.5, sm: 1 }, pt: { xs: 2, sm: 3 }, pl: { xs: 2, sm: 3, md: 4 }, pr: { xs: 2, sm: 3, md: 4 } }}>
      {/* Welcome Section */}
      <Box sx={{ mb: 3, pt: { xs: 1, sm: 1 }, px: { xs: 0, sm: 0 } }}>
        <Typography 
          variant="h4" 
          fontWeight={700} 
          gutterBottom 
          sx={{ 
            color: 'inherit',
            wordBreak: 'break-word',
            fontSize: { xs: '1.75rem', sm: '2.125rem' },
            lineHeight: 1.2,
            mb: 3
          }}
        >
          Activities
        </Typography>
      </Box>

      {/* Search Bar with proper spacing */}
      <Box sx={{ mb: 3, maxWidth: 250 }}>
        <TextField 
          placeholder="Search activities..." 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          size="small"
          fullWidth
        />
      </Box>
      
      {loading ? (
        <Typography>Loading activities...</Typography>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="textSecondary">No activities available</Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {filtered.map((act) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={act.id}>
              <Card 
                sx={{ 
                  width: '100%',
                  height: '280px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease-in-out',
                  borderLeft: '4px solid',
                  borderLeftColor: act.completed ? '#8B4513' : '#800000',
                  display: 'flex',
                  flexDirection: 'column',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 4,
                    borderLeftColor: act.completed ? '#A0522D' : '#A52A2A'
                  }
                }}
                onClick={() => setViewActivity(act)}
              >
                <CardHeader
                  title={
                    <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                      <Typography fontWeight={700} sx={{ fontSize: '1.1rem' }}>
                        {act.title}
                      </Typography>
                    </Stack>
                  }
                  subheader={
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                      <Chip 
                        label={act.category || 'General'} 
                        color="primary" 
                        size="small" 
                        variant="outlined"
                      />
                      <Chip 
                        label={act.completed ? 'Completed' : 'Scheduled'} 
                        color={act.completed ? 'success' : 'warning'} 
                        size="small" 
                      />
                    </Stack>
                  }
                />
                <CardContent sx={{ pt: 0, p: 2, flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      sx={{ 
                        mb: 1,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        fontSize: '0.875rem'
                      }}
                    >
                      {act.description || 'No description available'}
                    </Typography>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mb: 1 }}>
                      {act.organizer && (
                        <Chip 
                          label={`👤 ${act.organizer}`} 
                          size="small" 
                          variant="outlined" 
                          sx={{ fontSize: '0.7rem', height: '20px' }}
                        />
                      )}
                      {act.location && (
                        <Chip 
                          label={`📍 ${act.location}`} 
                          size="small" 
                          variant="outlined"
                          sx={{ fontSize: '0.7rem', height: '20px' }}
                        />
                      )}
                    </Stack>
                  </Box>
                  <Typography 
                    variant="caption" 
                    color="text.secondary" 
                    sx={{ 
                      display: 'block', 
                      mt: 'auto',
                      fontWeight: 500,
                      fontSize: '0.75rem'
                    }}
                  >
                    📅 {act.date ? new Date(act.date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    }) : 'Date TBD'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Activity Details Modal */}
      <Dialog open={!!viewActivity} onClose={() => setViewActivity(null)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Typography variant="h5" fontWeight={700}>{viewActivity?.title}</Typography>
            <Chip 
              label={viewActivity?.category || 'General'} 
              color="primary" 
              size="small" 
            />
            <Chip 
              label={viewActivity?.completed ? 'Completed' : 'Scheduled'} 
              color={viewActivity?.completed ? 'success' : 'warning'} 
              size="small" 
            />
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {viewActivity && (
            <Box>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        📅 Date & Time
                      </Typography>
                      <Typography variant="body1" fontWeight={500}>
                        {viewActivity.date ? new Date(viewActivity.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        }) : 'Not specified'}
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        👤 Organizer
                      </Typography>
                      <Typography variant="body1" fontWeight={500}>
                        {viewActivity.organizer || 'Not specified'}
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        📍 Location
                      </Typography>
                      <Typography variant="body1" fontWeight={500}>
                        {viewActivity.location || 'Not specified'}
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        🏷️ Category
                      </Typography>
                      <Typography variant="body1" fontWeight={500}>
                        {viewActivity.category || 'General'}
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        👥 Max Participants
                      </Typography>
                      <Typography variant="body1" fontWeight={500}>
                        {viewActivity.maxParticipants || 'No limit'}
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        📊 Status
                      </Typography>
                      <Chip 
                        label={viewActivity.completed ? 'Completed' : 'Scheduled'} 
                        color={viewActivity.completed ? 'success' : 'warning'} 
                        size="small"
                      />
                    </Box>
                  </Stack>
                </Grid>
                
                <Grid item xs={12}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      📝 Description
                    </Typography>
                    <Paper 
                      sx={{ 
                        p: 2, 
                        bgcolor: 'grey.50', 
                        border: '1px solid',
                        borderColor: 'grey.200',
                        borderRadius: 1
                      }}
                    >
                      <Typography variant="body1">
                        {viewActivity.description || 'No description provided'}
                      </Typography>
                    </Paper>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={() => setViewActivity(null)} 
            variant="outlined"
            size="large"
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Request Activity Dialog removed */}

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}


