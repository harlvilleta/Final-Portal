import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Button,
  Alert,
  Snackbar,
  IconButton,
  Tooltip,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Stack,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  InputAdornment
} from '@mui/material';
import {
  CalendarToday,
  Event,
  CheckCircle,
  Cancel,
  Warning,
  Search,
  Visibility
} from '@mui/icons-material';
import { auth, db } from '../firebase';
import { collection, getDocs, query, where, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore';

export default function AdminActivityScheduler() {
  const theme = useTheme();
  const [currentUser, setCurrentUser] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [viewBooking, setViewBooking] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [filteredModal, setFilteredModal] = useState({ open: false, filter: null, title: '' });
  const [searchTerm, setSearchTerm] = useState('');

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

  const handleApproveBooking = async (bookingId) => {
    setIsProcessing(true);
    try {
      await updateDoc(doc(db, 'activity_bookings', bookingId), {
        status: 'approved',
        reviewedBy: currentUser?.email || 'admin',
        reviewedAt: new Date().toISOString()
      });
      setSnackbar({ open: true, message: 'Booking approved successfully!', severity: 'success' });
      setViewBooking(null);
      // Reopen the filtered modal if it was open before
      if (filteredModal.filter) {
        setFilteredModal({ open: true, filter: filteredModal.filter, title: filteredModal.title });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Error approving booking', severity: 'error' });
    }
    setIsProcessing(false);
  };

  const handleRejectBooking = async (bookingId) => {
    setIsProcessing(true);
    try {
      await updateDoc(doc(db, 'activity_bookings', bookingId), {
        status: 'rejected',
        reviewedBy: currentUser?.email || 'admin',
        reviewedAt: new Date().toISOString()
      });
      setSnackbar({ open: true, message: 'Booking rejected', severity: 'info' });
      setViewBooking(null);
      // Reopen the filtered modal if it was open before
      if (filteredModal.filter) {
        setFilteredModal({ open: true, filter: filteredModal.filter, title: filteredModal.title });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Error rejecting booking', severity: 'error' });
    }
    setIsProcessing(false);
  };

  const handleStatsCardClick = (filter) => {
    let title = '';
    switch (filter) {
      case 'all':
        title = 'All Booking Requests';
        break;
      case 'pending':
        title = 'Pending Booking Requests';
        break;
      case 'approved':
        title = 'Approved Booking Requests';
        break;
      case 'rejected':
        title = 'Rejected Booking Requests';
        break;
      default:
        title = 'Booking Requests';
    }
    setSearchTerm(''); // Reset search when opening modal
    setFilteredModal({ open: true, filter, title });
  };

  const getFilteredBookings = () => {
    if (!filteredModal.filter) return [];
    
    let filtered = [];
    switch (filteredModal.filter) {
      case 'all':
        filtered = bookings;
        break;
      case 'pending':
        filtered = bookings.filter(b => b.status === 'pending');
        break;
      case 'approved':
        filtered = bookings.filter(b => b.status === 'approved');
        break;
      case 'rejected':
        filtered = bookings.filter(b => b.status === 'rejected');
        break;
      default:
        filtered = bookings;
    }

    // Apply search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(booking =>
        booking.activity?.toLowerCase().includes(search) ||
        booking.teacherName?.toLowerCase().includes(search) ||
        booking.department?.toLowerCase().includes(search) ||
        booking.resource?.toLowerCase().includes(search) ||
        booking.description?.toLowerCase().includes(search)
      );
    }

    return filtered;
  };


  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning'; // Orange
      case 'approved': return 'success'; // Green
      case 'rejected': return 'error'; // Red
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

  const filteredBookings = bookings;

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
    <Box sx={{ p: 3, bgcolor: 'background.default', minHeight: '100vh' }}>
      <Paper sx={{ 
        p: 2, 
        mb: 3, 
        bgcolor: theme.palette.mode === 'dark' ? '#2d2d2d' : '#f5f6fa',
        borderRadius: 2
      }}>
        <Typography variant="h4" gutterBottom sx={{ 
          fontWeight: 700, 
          color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000', 
          mb: 0 
        }}>
          Activity Scheduler - Admin Panel
        </Typography>
      </Paper>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper 
            onClick={() => handleStatsCardClick('all')}
            sx={{ 
            p: 2, 
            textAlign: 'center', 
            bgcolor: '#ffffff',
            border: '1px solid #e0e0e0',
            borderLeft: '4px solid #800000',
            borderRadius: 2,
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            transition: 'box-shadow 0.2s',
            cursor: 'pointer',
            '&:hover': {
              boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
            },
          }}>
              <Typography variant="h4" sx={{ 
              color: '#000000', 
              fontWeight: 'bold' 
              }}>
                {stats.total}
              </Typography>
            <Typography variant="body2" sx={{ 
              color: theme.palette.mode === 'dark' ? '#ffffff' : 'text.secondary' 
            }}>
              Total Bookings
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper 
            onClick={() => handleStatsCardClick('pending')}
            sx={{ 
            p: 2, 
            textAlign: 'center', 
            bgcolor: '#ffffff',
            border: '1px solid #e0e0e0',
            borderLeft: '4px solid #800000',
            borderRadius: 2,
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            transition: 'box-shadow 0.2s',
            cursor: 'pointer',
            '&:hover': {
              boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
            },
          }}>
              <Typography variant="h4" sx={{ 
              color: '#000000', 
              fontWeight: 'bold' 
              }}>
                {stats.pending}
              </Typography>
            <Typography variant="body2" sx={{ 
              color: theme.palette.mode === 'dark' ? '#ffffff' : 'text.secondary' 
            }}>
              Pending Requests
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper 
            onClick={() => handleStatsCardClick('approved')}
            sx={{ 
            p: 2, 
            textAlign: 'center', 
            bgcolor: '#ffffff',
            border: '1px solid #e0e0e0',
            borderLeft: '4px solid #800000',
            borderRadius: 2,
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            transition: 'box-shadow 0.2s',
            cursor: 'pointer',
            '&:hover': {
              boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
            },
          }}>
              <Typography variant="h4" sx={{ 
              color: '#000000', 
              fontWeight: 'bold' 
              }}>
                {stats.approved}
              </Typography>
            <Typography variant="body2" sx={{ 
              color: theme.palette.mode === 'dark' ? '#ffffff' : 'text.secondary' 
            }}>
              Approved Requests
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper 
            onClick={() => handleStatsCardClick('rejected')}
            sx={{ 
            p: 2, 
            textAlign: 'center', 
            bgcolor: '#ffffff',
            border: '1px solid #e0e0e0',
            borderLeft: '4px solid #800000',
            borderRadius: 2,
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            transition: 'box-shadow 0.2s',
            cursor: 'pointer',
            '&:hover': {
              boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
            },
          }}>
              <Typography variant="h4" sx={{ 
              color: '#000000', 
              fontWeight: 'bold' 
              }}>
                {stats.rejected}
              </Typography>
            <Typography variant="body2" sx={{ 
              color: theme.palette.mode === 'dark' ? '#ffffff' : 'text.secondary' 
            }}>
              Rejected Requests
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Calendar Section */}
        <Grid item xs={12}>
          <Paper sx={{ 
            mb: 3,
            p: 2,
            bgcolor: theme.palette.mode === 'dark' ? '#2d2d2d' : '#f8f9fa', 
            border: theme.palette.mode === 'dark' ? '1px solid #404040' : '1px solid #e9ecef',
            borderLeft: '4px solid #800000',
            transition: 'all 0.2s',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: 4,
            },
          }}>
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
          </Paper>
        </Grid>

        {/* Activity Bookings Cards Section */}
        <Grid item xs={12}>
          <Paper sx={{ 
            p: 3,
            bgcolor: theme.palette.mode === 'dark' ? '#2d2d2d' : '#f8f9fa', 
            border: theme.palette.mode === 'dark' ? '1px solid #404040' : '1px solid #e9ecef',
            borderLeft: '4px solid #800000',
            transition: 'all 0.2s',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: 4,
            },
          }}>
            <Typography variant="h5" gutterBottom sx={{ 
              fontWeight: 700, 
              color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000',
              mb: 3
            }}>
              📋 Activity Booking Requests
            </Typography>
            
            {bookings.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="h6" color="text.secondary">
                  No booking requests found
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={2}>
                {bookings.map((booking) => (
                  <Grid item xs={12} sm={6} md={4} key={booking.id}>
                    <Card 
                      sx={{ 
                        height: '100%',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease-in-out',
                        borderLeft: '4px solid #9e9e9e',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: 6,
                          borderLeft: '4px solid #757575'
                        }
                      }}
                      onClick={() => setViewBooking(booking)}
                    >
                      <CardHeader
                        title={
                          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                            <Typography 
                              fontWeight={700} 
                              sx={{ fontSize: '1.1rem' }}
                              className="card-title"
                            >
                              {booking.activity}
                            </Typography>
                          </Stack>
                        }
                        subheader={
                          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                            <Chip 
                              label={booking.department || 'General'} 
                              color="primary" 
                              size="small" 
                              variant="outlined"
                            />
                            <Chip 
                              label={booking.status.charAt(0).toUpperCase() + booking.status.slice(1)} 
                              color={getStatusColor(booking.status)} 
                              size="small" 
                              icon={getStatusIcon(booking.status)}
                            />
                          </Stack>
                        }
                      />
                      <CardContent sx={{ pt: 0 }}>
                        <Typography 
                          variant="body2" 
                          color="text.secondary" 
                          sx={{ 
                            mb: 2,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}
                        >
                          {booking.description || 'No description provided'}
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap">
                          <Chip 
                            label={`🏢 ${booking.resource}`} 
                            size="small" 
                            variant="outlined" 
                            sx={{ fontSize: '0.75rem' }}
                          />
                          <Chip 
                            label={`👤 ${booking.teacherName || 'Unknown'}`} 
                            size="small" 
                            variant="outlined"
                            sx={{ fontSize: '0.75rem' }}
                          />
                        </Stack>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography 
                            variant="caption" 
                            color="text.secondary" 
                            sx={{ 
                              fontWeight: 500,
                              flexGrow: 1
                            }}
                          >
                            📅 {booking.date ? new Date(booking.date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric'
                            }) : 'Date TBD'}
                          </Typography>
                          <Typography 
                            variant="caption" 
                            color="text.secondary" 
                            sx={{ fontWeight: 500 }}
                          >
                            🕐 {booking.startTime && booking.endTime 
                              ? `${booking.startTime} - ${booking.endTime}`
                              : booking.time || 'Time TBD'
                            }
                          </Typography>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Paper>
        </Grid>

      </Grid>



      {/* Filtered Records Modal */}
      <Dialog open={filteredModal.open} onClose={() => setFilteredModal({ open: false, filter: null, title: '' })} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Typography variant="h5" fontWeight={700}>{filteredModal.title}</Typography>
            <Chip 
              label={`${getFilteredBookings().length} records`} 
              color="primary" 
              size="small" 
            />
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {/* Search Bar */}
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              placeholder="Search bookings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderLeft: '4px solid #800000',
                  '&:hover': {
                    borderLeft: '4px solid #a00000',
                  }
                }
              }}
            />
          </Box>

          {getFilteredBookings().length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" color="text.secondary">
                {searchTerm ? 'No matching records found' : `No ${filteredModal.filter} booking requests found`}
              </Typography>
            </Box>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell sx={{ fontWeight: 700 }}>Activity</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Teacher</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Department</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Resource</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Time</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {getFilteredBookings().map((booking) => (
                    <TableRow 
                      key={booking.id}
                      sx={{ 
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        setViewBooking(booking);
                        setFilteredModal({ open: false, filter: null, title: '' });
                      }}
                    >
                      <TableCell sx={{ fontWeight: 500 }}>
                        {booking.activity}
                      </TableCell>
                      <TableCell>{booking.teacherName || 'Unknown'}</TableCell>
                      <TableCell>
                        <Chip 
                          label={booking.department || 'General'} 
                          color="primary" 
                          size="small" 
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{booking.resource}</TableCell>
                      <TableCell>
                        {booking.date ? new Date(booking.date).toLocaleDateString() : 'TBD'}
                      </TableCell>
                      <TableCell>
                        {booking.startTime && booking.endTime 
                          ? `${booking.startTime} - ${booking.endTime}`
                          : booking.time || 'TBD'
                        }
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={getStatusIcon(booking.status)}
                          label={booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                          color={getStatusColor(booking.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Tooltip title="View details">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewBooking(booking);
                              setFilteredModal({ open: false, filter: null, title: '' });
                            }}
                          >
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={() => setFilteredModal({ open: false, filter: null, title: '' })} 
            variant="outlined"
            size="large"
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Booking Details Modal */}
      <Dialog open={!!viewBooking} onClose={() => setViewBooking(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Typography variant="h5" fontWeight={700}>{viewBooking?.activity}</Typography>
            <Chip 
              label={viewBooking?.department || 'General'} 
              color="primary" 
              size="small" 
            />
            <Chip 
              label={viewBooking?.status.charAt(0).toUpperCase() + viewBooking?.status.slice(1)} 
              color={getStatusColor(viewBooking?.status)} 
              size="small" 
              icon={getStatusIcon(viewBooking?.status)}
            />
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {viewBooking && (
            <Box>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        📅 Date & Time
                      </Typography>
                      <Typography variant="body1" fontWeight={500}>
                        {viewBooking.date ? new Date(viewBooking.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        }) : 'Not specified'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {viewBooking.startTime && viewBooking.endTime 
                          ? `${viewBooking.startTime} - ${viewBooking.endTime}`
                          : viewBooking.time || 'Time not specified'
                        }
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        👤 Requested By
                      </Typography>
                      <Typography variant="body1" fontWeight={500}>
                        {viewBooking.teacherName || 'Unknown Teacher'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {viewBooking.teacherEmail || 'Email not provided'}
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        🏢 Resource/Location
                      </Typography>
                      <Typography variant="body1" fontWeight={500}>
                        {viewBooking.resource || 'Not specified'}
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        🏷️ Department
                      </Typography>
                      <Typography variant="body1" fontWeight={500}>
                        {viewBooking.department || 'General'}
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        📊 Status
                      </Typography>
                      <Chip 
                        label={viewBooking.status.charAt(0).toUpperCase() + viewBooking.status.slice(1)} 
                        color={getStatusColor(viewBooking.status)} 
                        size="small"
                        icon={getStatusIcon(viewBooking.status)}
                      />
                    </Box>
                    
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        📝 Request Details
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Requested on: {viewBooking.createdAt ? new Date(viewBooking.createdAt).toLocaleDateString() : 'Unknown'}
                      </Typography>
                      {viewBooking.reviewedBy && (
                        <Typography variant="body2" color="text.secondary">
                          Reviewed by: {viewBooking.reviewedBy}
                        </Typography>
                      )}
                      {viewBooking.reviewedAt && (
                        <Typography variant="body2" color="text.secondary">
                          Reviewed on: {new Date(viewBooking.reviewedAt).toLocaleDateString()}
                        </Typography>
                      )}
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
                        {viewBooking.description || 'No description provided'}
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
            onClick={() => {
              setViewBooking(null);
              // Reopen the filtered modal if it was open before
              if (filteredModal.filter) {
                setFilteredModal({ open: true, filter: filteredModal.filter, title: filteredModal.title });
              }
            }} 
            variant="outlined"
            size="large"
          >
            Close
          </Button>
          {viewBooking?.status === 'pending' && (
            <>
              <Button 
                onClick={() => handleRejectBooking(viewBooking.id)}
                variant="contained" 
                color="error"
                size="large"
                disabled={isProcessing}
                startIcon={<Cancel />}
              >
                {isProcessing ? 'Processing...' : 'Reject'}
              </Button>
              <Button 
                onClick={() => handleApproveBooking(viewBooking.id)}
                variant="contained" 
                color="success"
                size="large"
                disabled={isProcessing}
                startIcon={<CheckCircle />}
              >
                {isProcessing ? 'Processing...' : 'Approve'}
              </Button>
            </>
          )}
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
