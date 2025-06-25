import React, { useState, useEffect } from "react";
import { Typography, Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, TextField, Grid, Chip, Avatar, InputAdornment, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Card, CardContent, CardHeader, Divider, Tooltip, CircularProgress, Snackbar, Alert, Stack } from "@mui/material";
import { collection, getDocs, addDoc, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import SearchIcon from '@mui/icons-material/Search';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";
import { MenuItem } from "@mui/material";
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { logActivity } from '../firebase';
import emailjs from 'emailjs-com';

const statusColors = { Pending: 'warning', Solved: 'success' };
const EMAILJS_SERVICE_ID = 'service_7pgle82';
const EMAILJS_TEMPLATE_ID = 'template_f5q7j6q';
const EMAILJS_USER_ID = 'L77JuF4PF3ZtGkwHm';

export default function ViolationRecord() {
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [form, setForm] = useState({
    studentId: "",
    violation: "",
    classification: "",
    severity: "",
    date: "",
    time: "",
    location: "",
    description: "",
    witnesses: "",
    actionTaken: "",
    reportedBy: "",
    status: "Pending",
    image: null,
    studentName: ""
  });
  const [imageFile, setImageFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [viewViolation, setViewViolation] = useState(null);
  const [editViolation, setEditViolation] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });
  const [dataRefresh, setDataRefresh] = useState(0);
  const [studentName, setStudentName] = useState("");
  const [students, setStudents] = useState([]);
  const [openMeetingModal, setOpenMeetingModal] = useState(false);
  const [meetingForm, setMeetingForm] = useState({ studentId: '', studentName: '', location: '', purpose: '', date: '', time: '', description: '' });
  const [meetingSubmitting, setMeetingSubmitting] = useState(false);
  const [meetingSnackbar, setMeetingSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [openMeetingsModal, setOpenMeetingsModal] = useState(false);
  const [meetings, setMeetings] = useState([]);
  const [editMeeting, setEditMeeting] = useState(null);
  const [printMode, setPrintMode] = useState(false);

  useEffect(() => {
    const fetchViolations = async () => {
      try {
        const snap = await getDocs(collection(db, "violations"));
        setRecords(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (e) {
        setRecords([]);
      }
    };
    fetchViolations();
    // Fetch all students for ID lookup
    const fetchStudents = async () => {
      try {
        const snap = await getDocs(collection(db, "students"));
        setStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (e) {
        setStudents([]);
      }
    };
    fetchStudents();
  }, [dataRefresh]);

  // Fetch meetings when modal opens
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

  const filtered = records.filter(
    v =>
      v.studentId?.toLowerCase().includes(search.toLowerCase()) ||
      v.violation?.toLowerCase().includes(search.toLowerCase()) ||
      v.classification?.toLowerCase().includes(search.toLowerCase()) ||
      v.reportedBy?.toLowerCase().includes(search.toLowerCase())
  );

  // Summary stats
  const total = records.length;
  const pending = records.filter(v => v.status === 'Pending').length;
  const solved = records.filter(v => v.status === 'Solved').length;

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (name === "studentId") {
      const student = students.find(s => s.id === value);
      if (student) {
        setStudentName(`${student.firstName} ${student.lastName}`);
        setForm(f => ({ ...f, studentName: `${student.firstName} ${student.lastName}` }));
      } else {
        setStudentName("");
        setForm(f => ({ ...f, studentName: "" }));
      }
    }
  };
  const handleImage = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    let imageUrl = null;
    let uploadTimedOut = false;
    try {
      if (imageFile) {
        try {
          const storageRef = ref(storage, `violation_evidence/${form.studentId}_${Date.now()}_${imageFile.name}`);
          // Add timeout for uploadBytes (15s)
          const uploadPromise = uploadBytes(storageRef, imageFile);
          const uploadTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Image upload timed out')), 15000));
          await Promise.race([uploadPromise, uploadTimeout]);
          // Only try getDownloadURL if uploadBytes succeeded
          try {
            const urlPromise = getDownloadURL(storageRef);
            const urlTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Image URL fetch timed out')), 15000));
            imageUrl = await Promise.race([urlPromise, urlTimeout]);
          } catch (urlErr) {
            console.error("Image getDownloadURL error:", urlErr);
            setSnackbar({ open: true, message: "Image uploaded but URL fetch failed. Violation will be saved without image.", severity: "warning" });
            imageUrl = null;
          }
        } catch (imgErr) {
          console.error("Image upload error:", imgErr);
          uploadTimedOut = true;
          setSnackbar({ open: true, message: "Image upload failed or timed out. Violation will be saved without image.", severity: "warning" });
          imageUrl = null;
        }
      }
      const violationData = {
        ...form,
        image: imageUrl,
        timestamp: new Date().toISOString(),
      };
      await addDoc(collection(db, "violations"), violationData);
      await logActivity({ message: `Violation added for student: ${form.studentId}`, type: 'add_violation' });
      setForm({
        studentId: "",
        violation: "",
        classification: "",
        severity: "",
        date: "",
        time: "",
        location: "",
        description: "",
        witnesses: "",
        actionTaken: "",
        reportedBy: "",
        status: "Pending",
        image: null,
        studentName: ""
      });
      setStudentName("");
      setImageFile(null);
      setSnackbar({ open: true, message: uploadTimedOut ? "Violation added (image upload failed)" : "Violation added successfully!", severity: uploadTimedOut ? "warning" : "success" });
      setDataRefresh(r => r + 1); // refresh table after add
    } catch (e) {
      console.error("Error saving violation:", e);
      setSnackbar({ open: true, message: "Error adding violation.", severity: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };
  // Manual reset if stuck
  const handleReset = () => {
    setIsSubmitting(false);
    setSnackbar({ open: true, message: "Form reset. You can try submitting again.", severity: "info" });
  };

  // Edit handler
  const handleEdit = (violation) => setEditViolation(violation);
  const handleEditSave = async (updated) => {
    try {
      await updateDoc(doc(db, "violations", updated.id), updated);
      await logActivity({ message: `Violation updated for student: ${updated.studentId}`, type: 'edit_violation' });
      setSnackbar({ open: true, message: "Violation updated!", severity: "success" });
      setEditViolation(null);
      setDataRefresh(r => r + 1); // refresh table after edit
    } catch (e) {
      setSnackbar({ open: true, message: "Error updating violation.", severity: "error" });
    }
  };
  // Delete handler
  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, "violations", id));
      await logActivity({ message: `Violation deleted (ID: ${id})`, type: 'delete_violation' });
      setSnackbar({ open: true, message: "Violation deleted!", severity: "success" });
      setDeleteConfirm({ open: false, id: null });
      setDataRefresh(r => r + 1); // refresh table after delete
    } catch (e) {
      setSnackbar({ open: true, message: "Error deleting violation.", severity: "error" });
    }
  };

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
      });
      // Find student email
      const student = students.find(s => s.id === meetingForm.studentId || `${s.firstName} ${s.lastName}` === meetingForm.studentName);
      if (student && student.email) {
        // Send email notification
        await emailjs.send(
          EMAILJS_SERVICE_ID,
          EMAILJS_TEMPLATE_ID,
          {
            to_email: student.email,
            subject: `Meeting Scheduled: ${meetingForm.purpose}`,
            message: `Dear ${student.firstName} ${student.lastName},\n\nYou have a meeting scheduled.\n\nPurpose: ${meetingForm.purpose}\nLocation: ${meetingForm.location}\nDate: ${meetingForm.date}\nTime: ${meetingForm.time}\nDescription: ${meetingForm.description || ''}\n\nPlease be on time.\n\nThank you.`,
          },
          EMAILJS_USER_ID
        );
      }
      setMeetingSnackbar({ open: true, message: 'Meeting created successfully!', severity: 'success' });
      setOpenMeetingModal(false);
      setMeetingForm({ studentId: '', studentName: '', location: '', purpose: '', date: '', time: '', description: '' });
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
        Violation Records
      </Typography>
      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: '#e3f2fd', boxShadow: 2 }}>
            <CardHeader avatar={<AssignmentTurnedInIcon color="primary" />} title={<Typography variant="subtitle2">Total Violations</Typography>} />
            <CardContent>
              <Typography variant="h4" color="primary.main" fontWeight={700}>{total}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: '#fffde7', boxShadow: 2 }}>
            <CardHeader avatar={<PendingActionsIcon color="warning" />} title={<Typography variant="subtitle2">Pending</Typography>} />
            <CardContent>
              <Typography variant="h4" color="warning.main" fontWeight={700}>{pending}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: '#e8f5e9', boxShadow: 2 }}>
            <CardHeader avatar={<DoneAllIcon color="success" />} title={<Typography variant="subtitle2">Solved</Typography>} />
            <CardContent>
              <Typography variant="h4" color="success.main" fontWeight={700}>{solved}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      {/* Add Violation Form */}
      <Paper sx={{ p: { xs: 1, sm: 3 }, mb: 3, maxWidth: 1200, mx: 'auto', borderRadius: 3, boxShadow: 3 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom color="primary">Add New Violation</Typography>
        <Divider sx={{ mb: 2 }} />
        <form onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={3}>
              <TextField label="Student ID" name="studentId" value={form.studentId} onChange={handleFormChange} required fullWidth helperText={studentName ? `Name: ${studentName}` : "Enter the student's ID number"} />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField label="Violation" name="violation" value={form.violation} onChange={handleFormChange} required fullWidth helperText="Type of violation" />
            </Grid>
            <Grid item xs={12} sm={2}>
              <TextField label="Classification" name="classification" value={form.classification} onChange={handleFormChange} select fullWidth required helperText="Select classification">
                <MenuItem value="">Select</MenuItem>
                <MenuItem value="Minor">Minor</MenuItem>
                <MenuItem value="Major">Major</MenuItem>
                <MenuItem value="Serious">Serious</MenuItem>
                <MenuItem value="Grave">Grave</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={2}>
              <TextField label="Severity" name="severity" value={form.severity} onChange={handleFormChange} select fullWidth required helperText="Severity level">
                <MenuItem value="">Select</MenuItem>
                <MenuItem value="Low">Low</MenuItem>
                <MenuItem value="Medium">Medium</MenuItem>
                <MenuItem value="High">High</MenuItem>
                <MenuItem value="Critical">Critical</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={2}>
              <TextField label="Status" name="status" value={form.status} onChange={handleFormChange} select fullWidth required helperText="Mark as pending or solved">
                <MenuItem value="Pending">Pending</MenuItem>
                <MenuItem value="Solved">Solved</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={2}>
              <TextField label="Date" name="date" type="date" value={form.date} onChange={handleFormChange} InputLabelProps={{ shrink: true }} fullWidth required helperText="Date of violation" />
            </Grid>
            <Grid item xs={12} sm={2}>
              <TextField label="Time" name="time" type="time" value={form.time} onChange={handleFormChange} InputLabelProps={{ shrink: true }} fullWidth helperText="Time (optional)" />
            </Grid>
            <Grid item xs={12} sm={2}>
              <TextField label="Location" name="location" value={form.location} onChange={handleFormChange} fullWidth helperText="Location (optional)" />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField label="Reported By" name="reportedBy" value={form.reportedBy} onChange={handleFormChange} fullWidth helperText="Who reported?" />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField label="Action Taken" name="actionTaken" value={form.actionTaken} onChange={handleFormChange} fullWidth helperText="Action taken (optional)" />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField label="Witnesses" name="witnesses" value={form.witnesses} onChange={handleFormChange} fullWidth helperText="Witnesses (optional)" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Description" name="description" value={form.description} onChange={handleFormChange} fullWidth multiline minRows={2} helperText="Describe the violation (optional)" />
            </Grid>
            <Grid item xs={12} sm={3}>
              <Tooltip title="Attach an image as evidence (optional)">
                <Button variant="contained" component="label" fullWidth sx={{ bgcolor: '#1976d2', color: '#fff', '&:hover': { bgcolor: '#1565c0' } }}>
                  Attach Evidence Image
                  <input type="file" accept="image/*" hidden onChange={handleImage} />
                </Button>
              </Tooltip>
              {imageFile && (
                <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar src={URL.createObjectURL(imageFile)} sx={{ width: 40, height: 40 }} variant="rounded" />
                  <Button variant="outlined" color="error" size="small" onClick={() => setImageFile(null)}>Remove</Button>
                </Box>
              )}
            </Grid>
            {/* Buttons row: center both buttons as a group */}
            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center' }}>
              <Stack direction="row" spacing={2}>
                <Button type="submit" variant="contained" color="primary" size="small" sx={{ minWidth: 120, maxWidth: 160 }}
                  startIcon={isSubmitting ? <CircularProgress size={14} color="inherit" /> : null}>
                  {isSubmitting ? "Saving..." : "Add Violation"}
                </Button>
                <Button variant="contained" color="success" onClick={() => setOpenMeetingModal(true)} size="small" sx={{ minWidth: 120, maxWidth: 160 }}>
                  Create Meeting
                </Button>
                <Button variant="outlined" color="info" onClick={() => setOpenMeetingsModal(true)} size="small" sx={{ minWidth: 120, maxWidth: 160 }}>
                  View Meetings
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </form>
      </Paper>
      <Divider sx={{ mb: 3 }} />
      {/* Search and Table */}
      <Paper sx={{ p: 2, mb: 3, maxWidth: 1200, mx: 'auto', borderRadius: 3, boxShadow: 2 }}>
        <TextField
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by Student ID, Violation, Classification, or Reporter..."
          size="small"
          fullWidth
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            )
          }}
        />
        <TableContainer component={Paper} sx={{ maxHeight: 500, width: '100%', overflowX: 'auto' }}>
          <Table size="small" stickyHeader sx={{ minWidth: 1100 }}>
          <TableHead>
              <TableRow sx={{ bgcolor: '#e3f2fd' }}>
                <TableCell sx={{ position: 'sticky', left: 0, zIndex: 2, bgcolor: '#e3f2fd', minWidth: 80 }}>Evidence</TableCell>
                <TableCell sx={{ minWidth: 90 }}>Date</TableCell>
                <TableCell sx={{ minWidth: 80 }}>Time</TableCell>
                <TableCell sx={{ minWidth: 110 }}>Student ID</TableCell>
                <TableCell sx={{ minWidth: 160 }}>Student Name</TableCell>
                <TableCell sx={{ minWidth: 120 }}>Violation</TableCell>
                <TableCell sx={{ minWidth: 110 }}>Classification</TableCell>
                <TableCell sx={{ minWidth: 110 }}>Severity</TableCell>
                <TableCell sx={{ minWidth: 100 }}>Status</TableCell>
                <TableCell sx={{ minWidth: 120 }}>Location</TableCell>
                <TableCell sx={{ minWidth: 120 }}>Reported By</TableCell>
                <TableCell sx={{ minWidth: 160, maxWidth: 160 }}>Action Taken</TableCell>
                <TableCell sx={{ minWidth: 120 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={12}>No violations found.</TableCell></TableRow>
              ) : filtered.map((v, idx) => (
                <TableRow key={v.id || idx} hover sx={{ bgcolor: idx % 2 === 0 ? '#fafafa' : '#fff' }}>
                  <TableCell sx={{ position: 'sticky', left: 0, zIndex: 1, bgcolor: '#fff', minWidth: 80 }}>
                    {v.image && (
                      <Tooltip title="Click to preview evidence image">
                        <IconButton onClick={() => setImagePreview(v.image)}>
                          <Avatar src={v.image} sx={{ width: 40, height: 40 }} variant="rounded" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell sx={{ fontSize: 13 }}>{v.date || 'N/A'}</TableCell>
                  <TableCell sx={{ fontSize: 13 }}>{v.time || 'N/A'}</TableCell>
                  <TableCell sx={{ fontSize: 13 }}>{v.studentId || 'N/A'}</TableCell>
                  <TableCell sx={{ fontSize: 13 }}>{v.studentName || 'N/A'}</TableCell>
                  <TableCell sx={{ fontSize: 13, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <Tooltip title={v.violation || ''}><span>{v.violation}</span></Tooltip>
                    {v.description && (
                      <Typography variant="caption" color="textSecondary" display="block" sx={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <Tooltip title={v.description}><span>{v.description}</span></Tooltip>
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ fontSize: 13 }}>
                    <Chip label={v.classification} color={
                      v.classification === 'Grave' ? 'error' :
                      v.classification === 'Serious' ? 'warning' :
                      v.classification === 'Major' ? 'info' : 'success'
                    } size="small" />
                  </TableCell>
                  <TableCell sx={{ fontSize: 13 }}>
                    <Chip label={v.severity || 'N/A'} color={
                      v.severity === 'Critical' ? 'error' :
                      v.severity === 'High' ? 'warning' :
                      v.severity === 'Medium' ? 'info' : 'success'
                    } size="small" />
                  </TableCell>
                  <TableCell sx={{ fontSize: 13 }}>
                    <Chip label={v.status || 'Pending'} color={statusColors[v.status] || 'default'} size="small" />
                  </TableCell>
                  <TableCell sx={{ fontSize: 13, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <Tooltip title={v.location || ''}><span>{v.location || 'N/A'}</span></Tooltip>
                  </TableCell>
                  <TableCell sx={{ fontSize: 13, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <Tooltip title={v.reportedBy || ''}><span>{v.reportedBy || 'N/A'}</span></Tooltip>
                  </TableCell>
                  <TableCell sx={{ fontSize: 13, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <Tooltip title={v.actionTaken || ''}><span>{v.actionTaken || 'N/A'}</span></Tooltip>
                    {v.witnesses && (
                      <Typography variant="caption" color="textSecondary" display="block" sx={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <Tooltip title={v.witnesses}><span>Witnesses: {v.witnesses}</span></Tooltip>
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ fontSize: 13, minWidth: 120 }}>
                    <Tooltip title="View details"><IconButton onClick={() => setViewViolation(v)}><VisibilityIcon color="primary" /></IconButton></Tooltip>
                    <Tooltip title="Edit"><IconButton onClick={() => handleEdit(v)}><EditIcon color="info" /></IconButton></Tooltip>
                    <Tooltip title="Delete"><IconButton onClick={() => setDeleteConfirm({ open: true, id: v.id })}><DeleteIcon color="error" /></IconButton></Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      </Paper>
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
      {/* View Violation Modal */}
      <Dialog open={!!viewViolation} onClose={() => setViewViolation(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Violation Details</DialogTitle>
        <DialogContent dividers>
          {viewViolation && (
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>{viewViolation.violation}</Typography>
              <Divider sx={{ my: 1 }} />
              <Typography><b>Student ID:</b> {viewViolation.studentId}</Typography>
              <Typography><b>Date:</b> {viewViolation.date} <b>Time:</b> {viewViolation.time}</Typography>
              <Typography><b>Status:</b> {viewViolation.status}</Typography>
              <Typography><b>Classification:</b> {viewViolation.classification}</Typography>
              <Typography><b>Severity:</b> {viewViolation.severity}</Typography>
              <Typography><b>Location:</b> {viewViolation.location}</Typography>
              <Typography><b>Reported By:</b> {viewViolation.reportedBy}</Typography>
              <Typography><b>Action Taken:</b> {viewViolation.actionTaken}</Typography>
              <Typography><b>Witnesses:</b> {viewViolation.witnesses}</Typography>
              <Typography><b>Description:</b> {viewViolation.description}</Typography>
              {viewViolation.image && (
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                  <img src={viewViolation.image} alt="Evidence" style={{ maxWidth: 300, borderRadius: 8 }} />
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewViolation(null)} color="primary">Close</Button>
        </DialogActions>
      </Dialog>
      {/* Edit Violation Modal */}
      <Dialog open={!!editViolation} onClose={() => setEditViolation(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Violation</DialogTitle>
        <DialogContent dividers>
          {editViolation && (
            <Box component="form" onSubmit={e => { e.preventDefault(); handleEditSave(editViolation); }}>
              <TextField label="Student ID" value={editViolation.studentId} onChange={e => setEditViolation({ ...editViolation, studentId: e.target.value })} fullWidth sx={{ mb: 1 }} />
              <TextField label="Violation" value={editViolation.violation} onChange={e => setEditViolation({ ...editViolation, violation: e.target.value })} fullWidth sx={{ mb: 1 }} />
              <TextField label="Classification" value={editViolation.classification} onChange={e => setEditViolation({ ...editViolation, classification: e.target.value })} select fullWidth sx={{ mb: 1 }}>
                <MenuItem value="Minor">Minor</MenuItem>
                <MenuItem value="Major">Major</MenuItem>
                <MenuItem value="Serious">Serious</MenuItem>
                <MenuItem value="Grave">Grave</MenuItem>
              </TextField>
              <TextField label="Severity" value={editViolation.severity} onChange={e => setEditViolation({ ...editViolation, severity: e.target.value })} select fullWidth sx={{ mb: 1 }}>
                <MenuItem value="Low">Low</MenuItem>
                <MenuItem value="Medium">Medium</MenuItem>
                <MenuItem value="High">High</MenuItem>
                <MenuItem value="Critical">Critical</MenuItem>
              </TextField>
              <TextField label="Status" value={editViolation.status} onChange={e => setEditViolation({ ...editViolation, status: e.target.value })} select fullWidth sx={{ mb: 1 }}>
                <MenuItem value="Pending">Pending</MenuItem>
                <MenuItem value="Solved">Solved</MenuItem>
              </TextField>
              <TextField label="Date" type="date" value={editViolation.date} onChange={e => setEditViolation({ ...editViolation, date: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth sx={{ mb: 1 }} />
              <TextField label="Time" type="time" value={editViolation.time} onChange={e => setEditViolation({ ...editViolation, time: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth sx={{ mb: 1 }} />
              <TextField label="Location" value={editViolation.location} onChange={e => setEditViolation({ ...editViolation, location: e.target.value })} fullWidth sx={{ mb: 1 }} />
              <TextField label="Reported By" value={editViolation.reportedBy} onChange={e => setEditViolation({ ...editViolation, reportedBy: e.target.value })} fullWidth sx={{ mb: 1 }} />
              <TextField label="Action Taken" value={editViolation.actionTaken} onChange={e => setEditViolation({ ...editViolation, actionTaken: e.target.value })} fullWidth sx={{ mb: 1 }} />
              <TextField label="Witnesses" value={editViolation.witnesses} onChange={e => setEditViolation({ ...editViolation, witnesses: e.target.value })} fullWidth sx={{ mb: 1 }} />
              <TextField label="Description" value={editViolation.description} onChange={e => setEditViolation({ ...editViolation, description: e.target.value })} fullWidth multiline minRows={2} sx={{ mb: 1 }} />
              <DialogActions>
                <Button onClick={() => setEditViolation(null)} color="secondary">Cancel</Button>
                <Button type="submit" variant="contained" color="primary">Save</Button>
              </DialogActions>
            </Box>
          )}
        </DialogContent>
      </Dialog>
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirm.open} onClose={() => setDeleteConfirm({ open: false, id: null })}>
        <DialogTitle>Delete Violation?</DialogTitle>
        <DialogContent>Are you sure you want to delete this violation? This action cannot be undone.</DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm({ open: false, id: null })}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => handleDelete(deleteConfirm.id)}>Delete</Button>
        </DialogActions>
      </Dialog>
      {/* Meeting Modal */}
      <Dialog open={openMeetingModal} onClose={() => setOpenMeetingModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Meeting</DialogTitle>
        <DialogContent dividers>
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
                  sx={{ mb: 2 }}
                >
                  {students.map(s => (
                    <MenuItem key={s.id} value={`${s.firstName} ${s.lastName}`}>{s.firstName} {s.lastName}</MenuItem>
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
                  sx={{ mb: 2 }}
                >
                  {students.map(s => (
                    <MenuItem key={s.id} value={s.id}>{s.id}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Location" name="location" value={meetingForm.location} onChange={handleMeetingFormChange} fullWidth required sx={{ mb: 2 }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Purpose" name="purpose" value={meetingForm.purpose} onChange={handleMeetingFormChange} fullWidth required sx={{ mb: 2 }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Date" name="date" type="date" value={meetingForm.date} onChange={handleMeetingFormChange} InputLabelProps={{ shrink: true }} fullWidth required sx={{ mb: 2 }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Time" name="time" type="time" value={meetingForm.time} onChange={handleMeetingFormChange} InputLabelProps={{ shrink: true }} fullWidth required sx={{ mb: 2 }} />
              </Grid>
              <Grid item xs={12}>
                <TextField label="Description" name="description" value={meetingForm.description} onChange={handleMeetingFormChange} fullWidth multiline minRows={2} sx={{ mb: 2 }} />
              </Grid>
            </Grid>
            <DialogActions>
              <Button onClick={() => setOpenMeetingModal(false)} color="secondary">Cancel</Button>
              <Button type="submit" variant="contained" color="primary" disabled={meetingSubmitting}>
                {meetingSubmitting ? 'Submitting...' : 'Create Meeting'}
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>
      {/* Meetings Modal (CRUD + Print) */}
      <Dialog open={openMeetingsModal} onClose={() => { setOpenMeetingsModal(false); setPrintMode(false); }} maxWidth="md" fullWidth>
        <DialogTitle>Meetings
          <Button onClick={() => setPrintMode(true)} color="primary" variant="outlined" size="small" sx={{ float: 'right', ml: 2 }}>Print</Button>
        </DialogTitle>
        <DialogContent dividers>
          {printMode ? (
            <Box id="print-meetings">
              <Typography variant="h6" align="center" gutterBottom>Meetings List</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Time</TableCell>
                    <TableCell>Student Name</TableCell>
                    <TableCell>Student ID</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>Purpose</TableCell>
                    <TableCell>Description</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {meetings.map((m, idx) => (
                    <TableRow key={m.id || idx}>
                      <TableCell>{m.date}</TableCell>
                      <TableCell>{m.time}</TableCell>
                      <TableCell>{m.studentName}</TableCell>
                      <TableCell>{m.studentId}</TableCell>
                      <TableCell>{m.location}</TableCell>
                      <TableCell>{m.purpose}</TableCell>
                      <TableCell>{m.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Time</TableCell>
                  <TableCell>Student Name</TableCell>
                  <TableCell>Student ID</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Purpose</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {meetings.length === 0 ? (
                  <TableRow><TableCell colSpan={8}>No meetings found.</TableCell></TableRow>
                ) : meetings.map((m, idx) => (
                  <TableRow key={m.id || idx}>
                    <TableCell>{m.date}</TableCell>
                    <TableCell>{m.time}</TableCell>
                    <TableCell>{m.studentName}</TableCell>
                    <TableCell>{m.studentId}</TableCell>
                    <TableCell>{m.location}</TableCell>
                    <TableCell>{m.purpose}</TableCell>
                    <TableCell>{m.description}</TableCell>
                    <TableCell>
                      <Button size="small" color="info" variant="outlined" sx={{ mr: 1 }} onClick={() => setEditMeeting(m)}>Edit</Button>
                      <Button size="small" color="error" variant="outlined" onClick={() => handleDeleteMeeting(m.id)}>Delete</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpenMeetingsModal(false); setPrintMode(false); }} color="secondary">Close</Button>
        </DialogActions>
      </Dialog>
      {/* Edit Meeting Modal */}
      <Dialog open={!!editMeeting} onClose={() => setEditMeeting(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Meeting</DialogTitle>
        <DialogContent dividers>
          {editMeeting && (
            <Box component="form" onSubmit={e => { e.preventDefault(); handleEditMeetingSave(editMeeting); }}>
              <TextField label="Student Name" value={editMeeting.studentName} onChange={e => setEditMeeting({ ...editMeeting, studentName: e.target.value })} fullWidth sx={{ mb: 1 }} />
              <TextField label="Student ID" value={editMeeting.studentId} onChange={e => setEditMeeting({ ...editMeeting, studentId: e.target.value })} fullWidth sx={{ mb: 1 }} />
              <TextField label="Location" value={editMeeting.location} onChange={e => setEditMeeting({ ...editMeeting, location: e.target.value })} fullWidth sx={{ mb: 1 }} />
              <TextField label="Purpose" value={editMeeting.purpose} onChange={e => setEditMeeting({ ...editMeeting, purpose: e.target.value })} fullWidth sx={{ mb: 1 }} />
              <TextField label="Date" type="date" value={editMeeting.date} onChange={e => setEditMeeting({ ...editMeeting, date: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth sx={{ mb: 1 }} />
              <TextField label="Time" type="time" value={editMeeting.time} onChange={e => setEditMeeting({ ...editMeeting, time: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth sx={{ mb: 1 }} />
              <TextField label="Description" value={editMeeting.description} onChange={e => setEditMeeting({ ...editMeeting, description: e.target.value })} fullWidth multiline minRows={2} sx={{ mb: 1 }} />
              <DialogActions>
                <Button onClick={() => setEditMeeting(null)} color="secondary">Cancel</Button>
                <Button type="submit" variant="contained" color="primary">Save</Button>
              </DialogActions>
            </Box>
          )}
        </DialogContent>
      </Dialog>
      {/* Print meetings when printMode is true */}
      {printMode && (
        <Box sx={{ display: 'none' }}>
          <iframe
            title="print-meetings"
            srcDoc={`<html><head><title>Meetings List</title></head><body>${document.getElementById('print-meetings')?.outerHTML || ''}<script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; }<\/script></body></html>`}
            style={{ width: 0, height: 0, border: 0 }}
            onLoad={() => setTimeout(() => setPrintMode(false), 1000)}
          />
        </Box>
      )}
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
      <Snackbar open={meetingSnackbar.open} autoHideDuration={4000} onClose={() => setMeetingSnackbar({ ...meetingSnackbar, open: false })}>
        <Alert onClose={() => setMeetingSnackbar({ ...meetingSnackbar, open: false })} severity={meetingSnackbar.severity} sx={{ width: '100%' }}>
          {meetingSnackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
} 