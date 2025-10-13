import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  Snackbar,
  Alert,
  Autocomplete,
  CircularProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Add,
  AttachFile,
  Delete,
  Save
} from '@mui/icons-material';
import { collection, addDoc, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';

const violationTypes = [
  'Cheating',
  'Plagiarism',
  'Disruptive Behavior',
  'Inappropriate Language',
  'Bullying',
  'Tardiness',
  'Absence',
  'Dress Code Violation',
  'Academic Dishonesty',
  'Other'
];

const classifications = [
  'Academic',
  'Behavioral',
  'Disciplinary',
  'Attendance',
  'Other'
];

const severityLevels = [
  'Minor',
  'Moderate',
  'Major',
  'Critical'
];


export default function TeacherViolationRecords() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    studentName: '',
    studentId: '',
    violation: '',
    classification: '',
    severity: '',
    date: new Date().toISOString().split('T')[0],
    time: '',
    location: '',
    reportedBy: '',
    actionTaken: '',
    witnesses: '',
    description: '',
    evidenceImage: null
  });

  const [evidenceFile, setEvidenceFile] = useState(null);
  const [evidencePreview, setEvidencePreview] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          // Fetch user profile to get teacher name
          const userQuery = query(collection(db, 'users'), where('uid', '==', user.uid));
          const userSnapshot = await getDocs(userQuery);
          if (!userSnapshot.empty) {
            const userData = userSnapshot.docs[0].data();
            setUserProfile(userData);
            setFormData(prev => ({
              ...prev,
              reportedBy: userData.fullName || user.displayName || user.email
            }));
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      // Fetch all students from both collections
      const [studentsSnapshot, usersSnapshot] = await Promise.all([
        getDocs(collection(db, 'students')),
        getDocs(query(collection(db, 'users'), where('role', '==', 'Student')))
      ]);

      const studentsData = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const registeredStudents = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Combine and format students for autocomplete
      const allStudents = [...studentsData, ...registeredStudents].map(student => ({
        id: student.id,
        name: student.fullName || `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.name,
        studentId: student.studentId || student.idNumber || student.id,
        email: student.email,
        course: student.course,
        year: student.year,
        section: student.section
      }));

      setStudents(allStudents);
    } catch (error) {
      console.error('Error fetching students:', error);
      setSnackbar({ open: true, message: 'Error loading students', severity: 'error' });
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleStudentSelect = (event, selectedStudent) => {
    if (selectedStudent) {
      setFormData(prev => ({
        ...prev,
        studentName: selectedStudent.name,
        studentId: selectedStudent.studentId
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        studentName: '',
        studentId: ''
      }));
    }
  };

  const handleEvidenceUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setSnackbar({ 
          open: true, 
          message: 'Please select a valid image file', 
          severity: 'error' 
        });
        return;
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        setSnackbar({ 
          open: true, 
          message: 'Image file size must be less than 5MB', 
          severity: 'error' 
        });
        return;
      }
      
      setEvidenceFile(file);
      setFormData(prev => ({ ...prev, evidenceImage: file }));
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setEvidencePreview(e.target.result);
      };
      reader.onerror = () => {
        setSnackbar({ 
          open: true, 
          message: 'Error reading image file', 
          severity: 'error' 
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeEvidence = () => {
    setEvidenceFile(null);
    setEvidencePreview(null);
    setFormData(prev => ({ ...prev, evidenceImage: null }));
  };

  const validateForm = () => {
    const requiredFields = ['studentName', 'violation', 'classification', 'severity', 'date'];
    const missingFields = requiredFields.filter(field => !formData[field]);
    
    if (missingFields.length > 0) {
      setSnackbar({ 
        open: true, 
        message: `Please fill in all required fields: ${missingFields.join(', ')}`, 
        severity: 'error' 
      });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      // Create violation record
      const violationData = {
        studentName: formData.studentName,
        studentId: formData.studentId,
        studentEmail: students.find(s => s.name === formData.studentName)?.email || '',
        violationType: formData.violation,
        classification: formData.classification,
        severity: formData.severity,
        status: 'Pending', // Always set to Pending for new violations
        date: formData.date,
        time: formData.time || null,
        location: formData.location || null,
        reportedBy: formData.reportedBy,
        reportedByName: formData.reportedBy,
        reportedByEmail: currentUser?.email,
        reportedByRole: 'Teacher',
        actionTaken: formData.actionTaken || null,
        witnesses: formData.witnesses || null,
        description: formData.description || null,
        evidenceImage: evidenceFile ? {
          name: evidenceFile.name,
          size: evidenceFile.size,
          type: evidenceFile.type,
          url: evidencePreview
        } : null,
        image: evidencePreview || null, // Store image data for admin dashboard compatibility
        // Debug info for troubleshooting
        imageStored: !!evidencePreview,
        imageSize: evidencePreview ? evidencePreview.length : 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: currentUser?.uid,
        reviewedBy: null,
        reviewDate: null,
        adminNotes: null
      };

      // Add violation to database
      const docRef = await addDoc(collection(db, 'violations'), violationData);
      
      // Create notification for admin
      await addDoc(collection(db, 'notifications'), {
        recipientId: 'admin',
        recipientEmail: 'admin@school.com',
        recipientName: 'Administrator',
        title: 'New Violation Reported',
        message: `Teacher ${formData.reportedBy} has reported a ${formData.severity.toLowerCase()} violation: ${formData.violation} for student ${formData.studentName}`,
        type: 'violation',
        violationId: docRef.id,
        studentName: formData.studentName,
        violationType: formData.violation,
        severity: formData.severity,
        reportedBy: formData.reportedBy,
        senderId: currentUser?.uid,
        senderEmail: currentUser?.email,
        senderName: formData.reportedBy,
        read: false,
        createdAt: new Date().toISOString(),
        priority: formData.severity === 'Critical' ? 'high' : 'medium'
      });

      setSnackbar({ 
        open: true, 
        message: 'Violation recorded successfully! Admin has been notified.', 
        severity: 'success' 
      });

      // Reset form
      setFormData({
        studentName: '',
        studentId: '',
        violation: '',
        classification: '',
        severity: '',
        date: new Date().toISOString().split('T')[0],
        time: '',
        location: '',
        reportedBy: formData.reportedBy, // Keep the teacher's name
        actionTaken: '',
        witnesses: '',
        description: '',
        evidenceImage: null
      });
      setEvidenceFile(null);
      setEvidencePreview(null);

    } catch (error) {
      console.error('Error recording violation:', error);
      setSnackbar({ 
        open: true, 
        message: 'Error recording violation. Please try again.', 
        severity: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: '#800000', mb: 3 }}>
          📋 Violation Records
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Record student violations and notify administrators for review.
        </Typography>

        {/* Add New Violation Form */}
        <Paper elevation={2} sx={{ p: 3, mb: 3, bgcolor: '#fafafa' }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
            Add New Violation
          </Typography>
          
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {/* First Row */}
              <Grid item xs={12} md={6}>
                <Autocomplete
                  options={students}
                  getOptionLabel={(option) => option.name}
                  value={students.find(s => s.name === formData.studentName) || null}
                  onChange={handleStudentSelect}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Student Name *"
                      placeholder="Type to search for a student"
                      required
                    />
                  )}
                  renderOption={(props, option) => (
                    <Box component="li" {...props}>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {option.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.studentId} • {option.course} • {option.year}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Autocomplete
                  options={violationTypes}
                  value={formData.violation}
                  onChange={(event, newValue) => handleInputChange('violation', newValue || '')}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Violation *"
                      placeholder="Type of violation"
                      required
                    />
                  )}
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Autocomplete
                  options={classifications}
                  value={formData.classification}
                  onChange={(event, newValue) => handleInputChange('classification', newValue || '')}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Classification *"
                      placeholder="Select classification"
                      required
                    />
                  )}
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Autocomplete
                  options={severityLevels}
                  value={formData.severity}
                  onChange={(event, newValue) => handleInputChange('severity', newValue || '')}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Severity *"
                      placeholder="Severity level"
                      required
                    />
                  )}
                />
              </Grid>
              

              {/* Second Row */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Date *"
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => handleInputChange('time', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Location"
                  placeholder="Location (optional)"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Reported By"
                  placeholder="Who reported?"
                  value={formData.reportedBy}
                  onChange={(e) => handleInputChange('reportedBy', e.target.value)}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Action Taken"
                  placeholder="Action taken (optional)"
                  value={formData.actionTaken}
                  onChange={(e) => handleInputChange('actionTaken', e.target.value)}
                />
              </Grid>

              {/* Third Row */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Witnesses"
                  placeholder="Witnesses (optional)"
                  value={formData.witnesses}
                  onChange={(e) => handleInputChange('witnesses', e.target.value)}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Description"
                  placeholder="Describe the violation (optional)"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                />
              </Grid>

              {/* Evidence Upload */}
              <Grid item xs={12}>
                <Box sx={{ mb: 2 }}>
                  <input
                    accept="image/*"
                    style={{ display: 'none' }}
                    id="evidence-upload"
                    type="file"
                    onChange={handleEvidenceUpload}
                  />
                  <label htmlFor="evidence-upload">
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={<AttachFile />}
                      sx={{
                        borderColor: '#800000',
                        color: '#800000',
                        '&:hover': {
                          borderColor: '#6b0000',
                          backgroundColor: '#80000010'
                        }
                      }}
                    >
                      ATTACH EVIDENCE IMAGE
                    </Button>
                  </label>
                  
                  {evidenceFile && (
                    <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Selected: {evidenceFile.name}
                      </Typography>
                      <Tooltip title="Remove evidence">
                        <IconButton size="small" onClick={removeEvidence} color="error">
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  )}
                  
                  {evidencePreview && (
                    <Box sx={{ mt: 2 }}>
                      <img
                        src={evidencePreview}
                        alt="Evidence preview"
                        style={{
                          maxWidth: '200px',
                          maxHeight: '200px',
                          borderRadius: '8px',
                          border: '1px solid #e0e0e0'
                        }}
                      />
                    </Box>
                  )}
                </Box>
              </Grid>
            </Grid>

            {/* Submit Button */}
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-start' }}>
              <Button
                type="submit"
                variant="outlined"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <Save />}
                sx={{
                  borderColor: '#000000',
                  color: '#000000',
                  '&:hover': {
                    borderColor: '#333333',
                    backgroundColor: '#00000010'
                  }
                }}
              >
                {loading ? 'Recording...' : 'ADD VIOLATION'}
              </Button>
            </Box>
          </form>
        </Paper>
      </Paper>

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
