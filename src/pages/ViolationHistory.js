import React, { useState, useEffect } from "react";
import { Typography, Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, InputAdornment, Card, CardContent, CardHeader, Grid, Chip, Avatar, Tooltip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Divider, Tabs, Tab, Button, useTheme } from "@mui/material";
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { db } from "../firebase";
import SearchIcon from '@mui/icons-material/Search';
import TimelineIcon from '@mui/icons-material/Timeline';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { format } from 'date-fns';

export default function ViolationHistory() {
  const theme = useTheme();
  const [violations, setViolations] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [activities, setActivities] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedTab, setSelectedTab] = useState(0);
  const [viewViolation, setViewViolation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch violations
        const violationsSnap = await getDocs(query(collection(db, "violations"), orderBy("timestamp", "desc")));
        const violationsData = violationsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setViolations(violationsData);

        // Fetch violation meetings
        // Removed orderBy to avoid composite index requirement - sorting client-side instead
        const meetingsSnap = await getDocs(query(collection(db, "meetings"), where("type", "==", "violation_meeting")));
        const meetingsData = meetingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
          .sort((a, b) => {
            // Sort by createdAt in descending order (newest first)
            const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
            const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
            return dateB - dateA;
          });
        setMeetings(meetingsData);

        // Fetch violation-related activities
        const activitiesSnap = await getDocs(query(collection(db, "activity_log"), orderBy("timestamp", "desc")));
        const activitiesData = activitiesSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(activity => 
            activity.type?.includes('violation') || 
            activity.message?.toLowerCase().includes('violation')
          );
        setActivities(activitiesData);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const filteredViolations = violations.filter(v =>
    v.studentId?.toLowerCase().includes(search.toLowerCase()) ||
    v.violation?.toLowerCase().includes(search.toLowerCase()) ||
    v.studentName?.toLowerCase().includes(search.toLowerCase()) ||
    v.classification?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredMeetings = meetings.filter(m =>
    m.studentName?.toLowerCase().includes(search.toLowerCase()) ||
    m.studentId?.toLowerCase().includes(search.toLowerCase()) ||
    m.purpose?.toLowerCase().includes(search.toLowerCase()) ||
    m.violationType?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredActivities = activities.filter(a =>
    a.message?.toLowerCase().includes(search.toLowerCase()) ||
    a.type?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusColor = (status) => {
    return 'primary';
  };

  const getSeverityColor = (severity) => {
    return 'primary';
  };

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
    } catch {
      return dateString || 'N/A';
    }
  };

  const stats = {
    totalViolations: violations.length,
    pendingViolations: violations.filter(v => v.status === 'Pending').length,
    solvedViolations: violations.filter(v => v.status === 'Solved').length,
    totalMeetings: meetings.length,
    recentActivities: activities.length
  };

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };


  return (
    <Box sx={{ pt: { xs: 2, sm: 3 }, pl: { xs: 2, sm: 3, md: 4 }, pr: { xs: 2, sm: 3, md: 4 } }}>
      <Typography variant="h4" gutterBottom fontWeight={700} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000', mb: 2, mt: 1 }}>
        Violation History
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ boxShadow: 2, borderLeft: '4px solid #800000', minHeight: '120px' }}>
            <CardContent sx={{ p: 3, textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
              <Typography variant="h4" sx={{ color: '#000000', mb: 1 }} fontWeight={700}>{stats.totalViolations}</Typography>
              <Typography variant="subtitle2" sx={{ color: '#666666' }}>Total Violations</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ boxShadow: 2, borderLeft: '4px solid #800000', minHeight: '120px' }}>
            <CardContent sx={{ p: 3, textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
              <Typography variant="h4" sx={{ color: '#000000', mb: 1 }} fontWeight={700}>{stats.pendingViolations}</Typography>
              <Typography variant="subtitle2" sx={{ color: '#666666' }}>Pending</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ boxShadow: 2, borderLeft: '4px solid #800000', minHeight: '120px' }}>
            <CardContent sx={{ p: 3, textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
              <Typography variant="h4" sx={{ color: '#000000', mb: 1 }} fontWeight={700}>{stats.solvedViolations}</Typography>
              <Typography variant="subtitle2" sx={{ color: '#666666' }}>Solved</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search Bar */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search violations, meetings, or activities..."
          size="small"
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            )
          }}
        />
      </Paper>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={selectedTab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label={`Violations (${filteredViolations.length})`} />
        </Tabs>
      </Paper>

      {/* Violations Tab */}
      {selectedTab === 0 && (
        <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow sx={{ 
                bgcolor: '#800000' 
              }}>
                <TableCell sx={{ 
                  bgcolor: '#800000',
                  color: '#ffffff', 
                  fontWeight: 600 
                }}>Date</TableCell>
                <TableCell sx={{ 
                  bgcolor: '#800000',
                  color: '#ffffff', 
                  fontWeight: 600 
                }}>Student ID</TableCell>
                <TableCell sx={{ 
                  bgcolor: '#800000',
                  color: '#ffffff', 
                  fontWeight: 600 
                }}>Name</TableCell>
                <TableCell sx={{ 
                  bgcolor: '#800000',
                  color: '#ffffff', 
                  fontWeight: 600 
                }}>Violation</TableCell>
                <TableCell sx={{ 
                  bgcolor: '#800000',
                  color: '#ffffff', 
                  fontWeight: 600 
                }}>Status</TableCell>
                <TableCell sx={{ 
                  bgcolor: '#800000',
                  color: '#ffffff', 
                  fontWeight: 600 
                }}>Location</TableCell>
                <TableCell sx={{ 
                  bgcolor: '#800000',
                  color: '#ffffff', 
                  fontWeight: 600 
                }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredViolations.length === 0 ? (
                <TableRow><TableCell colSpan={7} align="center">No violations found.</TableCell></TableRow>
              ) : filteredViolations.map((violation, idx) => (
                <TableRow key={violation.id || idx} hover>
                  <TableCell>{formatDate(violation.timestamp)}</TableCell>
                  <TableCell>{violation.studentId}</TableCell>
                  <TableCell>{violation.studentName}</TableCell>
                  <TableCell>
                    <Typography variant="body2">{violation.violation}</Typography>
                    {violation.description && (
                      <Typography variant="caption" color="textSecondary" display="block">
                        {violation.description.substring(0, 50)}...
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: violation.status === 'Solved' || violation.status === 'Completed' ? '#4caf50' : '#800000',
                        fontWeight: 500
                      }}
                    >
                      {violation.status}
                    </Typography>
                  </TableCell>
                  <TableCell>{violation.location}</TableCell>
                  <TableCell>
                    <Tooltip title="View Details">
                      <IconButton size="small" color="primary" onClick={() => setViewViolation(violation)}>
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}



      {/* View Violation Details Dialog */}
      <Dialog open={!!viewViolation} onClose={() => setViewViolation(null)} maxWidth="md" fullWidth>
        <DialogTitle>Violation Details</DialogTitle>
        <DialogContent dividers>
          {viewViolation && (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="h6" color="primary">{viewViolation.violation}</Typography>
                  <Divider sx={{ my: 1 }} />
                </Grid>
                <Grid item xs={6}>
                  <Typography><strong>Student ID:</strong> {viewViolation.studentId}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography><strong>Student Name:</strong> {viewViolation.studentName}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography><strong>Date:</strong> {viewViolation.date}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography><strong>Time:</strong> {viewViolation.time}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography><strong>Classification:</strong> {viewViolation.classification}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography><strong>Severity:</strong> 
                    <Chip 
                      label={viewViolation.severity} 
                      color={getSeverityColor(viewViolation.severity)} 
                      size="small" 
                      sx={{ ml: 1 }}
                    />
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography><strong>Status:</strong> 
                    <Chip 
                      label={viewViolation.status} 
                      color={getStatusColor(viewViolation.status)} 
                      size="small" 
                      sx={{ ml: 1 }}
                    />
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography><strong>Location:</strong> {viewViolation.location}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography><strong>Reported By:</strong> {viewViolation.reportedBy}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography><strong>Witnesses:</strong> {viewViolation.witnesses || 'None'}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography><strong>Description:</strong></Typography>
                  <Typography variant="body2" sx={{ mt: 1, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                    {viewViolation.description || 'No description provided'}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography><strong>Action Taken:</strong></Typography>
                  <Typography variant="body2" sx={{ mt: 1, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                    {viewViolation.actionTaken || 'No action taken yet'}
                  </Typography>
                </Grid>
                {viewViolation.image && (
                  <Grid item xs={12}>
                    <Typography><strong>Evidence:</strong></Typography>
                    <Box sx={{ mt: 1, textAlign: 'center' }}>
                      <Avatar 
                        src={viewViolation.image} 
                        sx={{ width: 200, height: 200, mx: 'auto' }} 
                        variant="rounded"
                      />
                    </Box>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewViolation(null)} color="primary">Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 