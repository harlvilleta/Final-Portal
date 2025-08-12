import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  Divider,
  Alert,
  CircularProgress,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextareaAutosize,
  InputAdornment,
  IconButton
} from '@mui/material';
import {
  Search,
  Person,
  Warning,
  Add,
  Clear,
  School,
  Email,
  Phone
} from '@mui/icons-material';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs, addDoc, doc, getDoc } from 'firebase/firestore';

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

const severityLevels = [
  'Minor',
  'Moderate',
  'Major',
  'Critical'
];

export default function TeacherReportViolation() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [reportDialog, setReportDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [currentUser, setCurrentUser] = useState(null);
  
  // Violation report form state
  const [violationType, setViolationType] = useState('');
  const [severity, setSeverity] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));
  const [location, setLocation] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return unsubscribe;
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSnackbar({ open: true, message: 'Please enter a search term', severity: 'warning' });
      return;
    }

    setLoading(true);
    try {
      const usersRef = collection(db, 'users');
      let q;

      // Search by student ID or name
      if (searchQuery.match(/^\d+$/)) {
        // If it's all numbers, search by student ID
        q = query(usersRef, where('role', '==', 'Student'), where('studentId', '==', searchQuery));
      } else {
        // Search by name (first name, last name, or full name)
        q = query(usersRef, where('role', '==', 'Student'));
      }

      const querySnapshot = await getDocs(q);
      const results = [];

      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        const fullName = userData.fullName || `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
        
        // If searching by name, filter results
        if (!searchQuery.match(/^\d+$/) && 
            !fullName.toLowerCase().includes(searchQuery.toLowerCase()) &&
            !userData.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) &&
            !userData.lastName?.toLowerCase().includes(searchQuery.toLowerCase())) {
          return;
        }

        results.push({
          id: doc.id,
          ...userData,
          fullName: fullName
        });
      });

      setSearchResults(results);
      
      if (results.length === 0) {
        setSnackbar({ open: true, message: 'No students found with the provided search criteria', severity: 'info' });
      }
    } catch (error) {
      console.error('Search error:', error);
      setSnackbar({ open: true, message: 'Error searching for students', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    setReportDialog(true);
  };

  const handleSubmitViolation = async () => {
    if (!violationType || !severity || !description.trim()) {
      setSnackbar({ open: true, message: 'Please fill in all required fields', severity: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      const violationData = {
        studentId: selectedStudent.id,
        studentName: selectedStudent.fullName,
        studentEmail: selectedStudent.email,
        studentIdNumber: selectedStudent.studentId,
        violationType,
        severity,
        description: description.trim(),
        date,
        time,
        location: location.trim(),
        reportedBy: currentUser.uid,
        reportedByEmail: currentUser.email,
        reportedByName: currentUser.displayName || 'Teacher',
        status: 'Pending', // Set to pending for admin review
        adminReviewed: false,
        adminDecision: null,
        adminReviewDate: null,
        adminReviewReason: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Save violation to database
      const violationRef = await addDoc(collection(db, 'violations'), violationData);

      // Create notification for the student
      await addDoc(collection(db, 'notifications'), {
        recipientId: selectedStudent.id,
        recipientEmail: selectedStudent.email,
        recipientName: selectedStudent.fullName,
        title: 'Violation Report Filed',
        message: `You have been reported for a violation: ${violationType} by ${currentUser.displayName || 'Teacher'}. The case is under review by administration.`,
        type: 'violation_report',
        violationId: violationRef.id,
        senderId: currentUser.uid,
        senderEmail: currentUser.email,
        senderName: currentUser.displayName || 'Teacher',
        read: false,
        createdAt: new Date().toISOString(),
        priority: 'high'
      });

      // Create notification for admin
      await addDoc(collection(db, 'admin_notifications'), {
        title: 'New Violation Report',
        message: `${currentUser.displayName || 'Teacher'} has reported ${selectedStudent.fullName} for ${violationType}.`,
        type: 'violation_review',
        violationId: violationRef.id,
        teacherId: currentUser.uid,
        teacherEmail: currentUser.email,
        teacherName: currentUser.displayName || 'Teacher',
        studentId: selectedStudent.id,
        studentName: selectedStudent.fullName,
        studentEmail: selectedStudent.email,
        violationType,
        severity,
        read: false,
        createdAt: new Date().toISOString(),
        priority: 'high'
      });

      setSnackbar({ 
        open: true, 
        message: `Violation reported successfully! ${selectedStudent.fullName} has been notified and the case is pending admin review.`, 
        severity: 'success' 
      });

      // Reset form
      setViolationType('');
      setSeverity('');
      setDescription('');
      setLocation('');
      setSelectedStudent(null);
      setReportDialog(false);
      setSearchResults([]);
      setSearchQuery('');

    } catch (error) {
      console.error('Error submitting violation:', error);
      setSnackbar({ open: true, message: 'Error submitting violation report', severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedStudent(null);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
        <Typography variant="h4" gutterBottom color="primary" sx={{ fontWeight: 700, mb: 3 }}>
          🚨 Report Student Violation
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Search for a student by their Student ID or name to report a violation.
        </Typography>

        {/* Search Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
            Search for Student
          </Typography>
          
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="Search by Student ID or Name"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter Student ID (e.g., 2021001) or Name (e.g., John Doe)"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      {searchQuery && (
                        <IconButton onClick={handleClearSearch} size="small">
                          <Clear />
                        </IconButton>
                      )}
                    </InputAdornment>
                  )
                }}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Button
                variant="contained"
                onClick={handleSearch}
                disabled={loading || !searchQuery.trim()}
                startIcon={loading ? <CircularProgress size={20} /> : <Search />}
                fullWidth
                sx={{ py: 1.5 }}
              >
                {loading ? 'Searching...' : 'Search'}
              </Button>
            </Grid>
          </Grid>
        </Box>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
              Search Results ({searchResults.length})
            </Typography>
            
            <Grid container spacing={2}>
              {searchResults.map((student) => (
                <Grid item xs={12} md={6} lg={4} key={student.id}>
                  <Card 
                    elevation={2} 
                    sx={{ 
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: 4
                      }
                    }}
                    onClick={() => handleSelectStudent(student)}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Avatar 
                          src={student.profilePic} 
                          sx={{ 
                            width: 50, 
                            height: 50, 
                            mr: 2,
                            bgcolor: student.profilePic ? 'transparent' : '#1976d2'
                          }}
                        >
                          {!student.profilePic && (student.fullName?.charAt(0) || 'S')}
                        </Avatar>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {student.fullName}
                          </Typography>
                          <Chip 
                            label="Student" 
                            size="small" 
                            color="primary" 
                            variant="outlined"
                          />
                        </Box>
                      </Box>
                      
                      <Divider sx={{ my: 1 }} />
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <School sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          ID: {student.studentId || 'N/A'}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Email sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {student.email}
                        </Typography>
                      </Box>
                      
                      {student.course && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Person sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary">
                            {student.course} - {student.year} {student.section}
                          </Typography>
                        </Box>
                      )}
                      
                      <Button
                        variant="contained"
                        color="warning"
                        startIcon={<Warning />}
                        fullWidth
                        sx={{ mt: 2 }}
                      >
                        Report Violation
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Instructions */}
        {searchResults.length === 0 && !loading && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>How to search:</strong><br/>
              • <strong>Student ID:</strong> Enter the student's ID number (e.g., 2021001)<br/>
              • <strong>Name:</strong> Enter the student's first name, last name, or full name<br/>
              • Click "Search" or press Enter to find students
            </Typography>
          </Alert>
        )}
      </Paper>

      {/* Violation Report Dialog */}
      <Dialog 
        open={reportDialog} 
        onClose={() => setReportDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Warning sx={{ color: 'warning.main', mr: 1 }} />
            <Typography variant="h6">
              Report Violation - {selectedStudent?.fullName}
            </Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Violation Type</InputLabel>
                <Select
                  value={violationType}
                  onChange={(e) => setViolationType(e.target.value)}
                  label="Violation Type"
                >
                  {violationTypes.map((type) => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Severity Level</InputLabel>
                <Select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  label="Severity Level"
                >
                  {severityLevels.map((level) => (
                    <MenuItem key={level} value={level}>{level}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Location (Optional)"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Room 101, Library, Cafeteria"
              />
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Description *
              </Typography>
              <TextareaAutosize
                minRows={4}
                placeholder="Provide a detailed description of the violation..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontFamily: 'inherit',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions sx={{ p: 3 }}>
          <Button 
            onClick={() => setReportDialog(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleSubmitViolation}
            disabled={submitting || !violationType || !severity || !description.trim()}
            startIcon={submitting ? <CircularProgress size={20} /> : <Add />}
          >
            {submitting ? 'Submitting...' : 'Submit Report'}
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