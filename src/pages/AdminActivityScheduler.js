import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Alert,
  Snackbar,
  IconButton,
  Tooltip,
  useTheme
} from '@mui/material';
import {
  CalendarToday,
  Event,
  CheckCircle,
  Cancel,
  Warning
} from '@mui/icons-material';
import { auth, db } from '../firebase';
import { collection, getDocs, query, where, orderBy, onSnapshot } from 'firebase/firestore';

export default function AdminActivityScheduler() {
  const theme = useTheme();
  const [currentUser, setCurrentUser] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

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
            onClick={() => console.log('Total Bookings clicked')}
            sx={{ 
            p: 2, 
            textAlign: 'center', 
            bgcolor: theme.palette.mode === 'dark' ? '#2d2d2d' : '#f8f9fa', 
            border: theme.palette.mode === 'dark' ? '1px solid #404040' : '1px solid #e9ecef',
            borderLeft: '4px solid #800000',
            cursor: 'pointer',
            transition: 'all 0.2s',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: 4,
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
            onClick={() => console.log('Pending Requests clicked')}
            sx={{ 
            p: 2, 
            textAlign: 'center', 
            bgcolor: theme.palette.mode === 'dark' ? '#2d2d2d' : '#f8f9fa', 
            border: theme.palette.mode === 'dark' ? '1px solid #404040' : '1px solid #e9ecef',
            borderLeft: '4px solid #800000',
            cursor: 'pointer',
            transition: 'all 0.2s',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: 4,
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
            onClick={() => console.log('Approved Requests clicked')}
            sx={{ 
            p: 2, 
            textAlign: 'center', 
            bgcolor: theme.palette.mode === 'dark' ? '#2d2d2d' : '#f8f9fa', 
            border: theme.palette.mode === 'dark' ? '1px solid #404040' : '1px solid #e9ecef',
            borderLeft: '4px solid #800000',
            cursor: 'pointer',
            transition: 'all 0.2s',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: 4,
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
            onClick={() => console.log('Rejected Requests clicked')}
            sx={{ 
            p: 2, 
            textAlign: 'center', 
            bgcolor: theme.palette.mode === 'dark' ? '#2d2d2d' : '#f8f9fa', 
            border: theme.palette.mode === 'dark' ? '1px solid #404040' : '1px solid #e9ecef',
            borderLeft: '4px solid #800000',
            cursor: 'pointer',
            transition: 'all 0.2s',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: 4,
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

      </Grid>



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
