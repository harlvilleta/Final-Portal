import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField
} from '@mui/material';
import {
  CalendarToday,
  Event,
  CheckCircle,
  Cancel,
  Warning,
  FilterList,
  Visibility,
  Edit
} from '@mui/icons-material';
import { auth, db } from '../firebase';
import { collection, getDocs, query, where, orderBy, onSnapshot, updateDoc, doc, addDoc } from 'firebase/firestore';

export default function AdminActivityScheduler() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterResource, setFilterResource] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');

  // Available resources and departments
  const resources = [
    'Auditorium', 'Gymnasium', 'Library', 'Computer Lab', 'Science Lab',
    'Art Room', 'Music Room', 'Conference Room', 'Cafeteria', 'Outdoor Field'
  ];

  const departments = [
    'Mathematics', 'Science', 'English', 'History', 'Physical Education',
    'Art', 'Music', 'Computer Science', 'Foreign Languages', 'Administration'
  ];

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const bookingsQuery = query(
      collection(db, 'activity_bookings'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(bookingsQuery, (snapshot) => {
      const bookingsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBookings(bookingsData);
    });

    return unsubscribe;
  }, []);

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
    
    return checkDate < today;
  };

  const getDateStatus = (date) => {
    if (!date) return 'empty';
    if (isPastDate(date)) return 'past';
    const dateBookings = getBookingsForDate(date);
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
    setSelectedDate(date);
  };

  const handleApproveBooking = async (bookingId, status) => {
    try {
      console.log(`Admin ${status} booking:`, { bookingId, status, adminNotes });
      
      // Update the booking status
      await updateDoc(doc(db, 'activity_bookings', bookingId), {
        status: status,
        adminNotes: adminNotes,
        reviewedBy: currentUser.uid,
        reviewDate: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      console.log(`✅ Booking ${status} successfully`);

      // Create notification for the teacher
      if (selectedBooking) {
        const notificationData = {
          title: `Booking Request ${status === 'approved' ? 'Approved' : 'Rejected'}`,
          message: `Your booking request for "${selectedBooking.activity}" on ${new Date(selectedBooking.date).toLocaleDateString()} at ${selectedBooking.time} has been ${status}.${adminNotes ? ` Admin notes: ${adminNotes}` : ''}`,
          type: 'booking_approval',
          recipientId: selectedBooking.teacherId,
          recipientEmail: selectedBooking.teacherEmail,
          read: false,
          createdAt: new Date().toISOString(),
          bookingId: bookingId,
          status: status,
          adminNotes: adminNotes || null
        };

        await addDoc(collection(db, 'notifications'), notificationData);
        console.log(`✅ Notification sent to teacher: ${selectedBooking.teacherEmail}`);
      }

      // Log the admin action
      try {
        await addDoc(collection(db, 'activity_log'), {
          message: `Admin ${status} booking request: ${selectedBooking?.activity} on ${selectedBooking?.date} at ${selectedBooking?.time}`,
          type: 'booking_approval',
          user: currentUser.uid,
          userEmail: currentUser.email,
          userRole: 'Admin',
          timestamp: new Date().toISOString(),
          details: {
            bookingId: bookingId,
            status: status,
            teacherEmail: selectedBooking?.teacherEmail,
            resource: selectedBooking?.resource,
            adminNotes: adminNotes || null
          }
        });
        console.log('✅ Activity logged');
      } catch (logError) {
        console.warn('⚠️ Failed to log activity:', logError);
      }

      let successMessage = `Booking ${status} successfully! Teacher has been notified.`;
      if (status === 'rejected') {
        successMessage += ' The time slot is now available for other teachers to book.';
      }

      setSnackbar({
        open: true,
        message: successMessage,
        severity: 'success'
      });

      setApprovalDialogOpen(false);
      setSelectedBooking(null);
      setAdminNotes('');
    } catch (error) {
      console.error('❌ Error updating booking:', error);
      setSnackbar({
        open: true,
        message: 'Error updating booking',
        severity: 'error'
      });
    }
  };

  const openApprovalDialog = (booking) => {
    setSelectedBooking(booking);
    setAdminNotes(booking.adminNotes || '');
    setApprovalDialogOpen(true);
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
    const statusMatch = !filterStatus || booking.status === filterStatus;
    const resourceMatch = !filterResource || booking.resource === filterResource;
    const departmentMatch = !filterDepartment || booking.department === filterDepartment;
    return statusMatch && resourceMatch && departmentMatch;
  });

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
    
    const dateBookings = getBookingsForDate(date);
    if (dateBookings.length === 0) return 'Available';
    
    return dateBookings.map(booking => 
      `${booking.activity} - ${booking.department} (${booking.time}) - ${booking.status}`
    ).join('\n');
  };

  const getBookingStats = () => {
    return {
      total: bookings.length,
      pending: bookings.filter(b => b.status === 'pending').length,
      approved: bookings.filter(b => b.status === 'approved').length,
      rejected: bookings.filter(b => b.status === 'rejected').length
    };
  };

  const stats = getBookingStats();

  return (
    <Box sx={{ p: 3, bgcolor: '#f5f6fa', minHeight: '100vh' }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: '#800000', mb: 3 }}>
        Activity Scheduler - Admin Panel
      </Typography>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="black">
                Total Bookings
              </Typography>
              <Typography variant="h4" color="primary">
                {stats.total}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="black">
                Pending
              </Typography>
              <Typography variant="h4" color="warning.main">
                {stats.pending}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="black">
                Approved
              </Typography>
              <Typography variant="h4" color="success.main">
                {stats.approved}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="black">
                Rejected
              </Typography>
              <Typography variant="h4" color="error.main">
                {stats.rejected}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Calendar Section */}
        <Grid item xs={12} lg={8}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography 
                  variant="h5" 
                  sx={{ 
                    color: '#333',
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
                              cursor: date ? 'pointer' : 'default',
                              backgroundColor: date ? 'white' : 'transparent',
                              '&:hover': {
                                backgroundColor: date ? '#f5f5f5' : 'transparent'
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

        {/* Filters */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="black" gutterBottom>
                <FilterList sx={{ mr: 1, verticalAlign: 'middle' }} />
                Filters
              </Typography>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  label="Status"
                >
                  <MenuItem value="">All Status</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="approved">Approved</MenuItem>
                  <MenuItem value="rejected">Rejected</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Resource</InputLabel>
                <Select
                  value={filterResource}
                  onChange={(e) => setFilterResource(e.target.value)}
                  label="Resource"
                >
                  <MenuItem value="">All Resources</MenuItem>
                  {resources.map(resource => (
                    <MenuItem key={resource} value={resource}>{resource}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Department</InputLabel>
                <Select
                  value={filterDepartment}
                  onChange={(e) => setFilterDepartment(e.target.value)}
                  label="Department"
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

      {/* Bookings Table */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" color="black" gutterBottom>
            All Booking Requests
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Teacher</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Activity</TableCell>
                  <TableCell>Resource</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Time</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredBookings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      No booking requests found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell>{booking.teacherName}</TableCell>
                      <TableCell>{booking.department}</TableCell>
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
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => openApprovalDialog(booking)}
                          color="primary"
                        >
                          <Edit />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Approval Dialog */}
      <Dialog open={approvalDialogOpen} onClose={() => setApprovalDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Event sx={{ mr: 1, verticalAlign: 'middle' }} />
          Review Booking Request
        </DialogTitle>
        <DialogContent>
          {selectedBooking && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Teacher Name</Typography>
                <Typography variant="body1">{selectedBooking.teacherName}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Department</Typography>
                <Typography variant="body1">{selectedBooking.department}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">Activity/Event</Typography>
                <Typography variant="body1">{selectedBooking.activity}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Resource/Place</Typography>
                <Typography variant="body1">{selectedBooking.resource}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Time</Typography>
                <Typography variant="body1">{selectedBooking.time}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">Date</Typography>
                <Typography variant="body1">{new Date(selectedBooking.date).toLocaleDateString()}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">Notes</Typography>
                <Typography variant="body1">{selectedBooking.notes || 'No additional notes'}</Typography>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Admin Notes"
                  multiline
                  rows={3}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add your review notes here..."
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApprovalDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={() => handleApproveBooking(selectedBooking.id, 'rejected')}
            color="error"
            variant="outlined"
          >
            Reject
          </Button>
          <Button
            onClick={() => handleApproveBooking(selectedBooking.id, 'approved')}
            color="success"
            variant="contained"
          >
            Approve
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
