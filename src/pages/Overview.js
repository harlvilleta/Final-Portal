import React, { useState, useEffect } from "react";
import { 
  Typography, Box, Grid, Card, CardContent, Paper, CircularProgress, List, ListItem, ListItemText, 
  Divider, Button, Stack, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Snackbar, Alert,
  TableContainer, Table, TableHead, TableBody, TableRow, TableCell, Avatar, Chip, IconButton, Tooltip
} from "@mui/material";
import PeopleIcon from '@mui/icons-material/People';
import ReportIcon from '@mui/icons-material/Report';
import EventIcon from '@mui/icons-material/Event';
import CampaignIcon from '@mui/icons-material/Campaign';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { collection, getDocs, query, where, orderBy, limit, addDoc, deleteDoc, doc, getDoc } from "firebase/firestore";
import { db, auth } from "../firebase";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useNavigate, Link } from "react-router-dom";

export default function Overview() {
  const [stats, setStats] = useState({
    students: 0,
    violations: 0,
    activities: 0,
    announcements: 0
  });
  const [monthlyData, setMonthlyData] = useState({
    students: [],
    violations: []
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
      const [studentsSnapshot, violationsSnapshot, activitiesSnapshot, announcementsSnapshot] = await Promise.allSettled([
        getDocs(collection(db, "students")),
        getDocs(collection(db, "violations")),
        getDocs(collection(db, "activities")).catch(() => ({ size: 0 })),
        getDocs(collection(db, "announcements")).catch(() => ({ size: 0 }))
      ]);

      const studentsCount = studentsSnapshot.status === 'fulfilled' ? studentsSnapshot.value.size : 0;
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

    } catch (error) {
      console.error("Error fetching overview data:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateMonthlyData = async (collectionName, dateField) => {
    const months = [];
    const currentDate = new Date();
    
    // Create all queries in parallel for better performance
    const queries = [];
    const monthNames = [];
    
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthName = monthDate.toLocaleString('default', { month: 'short' });
      const year = monthDate.getFullYear();
      
      const startOfMonth = new Date(year, monthDate.getMonth(), 1);
      const endOfMonth = new Date(year, monthDate.getMonth() + 1, 0);
      
      monthNames.push(monthName);
      queries.push(
        query(
          collection(db, collectionName),
          where(dateField, ">=", startOfMonth.toISOString()),
          where(dateField, "<=", endOfMonth.toISOString())
        ).catch(() => ({ size: 0 }))
      );
    }
    
    try {
      // Execute all queries in parallel
      const snapshots = await Promise.allSettled(queries);
      
      snapshots.forEach((snapshot, index) => {
        const count = snapshot.status === 'fulfilled' ? snapshot.value.size : 0;
        months.push({
          month: monthNames[index],
          count: count
        });
      });
    } catch (error) {
      console.log(`Error fetching ${collectionName} monthly data:`, error);
      // Fallback to empty data
      monthNames.forEach(monthName => {
        months.push({
          month: monthName,
          count: 0
        });
      });
    }
    
    return months;
  };

  const fetchRecentActivity = async () => {
    setActivityLoading(true);
    try {
      const q = query(collection(db, "activity_log"), orderBy("timestamp", "desc"), limit(8));
      const snap = await getDocs(q);
      setRecentActivity(snap.docs.map(doc => doc.data()));
    } catch (e) {
      console.log("Activity log not found, using empty array");
      setRecentActivity([]);
    } finally {
      setActivityLoading(false);
    }
  };

  const statCards = [
    { 
      label: 'Students', 
      value: stats.students, 
      icon: <PeopleIcon fontSize="large" color="primary" />,
      color: '#1976d2',
      to: '/students'
    },
    { 
      label: 'Violations', 
      value: stats.violations, 
      icon: <ReportIcon fontSize="large" color="error" />,
      color: '#d32f2f',
      to: '/violation-record'
    },
    { 
      label: 'Activities', 
      value: stats.activities, 
      icon: <EventIcon fontSize="large" color="success" />,
      color: '#2e7d32',
      to: '/activity'
    },
    { 
      label: 'Announcements', 
      value: stats.announcements, 
      icon: <CampaignIcon fontSize="large" color="warning" />,
      color: '#ed6c02',
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
      <Typography variant="h4" gutterBottom>
        Dashboard Overview
      </Typography>
      
      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statCards.map((stat) => (
          <Grid item xs={12} sm={6} md={3} key={stat.label}>
            <Card
              onClick={() => navigate(stat.to)}
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                p: 2, 
                boxShadow: 3, 
                borderRadius: 2,
                borderLeft: `4px solid ${stat.color}`,
                background: stat.label === 'Students' ? '#80000020' :
                            stat.label === 'Violations' ? '#d32f2f20' :
                            stat.label === 'Activities' ? '#80000020' :
                            stat.label === 'Announcements' ? '#80000020' : '#fff',
                cursor: 'pointer',
                transition: 'box-shadow 0.2s, background 0.2s',
                '&:hover': {
                  boxShadow: 6,
                  background: '#80000022',
                },
              }}
            >
              <Box sx={{ mr: 2 }}>{stat.icon}</Box>
              <CardContent sx={{ flex: 1, p: '8px !important' }}>
                <Typography variant="h4" fontWeight={700} color={'#800000'}>
                  {stat.value.toLocaleString()}
                </Typography>
                <Typography color="text.secondary" variant="body2">
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
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Students Registration (Last 6 Months)
            </Typography>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData.students}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <RechartsTooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#800000" 
                  strokeWidth={3}
                  name="Students"
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Violations Monthly Chart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Violations Reported (Last 6 Months)
            </Typography>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData.violations}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <RechartsTooltip />
                <Legend />
                <Bar 
                  dataKey="count" 
                  fill="#800000" 
                  name="Violations"
                />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>


      {/* Recent Activity Section */}
      <Paper sx={{ mt: 4, p: 3, boxShadow: 2 }}>
          <Typography variant="h6" sx={{ mb: 1, fontWeight: 700, color: '#800000' }}>Recent Activity</Typography>
        {activityLoading ? (
          <Typography variant="body2" color="text.secondary">Loading...</Typography>
        ) : recentActivity.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No recent activity.</Typography>
        ) : (
          <List>
            {recentActivity.map((item, idx) => (
              <React.Fragment key={idx}>
                <ListItem>
                  <ListItemText
                    primary={item.message || item.type || 'Activity'}
                    secondary={item.timestamp ? new Date(item.timestamp).toLocaleString() : ''}
                  />
                </ListItem>
                <Divider component="li" />
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>
      
      {/* Snackbar for notifications */}
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
} 