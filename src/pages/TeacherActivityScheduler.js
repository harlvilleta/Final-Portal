import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  Snackbar,
  Tooltip,
  IconButton,
  Autocomplete,
  useTheme
} from '@mui/material';
import {
  CalendarToday,
  Event,
  CheckCircle,
  Cancel,
  Warning,
  FilterList,
  Add,
  Visibility,
  Delete
} from '@mui/icons-material';
import { auth, db } from '../firebase';
import { collection, addDoc, getDocs, query, where, orderBy, onSnapshot, updateDoc, doc, deleteDoc } from 'firebase/firestore';

export default function TeacherActivityScheduler() {
  const theme = useTheme();
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [bookingForm, setBookingForm] = useState({
    teacherName: '',
    department: '',
    activity: '',
    resource: '',
    date: '',
    time: '',
    notes: ''
  });
  const [conflictCheck, setConflictCheck] = useState(null);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [filterResource, setFilterResource] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Available resources and departments
  const resources = [
    'Auditorium', 'Gymnasium', 'Library', 'Computer Lab', 'Science Lab',
    'Art Room', 'Music Room', 'Conference Room', 'Cafeteria', 'Outdoor Field'
  ];

  const departments = [
    'Mathematics', 'Science', 'English', 'History', 'Physical Education',
    'Art', 'Music', 'Computer Science', 'Foreign Languages', 'Administration'
  ];

  const timeSlots = [
    '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
    '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'
  ];

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', user.uid)));
          if (!userDoc.empty) {
            const userData = userDoc.docs[0].data();
            setUserProfile(userData);
            setBookingForm(prev => ({
              ...prev,
              teacherName: userData.fullName || userData.name || user.displayName || '',
              department: userData.department || ''
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
    if (!currentUser?.email) return;

    const bookingsQuery = query(
      collection(db, 'activity_bookings'),
      orderBy('date', 'asc')
    );

    const unsubscribe = onSnapshot(bookingsQuery, (snapshot) => {
      const bookingsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBookings(bookingsData);
      console.log('📅 Bookings updated:', bookingsData.length, 'total bookings');
    }, (error) => {
      console.error('❌ Error listening to bookings:', error);
    });

    return unsubscribe;
  }, [currentUser]);

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const getBookingsForDate = (date) => {
    if (!date) return [];
    
    // Fix timezone issue: use local date formatting instead of toISOString()
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    // Only include bookings that are not rejected (pending or approved)
    return bookings.filter(booking => 
      booking.date === dateStr && 
      booking.status !== 'rejected'
    );
  };

  const isPastDate = (date) => {
    if (!date) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    
    let checkDate;
    if (typeof date === 'string') {
      // Handle date string like "2024-01-15" - use local timezone
      checkDate = new Date(date + 'T00:00:00');
    } else {
      // Handle Date object - create a new date with local timezone
      checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }
    checkDate.setHours(0, 0, 0, 0); // Reset time to start of day
    
    // Debug logging for October dates
    if (date && ((typeof date === 'object' && date.getMonth() === 9) || (typeof date === 'string' && date.includes('2024-10')))) {
      console.log('October date comparison:', {
        inputDate: date,
        checkDate: checkDate.toISOString(),
        today: today.toISOString(),
        isPast: checkDate < today,
        checkDateLocal: checkDate.toLocaleDateString(),
        todayLocal: today.toLocaleDateString()
      });
    }
    
    // Allow booking for today and future dates only
    return checkDate < today;
  };

  const getDateStatus = (date) => {
    if (!date) return 'empty';
    if (isPastDate(date)) return 'past';
    const dateBookings = getBookingsForDate(date);
    
    // Debug logging for October 15
    if (date && date.getDate() === 15 && date.getMonth() === 9) { // October is month 9 (0-indexed)
      console.log('October 15 status check:', {
        date: date.toISOString(),
        dateBookings: dateBookings,
        allBookingsForDate: bookings.filter(booking => booking.date === date.toISOString().split('T')[0]),
        status: dateBookings.length === 0 ? 'available' : 'booked'
      });
    }
    
    if (dateBookings.length === 0) return 'available';
    return 'booked';
  };

  const getDateColor = (date) => {
    const status = getDateStatus(date);
    switch (status) {
      case 'available': return '#4caf50'; // Green
      case 'booked': return '#f44336'; // Red
      case 'past': return '#9e9e9e'; // Gray for past dates
      default: return '#e0e0e0'; // Light gray for empty
    }
  };

  const getStatusDotColor = (date) => {
    const status = getDateStatus(date);
    switch (status) {
      case 'available': return '#4caf50'; // Green dot
      case 'booked': return '#f44336'; // Red dot
      case 'past': return '#9e9e9e'; // Gray dot for past dates
      default: return 'transparent'; // No dot for empty
    }
  };

  const handleDateClick = (date) => {
    if (!date) return;
    
    // Only prevent selection of past dates (not including today)
    if (isPastDate(date)) {
      setSnackbar({
        open: true,
        message: 'Cannot book past dates. Please select today or a future date.',
        severity: 'error'
      });
      return;
    }
    
    // Allow selection of today and future dates
    setSelectedDate(date);
    
    // Fix timezone issue: use local date formatting instead of toISOString()
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    console.log('Date click:', {
      originalDate: date,
      formattedDate: dateString,
      toISOString: date.toISOString().split('T')[0]
    });
    
    setBookingForm(prev => ({
      ...prev,
      date: dateString
    }));
    setConflictCheck(null); // Clear any existing conflict check when selecting a new date
    setBookingDialogOpen(true);
  };

  const checkConflict = (formData) => {
    const { resource, date, time } = formData;
    
    // Check if date is in the past (not including today)
    if (date && isPastDate(date)) {
      return {
        hasConflict: true,
        message: 'Cannot book past dates. Please select today or a future date.'
      };
    }
    
    // Check for conflicting bookings (exclude rejected bookings)
    const conflictingBooking = bookings.find(booking => 
      booking.resource === resource && 
      booking.date === date && 
      booking.time === time &&
      booking.status !== 'rejected'
    );

    if (conflictingBooking) {
      const statusText = conflictingBooking.status === 'pending' ? 'pending approval' : 'approved';
      return {
        hasConflict: true,
        message: `Conflict detected: ${resource} is already ${statusText} by ${conflictingBooking.department} on ${new Date(date).toLocaleDateString()} at ${time}. Please choose another time slot.`
      };
    }

    // Check if there are any rejected bookings for this slot (for informational purposes)
    const rejectedBooking = bookings.find(booking => 
      booking.resource === resource && 
      booking.date === date && 
      booking.time === time &&
      booking.status === 'rejected'
    );

    let message = 'This time slot is available. Submit your booking request for admin approval.';
    if (rejectedBooking) {
      message += ' (Note: This slot was previously rejected and is now available again.)';
    }

    return {
      hasConflict: false,
      message: message
    };
  };

  const handleFormChange = (field, value) => {
    const updatedForm = { ...bookingForm, [field]: value };
    setBookingForm(updatedForm);
    
    // Clear any existing conflict check when form changes
    setConflictCheck(null);
  };

  const handleSubmitBooking = async () => {
    try {
      console.log('Starting booking submission...', { bookingForm, currentUser });
      
      // Basic validation - only check if date is in the past (not including today)
      if (isPastDate(bookingForm.date)) {
        setSnackbar({
          open: true,
          message: 'Cannot book past dates. Please select today or a future date.',
          severity: 'error'
        });
        return;
      }

      // Validate required fields
      if (!bookingForm.teacherName || !bookingForm.department || !bookingForm.activity || 
          !bookingForm.resource || !bookingForm.date || !bookingForm.time) {
        setSnackbar({
          open: true,
          message: 'Please fill in all required fields.',
          severity: 'error'
        });
        return;
      }

      // Validate user authentication
      if (!currentUser || !currentUser.uid) {
        setSnackbar({
          open: true,
          message: 'User not authenticated. Please log in again.',
          severity: 'error'
        });
        return;
      }

      const bookingData = {
        teacherName: bookingForm.teacherName,
        department: bookingForm.department,
        activity: bookingForm.activity,
        resource: bookingForm.resource,
        date: bookingForm.date,
        time: bookingForm.time,
        notes: bookingForm.notes || '',
        teacherId: currentUser.uid,
        teacherEmail: currentUser.email,
        status: 'pending',
        createdAt: new Date().toISOString(),
        createdBy: currentUser.uid,
        updatedAt: new Date().toISOString()
      };

      console.log('Submitting booking data:', bookingData);
      const bookingRef = await addDoc(collection(db, 'activity_bookings'), bookingData);
      console.log('Booking submitted successfully!', bookingRef.id);

      // Create notification for admin
      try {
        await addDoc(collection(db, 'notifications'), {
          title: 'New Activity Booking Request',
          message: `${bookingForm.teacherName} from ${bookingForm.department} has requested to book ${bookingForm.resource} for ${bookingForm.activity} on ${new Date(bookingForm.date).toLocaleDateString()} at ${bookingForm.time}.`,
          type: 'activity_booking',
          senderId: currentUser.uid,
          senderName: bookingForm.teacherName,
          senderRole: 'Teacher',
          recipientRole: 'Admin',
          bookingId: bookingRef.id,
          status: 'pending',
          read: false,
          createdAt: new Date().toISOString(),
          priority: 'medium'
        });
        console.log('Notification created for admin');
      } catch (notificationError) {
        console.error('Error creating notification:', notificationError);
        // Don't fail the booking if notification fails
      }
      
      setSnackbar({
        open: true,
        message: 'Booking request submitted successfully!',
        severity: 'success'
      });
      
      setBookingDialogOpen(false);
      setBookingForm({
        teacherName: userProfile?.fullName || userProfile?.name || '',
        department: userProfile?.department || '',
        activity: '',
        resource: '',
        date: '',
        time: '',
        notes: ''
      });
      setConflictCheck(null);
    } catch (error) {
      console.error('Error submitting booking:', error);
      setSnackbar({
        open: true,
        message: 'Error submitting booking request',
        severity: 'error'
      });
    }
  };

  const handleDeleteBooking = (booking) => {
    setBookingToDelete(booking);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteBooking = async () => {
    try {
      await deleteDoc(doc(db, 'activity_bookings', bookingToDelete.id));
      
      setSnackbar({
        open: true,
        message: 'Booking request deleted successfully!',
        severity: 'success'
      });
      
      setDeleteDialogOpen(false);
      setBookingToDelete(null);
    } catch (error) {
      console.error('Error deleting booking:', error);
      setSnackbar({
        open: true,
        message: 'Error deleting booking request',
        severity: 'error'
      });
    }
  };

  const cancelDeleteBooking = () => {
    setDeleteDialogOpen(false);
    setBookingToDelete(null);
  };

  const handleRefreshBookings = async () => {
    setRefreshing(true);
    try {
      // Force a refresh by re-querying the bookings
      const bookingsQuery = query(
        collection(db, 'activity_bookings'),
        orderBy('date', 'asc')
      );
      
      const snapshot = await getDocs(bookingsQuery);
      const bookingsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setBookings(bookingsData);
      setSnackbar({
        open: true,
        message: 'Bookings refreshed successfully!',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error refreshing bookings:', error);
      setSnackbar({
        open: true,
        message: 'Error refreshing bookings',
        severity: 'error'
      });
    } finally {
      setRefreshing(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Warning />;
      case 'approved': return <CheckCircle />;
      case 'rejected': return <Cancel />;
      default: return <Event />;
    }
  };

  const filteredBookings = bookings.filter(booking => {
    const resourceMatch = !filterResource || booking.resource === filterResource;
    const departmentMatch = !filterDepartment || booking.department === filterDepartment;
    return resourceMatch && departmentMatch;
  });

  const myBookings = filteredBookings.filter(booking => booking.teacherId === currentUser?.uid);

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const getBookingTooltip = (date) => {
    if (isPastDate(date)) {
      return 'Past date - Cannot book';
    }
    
    const dateStatus = getDateStatus(date);
    if (dateStatus === 'available') {
      return 'Available - Click to book';
    }
    
    if (dateStatus === 'booked') {
      const dateBookings = getBookingsForDate(date);
      return `Booked - ${dateBookings.map(booking => 
        `${booking.activity} - ${booking.department} (${booking.time})`
      ).join(', ')} - Click to book anyway`;
    }
    
    return 'Click to book';
  };

  return (
    <Box sx={{ p: 3, bgcolor: '#f5f6fa', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#800000' }}>
          Activity Scheduler
        </Typography>
        <Button
          variant="outlined"
          startIcon={<FilterList />}
          onClick={handleRefreshBookings}
          disabled={refreshing}
          sx={{
            borderColor: '#800000',
            color: '#800000',
            '&:hover': {
              borderColor: '#6b0000',
              backgroundColor: 'rgba(128, 0, 0, 0.04)'
            }
          }}
        >
          {refreshing ? 'Refreshing...' : 'Refresh Bookings'}
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Calendar Section */}
        <Grid item xs={12} lg={8}>
          <Card sx={{ 
            mb: 3,
            bgcolor: '#D1D3D4',
            '&:hover': {
              bgcolor: '#D1D3D4'
            }
          }}>
            <CardContent>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                mb: 2,
                bgcolor: '#660B05',
                p: 2,
                borderRadius: 1
              }}>
                <Typography 
                  variant="h5" 
                  sx={{ 
                    color: '#ffffff',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    fontSize: '20px'
                  }}
                >
                  {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </Typography>
                <Box>
                  <IconButton onClick={() => navigateMonth(-1)}>
                    <Typography variant="h6">‹</Typography>
                  </IconButton>
                  <IconButton onClick={() => navigateMonth(1)}>
                    <Typography variant="h6">›</Typography>
                  </IconButton>
                </Box>
              </Box>

              {/* Clean Calendar Grid */}
              <Box
                sx={{
                  border: '1px solid #e0e0e0',
                  borderTop: '1px solid #e0e0e0',
                  borderLeft: '1px solid #e0e0e0',
                  backgroundColor: 'white'
                }}
              >
                {/* Day Headers Row */}
                <Box sx={{ display: 'flex' }}>
                  {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
                    <Box
                      key={day}
                      sx={{
                        flex: 1,
                        borderRight: '1px solid #e0e0e0',
                        borderBottom: '1px solid #e0e0e0',
                        minHeight: 40,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#fafafa'
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 500,
                          color: '#333',
                          fontSize: '12px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}
                      >
                        {day}
                      </Typography>
                    </Box>
                  ))}
                </Box>

                {/* Calendar Days Grid */}
                <Box>
                  {Array.from({ length: 6 }, (_, weekIndex) => (
                    <Box key={weekIndex} sx={{ display: 'flex' }}>
                      {Array.from({ length: 7 }, (_, dayIndex) => {
                        const cellIndex = weekIndex * 7 + dayIndex;
                        const date = getDaysInMonth(currentDate)[cellIndex];
                        
                        return (
                          <Box
                            key={dayIndex}
                            sx={{
                              flex: 1,
                              minHeight: 50,
                              borderRight: '1px solid #e0e0e0',
                              borderBottom: '1px solid #e0e0e0',
                              position: 'relative',
                              display: 'flex',
                              alignItems: 'flex-start',
                              justifyContent: 'flex-start',
                              padding: '8px',
                              cursor: date && !isPastDate(date) ? 'pointer' : 'default',
                              backgroundColor: date ? (getDateStatus(date) === 'available' ? '#f8fff8' : getDateStatus(date) === 'booked' ? '#ffeaea' : 'white') : 'transparent',
                              '&:hover': {
                                backgroundColor: date && !isPastDate(date) ? '#f5f5f5' : 'transparent'
                              }
                            }}
                            onClick={() => date && handleDateClick(date)}
                          >
                            {date && (
                              <Tooltip title={getBookingTooltip(date)} arrow>
                                <Box sx={{ position: 'relative', width: '100%' }}>
                                  {/* Date Number */}
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      color: isPastDate(date) ? '#999' : '#333',
                                      fontWeight: 400,
                                      fontSize: '14px',
                                      lineHeight: 1
                                    }}
                                  >
                                    {date.getDate()}
                                  </Typography>
                                  
                                  {/* Status Dot */}
                                  {getStatusDotColor(date) !== 'transparent' && (
                                    <Box
                                      sx={{
                                        position: 'absolute',
                                        top: 2,
                                        right: 2,
                                        width: 6,
                                        height: 6,
                                        borderRadius: '50%',
                                        backgroundColor: getStatusDotColor(date)
                                      }}
                                    />
                                  )}
                                </Box>
                              </Tooltip>
                            )}
                          </Box>
                        );
                      })}
                    </Box>
                  ))}
                </Box>
              </Box>

              {/* Legend */}
              <Box sx={{ display: 'flex', gap: 3, mt: 3, justifyContent: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 6, height: 6, backgroundColor: '#4caf50', borderRadius: '50%' }} />
                  <Typography variant="caption" sx={{ color: '#666', fontSize: '11px' }}>Available</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 6, height: 6, backgroundColor: '#f44336', borderRadius: '50%' }} />
                  <Typography variant="caption" sx={{ color: '#666', fontSize: '11px' }}>Booked</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 6, height: 6, backgroundColor: '#9e9e9e', borderRadius: '50%' }} />
                  <Typography variant="caption" sx={{ color: '#666', fontSize: '11px' }}>Past Date</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Stats */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" color="black" gutterBottom>
                My Bookings
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Pending:</Typography>
                  <Chip 
                    label={myBookings.filter(b => b.status === 'pending').length} 
                    color="warning" 
                    size="small" 
                  />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Approved:</Typography>
                  <Chip 
                    label={myBookings.filter(b => b.status === 'approved').length} 
                    color="success" 
                    size="small" 
                  />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Rejected:</Typography>
                  <Chip 
                    label={myBookings.filter(b => b.status === 'rejected').length} 
                    color="error" 
                    size="small" 
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Filters */}
          <Card sx={{ 
            bgcolor: '#DCDCDC',
            '&:hover': {
              bgcolor: '#DCDCDC'
            }
          }}>
            <CardContent>
              <Typography variant="h6" sx={{ 
                color: 'black' 
              }} gutterBottom>
                <FilterList sx={{ mr: 1, verticalAlign: 'middle' }} />
                Filters
              </Typography>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel sx={{ color: 'black' }}>Resource</InputLabel>
                <Select
                  value={filterResource}
                  onChange={(e) => setFilterResource(e.target.value)}
                  label="Resource"
                  sx={{ color: 'black' }}
                >
                  <MenuItem value="">All Resources</MenuItem>
                  {resources.map(resource => (
                    <MenuItem key={resource} value={resource}>{resource}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel sx={{ color: 'black' }}>Department</InputLabel>
                <Select
                  value={filterDepartment}
                  onChange={(e) => setFilterDepartment(e.target.value)}
                  label="Department"
                  sx={{ color: 'black' }}
                >
                  <MenuItem value="">All Departments</MenuItem>
                  {departments.map(department => (
                    <MenuItem key={department} value={department}>{department}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* My Bookings Table */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" color="black" gutterBottom>
            My Booking Requests
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Activity</TableCell>
                  <TableCell>Resource</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Time</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Notes</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {myBookings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      No booking requests found
                    </TableCell>
                  </TableRow>
                ) : (
                  myBookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell>{booking.activity}</TableCell>
                      <TableCell>{booking.resource}</TableCell>
                      <TableCell>{new Date(booking.date).toLocaleDateString()}</TableCell>
                      <TableCell>{booking.time}</TableCell>
                      <TableCell>
                        <Chip
                          icon={getStatusIcon(booking.status)}
                          label={booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                          color={getStatusColor(booking.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{booking.notes || '-'}</TableCell>
                      <TableCell>
                        {booking.status === 'pending' && (
                          <Tooltip title="Delete booking request">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteBooking(booking)}
                            >
                              <Delete />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Booking Dialog */}
      <Dialog open={bookingDialogOpen} onClose={() => setBookingDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <CalendarToday sx={{ mr: 1, verticalAlign: 'middle' }} />
          Book Facility
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Teacher Name"
                value={bookingForm.teacherName}
                onChange={(e) => handleFormChange('teacherName', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Department</InputLabel>
                <Select
                  value={bookingForm.department}
                  onChange={(e) => handleFormChange('department', e.target.value)}
                  label="Department"
                >
                  {departments.map(dept => (
                    <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Activity/Event"
                value={bookingForm.activity}
                onChange={(e) => handleFormChange('activity', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Resource/Place</InputLabel>
                <Select
                  value={bookingForm.resource}
                  onChange={(e) => handleFormChange('resource', e.target.value)}
                  label="Resource/Place"
                >
                  {resources.map(resource => (
                    <MenuItem key={resource} value={resource}>{resource}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Time</InputLabel>
                <Select
                  value={bookingForm.time}
                  onChange={(e) => handleFormChange('time', e.target.value)}
                  label="Time"
                >
                  {timeSlots.map(time => (
                    <MenuItem key={time} value={time}>{time}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={3}
                value={bookingForm.notes}
                onChange={(e) => handleFormChange('notes', e.target.value)}
                placeholder="Additional details about your booking..."
              />
            </Grid>
          </Grid>

        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBookingDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSubmitBooking}
            variant="contained"
            disabled={!bookingForm.teacherName || !bookingForm.department || 
                     !bookingForm.activity || !bookingForm.resource || 
                     !bookingForm.date || !bookingForm.time}
          >
            Submit Request
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={cancelDeleteBooking} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Warning sx={{ mr: 1, verticalAlign: 'middle', color: 'error.main' }} />
          Delete Booking Request
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mt: 1 }}>
            Are you sure you want to delete this booking request?
          </Typography>
          {bookingToDelete && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Booking Details:
              </Typography>
              <Typography variant="body2">
                <strong>Activity:</strong> {bookingToDelete.activity}
              </Typography>
              <Typography variant="body2">
                <strong>Resource:</strong> {bookingToDelete.resource}
              </Typography>
              <Typography variant="body2">
                <strong>Date:</strong> {new Date(bookingToDelete.date).toLocaleDateString()}
              </Typography>
              <Typography variant="body2">
                <strong>Time:</strong> {bookingToDelete.time}
              </Typography>
            </Box>
          )}
          <Alert severity="warning" sx={{ mt: 2 }}>
            This action cannot be undone. The booking request will be permanently deleted.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDeleteBooking}>Cancel</Button>
          <Button
            onClick={confirmDeleteBooking}
            variant="contained"
            color="error"
          >
            Delete Booking
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
