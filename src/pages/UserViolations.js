import React, { useState, useEffect } from "react";
import { 
  Box, Grid, Card, CardContent, Typography, TextField, Button, Paper, Avatar, Snackbar, Alert, 
  List, ListItem, ListItemText, ListItemAvatar, Chip, Divider, Dialog, DialogTitle, DialogContent,
  DialogActions, IconButton, Tooltip, Stack, Badge, CircularProgress, Tabs, Tab, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from "@mui/material";
import { 
  Warning, CheckCircle, CalendarToday, AccessTime, LocationOn, Person, Comment,
  Visibility, Edit, Delete, FilterList, Search, Assignment, PendingActions, DoneAll,
  PriorityHigh, Description, Close, ExpandMore, ExpandLess
} from "@mui/icons-material";
import { db, auth } from "../firebase";
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, updateDoc } from "firebase/firestore";

export default function UserViolations({ currentUser }) {
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [selectedViolation, setSelectedViolation] = useState(null);
  const [openDetailDialog, setOpenDetailDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [expandedViolations, setExpandedViolations] = useState(new Set());
  const [selectedTab, setSelectedTab] = useState(0);
  const [user, setUser] = useState(null);

  // Get current user from auth if not passed as prop
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      console.log("UserViolations - Auth state changed:", user?.email);
    });

    return unsubscribe;
  }, []);

  // Use either passed currentUser or auth user
  const activeUser = currentUser || user;

  useEffect(() => {
    console.log("UserViolations - useEffect triggered with user:", activeUser?.email);
    
    if (!activeUser?.email) {
      console.log("UserViolations - No user email, setting loading to false");
      setLoading(false);
      return;
    }

    console.log("UserViolations - Setting up Firebase query for email:", activeUser.email);
    
    try {
      // Remove orderBy to avoid composite index requirement
      const violationsQuery = query(
        collection(db, "violations"),
        where("studentEmail", "==", activeUser.email)
      );
      
      const unsubscribe = onSnapshot(violationsQuery, (snap) => {
        console.log("UserViolations - Firebase query result:", snap.docs.length, "violations");
        const violationsData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Sort by createdAt in descending order (newest first) in JavaScript
        const sortedViolations = violationsData.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
          const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
          return dateB - dateA; // Descending order (newest first)
        });
        
        setViolations(sortedViolations);
        setLoading(false);
      }, (error) => {
        console.error("UserViolations - Firebase query error:", error);
        setSnackbar({ open: true, message: 'Error loading violations: ' + error.message, severity: 'error' });
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error("UserViolations - Error setting up query:", error);
      setSnackbar({ open: true, message: 'Error setting up violations query: ' + error.message, severity: 'error' });
      setLoading(false);
    }
  }, [activeUser]);

  const handleAddComment = async (violationId) => {
    if (!comment.trim()) return;

    try {
      const violationRef = doc(db, "violations", violationId);
      const violationDoc = await getDoc(violationRef);
      
      if (violationDoc.exists()) {
        const currentComments = violationDoc.data().comments || [];
        const newComment = {
          text: comment,
          author: activeUser.email,
          timestamp: new Date().toISOString()
        };
        
        await updateDoc(violationRef, {
          comments: [...currentComments, newComment]
        });
        
        setComment('');
        setSnackbar({ open: true, message: 'Comment added successfully!', severity: 'success' });
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      setSnackbar({ open: true, message: 'Error adding comment', severity: 'error' });
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'Critical': return 'error';
      case 'High': return 'warning';
      case 'Medium': return 'info';
      case 'Low': return 'success';
      default: return 'default';
    }
  };

  const getClassificationColor = (classification) => {
    switch (classification) {
      case 'Grave': return 'error';
      case 'Serious': return 'warning';
      case 'Major': return 'info';
      case 'Minor': return 'success';
      default: return 'default';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return 'warning';
      case 'Solved': return 'success';
      default: return 'default';
    }
  };

  const toggleExpanded = (violationId) => {
    const newExpanded = new Set(expandedViolations);
    if (newExpanded.has(violationId)) {
      newExpanded.delete(violationId);
    } else {
      newExpanded.add(violationId);
    }
    setExpandedViolations(newExpanded);
  };

  const handleViewDetails = (violation) => {
    setSelectedViolation(violation);
    setOpenDetailDialog(true);
  };

  // Filter violations based on search and filters
  const filteredViolations = violations.filter(violation => {
    const matchesSearch = 
      violation.violation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      violation.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      violation.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      violation.reportedBy?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' || violation.status === filterStatus;
    const matchesSeverity = filterSeverity === 'all' || violation.severity === filterSeverity;

    return matchesSearch && matchesStatus && matchesSeverity;
  });

  // Calculate statistics
  const stats = {
    total: violations.length,
    pending: violations.filter(v => v.status === 'Pending').length,
    solved: violations.filter(v => v.status === 'Solved').length,
    critical: violations.filter(v => v.severity === 'Critical').length,
    high: violations.filter(v => v.severity === 'High').length,
    medium: violations.filter(v => v.severity === 'Medium').length,
    low: violations.filter(v => v.severity === 'Low').length
  };

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
    // Apply filter based on tab
    switch (newValue) {
      case 1: // Pending
        setFilterStatus('Pending');
        setFilterSeverity('all');
        break;
      case 2: // Solved
        setFilterStatus('Solved');
        setFilterSeverity('all');
        break;
      case 3: // Critical
        setFilterStatus('all');
        setFilterSeverity('Critical');
        break;
      default: // All
        setFilterStatus('all');
        setFilterSeverity('all');
    }
  };

  // Show loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', flexDirection: 'column' }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Loading violations...
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
          User: {activeUser?.email || 'Not logged in'}
        </Typography>
      </Box>
    );
  }

  // Show error if no user
  if (!activeUser) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', flexDirection: 'column' }}>
        <Typography variant="h6" color="error.main" gutterBottom>
          Authentication Error
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Please log in to view your violations.
        </Typography>
        <Button 
          variant="contained" 
          onClick={() => window.location.reload()}
          sx={{ mt: 2 }}
        >
          Refresh Page
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={700} color="primary.main">
        My Violations
      </Typography>

      {/* Debug Info */}
      <Box sx={{ mb: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
        <Typography variant="body2" color="textSecondary">
          Logged in as: {activeUser.email} | Total violations: {violations.length}
        </Typography>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#e3f2fd', boxShadow: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Assignment color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" color="primary.main" fontWeight={700}>
                  {stats.total}
                </Typography>
              </Box>
              <Typography variant="body2" color="textSecondary">Total Violations</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#fff3e0', boxShadow: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PendingActions color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6" color="warning.main" fontWeight={700}>
                  {stats.pending}
                </Typography>
              </Box>
              <Typography variant="body2" color="textSecondary">Pending</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#e8f5e8', boxShadow: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <DoneAll color="success" sx={{ mr: 1 }} />
                <Typography variant="h6" color="success.main" fontWeight={700}>
                  {stats.solved}
                </Typography>
              </Box>
              <Typography variant="body2" color="textSecondary">Resolved</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#ffebee', boxShadow: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PriorityHigh color="error" sx={{ mr: 1 }} />
                <Typography variant="h6" color="error.main" fontWeight={700}>
                  {stats.critical}
                </Typography>
              </Box>
              <Typography variant="body2" color="textSecondary">Critical</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Filter Bar */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search violations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              select
              fullWidth
              label="Status Filter"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="Pending">Pending</MenuItem>
              <MenuItem value="Solved">Solved</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              select
              fullWidth
              label="Severity Filter"
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
            >
              <MenuItem value="all">All Severity</MenuItem>
              <MenuItem value="Critical">Critical</MenuItem>
              <MenuItem value="High">High</MenuItem>
              <MenuItem value="Medium">Medium</MenuItem>
              <MenuItem value="Low">Low</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => {
                setSearchTerm('');
                setFilterStatus('all');
                setFilterSeverity('all');
                setSelectedTab(0);
              }}
            >
              Clear Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={selectedTab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label={`All (${stats.total})`} />
          <Tab label={`Pending (${stats.pending})`} />
          <Tab label={`Solved (${stats.solved})`} />
          <Tab label={`Critical (${stats.critical})`} />
        </Tabs>
      </Paper>

      {/* Violations List */}
      {filteredViolations.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="textSecondary">No violations found</Typography>
            <Typography variant="body2" color="textSecondary">
              {searchTerm || filterStatus !== 'all' || filterSeverity !== 'all' 
                ? 'Try adjusting your search or filters' 
                : 'You have a clean record!'}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {filteredViolations.map((violation) => (
            <Grid item xs={12} key={violation.id}>
              <Card sx={{ 
                border: violation.severity === 'Critical' ? '2px solid #d32f2f' : 
                        violation.severity === 'High' ? '2px solid #f57c00' : '1px solid #e0e0e0',
                boxShadow: violation.severity === 'Critical' ? 4 : 2
              }}>
                <CardContent>
                  {/* Header */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" gutterBottom color="primary.main" fontWeight={600}>
                        {violation.violation}
                      </Typography>
                      {violation.description && (
                        <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                          {violation.description}
                        </Typography>
                      )}
                    </Box>
                    <Stack direction="row" spacing={1} sx={{ ml: 2 }}>
                      <Chip 
                        label={violation.classification} 
                        color={getClassificationColor(violation.classification)}
                        size="small"
                      />
                      {violation.severity && (
                        <Chip 
                          label={violation.severity} 
                          color={getSeverityColor(violation.severity)}
                          size="small"
                        />
                      )}
                      <Chip 
                        label={violation.status || 'Pending'} 
                        color={getStatusColor(violation.status)}
                        size="small"
                      />
                    </Stack>
                  </Box>

                  {/* Basic Info Grid */}
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={12} sm={6} md={3}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <CalendarToday sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                        <Box>
                          <Typography variant="caption" color="textSecondary">Date</Typography>
                          <Typography variant="body2">{violation.date}</Typography>
                        </Box>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <AccessTime sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                        <Box>
                          <Typography variant="caption" color="textSecondary">Time</Typography>
                          <Typography variant="body2">{violation.time || 'N/A'}</Typography>
                        </Box>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <LocationOn sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                        <Box>
                          <Typography variant="caption" color="textSecondary">Location</Typography>
                          <Typography variant="body2">{violation.location || 'N/A'}</Typography>
                        </Box>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Person sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                        <Box>
                          <Typography variant="caption" color="textSecondary">Reported By</Typography>
                          <Typography variant="body2">{violation.reportedBy || 'N/A'}</Typography>
                        </Box>
                      </Box>
                    </Grid>
                  </Grid>

                  {/* Action Taken */}
                  {violation.actionTaken && (
                    <Box sx={{ mb: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                      <Typography variant="subtitle2" gutterBottom color="primary.main">
                        Action Taken:
                      </Typography>
                      <Typography variant="body2">
                        {violation.actionTaken}
                      </Typography>
                    </Box>
                  )}

                  {/* Evidence Image */}
                  {violation.image && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom color="primary.main">
                        Evidence:
                      </Typography>
                      <img 
                        src={violation.image} 
                        alt="Violation evidence" 
                        style={{ 
                          maxWidth: '200px', 
                          maxHeight: '200px', 
                          borderRadius: '8px',
                          border: '1px solid #e0e0e0'
                        }}
                      />
                    </Box>
                  )}

                  {/* Additional Details (Expandable) */}
                  <Box sx={{ mb: 2 }}>
                    <Button
                      size="small"
                      onClick={() => toggleExpanded(violation.id)}
                      endIcon={expandedViolations.has(violation.id) ? <ExpandLess /> : <ExpandMore />}
                    >
                      {expandedViolations.has(violation.id) ? 'Hide Details' : 'Show More Details'}
                    </Button>
                    
                    {expandedViolations.has(violation.id) && (
                      <Box sx={{ mt: 2, p: 2, bgcolor: '#fafafa', borderRadius: 1 }}>
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="subtitle2" color="textSecondary">Witnesses:</Typography>
                            <Typography variant="body2">
                              {violation.witnesses || 'None specified'}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="subtitle2" color="textSecondary">Created:</Typography>
                            <Typography variant="body2">
                              {new Date(violation.createdAt).toLocaleString()}
                            </Typography>
                          </Grid>
                          {violation.updatedAt && (
                            <Grid item xs={12} sm={6}>
                              <Typography variant="subtitle2" color="textSecondary">Last Updated:</Typography>
                              <Typography variant="body2">
                                {new Date(violation.updatedAt).toLocaleString()}
                              </Typography>
                            </Grid>
                          )}
                        </Grid>
                      </Box>
                    )}
                  </Box>

                  {/* Comments Section */}
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2" color="primary.main">
                      Comments ({violation.comments?.length || 0})
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <Tooltip title="View Full Details">
                        <IconButton 
                          size="small" 
                          onClick={() => handleViewDetails(violation)}
                          color="primary"
                        >
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Box>
                  
                  {violation.comments && violation.comments.length > 0 ? (
                    <List dense>
                      {violation.comments.slice(0, 3).map((comment, index) => (
                        <ListItem key={index} sx={{ pl: 0 }}>
                          <ListItemAvatar>
                            <Avatar sx={{ width: 32, height: 32, fontSize: '0.875rem' }}>
                              {comment.author?.charAt(0).toUpperCase()}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={comment.text}
                            secondary={
                              <Typography variant="caption" color="textSecondary">
                                {comment.author} • {new Date(comment.timestamp).toLocaleString()}
                              </Typography>
                            }
                          />
                        </ListItem>
                      ))}
                      {violation.comments.length > 3 && (
                        <ListItem sx={{ pl: 0 }}>
                          <Typography variant="body2" color="textSecondary">
                            ... and {violation.comments.length - 3} more comments
                          </Typography>
                        </ListItem>
                      )}
                    </List>
                  ) : (
                    <Typography variant="body2" color="textSecondary">No comments yet.</Typography>
                  )}

                  {/* Add Comment */}
                  <Box sx={{ mt: 2 }}>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      placeholder="Add a comment..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      sx={{ mb: 1 }}
                    />
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => handleAddComment(violation.id)}
                      disabled={!comment.trim()}
                      startIcon={<Comment />}
                    >
                      Add Comment
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Detailed Violation Dialog */}
      <Dialog 
        open={openDetailDialog} 
        onClose={() => setOpenDetailDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Violation Details
            </Typography>
            <IconButton onClick={() => setOpenDetailDialog(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedViolation && (
            <Box>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="h5" gutterBottom color="primary.main" fontWeight={600}>
                    {selectedViolation.violation}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                    <Chip 
                      label={selectedViolation.classification} 
                      color={getClassificationColor(selectedViolation.classification)}
                    />
                    {selectedViolation.severity && (
                      <Chip 
                        label={selectedViolation.severity} 
                        color={getSeverityColor(selectedViolation.severity)}
                      />
                    )}
                    <Chip 
                      label={selectedViolation.status || 'Pending'} 
                      color={getStatusColor(selectedViolation.status)}
                    />
                  </Stack>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>Description</Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {selectedViolation.description || 'No description provided'}
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>Basic Information</Typography>
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Date:</TableCell>
                        <TableCell>{selectedViolation.date}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Time:</TableCell>
                        <TableCell>{selectedViolation.time || 'N/A'}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Location:</TableCell>
                        <TableCell>{selectedViolation.location || 'N/A'}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Reported By:</TableCell>
                        <TableCell>{selectedViolation.reportedBy || 'N/A'}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Witnesses:</TableCell>
                        <TableCell>{selectedViolation.witnesses || 'None specified'}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>Timestamps</Typography>
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Created:</TableCell>
                        <TableCell>{new Date(selectedViolation.createdAt).toLocaleString()}</TableCell>
                      </TableRow>
                      {selectedViolation.updatedAt && (
                        <TableRow>
                          <TableCell sx={{ fontWeight: 'bold' }}>Last Updated:</TableCell>
                          <TableCell>{new Date(selectedViolation.updatedAt).toLocaleString()}</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </Grid>

                {selectedViolation.actionTaken && (
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>Action Taken</Typography>
                    <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                      <Typography variant="body1">
                        {selectedViolation.actionTaken}
                      </Typography>
                    </Box>
                  </Grid>
                )}

                {selectedViolation.image && (
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>Evidence</Typography>
                    <Box sx={{ textAlign: 'center' }}>
                      <img 
                        src={selectedViolation.image} 
                        alt="Violation evidence" 
                        style={{ 
                          maxWidth: '100%', 
                          maxHeight: '400px', 
                          borderRadius: '8px',
                          border: '1px solid #e0e0e0'
                        }}
                      />
                    </Box>
                  </Grid>
                )}

                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Comments ({selectedViolation.comments?.length || 0})
                  </Typography>
                  {selectedViolation.comments && selectedViolation.comments.length > 0 ? (
                    <List>
                      {selectedViolation.comments.map((comment, index) => (
                        <ListItem key={index} sx={{ pl: 0 }}>
                          <ListItemAvatar>
                            <Avatar>
                              {comment.author?.charAt(0).toUpperCase()}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={comment.text}
                            secondary={
                              <Typography variant="caption" color="textSecondary">
                                {comment.author} • {new Date(comment.timestamp).toLocaleString()}
                              </Typography>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="textSecondary">No comments yet.</Typography>
                  )}
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDetailDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
} 