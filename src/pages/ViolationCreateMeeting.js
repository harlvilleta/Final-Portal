import React, { useState, useEffect } from "react";
import { Typography, Box, Paper, TextField, Button, Grid, Dialog, DialogTitle, DialogContent, DialogActions, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Tooltip, Snackbar, Alert, Card, CardContent, CardHeader, Divider } from "@mui/material";
import { collection, getDocs, addDoc, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { MenuItem } from "@mui/material";
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { logActivity } from '../firebase';
import emailjs from 'emailjs-com';
import { sendSMS, formatPhilippineNumber } from '../utils/smsService';

const EMAILJS_SERVICE_ID = 'service_7pgle82';
const EMAILJS_TEMPLATE_ID = 'template_f5q7j6q';
const EMAILJS_USER_ID = 'L77JuF4PF3ZtGkwHm';

export default function ViolationCreateMeeting() {
  const [meetings, setMeetings] = useState([]);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [openMeetingModal, setOpenMeetingModal] = useState(false);
  const [openMeetingsModal, setOpenMeetingsModal] = useState(false);
  const [editMeeting, setEditMeeting] = useState(null);
  const [meetingForm, setMeetingForm] = useState({ 
    studentName: '', 
    cellphoneNumber: '',
    location: '', 
    purpose: '', 
    date: '', 
    time: '', 
    description: '',
    teacherName: ''
  });
  const [meetingSubmitting, setMeetingSubmitting] = useState(false);
  const [meetingSnackbar, setMeetingSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [phoneValidationError, setPhoneValidationError] = useState('');
  const [isValidatingPhone, setIsValidatingPhone] = useState(false);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const snap = await getDocs(collection(db, "students"));
        const studentsData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Sort students by creation date (newest first)
        const sortedStudents = studentsData.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
          const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
          return dateB - dateA; // Descending order (newest first)
        });
        
        setStudents(sortedStudents);
      } catch (e) {
        setStudents([]);
      }
    };

    const fetchTeachers = async () => {
      try {
        const snap = await getDocs(collection(db, "users"));
        const teachersData = snap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(user => user.role === 'Teacher')
          .sort((a, b) => (a.fullName || a.displayName || '').localeCompare(b.fullName || b.displayName || ''));
        
        setTeachers(teachersData);
      } catch (e) {
        setTeachers([]);
      }
    };

    fetchStudents();
    fetchTeachers();
  }, []);

  useEffect(() => {
    if (openMeetingsModal) {
      const fetchMeetings = async () => {
        try {
          const snap = await getDocs(collection(db, 'meetings'));
          setMeetings(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (e) {
          setMeetings([]);
        }
      };
      fetchMeetings();
    }
  }, [openMeetingsModal, meetingSnackbar]);

  const handleMeetingFormChange = (e) => {
    const { name, value } = e.target;
    setMeetingForm(f => ({ ...f, [name]: value }));
    
    // Clear phone validation error when user starts typing
    if (name === 'cellphoneNumber') {
      setPhoneValidationError('');
    }
  };

  // Function to validate Philippine phone number format for SMS capability
  const validatePhoneNumber = async (phoneNumber) => {
    if (!phoneNumber) return false;
    
    setIsValidatingPhone(true);
    try {
      // Remove all non-digit characters for validation
      const cleanNumber = phoneNumber.replace(/\D/g, '');
      
      // Philippine mobile number validation
      // Valid formats: +639xxxxxxxxx, 639xxxxxxxxx, 09xxxxxxxxx
      // Philippine mobile numbers are 10 digits (excluding country code)
      // Country code is +63, so total with country code is 12 digits
      
      let isValidPhilippineNumber = false;
      let formattedNumber = '';
      
      if (cleanNumber.length === 10 && cleanNumber.startsWith('9')) {
        // Format: 09xxxxxxxxx (10 digits starting with 9)
        isValidPhilippineNumber = true;
        formattedNumber = `+63${cleanNumber}`;
      } else if (cleanNumber.length === 12 && cleanNumber.startsWith('63')) {
        // Format: 639xxxxxxxxx (12 digits starting with 63)
        const mobilePart = cleanNumber.substring(2);
        if (mobilePart.startsWith('9') && mobilePart.length === 10) {
          isValidPhilippineNumber = true;
          formattedNumber = `+${cleanNumber}`;
        }
      } else if (cleanNumber.length === 11 && cleanNumber.startsWith('0')) {
        // Format: 09xxxxxxxxx (11 digits starting with 0)
        const mobilePart = cleanNumber.substring(1);
        if (mobilePart.startsWith('9') && mobilePart.length === 10) {
          isValidPhilippineNumber = true;
          formattedNumber = `+63${mobilePart}`;
        }
      }
      
      if (!isValidPhilippineNumber) {
        setPhoneValidationError('Please enter a valid Philippine mobile number (e.g., +639123456789, 09123456789, or 639123456789).');
        return false;
      }
      
      // Additional validation: Check if the mobile number starts with 9 (required for Philippine mobile)
      const mobilePart = formattedNumber.substring(3); // Remove +63
      if (!mobilePart.startsWith('9')) {
        setPhoneValidationError('Philippine mobile numbers must start with 9 (e.g., 9123456789).');
        return false;
      }
      
      setPhoneValidationError('');
      return true;
    } catch (error) {
      console.error('Error validating phone number:', error);
      setPhoneValidationError('Error validating Philippine phone number format.');
      return false;
    } finally {
      setIsValidatingPhone(false);
    }
  };

  // Function to send SMS to Philippine mobile numbers
  const sendSMSMessage = async (phoneNumber, message) => {
    try {
      // Format the Philippine phone number
      const formattedPhoneNumber = formatPhilippineNumber(phoneNumber);
      
      console.log(`Sending SMS to ${formattedPhoneNumber}: ${message}`);
      
      // Use our SMS service
      const result = await sendSMS(formattedPhoneNumber, message);
      
      if (result.success) {
        console.log('SMS sent successfully:', result);
        return true;
      } else {
        console.error('SMS sending failed:', result.error);
        
        // Show user notification about SMS failure
        alert(`SMS could not be sent automatically. Please send this message manually to ${formattedPhoneNumber}:\n\n${message}`);
        
        return false;
      }
    } catch (error) {
      console.error('SMS sending error:', error);
      
      // Show user notification about SMS failure
      alert(`SMS could not be sent automatically. Please send this message manually to ${phoneNumber}:\n\n${message}`);
      
      return false;
    }
  };

  const handleMeetingSubmit = async (e) => {
    e.preventDefault();
    setMeetingSubmitting(true);
    try {
      // Validate phone number if provided
      if (meetingForm.cellphoneNumber) {
        const isPhoneValid = await validatePhoneNumber(meetingForm.cellphoneNumber);
        if (!isPhoneValid) {
          setMeetingSubmitting(false);
          return;
        }
      }

      // Prepare participants array
      const participants = [];
      const student = students.find(s => `${s.firstName} ${s.lastName}` === meetingForm.studentName);
      if (student && student.email) {
        participants.push(student.email);
      }
      
      // Add teacher to participants if specified
      if (meetingForm.teacherName) {
        const teacher = teachers.find(t => t.fullName === meetingForm.teacherName);
        if (teacher && teacher.email) {
          participants.push(teacher.email);
        }
      }

      const meetingData = {
        ...meetingForm,
        participants: participants,
        createdAt: new Date().toISOString(),
        type: 'meeting'
      };

      await addDoc(collection(db, 'meetings'), meetingData);
      
      // Send email notification to student
      if (student && student.email) {
        try {
          await emailjs.send(
            EMAILJS_SERVICE_ID,
            EMAILJS_TEMPLATE_ID,
            {
              to_email: student.email,
              subject: `Meeting Scheduled: ${meetingForm.purpose}`,
              message: `Dear ${student.firstName} ${student.lastName},\n\nYou have a meeting scheduled.\n\nPurpose: ${meetingForm.purpose}\n${meetingForm.teacherName ? `Teacher: ${meetingForm.teacherName}\n` : ''}Location: ${meetingForm.location}\nDate: ${meetingForm.date}\nTime: ${meetingForm.time}\nDescription: ${meetingForm.description || ''}\n\nPlease be on time.\n\nThank you.`,
            },
            EMAILJS_USER_ID
          );
        } catch (emailError) {
          console.error("Email sending failed:", emailError);
        }
      }

      // Send SMS notification to student if phone number is provided
      let smsSent = false;
      if (meetingForm.cellphoneNumber) {
        try {
          const smsMessage = `Meeting Scheduled: ${meetingForm.purpose}\nDate: ${meetingForm.date}\nTime: ${meetingForm.time}\nLocation: ${meetingForm.location}\n${meetingForm.teacherName ? `Teacher: ${meetingForm.teacherName}\n` : ''}Please be on time.`;
          smsSent = await sendSMSMessage(meetingForm.cellphoneNumber, smsMessage);
          
          if (smsSent) {
            console.log(`SMS notification sent successfully to ${meetingForm.cellphoneNumber}`);
          } else {
            console.warn(`SMS notification failed to send to ${meetingForm.cellphoneNumber}`);
          }
        } catch (smsError) {
          console.error("SMS sending failed:", smsError);
          smsSent = false;
        }
      }

      // Send notification to teacher if specified
      if (meetingForm.teacherName) {
        const teacher = teachers.find(t => t.fullName === meetingForm.teacherName);
        if (teacher && teacher.email) {
          try {
            await addDoc(collection(db, 'notifications'), {
              recipientEmail: teacher.email,
              title: `New Meeting Assignment`,
              message: `You have been assigned to a meeting with ${meetingForm.studentName} on ${meetingForm.date} at ${meetingForm.time}.`,
              type: 'meeting',
              read: false,
              createdAt: new Date().toISOString(),
              meetingId: meetingData.id
            });
          } catch (notificationError) {
            console.error("Teacher notification failed:", notificationError);
          }
        }
      }
      
      await logActivity({ message: `Meeting created for student: ${meetingForm.studentName}${meetingForm.teacherName ? ` with teacher: ${meetingForm.teacherName}` : ''}${smsSent ? ' (SMS sent)' : ''}`, type: 'create_meeting' });
      
      let successMessage = 'Meeting created successfully!';
      if (meetingForm.cellphoneNumber) {
        successMessage += smsSent ? ' SMS notification sent.' : ' SMS notification could not be sent.';
      }
      
      setMeetingSnackbar({ open: true, message: successMessage, severity: 'success' });
      setOpenMeetingModal(false);
      setMeetingForm({ 
        studentName: '', 
        cellphoneNumber: '',
        location: '', 
        purpose: '', 
        date: '', 
        time: '', 
        description: '',
        teacherName: ''
      });
    } catch (e) {
      setMeetingSnackbar({ open: true, message: 'Failed to create meeting.', severity: 'error' });
    }
    setMeetingSubmitting(false);
  };

  const handleDeleteMeeting = async (id) => {
    try {
      await deleteDoc(doc(db, 'meetings', id));
      setMeetings(meetings => meetings.filter(m => m.id !== id));
      setMeetingSnackbar({ open: true, message: 'Meeting deleted.', severity: 'success' });
    } catch (e) {
      setMeetingSnackbar({ open: true, message: 'Failed to delete meeting.', severity: 'error' });
    }
  };

  const handleEditMeetingSave = async (updated) => {
    try {
      await updateDoc(doc(db, 'meetings', updated.id), updated);
      setMeetings(meetings => meetings.map(m => m.id === updated.id ? updated : m));
      setMeetingSnackbar({ open: true, message: 'Meeting updated.', severity: 'success' });
      setEditMeeting(null);
    } catch (e) {
      setMeetingSnackbar({ open: true, message: 'Failed to update meeting.', severity: 'error' });
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={700} sx={{ color: '#800000' }}>
        Create Meeting
      </Typography>
      
      {/* Summary Card */}
      <Card sx={{ boxShadow: 2, mb: 3, borderLeft: '4px solid #800000' }}>
        <CardHeader 
          avatar={<MeetingRoomIcon />} 
          title={<Typography variant="subtitle2">Meetings</Typography>} 
        />
        <CardContent>
          <Typography variant="h4" sx={{ color: '#000000' }} fontWeight={700}>
            {meetings.filter(m => m.type === 'meeting').length}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Total meetings scheduled
          </Typography>
        </CardContent>
      </Card>

      {/* Create Meeting Form */}
      <Paper sx={{ p: { xs: 1, sm: 3 }, mb: 3, maxWidth: 1200, mx: 'auto', borderRadius: 3, boxShadow: 3 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom sx={{ color: '#000000' }}>Schedule New Meeting</Typography>
        <Divider sx={{ mb: 2 }} />
        <form onSubmit={handleMeetingSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                select
                label="Student Name"
                name="studentName"
                value={meetingForm.studentName}
                onChange={handleMeetingFormChange}
                fullWidth
                required
                helperText="Select the student for the meeting"
              >
                {students.map(s => (
                  <MenuItem key={s.id} value={`${s.firstName} ${s.lastName}`}>
                    {s.firstName} {s.lastName} ({s.id})
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Student Cellphone Number"
                name="cellphoneNumber"
                value={meetingForm.cellphoneNumber}
                onChange={handleMeetingFormChange}
                onBlur={() => {
                  if (meetingForm.cellphoneNumber) {
                    validatePhoneNumber(meetingForm.cellphoneNumber);
                  }
                }}
                fullWidth
                required
                type="tel"
                error={!!phoneValidationError}
                helperText={phoneValidationError || "Enter a valid Philippine mobile number that can receive SMS messages"}
                disabled={isValidatingPhone}
                placeholder="+639123456789 or 09123456789"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                select
                label="Teacher Name (Optional)"
                name="teacherName"
                value={meetingForm.teacherName}
                onChange={handleMeetingFormChange}
                fullWidth
                helperText="Select the teacher for the meeting (optional)"
              >
                {teachers.map(t => (
                  <MenuItem key={t.id} value={t.fullName || t.displayName || t.email}>
                    {t.fullName || t.displayName || t.email}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField 
                label="Meeting Purpose" 
                name="purpose" 
                value={meetingForm.purpose} 
                onChange={handleMeetingFormChange} 
                fullWidth 
                required 
                helperText="Purpose of the meeting"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField 
                label="Meeting Location" 
                name="location" 
                value={meetingForm.location} 
                onChange={handleMeetingFormChange} 
                fullWidth 
                required 
                helperText="Where will the meeting take place?"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField 
                label="Meeting Date" 
                name="date" 
                type="date" 
                value={meetingForm.date} 
                onChange={handleMeetingFormChange} 
                InputLabelProps={{ shrink: true }} 
                fullWidth 
                required 
                helperText="Date of the meeting"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField 
                label="Meeting Time" 
                name="time" 
                type="time" 
                value={meetingForm.time} 
                onChange={handleMeetingFormChange} 
                InputLabelProps={{ shrink: true }} 
                fullWidth 
                required 
                helperText="Time of the meeting"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField 
                label="Description" 
                name="description" 
                value={meetingForm.description} 
                onChange={handleMeetingFormChange} 
                fullWidth 
                multiline 
                minRows={3} 
                helperText="Detailed description of what will be discussed"
              />
            </Grid>
            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
              <Button 
                type="submit" 
                variant="outlined" 
                size="large"
                disabled={meetingSubmitting || !meetingForm.studentName || !meetingForm.cellphoneNumber || !meetingForm.purpose || !meetingForm.date || !!phoneValidationError}
                sx={{ 
                  minWidth: 200,
                  bgcolor: '#ffffff',
                  color: '#000000',
                  borderColor: '#000000',
                  '&:hover': { 
                    bgcolor: '#800000',
                    color: '#ffffff',
                    borderColor: '#800000'
                  },
                  '&:disabled': { bgcolor: '#cccccc', color: '#666666', borderColor: '#999999' }
                }}
              >
                {meetingSubmitting ? "Creating..." : "Create Meeting"}
              </Button>
              <Button 
                variant="outlined" 
                onClick={() => setOpenMeetingsModal(true)} 
                size="large"
                sx={{ 
                  minWidth: 200,
                  bgcolor: '#ffffff',
                  color: '#000000',
                  borderColor: '#000000',
                  '&:hover': { 
                    bgcolor: '#800000',
                    color: '#ffffff',
                    borderColor: '#800000'
                  }
                }}
              >
                View All Meetings
              </Button>
              {meetingForm.cellphoneNumber && (
                <Button 
                  variant="outlined" 
                  onClick={async () => {
                    const testMessage = "Test SMS from Student Affairs System. If you receive this, SMS is working!";
                    const result = await sendSMSMessage(meetingForm.cellphoneNumber, testMessage);
                    if (result) {
                      alert("Test SMS sent successfully!");
                    } else {
                      alert("Test SMS failed. Check console for details.");
                    }
                  }}
                  size="large"
                  sx={{ 
                    minWidth: 150,
                    bgcolor: '#ffffff',
                    color: '#000000',
                    borderColor: '#000000',
                    '&:hover': { 
                      bgcolor: '#800000',
                      color: '#ffffff',
                      borderColor: '#800000'
                    }
                  }}
                >
                  Test SMS
                </Button>
              )}
            </Grid>
          </Grid>
        </form>
      </Paper>

      {/* View Meetings Modal */}
      <Dialog open={openMeetingsModal} onClose={() => setOpenMeetingsModal(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Meetings</DialogTitle>
        <DialogContent dividers>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Time</TableCell>
                  <TableCell>Student Name</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Purpose</TableCell>
                  <TableCell>Teacher</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {meetings.filter(m => m.type === 'meeting').length === 0 ? (
                  <TableRow><TableCell colSpan={7} align="center">No meetings found.</TableCell></TableRow>
                ) : meetings.filter(m => m.type === 'meeting').map((m, idx) => (
                  <TableRow key={m.id || idx}>
                    <TableCell>{m.date}</TableCell>
                    <TableCell>{m.time}</TableCell>
                    <TableCell>{m.studentName}</TableCell>
                    <TableCell>{m.location}</TableCell>
                    <TableCell>{m.purpose}</TableCell>
                    <TableCell>{m.teacherName || 'Not assigned'}</TableCell>
                    <TableCell>
                      <Tooltip title="View Details">
                        <IconButton size="small" color="info" onClick={() => setEditMeeting(m)}>
                          <VisibilityIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit Meeting">
                        <IconButton size="small" color="warning" onClick={() => setEditMeeting(m)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Meeting">
                        <IconButton size="small" color="error" onClick={() => handleDeleteMeeting(m.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenMeetingsModal(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Meeting Modal */}
      <Dialog open={!!editMeeting} onClose={() => setEditMeeting(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Meeting</DialogTitle>
        <DialogContent>
          <TextField 
            label="Student Name" 
            value={editMeeting?.studentName || ''} 
            onChange={e => setEditMeeting({ ...editMeeting, studentName: e.target.value })} 
            fullWidth 
            sx={{ mb: 1 }} 
          />
          <TextField
            select
            label="Teacher Name (Optional)"
            value={editMeeting?.teacherName || ''}
            onChange={e => setEditMeeting({ ...editMeeting, teacherName: e.target.value })}
            fullWidth
            sx={{ mb: 1 }}
          >
            {teachers.map(t => (
              <MenuItem key={t.id} value={t.fullName || t.displayName || t.email}>
                {t.fullName || t.displayName || t.email}
              </MenuItem>
            ))}
          </TextField>
          <TextField 
            label="Purpose" 
            value={editMeeting?.purpose || ''} 
            onChange={e => setEditMeeting({ ...editMeeting, purpose: e.target.value })} 
            fullWidth 
            sx={{ mb: 1 }} 
          />
          <TextField 
            label="Location" 
            value={editMeeting?.location || ''} 
            onChange={e => setEditMeeting({ ...editMeeting, location: e.target.value })} 
            fullWidth 
            sx={{ mb: 1 }} 
          />
          <TextField 
            label="Date" 
            type="date" 
            value={editMeeting?.date || ''} 
            onChange={e => setEditMeeting({ ...editMeeting, date: e.target.value })} 
            fullWidth 
            sx={{ mb: 1 }} 
            InputLabelProps={{ shrink: true }}
          />
          <TextField 
            label="Time" 
            type="time" 
            value={editMeeting?.time || ''} 
            onChange={e => setEditMeeting({ ...editMeeting, time: e.target.value })} 
            fullWidth 
            sx={{ mb: 1 }} 
            InputLabelProps={{ shrink: true }}
          />
          <TextField 
            label="Description" 
            value={editMeeting?.description || ''} 
            onChange={e => setEditMeeting({ ...editMeeting, description: e.target.value })} 
            fullWidth 
            multiline 
            minRows={3} 
            sx={{ mb: 1 }} 
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditMeeting(null)}>Cancel</Button>
          <Button onClick={() => handleEditMeetingSave(editMeeting)} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar 
        open={meetingSnackbar.open} 
        autoHideDuration={6000} 
        onClose={() => setMeetingSnackbar({ ...meetingSnackbar, open: false })}
      >
        <Alert severity={meetingSnackbar.severity} onClose={() => setMeetingSnackbar({ ...meetingSnackbar, open: false })}>
          {meetingSnackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

