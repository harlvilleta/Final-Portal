import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  TextField,
  InputAdornment,
  Alert,
  Snackbar,
  useTheme,
  CircularProgress,
  Stack,
  Paper,
  Button
} from '@mui/material';
import { Search, Event, LocationOn, Schedule, Person } from '@mui/icons-material';
import { collection, query, where, getDocs, orderBy, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { db, auth } from '../firebase';

export default function StudentActivities() {
  const theme = useTheme();
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          // Fetch user profile to get course, year, and section
          // Use the user's UID as the document ID directly
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserProfile(userData);
            console.log('Student profile loaded:', userData);
          } else {
            console.log('User document not found for UID:', user.uid);
            setSnackbar({
              open: true,
              message: 'User profile not found. Please contact your administrator.',
              severity: 'error'
            });
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          setSnackbar({
            open: true,
            message: 'Error loading profile. Please refresh the page.',
            severity: 'error'
          });
        }
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!userProfile?.course || !userProfile?.year || !userProfile?.section) {
      console.log('Missing profile data:', {
        course: userProfile?.course,
        year: userProfile?.year,
        section: userProfile?.section,
        fullProfile: userProfile
      });
      
      // Show more specific error message
      if (!userProfile) {
        console.log('No user profile loaded at all');
      } else {
        console.log('Profile loaded but missing required fields:', {
          hasCourse: !!userProfile.course,
          hasYear: !!userProfile.year,
          hasSection: !!userProfile.section,
          profileKeys: Object.keys(userProfile)
        });
      }
      
      setLoading(false);
      return;
    }

    console.log('Loading activities for:', {
      course: userProfile.course,
      year: userProfile.year,
      section: userProfile.section
    });

    // First, let's try a simpler query to see if there are any activities at all
    const allActivitiesQuery = query(
      collection(db, 'activity_bookings'),
      orderBy('date', 'asc')
    );

    // Get all activities first to debug
    getDocs(allActivitiesQuery).then((snapshot) => {
      const allActivities = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log('All activities in database:', allActivities);
      console.log('Looking for activities matching:', {
        course: userProfile.course,
        year: userProfile.year,
        section: userProfile.section
      });
    });

    // Query activities that match the student's course, year, and section
    // First try the compound query, but if it fails, we'll use a fallback approach
    let activitiesQuery;
    try {
      activitiesQuery = query(
        collection(db, 'activity_bookings'),
        where('course', '==', userProfile.course),
        where('year', '==', userProfile.year),
        where('section', '==', userProfile.section),
        where('status', '==', 'approved'), // Only show approved activities
        orderBy('date', 'asc')
      );
    } catch (queryError) {
      console.log('Compound query failed, using fallback approach:', queryError);
      // Use a simpler query and filter in JavaScript
      activitiesQuery = query(
        collection(db, 'activity_bookings'),
        where('status', '==', 'approved'),
        orderBy('date', 'asc')
      );
    }

    const unsubscribe = onSnapshot(activitiesQuery, (snapshot) => {
      const allActivities = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('All approved activities from query:', allActivities);
      console.log('Student profile for filtering:', {
        course: userProfile.course,
        year: userProfile.year,
        section: userProfile.section
      });
      
      // Filter activities that match the student's course, year, and section
      const filteredActivities = allActivities.filter(activity => {
        // Use more flexible matching to handle case differences and data type differences
        const courseMatch = activity.course?.toLowerCase() === userProfile.course?.toLowerCase();
        const yearMatch = activity.year?.toString() === userProfile.year?.toString();
        const sectionMatch = activity.section?.toLowerCase() === userProfile.section?.toLowerCase();
        
        console.log(`Activity ${activity.id}:`, {
          activityCourse: activity.course,
          activityYear: activity.year,
          activitySection: activity.section,
          studentCourse: userProfile.course,
          studentYear: userProfile.year,
          studentSection: userProfile.section,
          courseMatch,
          yearMatch,
          sectionMatch,
          matches: courseMatch && yearMatch && sectionMatch
        });
        
        return courseMatch && yearMatch && sectionMatch;
      });
      
      console.log('Filtered activities for student:', filteredActivities);
      setActivities(filteredActivities);
      setLoading(false);
      console.log('Activities loaded for student:', filteredActivities.length);
    }, (error) => {
      console.error('Error loading activities:', error);
      console.error('Error details:', error.code, error.message);
      
      // If the query fails, try a simpler approach
      console.log('Trying fallback query...');
      const fallbackQuery = query(
        collection(db, 'activity_bookings'),
        where('status', '==', 'approved')
      );
      
      getDocs(fallbackQuery).then((snapshot) => {
        const allApprovedActivities = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        console.log('All approved activities from fallback:', allApprovedActivities);
        
        // Filter manually in JavaScript with more flexible matching
        const filteredActivities = allApprovedActivities.filter(activity => {
          const courseMatch = activity.course?.toLowerCase() === userProfile.course?.toLowerCase();
          const yearMatch = activity.year?.toString() === userProfile.year?.toString();
          const sectionMatch = activity.section?.toLowerCase() === userProfile.section?.toLowerCase();
          
          console.log(`Fallback Activity ${activity.id}:`, {
            activityCourse: activity.course,
            activityYear: activity.year,
            activitySection: activity.section,
            studentCourse: userProfile.course,
            studentYear: userProfile.year,
            studentSection: userProfile.section,
            courseMatch,
            yearMatch,
            sectionMatch,
            matches: courseMatch && yearMatch && sectionMatch
          });
          
          return courseMatch && yearMatch && sectionMatch;
        });
        
        console.log('Manually filtered activities from fallback:', filteredActivities);
        setActivities(filteredActivities);
        setLoading(false);
      }).catch(fallbackError => {
        console.error('Fallback query also failed:', fallbackError);
        setLoading(false);
        setSnackbar({
          open: true,
          message: 'Error loading activities. Please check your profile information.',
          severity: 'error'
        });
      });
    });

    return unsubscribe;
  }, [userProfile]);

  // Filter activities based on search
  const filteredActivities = activities.filter(activity => {
    const searchTerm = search.toLowerCase();
    return (
      activity.activity?.toLowerCase().includes(searchTerm) ||
      activity.resource?.toLowerCase().includes(searchTerm) ||
      activity.teacherName?.toLowerCase().includes(searchTerm) ||
      activity.notes?.toLowerCase().includes(searchTerm)
    );
  });

  const formatDate = (dateString) => {
    if (!dateString) return 'Date TBD';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const formatTime = (startTime, endTime) => {
    if (!startTime || !endTime) return 'Time TBD';
    return `${startTime} - ${endTime}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };


  if (!userProfile?.course || !userProfile?.year || !userProfile?.section) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Profile Information Required
          </Typography>
          <Typography sx={{ mb: 2 }}>
            Please ensure your profile has complete course, year, and section information to view activities.
            Contact your administrator if this information is missing.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            <strong>Current profile status:</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • Course: {userProfile?.course || 'Missing'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • Year: {userProfile?.year || 'Missing'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • Section: {userProfile?.section || 'Missing'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            <strong>Available profile fields:</strong> {userProfile ? Object.keys(userProfile).join(', ') : 'No profile loaded'}
          </Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600, color: 'primary.main' }}>
        My Activities
      </Typography>
      
      <Typography variant="subtitle1" sx={{ mb: 3, color: 'text.secondary' }}>
        Activities for {userProfile.course} - {userProfile.year} - Section {userProfile.section}
      </Typography>
      

      {/* Search Bar */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search activities..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          sx={{ maxWidth: 400 }}
        />
      </Box>

      {/* Activities Grid */}
      {filteredActivities.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Event sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
            {search ? 'No activities found matching your search' : 'No activities scheduled'}
          </Typography>
          <Typography color="text.secondary">
            {search 
              ? 'Try adjusting your search terms'
              : 'Activities will appear here when your teachers schedule them for your class'
            }
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {filteredActivities.map((activity) => (
            <Grid item xs={12} sm={6} md={4} key={activity.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1, p: 3 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
                      {activity.activity}
                    </Typography>
                    <Chip
                      label={activity.status}
                      color={getStatusColor(activity.status)}
                      size="small"
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </Stack>

                  <Stack spacing={2}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Person sx={{ fontSize: 20, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {activity.teacherName}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LocationOn sx={{ fontSize: 20, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {activity.resource}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Event sx={{ fontSize: 20, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(activity.date)}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Schedule sx={{ fontSize: 20, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {formatTime(activity.startTime, activity.endTime)}
                      </Typography>
                    </Box>

                    {activity.notes && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                          "{activity.notes}"
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
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
