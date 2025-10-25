import React, { useState, useEffect } from "react";
import { 
  Box, Grid, Card, CardContent, Typography, TextField, Button, Paper, Avatar, Snackbar, Alert, 
  List, ListItem, ListItemText, ListItemAvatar, Chip, Divider, Dialog, DialogTitle, DialogContent,
  DialogActions, IconButton, Tooltip, Stack, Badge, CircularProgress, Tabs, Tab, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, useTheme
} from "@mui/material";
import { 
  Warning, CheckCircle, CalendarToday, AccessTime, LocationOn, Person, Comment,
  Visibility, Edit, Delete, FilterList, Search, Assignment, PendingActions, DoneAll,
  PriorityHigh, Description, Close, ExpandMore, ExpandLess
} from "@mui/icons-material";
import { db, auth } from "../firebase";
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, updateDoc } from "firebase/firestore";

export default function UserViolations({ currentUser }) {
  const theme = useTheme();
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
  const [imagePreview, setImagePreview] = useState(null);
  const [viewDetails, setViewDetails] = useState(null);

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

    console.log("UserViolations - Setting up listener for user:", activeUser.email);
    
    const violationsQuery = query(
      collection(db, "violations"),
      where("studentEmail", "==", activeUser.email),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(violationsQuery, (snapshot) => {
      const violationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log("UserViolations - Received violations:", violationsData.length);
      setViolations(violationsData);
      setLoading(false);
    }, (error) => {
      console.error("UserViolations - Error fetching violations:", error);
      setLoading(false);
    });

    return unsubscribe;
  }, [activeUser?.email]);

  // Calculate statistics
  const stats = {
    total: violations.length,
    pending: violations.filter(v => v.status === 'Pending').length,
    solved: violations.filter(v => v.status === 'Solved').length,
    critical: violations.filter(v => v.severity === 'Critical').length
  };

  // Filter violations based on search and filters
  const filteredViolations = violations.filter(violation => {
    const matchesSearch = !searchTerm || 
      violation.violation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      violation.classification?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      violation.reportedBy?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || violation.status === filterStatus;
    const matchesSeverity = filterSeverity === 'all' || violation.severity === filterSeverity;
    
    return matchesSearch && matchesStatus && matchesSeverity;
  });

  const getClassificationColor = (classification) => {
    switch (classification) {
      case 'Grave': return 'error';
      case 'Serious': return 'warning';
      case 'Major': return 'info';
      case 'Minor': return 'success';
      default: return 'default';
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
    setViewDetails(violation);
  };


  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ 
        fontWeight: 700, 
        color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000', 
        mb: 3 
      }}>
        📋 My Violation Records
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        View and track your violation records and their current status.
      </Typography>

      {/* Statistics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ boxShadow: 2, borderLeft: '4px solid #800000', background: 'transparent', borderRadius: 2 }}>
            <CardContent sx={{ textAlign: 'center', p: 2 }}>
              <Typography variant="h4" fontWeight={700} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>
                {stats.total}
              </Typography>
              <Typography variant="body2" color="textSecondary">Total Violations</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ boxShadow: 2, borderLeft: '4px solid #800000', background: 'transparent', borderRadius: 2 }}>
            <CardContent sx={{ textAlign: 'center', p: 2 }}>
              <Typography variant="h4" fontWeight={700} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>
                {stats.pending}
              </Typography>
              <Typography variant="body2" color="textSecondary">Pending</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ boxShadow: 2, borderLeft: '4px solid #800000', background: 'transparent', borderRadius: 2 }}>
            <CardContent sx={{ textAlign: 'center', p: 2 }}>
              <Typography variant="h4" fontWeight={700} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>
                {stats.solved}
              </Typography>
              <Typography variant="body2" color="textSecondary">Resolved</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ boxShadow: 2, borderLeft: '4px solid #800000', background: 'transparent', borderRadius: 2 }}>
            <CardContent sx={{ textAlign: 'center', p: 2 }}>
              <Typography variant="h4" fontWeight={700} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>
                {stats.critical}
              </Typography>
              <Typography variant="body2" color="textSecondary">Critical</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Filter Bar */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search violations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Grid>
          <Grid item xs={12} sm={3} md={2}>
            <TextField
              select
              fullWidth
              size="small"
              label="Status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="Pending">Pending</MenuItem>
              <MenuItem value="Solved">Solved</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={3} md={2}>
            <TextField
              select
              fullWidth
              size="small"
              label="Severity"
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
        </Grid>
      </Paper>

      {/* Violations List */}
      {filteredViolations.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 4 }}>
          <CardContent>
            <Warning sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {searchTerm || filterStatus !== 'all' || filterSeverity !== 'all' 
                ? 'No violations found matching your criteria' 
                : 'No violations found'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {searchTerm || filterStatus !== 'all' || filterSeverity !== 'all' 
                ? 'Try adjusting your search or filters' 
                : 'You have a clean record!'}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {filteredViolations.map((violation) => (
            <Grid item xs={12} sm={6} md={4} key={violation.id}>
              <Card sx={{ 
                border: '1px solid #e0e0e0',
                borderLeft: '4px solid #800000',
                borderRadius: 2,
                bgcolor: '#ffffff',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                transition: 'box-shadow 0.2s',
                '&:hover': {
                  boxShadow: '0 4px 8px rgba(0,0,0,0.15)'
                }
              }}>
                <CardContent sx={{ p: 3, textAlign: 'center' }}>
                  {/* Large Number at Top - Exactly like the image */}
                  <Typography variant="h2" fontWeight={700} color="#000000" sx={{ mb: 2, fontSize: '3rem' }}>
                    {violation.id ? violation.id.slice(-2) : '01'}
                  </Typography>
                  
                  {/* Descriptive Text Below - Exactly like the image */}
                  <Typography variant="h6" fontWeight={400} color="#333333" sx={{ fontSize: '1.1rem' }}>
                    {violation.violation}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Image Preview Modal */}
      <Dialog open={!!imagePreview} onClose={() => setImagePreview(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: 'primary.main' }}>Violation Evidence Image</DialogTitle>
        <DialogContent>
          {imagePreview && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 2, bgcolor: '#f5f6fa', borderRadius: 2 }}>
              <img
                src={imagePreview}
                alt="Violation Evidence"
                style={{
                  maxWidth: '100%',
                  maxHeight: '70vh',
                  objectFit: 'contain',
                  borderRadius: 8,
                  boxShadow: '0 2px 16px #0002'
                }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImagePreview(null)} variant="contained" color="primary">Close</Button>
        </DialogActions>
      </Dialog>

      {/* View Details Modal */}
      <Dialog open={!!viewDetails} onClose={() => setViewDetails(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: 'primary.main' }}>Violation Details</DialogTitle>
        <DialogContent>
          {viewDetails && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Violation</Typography>
                  <Typography variant="body1" fontWeight={600}>{viewDetails.violation}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Classification</Typography>
                  <Typography variant="body1">{viewDetails.classification}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Severity</Typography>
                  <Typography variant="body1">{viewDetails.severity || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Status</Typography>
                  <Typography variant="body1">{viewDetails.status || 'Pending'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Date</Typography>
                  <Typography variant="body1">{viewDetails.date}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Time</Typography>
                  <Typography variant="body1">{viewDetails.time || 'N/A'}</Typography>
                </Grid>
                {viewDetails.location && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="textSecondary">Location</Typography>
                    <Typography variant="body1">{viewDetails.location}</Typography>
                  </Grid>
                )}
                {viewDetails.reportedBy && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="textSecondary">Reported By</Typography>
                    <Typography variant="body1">{viewDetails.reportedBy}</Typography>
                  </Grid>
                )}
                {viewDetails.actionTaken && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="textSecondary">Action Taken</Typography>
                    <Typography variant="body1">{viewDetails.actionTaken}</Typography>
                  </Grid>
                )}
                {viewDetails.witnesses && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="textSecondary">Witnesses</Typography>
                    <Typography variant="body1">{viewDetails.witnesses}</Typography>
                  </Grid>
                )}
                {viewDetails.description && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="textSecondary">Description</Typography>
                    <Typography variant="body1">{viewDetails.description}</Typography>
                  </Grid>
                )}
              </Grid>
              {viewDetails.image && (
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                  <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 1 }}>Evidence</Typography>
                  <img 
                    src={viewDetails.image} 
                    alt="Evidence" 
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: 300, 
                      borderRadius: 8,
                      border: '1px solid #e0e0e0'
                    }} 
                  />
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDetails(null)} color="primary">Close</Button>
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
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}