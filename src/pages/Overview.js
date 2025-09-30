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
  
  // New state for student list
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchOverviewData();
    fetchRecentActivity();
    fetchStudents();
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

  const fetchStudents = async () => {
    try {
      setStudentsLoading(false);
      const querySnapshot = await getDocs(collection(db, "students"));
      const studentsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sort students by creation date (newest first)
      const sortedStudents = studentsData.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return dateB - dateA; // Descending order (newest first)
      });
      
      setStudents(sortedStudents);
    } catch (error) {
      console.error("Error fetching students:", error);
      setSnackbar({ open: true, message: "Error loading students", severity: "error" });
    } finally {
      setStudentsLoading(false);
    }
  };

  const handleDeleteStudent = async (studentId, studentName) => {
    if (window.confirm(`Are you sure you want to delete ${studentName}?`)) {
      try {
        await deleteDoc(doc(db, "students", studentId));
        setSnackbar({ open: true, message: "Student deleted successfully!", severity: "success" });
        fetchStudents(); // Refresh the list
      } catch (error) {
        console.error("Error deleting student:", error);
        setSnackbar({ open: true, message: "Error deleting student", severity: "error" });
      }
    }
  };

  const handleViewStudent = (student) => {
    // Navigate to student details or open a modal
    navigate(`/students?view=${student.id}`);
  };

  const handleEditStudent = (student) => {
    // Navigate to edit student page
    navigate(`/students?edit=${student.id}`);
  };

  const fetchOverviewData = async () => {
    try {
      setLoading(false);
      
      // Fetch students count
      const studentsSnapshot = await getDocs(collection(db, "students"));
      const studentsCount = studentsSnapshot.size;
      
      // Fetch violations count
      const violationsSnapshot = await getDocs(collection(db, "violations"));
      const violationsCount = violationsSnapshot.size;
      
      // Fetch activities count (assuming activities collection exists)
      let activitiesCount = 0;
      try {
        const activitiesSnapshot = await getDocs(collection(db, "activities"));
        activitiesCount = activitiesSnapshot.size;
      } catch (error) {
        console.log("Activities collection not found, using default value");
      }
      
      // Fetch announcements count (assuming announcements collection exists)
      let announcementsCount = 0;
      try {
        const announcementsSnapshot = await getDocs(collection(db, "announcements"));
        announcementsCount = announcementsSnapshot.size;
      } catch (error) {
        console.log("Announcements collection not found, using default value");
      }

      setStats({
        students: studentsCount,
        violations: violationsCount,
        activities: activitiesCount,
        announcements: announcementsCount
      });

      // Generate monthly data for the last 6 months
      const monthlyStudents = await generateMonthlyData("students", "createdAt");
      const monthlyViolations = await generateMonthlyData("violations", "createdAt");

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
    
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthName = monthDate.toLocaleString('default', { month: 'short' });
      const year = monthDate.getFullYear();
      
      const startOfMonth = new Date(year, monthDate.getMonth(), 1);
      const endOfMonth = new Date(year, monthDate.getMonth() + 1, 0);
      
      try {
        const q = query(
          collection(db, collectionName),
          where(dateField, ">=", startOfMonth.toISOString()),
          where(dateField, "<=", endOfMonth.toISOString())
        );
        const snapshot = await getDocs(q);
        
        months.push({
          month: monthName,
          count: snapshot.size
        });
      } catch (error) {
        console.log(`Error fetching ${collectionName} for ${monthName}:`, error);
        months.push({
          month: monthName,
          count: 0
        });
      }
    }
    
    return months;
  };

  const fetchRecentActivity = async () => {
    setActivityLoading(false);
    try {
      const q = query(collection(db, "activity_log"), orderBy("timestamp", "desc"), limit(8));
      const snap = await getDocs(q);
      setRecentActivity(snap.docs.map(doc => doc.data()));
    } catch (e) {
      setRecentActivity([]);
    }
    setActivityLoading(false);
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

      {/* Student List Table */}
      <Paper sx={{ mt: 4, p: 3, boxShadow: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#1976d2' }}>
            Registered Students ({students.length})
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => navigate('/students')}
            startIcon={<PeopleIcon />}
          >
            View All Students
          </Button>
        </Box>
        
        {studentsLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            {/* Loading removed per requirement; show nothing */}
          </Box>
        ) : students.length === 0 ? (
          <Box sx={{ textAlign: 'center', p: 3 }}>
            <Typography variant="body1" color="text.secondary">No students registered yet.</Typography>
            <Button 
              variant="outlined" 
              color="primary" 
              onClick={() => navigate('/students')}
              sx={{ mt: 2 }}
            >
              Add First Student
            </Button>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Photo</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>ID Number</TableCell>
                  <TableCell>Course</TableCell>
                  <TableCell>Year & Section</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {students.slice(0, 10).map((student) => (
                  <TableRow key={student.id} hover>
                    <TableCell>
                      {student.image ? (
                        <Avatar src={student.image} sx={{ width: 40, height: 40 }} />
                      ) : (
                        <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}>
                          {student.firstName?.charAt(0)}{student.lastName?.charAt(0)}
                        </Avatar>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {student.firstName} {student.lastName}
                      </Typography>
                    </TableCell>
                    <TableCell>{student.id || 'N/A'}</TableCell>
                    <TableCell>
                      <Chip 
                        label={student.course || 'N/A'} 
                        size="small" 
                        color="primary" 
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {student.year || 'N/A'} • {student.section || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {student.email || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Tooltip title="View Details">
                          <IconButton 
                            size="small" 
                            color="primary"
                            onClick={() => handleViewStudent(student)}
                          >
                            <VisibilityIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit Student">
                          <IconButton 
                            size="small" 
                            color="warning"
                            onClick={() => handleEditStudent(student)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Student">
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => handleDeleteStudent(student.id, `${student.firstName} ${student.lastName}`)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        
        {students.length > 10 && (
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Showing first 10 students. 
            </Typography>
            <Button 
              variant="text" 
              color="primary" 
              onClick={() => navigate('/students')}
              sx={{ mt: 1 }}
            >
              View All {students.length} Students
            </Button>
          </Box>
        )}
      </Paper>

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