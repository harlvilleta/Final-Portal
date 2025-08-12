import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Card,
  CardContent,
  Divider,
  TextField,
  InputAdornment,
  CircularProgress,
  Snackbar,
  Alert
} from '@mui/material';
import {
  Visibility,
  Search,
  Person,
  Warning,
  CheckCircle,
  Cancel,
  Schedule,
  FilterList
} from '@mui/icons-material';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';

const statusColors = {
  'Pending': 'warning',
  'Approved': 'success',
  'Denied': 'error'
};

const severityColors = {
  'Minor': 'success',
  'Moderate': 'warning',
  'Major': 'error',
  'Critical': 'error'
};

export default function TeacherReports() {
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedViolation, setSelectedViolation] = useState(null);
  const [viewDialog, setViewDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentUser, setCurrentUser] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      if (user) {
        fetchTeacherViolations(user.uid);
      }
    });

    return unsubscribe;
  }, []);

  const fetchTeacherViolations = async (teacherId) => {
    setLoading(true);
    try {
      console.log('Fetching violations for teacher ID:', teacherId);
      
      // Fetch violations reported by this teacher
      const violationsQuery = query(
        collection(db, 'violations'),
        where('reportedBy', '==', teacherId),
        orderBy('createdAt', 'desc')
      );
      
      console.log('Query created, executing...');
      const querySnapshot = await getDocs(violationsQuery);
      console.log('Query executed, processing results...');
      
      const violationsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      console.log('Violations data:', violationsData);
      setViolations(violationsData);
      console.log(`Found ${violationsData.length} violations reported by teacher`);
      
      if (violationsData.length === 0) {
        setSnackbar({ 
          open: true, 
          message: 'No violations found. You haven\'t reported any violations yet.', 
          severity: 'info' 
        });
      }
    } catch (error) {
      console.error('Error fetching teacher violations:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        teacherId: teacherId
      });
      
      // Try a simpler query without orderBy to see if that's the issue
      try {
        console.log('Trying simpler query without orderBy...');
        const simpleQuery = query(
          collection(db, 'violations'),
          where('reportedBy', '==', teacherId)
        );
        
        const simpleSnapshot = await getDocs(simpleQuery);
        const simpleData = simpleSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Sort manually
        const sortedData = simpleData.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
          const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
          return dateB - dateA;
        });
        
        setViolations(sortedData);
        console.log(`Found ${sortedData.length} violations with simple query`);
        
        if (sortedData.length === 0) {
          setSnackbar({ 
            open: true, 
            message: 'No violations found. You haven\'t reported any violations yet.', 
            severity: 'info' 
          });
        }
      } catch (simpleError) {
        console.error('Simple query also failed:', simpleError);
        
        // Final fallback: fetch all violations and filter client-side
        try {
          console.log('Trying fallback: fetch all violations and filter client-side...');
          const allViolationsQuery = query(collection(db, 'violations'));
          const allSnapshot = await getDocs(allViolationsQuery);
          const allViolations = allSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
          // Filter for this teacher's violations
          const teacherViolations = allViolations.filter(v => v.reportedBy === teacherId);
          
          // Sort manually
          const sortedTeacherViolations = teacherViolations.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
            const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
            return dateB - dateA;
          });
          
          setViolations(sortedTeacherViolations);
          console.log(`Found ${sortedTeacherViolations.length} violations with fallback method`);
          
          if (sortedTeacherViolations.length === 0) {
            setSnackbar({ 
              open: true, 
              message: 'No violations found. You haven\'t reported any violations yet.', 
              severity: 'info' 
            });
          } else {
            setSnackbar({ 
              open: true, 
              message: `Loaded ${sortedTeacherViolations.length} violations using fallback method.`, 
              severity: 'warning' 
            });
          }
        } catch (fallbackError) {
          console.error('All methods failed:', fallbackError);
          setSnackbar({ 
            open: true, 
            message: `Error loading violations: ${error.message}. Please check your connection and try again.`, 
            severity: 'error' 
          });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (violation) => {
    setSelectedViolation(violation);
    setViewDialog(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Approved':
        return <CheckCircle color="success" />;
      case 'Denied':
        return <Cancel color="error" />;
      case 'Pending':
        return <Schedule color="warning" />;
      default:
        return <Warning color="default" />;
    }
  };

  // Filter violations based on search and status
  const filteredViolations = violations.filter(violation => {
    const matchesSearch = 
      violation.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      violation.violationType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      violation.studentIdNumber?.includes(searchQuery);
    
    const matchesStatus = statusFilter === 'All' || violation.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Statistics
  const totalViolations = violations.length;
  const pendingViolations = violations.filter(v => v.status === 'Pending').length;
  const approvedViolations = violations.filter(v => v.status === 'Approved').length;
  const deniedViolations = violations.filter(v => v.status === 'Denied').length;

  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
        <Typography variant="h4" gutterBottom color="primary" sx={{ fontWeight: 700, mb: 3 }}>
          📋 My Reported Violations
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          View and track all violations you have reported. Monitor their status and admin decisions.
        </Typography>

        {/* Statistics Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#e3f2fd', border: '2px solid #2196f3' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary" fontWeight={700}>
                  {totalViolations}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Reports
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#fff3e0', border: '2px solid #ff9800' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="warning.main" fontWeight={700}>
                  {pendingViolations}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Pending Review
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#e8f5e8', border: '2px solid #4caf50' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="success.main" fontWeight={700}>
                  {approvedViolations}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Approved
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#ffebee', border: '2px solid #f44336' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="error.main" fontWeight={700}>
                  {deniedViolations}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Denied
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Search and Filter */}
        <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            placeholder="Search by student name, ID, or violation type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 300, flex: 1 }}
          />
          <TextField
            select
            label="Status Filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ minWidth: 150 }}
          >
            <option value="All">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Denied">Denied</option>
          </TextField>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh' }}>
            <CircularProgress size={60} />
            <Typography variant="h6" sx={{ ml: 2 }}>
              Loading your reports...
            </Typography>
          </Box>
        ) : (
          <TableContainer component={Paper} elevation={2}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'primary.main' }}>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>Date Reported</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>Student</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>Violation Type</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>Severity</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredViolations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography variant="h6" color="text.secondary">
                        {violations.length === 0 ? 'No violations reported yet.' : 'No violations match your search criteria.'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : filteredViolations.map((violation) => (
                  <TableRow key={violation.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {formatDate(violation.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar 
                          sx={{ 
                            width: 32, 
                            height: 32, 
                            mr: 1,
                            bgcolor: 'primary.main'
                          }}
                        >
                          <Person />
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            {violation.studentName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ID: {violation.studentIdNumber}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {violation.violationType}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={violation.severity} 
                        size="small" 
                        color={severityColors[violation.severity]}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {getStatusIcon(violation.status)}
                        <Chip 
                          label={violation.status} 
                          size="small" 
                          color={statusColors[violation.status]}
                          sx={{ ml: 1 }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View Details">
                        <IconButton 
                          size="small" 
                          onClick={() => handleViewDetails(violation)}
                          color="primary"
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
      </Paper>

      {/* View Details Dialog */}
      <Dialog 
        open={viewDialog} 
        onClose={() => setViewDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Visibility sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">
              Violation Report Details
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedViolation && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="h5" gutterBottom fontWeight={600}>
                    {selectedViolation.violationType}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Student Information
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Person sx={{ mr: 1, color: 'primary.main' }} />
                        <Typography variant="body1" fontWeight={500}>
                          {selectedViolation.studentName}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        ID: {selectedViolation.studentIdNumber}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Email: {selectedViolation.studentEmail}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Report Details
                      </Typography>
                      <Typography variant="body2">
                        <strong>Date:</strong> {selectedViolation.date}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Time:</strong> {selectedViolation.time}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Location:</strong> {selectedViolation.location || 'N/A'}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Reported:</strong> {formatDate(selectedViolation.createdAt)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Violation Details
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2">
                          <strong>Type:</strong> {selectedViolation.violationType}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2">
                          <strong>Severity:</strong> 
                          <Chip 
                            label={selectedViolation.severity} 
                            size="small" 
                            color={severityColors[selectedViolation.severity]}
                            sx={{ ml: 1 }}
                          />
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="body2">
                          <strong>Description:</strong>
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 1, p: 2, bgcolor: 'white', borderRadius: 1 }}>
                          {selectedViolation.description}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
                
                {selectedViolation.adminReviewed && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Admin Review
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: '#e8f5e8' }}>
                      <Typography variant="body2">
                        <strong>Decision:</strong> {selectedViolation.adminDecision}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Reviewed:</strong> {formatDate(selectedViolation.adminReviewDate)}
                      </Typography>
                      {selectedViolation.adminReviewReason && (
                        <Typography variant="body2">
                          <strong>Reason:</strong> {selectedViolation.adminReviewReason}
                        </Typography>
                      )}
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialog(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
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