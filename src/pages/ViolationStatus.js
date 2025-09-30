import React, { useState, useEffect } from "react";
import { Typography, Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, InputAdornment, Card, CardContent, CardHeader, Grid, Chip, Avatar, Tooltip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Divider, Tabs, Tab, LinearProgress, CircularProgress, Button } from "@mui/material";
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { db } from "../firebase";
import SearchIcon from '@mui/icons-material/Search';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { format } from 'date-fns';

export default function ViolationStatus() {
  const [violations, setViolations] = useState([]);
  const [meetings, setMeetings] = useState([]);
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
        const meetingsSnap = await getDocs(query(collection(db, "meetings"), where("type", "==", "violation_meeting"), orderBy("createdAt", "desc")));
        const meetingsData = meetingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMeetings(meetingsData);
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return 'warning';
      case 'Solved': return 'success';
      default: return 'default';
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'Low': return 'success';
      case 'Medium': return 'warning';
      case 'High': return 'error';
      case 'Critical': return 'error';
      default: return 'default';
    }
  };

  const getClassificationColor = (classification) => {
    switch (classification) {
      case 'Minor': return 'success';
      case 'Major': return 'warning';
      case 'Serious': return 'error';
      case 'Grave': return 'error';
      default: return 'default';
    }
  };

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString || 'N/A';
    }
  };

  // Calculate statistics
  const stats = {
    totalViolations: violations.length,
    pendingViolations: violations.filter(v => v.status === 'Pending').length,
    solvedViolations: violations.filter(v => v.status === 'Solved').length,
    totalMeetings: meetings.length,
    pendingMeetings: meetings.filter(m => new Date(m.date) >= new Date()).length,
    completedMeetings: meetings.filter(m => new Date(m.date) < new Date()).length
  };

  // Calculate percentages
  const pendingPercentage = stats.totalViolations > 0 ? (stats.pendingViolations / stats.totalViolations) * 100 : 0;
  const solvedPercentage = stats.totalViolations > 0 ? (stats.solvedViolations / stats.totalViolations) * 100 : 0;

  // Group violations by classification
  const classificationStats = violations.reduce((acc, violation) => {
    const classification = violation.classification || 'Unknown';
    acc[classification] = (acc[classification] || 0) + 1;
    return acc;
  }, {});

  // Group violations by severity
  const severityStats = violations.reduce((acc, violation) => {
    const severity = violation.severity || 'Unknown';
    acc[severity] = (acc[severity] || 0) + 1;
    return acc;
  }, {});

  // Group violations by month
  const monthlyStats = violations.reduce((acc, violation) => {
    const month = formatDate(violation.timestamp).substring(0, 7); // YYYY-MM
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {});

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  // Loading placeholder removed per requirement

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={700} color="primary.main">
        Violation Status & Analytics
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#80000010', boxShadow: 2, borderLeft: '4px solid #800000' }}>
            <CardHeader avatar={<AssignmentTurnedInIcon color="primary" />} title={<Typography variant="subtitle2">Total Violations</Typography>} />
            <CardContent>
              <Typography variant="h4" color="primary.main" fontWeight={700}>{stats.totalViolations}</Typography>
              <Typography variant="body2" color="textSecondary">All time violations</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#80000010', boxShadow: 2, borderLeft: '4px solid #800000' }}>
            <CardHeader avatar={<PendingActionsIcon color="primary" />} title={<Typography variant="subtitle2">Pending</Typography>} />
            <CardContent>
              <Typography variant="h4" color="primary.main" fontWeight={700}>{stats.pendingViolations}</Typography>
              <Typography variant="body2" color="textSecondary">
                {pendingPercentage.toFixed(1)}% of total
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={pendingPercentage} 
                color="primary" 
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#80000010', boxShadow: 2, borderLeft: '4px solid #800000' }}>
            <CardHeader avatar={<DoneAllIcon color="primary" />} title={<Typography variant="subtitle2">Solved</Typography>} />
            <CardContent>
              <Typography variant="h4" color="primary.main" fontWeight={700}>{stats.solvedViolations}</Typography>
              <Typography variant="body2" color="textSecondary">
                {solvedPercentage.toFixed(1)}% of total
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={solvedPercentage} 
                color="primary" 
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#80000010', boxShadow: 2, borderLeft: '4px solid #800000' }}>
            <CardHeader avatar={<AssessmentIcon color="primary" />} title={<Typography variant="subtitle2">Meetings</Typography>} />
            <CardContent>
              <Typography variant="h4" color="primary.main" fontWeight={700}>{stats.totalMeetings}</Typography>
              <Typography variant="body2" color="textSecondary">
                {stats.pendingMeetings} pending, {stats.completedMeetings} completed
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Analytics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ boxShadow: 2 }}>
            <CardHeader title="Violations by Classification" />
            <CardContent>
              {Object.entries(classificationStats).map(([classification, count]) => (
                <Box key={classification} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Chip label={classification} color="primary" size="small" />
                    <Typography variant="body2">{count} violations</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={(count / stats.totalViolations) * 100} color="primary" sx={{ height: 8, borderRadius: 4 }} />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ boxShadow: 2 }}>
            <CardHeader title="Violations by Severity" />
            <CardContent>
              {Object.entries(severityStats).map(([severity, count]) => (
                <Box key={severity} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Chip label={severity} color="primary" size="small" />
                    <Typography variant="body2">{count} violations</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={(count / stats.totalViolations) * 100} color="primary" sx={{ height: 8, borderRadius: 4 }} />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search Bar */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search violations by student, violation type, or classification..."
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
          <Tab label={`All Violations (${filteredViolations.length})`} />
          <Tab label={`Pending (${filteredViolations.filter(v => v.status === 'Pending').length})`} />
          <Tab label={`Solved (${filteredViolations.filter(v => v.status === 'Solved').length})`} />
          <Tab label={`Critical (${filteredViolations.filter(v => v.severity === 'Critical').length})`} />
        </Tabs>
      </Paper>

      {/* Violations Table */}
      <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow sx={{ bgcolor: '#80000010' }}>
              <TableCell>Date</TableCell>
              <TableCell>Student ID</TableCell>
              <TableCell>Student Name</TableCell>
              <TableCell>Violation</TableCell>
              <TableCell>Classification</TableCell>
              <TableCell>Severity</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Progress</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredViolations.length === 0 ? (
              <TableRow><TableCell colSpan={9} align="center">No violations found.</TableCell></TableRow>
            ) : filteredViolations
                .filter(v => {
                  if (selectedTab === 1) return v.status === 'Pending';
                  if (selectedTab === 2) return v.status === 'Solved';
                  if (selectedTab === 3) return v.severity === 'Critical';
                  return true;
                })
                .map((violation, idx) => (
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
                      <Chip label={violation.classification} color="primary" size="small" />
                    </TableCell>
                    <TableCell>
                      <Chip label={violation.severity} color="primary" size="small" />
                    </TableCell>
                    <TableCell>
                      <Chip label={violation.status} color="primary" size="small" />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ width: '100%', mr: 1 }}>
                          <LinearProgress variant="determinate" value={violation.status === 'Solved' ? 100 : 0} color="primary" sx={{ height: 6, borderRadius: 3 }} />
                        </Box>
                        <Box sx={{ minWidth: 35 }}>
                          <Typography variant="body2" color="textSecondary">
                            {violation.status === 'Solved' ? '100%' : '0%'}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
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

      {/* Monthly Trends */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>Monthly Violation Trends</Typography>
        <Grid container spacing={2}>
          {Object.entries(monthlyStats)
            .sort(([a], [b]) => b.localeCompare(a))
            .slice(0, 6)
            .map(([month, count]) => (
              <Grid item xs={12} sm={6} md={4} key={month}>
                <Card sx={{ bgcolor: '#f5f5f5' }}>
                  <CardContent>
                    <Typography variant="h6" color="primary">{month}</Typography>
                    <Typography variant="h4" fontWeight={700}>{count}</Typography>
                    <Typography variant="body2" color="textSecondary">violations</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
        </Grid>
      </Paper>

      {/* View Violation Details Dialog */}
      <Dialog open={!!viewViolation} onClose={() => setViewViolation(null)} maxWidth="md" fullWidth>
        <DialogTitle>Violation Status Details</DialogTitle>
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
                  <Typography><strong>Classification:</strong> 
                    <Chip 
                      label={viewViolation.classification} 
                      color={getClassificationColor(viewViolation.classification)} 
                      size="small" 
                      sx={{ ml: 1 }}
                    />
                  </Typography>
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