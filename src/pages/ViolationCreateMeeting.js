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

const EMAILJS_SERVICE_ID = 'service_7pgle82';
const EMAILJS_TEMPLATE_ID = 'template_f5q7j6q';
const EMAILJS_USER_ID = 'L77JuF4PF3ZtGkwHm';

export default function ViolationCreateMeeting() {
  const [meetings, setMeetings] = useState([]);
  const [students, setStudents] = useState([]);
  const [openMeetingModal, setOpenMeetingModal] = useState(false);
  const [openMeetingsModal, setOpenMeetingsModal] = useState(false);
  const [editMeeting, setEditMeeting] = useState(null);
  const [meetingForm, setMeetingForm] = useState({ 
    studentId: '', 
    studentName: '', 
    location: '', 
    purpose: '', 
    date: '', 
    time: '', 
    description: '',
    violationType: '',
    severity: ''
  });
  const [meetingSubmitting, setMeetingSubmitting] = useState(false);
  const [meetingSnackbar, setMeetingSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const snap = await getDocs(collection(db, "students"));
        setStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (e) {
        setStudents([]);
      }
    };
    fetchStudents();
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
    if (name === 'studentId') {
      const student = students.find(s => s.id === value);
      if (student) {
        setMeetingForm(f => ({ ...f, studentName: `${student.firstName} ${student.lastName}` }));
      } else {
        setMeetingForm(f => ({ ...f, studentName: '' }));
      }
    }
    if (name === 'studentName') {
      const student = students.find(s => `${s.firstName} ${s.lastName}` === value);
      if (student) {
        setMeetingForm(f => ({ ...f, studentId: student.id }));
      } else {
        setMeetingForm(f => ({ ...f, studentId: '' }));
      }
    }
  };

  const handleMeetingSubmit = async (e) => {
    e.preventDefault();
    setMeetingSubmitting(true);
    try {
      await addDoc(collection(db, 'meetings'), {
        ...meetingForm,
        createdAt: new Date().toISOString(),
        type: 'violation_meeting'
      });
      
      // Find student email and send notification
      const student = students.find(s => s.id === meetingForm.studentId || `${s.firstName} ${s.lastName}` === meetingForm.studentName);
      if (student && student.email) {
        try {
          await emailjs.send(
            EMAILJS_SERVICE_ID,
            EMAILJS_TEMPLATE_ID,
            {
              to_email: student.email,
              subject: `Violation Meeting Scheduled: ${meetingForm.purpose}`,
              message: `Dear ${student.firstName} ${student.lastName},\n\nYou have a violation-related meeting scheduled.\n\nPurpose: ${meetingForm.purpose}\nViolation Type: ${meetingForm.violationType}\nSeverity: ${meetingForm.severity}\nLocation: ${meetingForm.location}\nDate: ${meetingForm.date}\nTime: ${meetingForm.time}\nDescription: ${meetingForm.description || ''}\n\nPlease be on time.\n\nThank you.`,
            },
            EMAILJS_USER_ID
          );
        } catch (emailError) {
          console.error("Email sending failed:", emailError);
        }
      }
      
      await logActivity({ message: `Violation meeting created for student: ${meetingForm.studentName}`, type: 'create_violation_meeting' });
      setMeetingSnackbar({ open: true, message: 'Violation meeting created successfully!', severity: 'success' });
      setOpenMeetingModal(false);
      setMeetingForm({ 
        studentId: '', 
        studentName: '', 
        location: '', 
        purpose: '', 
        date: '', 
        time: '', 
        description: '',
        violationType: '',
        severity: ''
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
      <Typography variant="h4" gutterBottom fontWeight={700} color="primary.main">
        Create Violation Meeting
      </Typography>
      
      {/* Summary Card */}
      <Card sx={{ bgcolor: '#e3f2fd', boxShadow: 2, mb: 3 }}>
        <CardHeader 
          avatar={<MeetingRoomIcon color="primary" />} 
          title={<Typography variant="subtitle2">Violation Meetings</Typography>} 
        />
        <CardContent>
          <Typography variant="h4" color="primary.main" fontWeight={700}>
            {meetings.filter(m => m.type === 'violation_meeting').length}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Total violation meetings scheduled
          </Typography>
        </CardContent>
      </Card>

      {/* Create Meeting Form */}
      <Paper sx={{ p: { xs: 1, sm: 3 }, mb: 3, maxWidth: 1200, mx: 'auto', borderRadius: 3, boxShadow: 3 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom color="primary">Schedule New Violation Meeting</Typography>
        <Divider sx={{ mb: 2 }} />
        <form onSubmit={handleMeetingSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
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
            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Student ID"
                name="studentId"
                value={meetingForm.studentId}
                onChange={handleMeetingFormChange}
                fullWidth
                required
                helperText="Or select by student ID"
              >
                {students.map(s => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.id} - {s.firstName} {s.lastName}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
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
            <Grid item xs={12} sm={6}>
              <TextField 
                label="Meeting Purpose" 
                name="purpose" 
                value={meetingForm.purpose} 
                onChange={handleMeetingFormChange} 
                fullWidth 
                required 
                helperText="Purpose of the violation meeting"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField 
                label="Violation Type" 
                name="violationType" 
                value={meetingForm.violationType} 
                onChange={handleMeetingFormChange} 
                fullWidth 
                required 
                helperText="Type of violation to discuss"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField 
                label="Severity Level" 
                name="severity" 
                value={meetingForm.severity} 
                onChange={handleMeetingFormChange} 
                select
                fullWidth 
                required 
                helperText="Severity of the violation"
              >
                <MenuItem value="Low">Low</MenuItem>
                <MenuItem value="Medium">Medium</MenuItem>
                <MenuItem value="High">High</MenuItem>
                <MenuItem value="Critical">Critical</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
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
            <Grid item xs={12} sm={6}>
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
            <Grid item xs={12} sm={6}>
              <Button 
                variant="outlined" 
                color="info" 
                onClick={() => setOpenMeetingsModal(true)} 
                fullWidth
                sx={{ height: 56 }}
              >
                View All Meetings
              </Button>
            </Grid>
            <Grid item xs={12}>
              <TextField 
                label="Meeting Description" 
                name="description" 
                value={meetingForm.description} 
                onChange={handleMeetingFormChange} 
                fullWidth 
                multiline 
                minRows={3} 
                helperText="Detailed description of what will be discussed"
              />
            </Grid>
            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center' }}>
              <Button 
                type="submit" 
                variant="contained" 
                color="primary" 
                size="large"
                disabled={meetingSubmitting || !meetingForm.studentName || !meetingForm.purpose || !meetingForm.date}
                sx={{ minWidth: 200 }}
              >
                {meetingSubmitting ? "Creating..." : "Create Meeting"}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>

      {/* View Meetings Modal */}
      <Dialog open={openMeetingsModal} onClose={() => setOpenMeetingsModal(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Violation Meetings</DialogTitle>
        <DialogContent dividers>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Time</TableCell>
                  <TableCell>Student Name</TableCell>
                  <TableCell>Student ID</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Purpose</TableCell>
                  <TableCell>Violation Type</TableCell>
                  <TableCell>Severity</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {meetings.filter(m => m.type === 'violation_meeting').length === 0 ? (
                  <TableRow><TableCell colSpan={9} align="center">No violation meetings found.</TableCell></TableRow>
                ) : meetings.filter(m => m.type === 'violation_meeting').map((m, idx) => (
                  <TableRow key={m.id || idx}>
                    <TableCell>{m.date}</TableCell>
                    <TableCell>{m.time}</TableCell>
                    <TableCell>{m.studentName}</TableCell>
                    <TableCell>{m.studentId}</TableCell>
                    <TableCell>{m.location}</TableCell>
                    <TableCell>{m.purpose}</TableCell>
                    <TableCell>{m.violationType}</TableCell>
                    <TableCell>{m.severity}</TableCell>
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
          <Button onClick={() => setOpenMeetingsModal(false)} color="secondary">Close</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Meeting Modal */}
      <Dialog open={!!editMeeting} onClose={() => setEditMeeting(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Meeting Details</DialogTitle>
        <DialogContent dividers>
          {editMeeting && (
            <Box component="form" onSubmit={e => { e.preventDefault(); handleEditMeetingSave(editMeeting); }}>
              <TextField 
                label="Student Name" 
                value={editMeeting.studentName} 
                onChange={e => setEditMeeting({ ...editMeeting, studentName: e.target.value })} 
                fullWidth 
                sx={{ mb: 1 }} 
              />
              <TextField 
                label="Student ID" 
                value={editMeeting.studentId} 
                onChange={e => setEditMeeting({ ...editMeeting, studentId: e.target.value })} 
                fullWidth 
                sx={{ mb: 1 }} 
              />
              <TextField 
                label="Location" 
                value={editMeeting.location} 
                onChange={e => setEditMeeting({ ...editMeeting, location: e.target.value })} 
                fullWidth 
                sx={{ mb: 1 }} 
              />
              <TextField 
                label="Purpose" 
                value={editMeeting.purpose} 
                onChange={e => setEditMeeting({ ...editMeeting, purpose: e.target.value })} 
                fullWidth 
                sx={{ mb: 1 }} 
              />
              <TextField 
                label="Violation Type" 
                value={editMeeting.violationType} 
                onChange={e => setEditMeeting({ ...editMeeting, violationType: e.target.value })} 
                fullWidth 
                sx={{ mb: 1 }} 
              />
              <TextField 
                label="Severity" 
                value={editMeeting.severity} 
                onChange={e => setEditMeeting({ ...editMeeting, severity: e.target.value })} 
                select
                fullWidth 
                sx={{ mb: 1 }} 
              >
                <MenuItem value="Low">Low</MenuItem>
                <MenuItem value="Medium">Medium</MenuItem>
                <MenuItem value="High">High</MenuItem>
                <MenuItem value="Critical">Critical</MenuItem>
              </TextField>
              <TextField 
                label="Date" 
                type="date" 
                value={editMeeting.date} 
                onChange={e => setEditMeeting({ ...editMeeting, date: e.target.value })} 
                InputLabelProps={{ shrink: true }} 
                fullWidth 
                sx={{ mb: 1 }} 
              />
              <TextField 
                label="Time" 
                type="time" 
                value={editMeeting.time} 
                onChange={e => setEditMeeting({ ...editMeeting, time: e.target.value })} 
                InputLabelProps={{ shrink: true }} 
                fullWidth 
                sx={{ mb: 1 }} 
              />
              <TextField 
                label="Description" 
                value={editMeeting.description} 
                onChange={e => setEditMeeting({ ...editMeeting, description: e.target.value })} 
                fullWidth 
                multiline 
                minRows={2} 
                sx={{ mb: 1 }} 
              />
              <DialogActions>
                <Button onClick={() => setEditMeeting(null)} color="secondary">Cancel</Button>
                <Button type="submit" variant="contained" color="primary">Save</Button>
              </DialogActions>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      <Snackbar open={meetingSnackbar.open} autoHideDuration={4000} onClose={() => setMeetingSnackbar({ ...meetingSnackbar, open: false })}>
        <Alert onClose={() => setMeetingSnackbar({ ...meetingSnackbar, open: false })} severity={meetingSnackbar.severity} sx={{ width: '100%' }}>
          {meetingSnackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
} 