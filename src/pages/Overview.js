import React, { useState, useEffect } from "react";
import { 
  Typography, Box, Grid, Card, CardContent, Paper, CircularProgress, List, ListItem, ListItemText, 
  Divider, Button, Stack, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Snackbar, Alert,
  TableContainer, Table, TableHead, TableBody, TableRow, TableCell, Avatar, Chip, IconButton, Tooltip,
  useTheme
} from "@mui/material";
import { useTheme as useCustomTheme } from "../contexts/ThemeContext";
import PeopleIcon from '@mui/icons-material/People';
import ReportIcon from '@mui/icons-material/Report';
import EventIcon from '@mui/icons-material/Event';
import CampaignIcon from '@mui/icons-material/Campaign';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { collection, getDocs, query, where, orderBy, limit, addDoc, deleteDoc, doc, getDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { db, auth } from "../firebase";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useNavigate, Link } from "react-router-dom";

export default function Overview() {
  const theme = useTheme();
  const { isDark } = useCustomTheme();
  const [stats, setStats] = useState({
    students: 0,
    violations: 0,
    activities: 0,
    announcements: 0
  });
  const [monthlyData, setMonthlyData] = useState({
    students: [
      { month: 'Jul', count: 5 },
      { month: 'Aug', count: 8 },
      { month: 'Sep', count: 12 },
      { month: 'Oct', count: 15 },
      { month: 'Nov', count: 10 },
      { month: 'Dec', count: 7 }
    ],
    violations: [
      { month: 'Jul', count: 2 },
      { month: 'Aug', count: 4 },
      { month: 'Sep', count: 3 },
      { month: 'Oct', count: 6 },
      { month: 'Nov', count: 5 },
      { month: 'Dec', count: 3 }
    ]
  });
  const [loading, setLoading] = useState(false);
  const [recentActivity, setRecentActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [openEventModal, setOpenEventModal] = useState(false);
  const [eventForm, setEventForm] = useState({ title: '', description: '', proposedBy: '', date: '', time: '', location: '' });
  const [eventSubmitting, setEventSubmitting] = useState(false);
  const [eventSnackbar, setEventSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch data in parallel for better performance
    Promise.all([
      fetchOverviewData(),
      fetchRecentActivity()
    ]);
    
    // Get current user and their profile
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      
      if (user) {
        try {
          // Fetch user profile from Firestore
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setUserProfile(userDoc.data());
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      }
    });
    return unsubscribe;
  }, []);


  const fetchOverviewData = async () => {
    try {
      setLoading(true);
      
      // Use Promise.all to fetch all data in parallel for better performance
      const [studentsSnapshot, usersSnapshot, violationsSnapshot, activitiesSnapshot, announcementsSnapshot] = await Promise.allSettled([
        getDocs(collection(db, "students")),
        getDocs(query(collection(db, "users"), where("role", "==", "Student"))),
        getDocs(collection(db, "violations")),
        getDocs(collection(db, "activities")).catch(() => ({ size: 0 })),
        getDocs(collection(db, "announcements")).catch(() => ({ size: 0 }))
      ]);

      const studentsCount = (studentsSnapshot.status === 'fulfilled' ? studentsSnapshot.value.size : 0) + 
                           (usersSnapshot.status === 'fulfilled' ? usersSnapshot.value.size : 0);
      const violationsCount = violationsSnapshot.status === 'fulfilled' ? violationsSnapshot.value.size : 0;
      const activitiesCount = activitiesSnapshot.status === 'fulfilled' ? activitiesSnapshot.value.size : 0;
      const announcementsCount = announcementsSnapshot.status === 'fulfilled' ? announcementsSnapshot.value.size : 0;

      setStats({
        students: studentsCount,
        violations: violationsCount,
        activities: activitiesCount,
        announcements: announcementsCount
      });

      // Generate monthly data in parallel for better performance
      const [monthlyStudents, monthlyViolations] = await Promise.all([
        generateMonthlyData("students", "createdAt"),
        generateMonthlyData("violations", "createdAt")
      ]);

      setMonthlyData({
        students: monthlyStudents,
        violations: monthlyViolations
      });
      
      console.log('Updated monthly data:', {
        students: monthlyStudents,
        violations: monthlyViolations
      });

    } catch (error) {
      console.error("Error fetching overview data:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateMonthlyData = async (collectionName, dateField) => {
    const months = [];
    const currentDate = new Date();
    
    // Generate default data structure first
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthName = monthDate.toLocaleString('default', { month: 'short' });
      const year = monthDate.getFullYear();
      const monthNumber = monthDate.getMonth();
      
      months.push({
        month: monthName,
        count: 0,
        year: year,
        monthNumber: monthNumber
      });
    }
    
    try {
      if (collectionName === "students") {
        // For students, fetch ALL students from both collections and distribute by month
        const [studentsSnapshot, usersSnapshot] = await Promise.allSettled([
          getDocs(collection(db, "students")),
          getDocs(query(collection(db, "users"), where("role", "==", "Student")))
        ]);
        
        // Process students from "students" collection
        if (studentsSnapshot.status === 'fulfilled') {
          studentsSnapshot.value.docs.forEach(doc => {
            const data = doc.data();
            const createdAt = data[dateField];
            if (createdAt) {
              const createdDate = new Date(createdAt);
              const createdMonth = createdDate.getMonth();
              const createdYear = createdDate.getFullYear();
              
              // Find matching month in our array
              const monthIndex = months.findIndex(m => 
                m.monthNumber === createdMonth && m.year === createdYear
              );
              
              if (monthIndex !== -1) {
                months[monthIndex].count++;
              }
            }
          });
        }
        
        // Process students from "users" collection
        if (usersSnapshot.status === 'fulfilled') {
          usersSnapshot.value.docs.forEach(doc => {
            const data = doc.data();
            const createdAt = data[dateField];
            if (createdAt) {
              const createdDate = new Date(createdAt);
              const createdMonth = createdDate.getMonth();
              const createdYear = createdDate.getFullYear();
              
              // Find matching month in our array
              const monthIndex = months.findIndex(m => 
                m.monthNumber === createdMonth && m.year === createdYear
              );
              
              if (monthIndex !== -1) {
                months[monthIndex].count++;
              }
            }
          });
        }
      } else {
        // For other collections (violations, etc.), use the original logic
        for (let i = 0; i < months.length; i++) {
          const monthDate = new Date(months[i].year, months[i].monthNumber, 1);
          const startOfMonth = new Date(months[i].year, months[i].monthNumber, 1);
          const endOfMonth = new Date(months[i].year, months[i].monthNumber + 1, 0, 23, 59, 59);
          
          try {
            const q = query(
              collection(db, collectionName),
              where(dateField, ">=", startOfMonth.toISOString()),
              where(dateField, "<=", endOfMonth.toISOString())
            );
            const snapshot = await getDocs(q);
            months[i].count = snapshot.size;
          } catch (error) {
            console.log(`Error fetching ${collectionName} for ${months[i].month}:`, error);
            months[i].count = 0;
          }
        }
      }
    } catch (error) {
      console.error(`Error generating monthly data for ${collectionName}:`, error);
    }
    
    // Remove the extra properties we added for processing
    return months.map(({ month, count }) => ({ month, count }));
  };

  const fetchRecentActivity = async () => {
    setActivityLoading(true);
    try {
      // Fetch all recent activities from various collections
      const activities = [];
      
      // Fetch from activity_log collection
      try {
        const activityLogQuery = query(collection(db, "activity_log"), orderBy("timestamp", "desc"), limit(10));
        const activityLogSnap = await getDocs(activityLogQuery);
        const activityLogData = activityLogSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          type: 'activity_log'
        }));
        activities.push(...activityLogData);
      } catch (e) {
        console.log("Activity log not found");
      }

      // Fetch from notifications collection (admin notifications)
      try {
        const notificationsQuery = query(collection(db, "notifications"), orderBy("createdAt", "desc"), limit(10));
        const notificationsSnap = await getDocs(notificationsQuery);
        const notificationsData = notificationsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          type: 'notification',
          message: doc.data().title || doc.data().message,
          timestamp: doc.data().createdAt
        }));
        activities.push(...notificationsData);
      } catch (e) {
        console.log("Notifications not found");
      }

      // Fetch from violations collection
      try {
        const violationsQuery = query(collection(db, "violations"), orderBy("createdAt", "desc"), limit(10));
        const violationsSnap = await getDocs(violationsQuery);
        const violationsData = violationsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          type: 'violation',
          message: `Violation reported: ${doc.data().violation}`,
          timestamp: doc.data().createdAt
        }));
        activities.push(...violationsData);
      } catch (e) {
        console.log("Violations not found");
      }

      // Sort all activities by timestamp and take the most recent 15
      const sortedActivities = activities
        .filter(activity => activity.timestamp)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 15);

      setRecentActivity(sortedActivities);
    } catch (e) {
      console.log("Error fetching recent activity:", e);
      setRecentActivity([]);
    } finally {
      setActivityLoading(false);
    }
  };





  const statCards = [
    { 
      label: 'Students', 
      value: stats.students, 
      icon: <PeopleIcon fontSize="large" />,
      color: '#800000',
      to: '/students'
    },
    { 
      label: 'Violations', 
      value: stats.violations, 
      icon: <ReportIcon fontSize="large" />,
      color: '#800000',
      to: '/violation-record'
    },
    { 
      label: 'Activities', 
      value: stats.activities, 
      icon: <EventIcon fontSize="large" />,
      color: '#800000',
      to: '/activity'
    },
    { 
      label: 'Announcements', 
      value: stats.announcements, 
      icon: <CampaignIcon fontSize="large" />,
      color: '#800000',
      to: '/announcements'
    },
  ];

  const handleEventFormChange = (e) => {
    const { name, value } = e.target;
    setEventForm(f => ({ ...f, [name]: value }));
  };

  const handleEventSubmit = async (e) => {
    e.preventDefault();
    setEventSubmitting(true);
    try {
      await addDoc(collection(db, 'events'), {
        ...eventForm,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
      setEventSnackbar({ open: true, message: 'Event proposal submitted for approval!', severity: 'success' });
      setOpenEventModal(false);
      setEventForm({ title: '', description: '', proposedBy: '', date: '', time: '', location: '' });
    } catch (e) {
      setEventSnackbar({ open: true, message: 'Failed to submit event proposal.', severity: 'error' });
    }
    setEventSubmitting(false);
  };

  // Get user display info
  const getUserDisplayInfo = () => {
    if (userProfile) {
      return {
        name: userProfile.fullName || currentUser?.displayName || 'Admin User',
        email: userProfile.email || currentUser?.email,
        photo: userProfile.profilePic || currentUser?.photoURL,
        role: userProfile.role || 'Admin'
      };
    }
    return {
      name: currentUser?.displayName || 'Admin User',
      email: currentUser?.email,
      photo: currentUser?.photoURL,
      role: 'Admin'
    };
  };

  const userInfo = getUserDisplayInfo();

  // Removed loading screen per requirements

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ color: isDark ? '#ffffff' : '#800000' }}>
        Dashboard Overview
      </Typography>
      
      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statCards.map((stat) => (
          <Grid item xs={12} sm={6} md={3} key={stat.label}>
            <Card
              onClick={() => stat.to ? navigate(stat.to) : null}
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                p: 2, 
                boxShadow: 3, 
                borderRadius: 2,
                borderLeft: `4px solid ${stat.color}`,
                background: '#ffffff',
                cursor: stat.to ? 'pointer' : 'default',
                transition: 'box-shadow 0.2s',
                '&:hover': {
                  boxShadow: 6,
                },
              }}
            >
              <Box sx={{ mr: 2 }}>{stat.icon}</Box>
              <CardContent sx={{ flex: 1, p: '8px !important' }}>
                <Typography 
                  variant="h4" 
                  fontWeight={700} 
                  sx={{ 
                    color: isDark ? '#ffffff' : '#000000'
                  }}
                >
                  {stat.value.toLocaleString()}
                </Typography>
                <Typography variant="body2" sx={{ color: isDark ? '#cccccc' : '#666666' }}>
                  {stat.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Monthly Charts */}
      <Grid container spacing={3}>
        {/* Students Monthly Chart */}
        <Grid item xs={12} md={6}>
          <Paper 
            sx={{ 
              p: 3, 
              height: 400, 
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                boxShadow: 6,
                transform: 'translateY(-2px)'
              }
            }}
            onClick={() => navigate('/students-chart')}
          >
            <Typography variant="h6" gutterBottom sx={{ color: isDark ? '#ffffff' : '#000000' }}>
              Students Registration (Last 6 Months)
            </Typography>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData.students || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                  axisLine={{ stroke: isDark ? '#D84040' : '#800000' }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  axisLine={{ stroke: isDark ? '#D84040' : '#800000' }}
                  domain={[0, 'dataMax + 1']}
                />
                <RechartsTooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: isDark ? '1px solid #D84040' : '1px solid #800000',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke={isDark ? '#D84040' : '#800000'} 
                  strokeWidth={3}
                  name="Students"
                  dot={{ fill: isDark ? '#D84040' : '#800000', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: isDark ? '#D84040' : '#800000', strokeWidth: 2 }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Violations Monthly Chart */}
        <Grid item xs={12} md={6}>
          <Paper 
            sx={{ 
              p: 3, 
              height: 400, 
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                boxShadow: 6,
                transform: 'translateY(-2px)'
              }
            }}
            onClick={() => navigate('/violations-chart')}
          >
            <Typography variant="h6" gutterBottom sx={{ color: isDark ? '#ffffff' : '#000000' }}>
              Violations Reported (Last 6 Months)
            </Typography>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData.violations || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                  axisLine={{ stroke: isDark ? '#D84040' : '#800000' }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  axisLine={{ stroke: isDark ? '#D84040' : '#800000' }}
                  domain={[0, 'dataMax + 1']}
                />
                <RechartsTooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: isDark ? '1px solid #D84040' : '1px solid #800000',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar 
                  dataKey="count" 
                  fill={isDark ? '#D84040' : '#800000'} 
                  name="Violations"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Recent Activity Section */}
      <Grid container spacing={3} sx={{ mt: 4, justifyContent: 'center' }}>
        <Grid item xs={12} md={11} lg={10}>
          <Paper sx={{ p: 3, boxShadow: 2 }}>
            <Typography 
              variant="h6" 
              sx={{ 
                mb: 3, 
                fontWeight: 700, 
                color: isDark ? '#ffffff' : '#000000'
              }}
            >
              Recent Activity
            </Typography>
            {activityLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
                <CircularProgress size={24} sx={{ mr: 2 }} />
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: isDark ? '#ffffff' : '#333333',
                    fontWeight: 500
                  }}
                >
                  Loading recent activity...
                </Typography>
              </Box>
            ) : recentActivity.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: isDark ? '#ffffff' : '#333333',
                    fontWeight: 500
                  }}
                >
                  No recent activity found.
                </Typography>
              </Box>
            ) : (
              <List sx={{ 
                maxHeight: 500, 
                overflow: 'auto',
                '& .MuiListItem-root': {
                  color: isDark ? '#ffffff' : '#000000',
                  padding: '12px 0',
                  borderBottom: `1px solid ${isDark ? '#404040' : '#e0e0e0'}`
                }
              }}>
                {recentActivity.map((item, idx) => (
                  <ListItem 
                    key={`${item.type}-${item.id}-${idx}`}
                    sx={{ 
                      color: isDark ? '#ffffff' : '#000000',
                      '&:hover': {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'
                      }
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography
                            variant="body1"
                            sx={{ 
                              color: isDark ? '#ffffff' : '#000000',
                              fontWeight: 500,
                              fontSize: '0.9rem'
                            }}
                          >
                            {item.message || item.type || 'Activity'}
                          </Typography>
                          <Chip 
                            label={item.type?.replace('_', ' ').toUpperCase() || 'ACTIVITY'} 
                            size="small" 
                            sx={{ 
                              fontSize: '0.7rem',
                              height: 20,
                              bgcolor: item.type === 'violation' ? '#ffebee' : 
                                       item.type === 'notification' ? '#e3f2fd' : '#f3e5f5',
                              color: item.type === 'violation' ? '#d32f2f' : 
                                     item.type === 'notification' ? '#1976d2' : '#7b1fa2'
                            }}
                          />
                        </Box>
                      }
                      secondary={
                        <Typography
                          variant="body2"
                          sx={{ 
                            color: isDark ? '#cccccc' : '#333333',
                            fontSize: '0.8rem',
                            fontWeight: 400,
                            mt: 0.5
                          }}
                        >
                          {item.timestamp ? new Date(item.timestamp).toLocaleString() : 'No timestamp'}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Snackbar for notifications */}
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
} 