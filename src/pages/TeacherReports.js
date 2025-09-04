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
  Alert,
  MenuItem
} from '@mui/material';
import {
  Visibility,
  Search,
  Person,
  Warning,
  CheckCircle,
  Cancel,
  Schedule,
  FilterList,
  Add
} from '@mui/icons-material';
import { collection, query, where, getDocs, orderBy, addDoc, deleteDoc, doc } from 'firebase/firestore';
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

// Quick report options
const violationTypes = [
  'Academic Dishonesty',
  'Disruptive Behavior',
  'Dress Code Violation',
  'Late to Class',
  'Absent Without Permission',
  'Bullying',
  'Cheating',
  'Plagiarism',
  'Inappropriate Language',
  'Cell Phone Use',
  'Food/Drink in Class',
  'Other'
];

const severityLevels = ['Minor', 'Moderate', 'Major', 'Critical'];

export default function TeacherReports() {
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedViolation, setSelectedViolation] = useState(null);
  const [viewDialog, setViewDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentUser, setCurrentUser] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  // New state for quick report
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentResults, setStudentResults] = useState([]);
  const [studentSearching, setStudentSearching] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportForm, setReportForm] = useState({
    violationType: '',
    severity: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    location: '',
    customViolationType: ''
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      console.log('Auth state changed in TeacherReports:', user);
      setCurrentUser(user);
      if (user) {
        console.log('User authenticated, fetching violations for:', user.uid);
        fetchTeacherViolations(user.uid);
      } else {
        console.log('No user authenticated');
        setViolations([]);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  // Load students
  useEffect(() => {
    const loadStudents = async () => {
      if (!currentUser?.uid) return;
      try {
        console.log('Loading students for teacher:', currentUser.uid);
        const studentsQuery = query(collection(db, 'users'), where('role', '==', 'Student'));
        const snapshot = await getDocs(studentsQuery);
        const data = snapshot.docs.map(d => {
          const docData = d.data();
          const fullName = docData.fullName || `${docData.firstName || ''} ${docData.lastName || ''}`.trim();
          return { id: d.id, ...docData, fullName };
        });
        data.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
        setStudents(data);
        console.log(`Loaded ${data.length} students successfully`);
        
        if (data.length === 0) {
          setSnackbar({ 
            open: true, 
            message: 'No students found in the system. Please contact an administrator.', 
            severity: 'warning' 
          });
        }
      } catch (error) {
        console.error('Failed to load students:', error);
        setSnackbar({ 
          open: true, 
          message: 'Failed to load students. Please refresh the page and try again.', 
          severity: 'error' 
        });
      }
    };
    loadStudents();
  }, [currentUser]);

  // Search students by ID or name
  useEffect(() => {
    if (!studentSearch) {
      setStudentResults([]);
      return;
    }
    const perform = () => {
      const term = studentSearch.toLowerCase();
      const results = students.filter(s => {
        const fullName = (s.fullName || `${s.firstName || ''} ${s.lastName || ''}`.trim()).toLowerCase();
        const idNum = (s.studentId || '').toLowerCase();
        return fullName.includes(term) || idNum.includes(term);
      });
      setStudentResults(results.slice(0, 20));
    };
    setStudentSearching(true);
    const id = setTimeout(() => {
      perform();
      setStudentSearching(false);
    }, 250);
    return () => clearTimeout(id);
  }, [studentSearch, students]);

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

  // Test database connection and permissions
  const testDatabaseConnection = async () => {
    try {
      console.log('Testing database connection...');
      
      // Test if we can read from violations collection
      const testQuery = query(collection(db, 'violations'), where('reportedBy', '==', currentUser?.uid));
      const testSnapshot = await getDocs(testQuery);
      console.log('Database read test passed. Found violations:', testSnapshot.docs.length);
      
      // Test if we can write to violations collection (just a test document)
      const testDoc = {
        test: true,
        timestamp: new Date().toISOString(),
        teacherId: currentUser?.uid
      };
      
      const testRef = await addDoc(collection(db, 'violations'), testDoc);
      console.log('Database write test passed. Test document ID:', testRef.id);
      
      // Clean up test document
      await deleteDoc(doc(db, 'violations', testRef.id));
      console.log('Test document cleaned up successfully');
      
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  };

  // Submit quick report
  const handleSubmitQuickReport = async () => {
    if (!selectedStudent) {
      setSnackbar({ open: true, message: 'Please select a student to report.', severity: 'warning' });
      return;
    }
    if (!reportForm.violationType || !reportForm.severity || !reportForm.description.trim()) {
      setSnackbar({ open: true, message: 'Please fill in violation type, severity, and description.', severity: 'error' });
      return;
    }
    
    if (reportForm.violationType === 'Other' && !reportForm.customViolationType.trim()) {
      setSnackbar({ open: true, message: 'Please specify the custom violation type.', severity: 'error' });
      return;
    }

    setReportSubmitting(true);
    try {
      // Validate current user
      if (!currentUser || !currentUser.uid) {
        throw new Error('User not authenticated');
      }

      // Validate student data
      if (!selectedStudent.id || !selectedStudent.fullName) {
        throw new Error('Invalid student data');
      }

      const violationData = {
        studentId: selectedStudent.id,
        studentName: selectedStudent.fullName,
        studentEmail: selectedStudent.email || '',
        studentIdNumber: selectedStudent.studentId || '',
        violationType: reportForm.violationType === 'Other' ? reportForm.customViolationType.trim() : reportForm.violationType,
        severity: reportForm.severity,
        description: reportForm.description.trim(),
        date: reportForm.date,
        time: reportForm.time,
        location: reportForm.location.trim() || '',
        reportedBy: currentUser.uid,
        reportedByEmail: currentUser.email || '',
        reportedByName: currentUser.displayName || 'Teacher',
        status: 'Pending',
        adminReviewed: false,
        adminDecision: null,
        adminReviewDate: null,
        adminReviewReason: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      console.log('Submitting violation data:', violationData);
      console.log('Current user:', currentUser);

      // First, try to save the violation
      let violationRef;
      try {
        violationRef = await addDoc(collection(db, 'violations'), violationData);
        console.log('Violation saved successfully with ID:', violationRef.id);
      } catch (violationError) {
        console.error('Error saving violation:', violationError);
        throw new Error(`Failed to save violation: ${violationError.message}`);
      }

      // Try to create student notification
      let studentNotificationCreated = false;
      try {
        if (selectedStudent.email) {
          await addDoc(collection(db, 'notifications'), {
            recipientId: selectedStudent.id,
            recipientEmail: selectedStudent.email,
            recipientName: selectedStudent.fullName,
            title: 'Violation Report Filed',
            message: `You have been reported for a violation: ${reportForm.violationType === 'Other' ? reportForm.customViolationType.trim() : reportForm.violationType} by ${currentUser.displayName || 'Teacher'}. The case is under review by administration.`,
            type: 'violation_report',
            violationId: violationRef.id,
            senderId: currentUser.uid,
            senderEmail: currentUser.email || '',
            senderName: currentUser.displayName || 'Teacher',
            read: false,
            createdAt: new Date().toISOString(),
            priority: 'high'
          });
          console.log('Student notification created successfully');
          studentNotificationCreated = true;
        }
      } catch (notificationError) {
        console.error('Error creating student notification:', notificationError);
        // Don't fail the entire process if notification fails
      }

      // Try to create admin notification
      let adminNotificationCreated = false;
      try {
        await addDoc(collection(db, 'admin_notifications'), {
          title: 'New Violation Report',
          message: `${currentUser.displayName || 'Teacher'} has reported ${selectedStudent.fullName} for ${reportForm.violationType === 'Other' ? reportForm.customViolationType.trim() : reportForm.violationType}.`,
          type: 'violation_review',
          violationId: violationRef.id,
          teacherId: currentUser.uid,
          teacherEmail: currentUser.email || '',
          teacherName: currentUser.displayName || 'Teacher',
          studentId: selectedStudent.id,
          studentName: selectedStudent.fullName,
          studentEmail: selectedStudent.email || '',
          violationType: reportForm.violationType === 'Other' ? reportForm.customViolationType.trim() : reportForm.violationType,
          severity: reportForm.severity,
          read: false,
          createdAt: new Date().toISOString(),
          priority: 'high'
        });
        console.log('Admin notification created successfully');
        adminNotificationCreated = true;
      } catch (adminNotificationError) {
        console.error('Error creating admin notification:', adminNotificationError);
        // Don't fail the entire process if notification fails
      }

      // Update the local state
      const newViolation = { id: violationRef.id, ...violationData };
      setViolations(prev => [newViolation, ...prev]);

      // Show success message
      let successMessage = `Successfully reported ${selectedStudent.fullName} for ${reportForm.violationType === 'Other' ? reportForm.customViolationType.trim() : reportForm.violationType}.`;
      
      if (!studentNotificationCreated) {
        successMessage += ' Note: Student notification failed.';
      }
      if (!adminNotificationCreated) {
        successMessage += ' Note: Admin notification failed.';
      }
      
      successMessage += ' Admin will review the case.';

      setSnackbar({ 
        open: true, 
        message: successMessage, 
        severity: 'success' 
      });

      // Reset form and close dialog
      setReportOpen(false);
      setReportForm({
        violationType: '',
        severity: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().slice(0, 5),
        location: '',
        customViolationType: ''
      });
      setSelectedStudent(null);

    } catch (error) {
      console.error('Error submitting quick report:', error);
      
      let errorMessage = 'Failed to submit report. Please try again.';
      
      if (error.message.includes('User not authenticated')) {
        errorMessage = 'Authentication error. Please refresh the page and try again.';
      } else if (error.message.includes('Invalid student data')) {
        errorMessage = 'Invalid student information. Please select a student again.';
      } else if (error.message.includes('Failed to save violation')) {
        errorMessage = 'Database error. Please check your connection and try again.';
      } else if (error.code === 'permission-denied') {
        errorMessage = 'Permission denied. Please check your account permissions.';
      } else if (error.code === 'unavailable') {
        errorMessage = 'Database temporarily unavailable. Please try again in a moment.';
      } else if (error.code === 'deadline-exceeded') {
        errorMessage = 'Request timed out. Please check your connection and try again.';
      }
      
      setSnackbar({ 
        open: true, 
        message: errorMessage, 
        severity: 'error' 
      });
    } finally {
      setReportSubmitting(false);
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

        {/* Search, Filter, and Quick Report */}
        <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
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
            sx={{ minWidth: 280, flex: 1 }}
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
          <Box sx={{ minWidth: 280, flex: 1, position: 'relative' }}>
            <TextField
              label="Search Student (ID or Name)"
              placeholder="Type ID or name..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
                endAdornment: studentSearching ? (
                  <InputAdornment position="end">
                    <CircularProgress size={18} />
                  </InputAdornment>
                ) : null
              }}
              sx={{ width: '100%' }}
            />
            {studentResults.length > 0 && (
              <Paper elevation={3} sx={{ position: 'absolute', left: 0, right: 0, zIndex: 10, mt: 1, maxHeight: 240, overflow: 'auto' }}>
                {studentResults.map(s => (
                  <Box key={s.id} sx={{ p: 1.5, display: 'flex', alignItems: 'center', cursor: 'pointer', '&:hover': { bgcolor: '#f5f5f5' } }} onClick={() => { setSelectedStudent(s); setStudentResults([]); setStudentSearch(s.fullName || s.studentId || ''); }}>
                    <Avatar sx={{ width: 28, height: 28, mr: 1 }}>
                      <Person />
                    </Avatar>
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="body2" fontWeight={600}>{s.fullName || `${s.firstName || ''} ${s.lastName || ''}`.trim()}</Typography>
                      <Typography variant="caption" color="text.secondary">{s.studentId ? `ID: ${s.studentId}` : ''} {s.email ? `• ${s.email}` : ''}</Typography>
                    </Box>
                  </Box>
                ))}
              </Paper>
            )}
          </Box>
          <Button
            variant="contained"
            color="warning"
            startIcon={reportSubmitting ? <CircularProgress size={18} /> : <Add />}
            disabled={reportSubmitting}
            onClick={() => {
              if (!selectedStudent) {
                setSnackbar({ open: true, message: 'Please select a student first.', severity: 'warning' });
                return;
              }
              setReportOpen(true);
            }}
            sx={{ whiteSpace: 'nowrap' }}
          >
            Report Student
          </Button>
          <Button
            variant="outlined"
            color="info"
            size="small"
            onClick={async () => {
              const isConnected = await testDatabaseConnection();
              if (isConnected) {
                setSnackbar({ open: true, message: 'Database connection test passed!', severity: 'success' });
              } else {
                setSnackbar({ open: true, message: 'Database connection test failed. Check console for details.', severity: 'error' });
              }
            }}
            sx={{ whiteSpace: 'nowrap' }}
          >
            Test DB
          </Button>
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

      {/* Quick Report Dialog */}
      <Dialog open={reportOpen} onClose={() => setReportOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Warning sx={{ color: 'warning.main', mr: 1 }} />
            <Typography variant="h6">
              Report Violation - {selectedStudent?.fullName || 'Select student'}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="Violation Type *"
                value={reportForm.violationType}
                onChange={(e) => setReportForm(prev => ({ ...prev, violationType: e.target.value }))}
                required
                SelectProps={{
                  MenuProps: {
                    PaperProps: {
                      style: {
                        maxHeight: 300
                      }
                    }
                  }
                }}
              >
                {violationTypes.map(type => (
                  <MenuItem key={type} value={type}>{type}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="Severity *"
                value={reportForm.severity}
                onChange={(e) => setReportForm(prev => ({ ...prev, severity: e.target.value }))}
                required
                SelectProps={{
                  MenuProps: {
                    PaperProps: {
                      style: {
                        maxHeight: 300
                      }
                    }
                  }
                }}
              >
                {severityLevels.map(level => (
                  <MenuItem key={level} value={level}>{level}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="Date *"
                InputLabelProps={{ shrink: true }}
                value={reportForm.date}
                onChange={(e) => setReportForm(prev => ({ ...prev, date: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="time"
                label="Time *"
                InputLabelProps={{ shrink: true }}
                value={reportForm.time}
                onChange={(e) => setReportForm(prev => ({ ...prev, time: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Location (optional)"
                value={reportForm.location}
                onChange={(e) => setReportForm(prev => ({ ...prev, location: e.target.value }))}
                placeholder="e.g., Room 101, Library, Cafeteria"
              />
            </Grid>
            {reportForm.violationType === 'Other' && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Specify Violation Type *"
                  placeholder="Enter the specific violation type..."
                  value={reportForm.customViolationType}
                  onChange={(e) => setReportForm(prev => ({ ...prev, customViolationType: e.target.value }))}
                  required
                />
              </Grid>
            )}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                minRows={3}
                label="Description *"
                placeholder="Provide a detailed description of the violation..."
                value={reportForm.description}
                onChange={(e) => setReportForm(prev => ({ ...prev, description: e.target.value }))}
                required
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReportOpen(false)} disabled={reportSubmitting}>Cancel</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleSubmitQuickReport}
            disabled={reportSubmitting || !reportForm.violationType || !reportForm.severity || !reportForm.description.trim() || (reportForm.violationType === 'Other' && !reportForm.customViolationType.trim())}
            startIcon={reportSubmitting ? <CircularProgress size={18} /> : <Add />}
          >
            {reportSubmitting ? 'Submitting...' : 'Submit Report'}
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