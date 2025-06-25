import React, { useState, useEffect } from "react";
import { Box, Typography, Grid, Card, CardContent, TextField, Button, MenuItem, Paper, List, ListItem, ListItemText, Divider, Stack, Snackbar, Alert, IconButton, Table, TableHead, TableBody, TableRow, TableCell, Dialog, DialogTitle, DialogContent, DialogActions, Chip, InputAdornment, Pagination } from "@mui/material";
import { EventNote, History, CheckCircle, Edit, Delete, Visibility } from "@mui/icons-material";
import { collection, addDoc, getDocs, updateDoc, doc, orderBy, query, deleteDoc } from "firebase/firestore";
import { db, logActivity } from "../firebase";
import SearchIcon from '@mui/icons-material/Search';

const categories = ["Seminar", "Meeting", "Workshop", "Event", "Other"];

function ActivityForm({ onActivityAdded }) {
  const [form, setForm] = useState({
    title: "",
    date: "",
    startTime: "",
    endTime: "",
    organizer: "",
    location: "",
    category: "Seminar",
    maxParticipants: "",
    description: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.date || !form.startTime || !form.endTime || !form.organizer || !form.location || !form.category || !form.maxParticipants || !form.description) {
      setSnackbar({ open: true, message: "Please fill in all fields.", severity: "error" });
      return;
    }
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "activities"), {
        ...form,
        createdAt: new Date().toISOString(),
        completed: false
      });
      await logActivity({ message: `Activity scheduled: ${form.title}`, type: 'add_activity' });
      setSnackbar({ open: true, message: "Activity scheduled!", severity: "success" });
      setForm({
        title: "",
        date: "",
        startTime: "",
        endTime: "",
        organizer: "",
        location: "",
        category: "Seminar",
        maxParticipants: "",
        description: ""
      });
      if (onActivityAdded) onActivityAdded();
    } catch (e) {
      setSnackbar({ open: true, message: "Error scheduling activity.", severity: "error" });
    }
    setIsSubmitting(false);
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h5" gutterBottom>Schedule New Activity</Typography>
      <Box component="form" onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Title" name="title" value={form.title} onChange={handleChange} required />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth type="date" label="Date" name="date" value={form.date} onChange={handleChange} InputLabelProps={{ shrink: true }} required />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth type="time" label="Start Time" name="startTime" value={form.startTime} onChange={handleChange} InputLabelProps={{ shrink: true }} required />
              </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth type="time" label="End Time" name="endTime" value={form.endTime} onChange={handleChange} InputLabelProps={{ shrink: true }} required />
              </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Organizer" name="organizer" value={form.organizer} onChange={handleChange} required />
              </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Location" name="location" value={form.location} onChange={handleChange} required />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth select label="Category" name="category" value={form.category} onChange={handleChange} required>
              {categories.map((cat) => <MenuItem key={cat} value={cat}>{cat}</MenuItem>)}
                </TextField>
              </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth type="number" label="Max Participants" name="maxParticipants" value={form.maxParticipants} onChange={handleChange} required />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth multiline minRows={3} label="Description" name="description" value={form.description} onChange={handleChange} required />
          </Grid>
          <Grid item xs={12}>
            <Button type="submit" variant="contained" color="primary" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Activity"}
            </Button>
          </Grid>
        </Grid>
      </Box>
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
}

function SummaryCard({ stats }) {
  return (
    <Paper sx={{ p: 2, mb: 2, bgcolor: '#f5f6fa', boxShadow: 1 }}>
      <Typography variant="h6" gutterBottom>Activity Summary</Typography>
      <Stack direction="row" spacing={2}>
        <Box>
          <Typography variant="body2">Total</Typography>
          <Typography variant="h5" color="primary.main">{stats.total}</Typography>
        </Box>
        <Box>
          <Typography variant="body2">Scheduled</Typography>
          <Typography variant="h5" color="warning.main">{stats.scheduled}</Typography>
        </Box>
        <Box>
          <Typography variant="body2">Completed</Typography>
          <Typography variant="h5" color="success.main">{stats.completed}</Typography>
        </Box>
        <Box>
          <Typography variant="body2">Categories</Typography>
          <Typography variant="h5">{stats.categories}</Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

function ExportButton({ activities }) {
  const handleExport = () => {
    const csvRows = [
      ["Title", "Date", "Status", "Category", "Organizer", "Location", "Max Participants", "Description"],
      ...activities.map(a => [
        a.title, a.date, a.completed ? 'Completed' : 'Scheduled', a.category, a.organizer, a.location, a.maxParticipants, a.description
      ])
    ];
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.href = csvContent;
    link.download = "activities.csv";
    link.click();
  };
  return <Button variant="outlined" color="info" onClick={handleExport} sx={{ mb: 2 }}>Export to CSV</Button>;
}

function SearchBar({ value, onChange, placeholder }) {
  return (
    <TextField
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
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
  );
}

function ActivityHistory({ activities, onView, onEdit, onDelete, search, onSearch, page, onPageChange, rowsPerPage }) {
  // Filter and paginate
  const filtered = activities.filter(a =>
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    a.organizer?.toLowerCase().includes(search.toLowerCase()) ||
    a.category?.toLowerCase().includes(search.toLowerCase())
  );
  const paginated = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h5" gutterBottom>Activity History</Typography>
      <SearchBar value={search} onChange={onSearch} placeholder="Search activities..." />
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Title</TableCell>
            <TableCell>Date</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Category</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {paginated.length === 0 ? (
            <TableRow><TableCell colSpan={5}>No activities found.</TableCell></TableRow>
          ) : paginated.map((a) => (
            <TableRow key={a.id}>
              <TableCell>{a.title}</TableCell>
              <TableCell>{a.date ? new Date(a.date).toLocaleDateString() : ''}</TableCell>
              <TableCell>
                <Chip label={a.completed ? 'Completed' : 'Scheduled'} color={a.completed ? 'success' : 'warning'} size="small" />
              </TableCell>
              <TableCell>
                <Chip label={a.category} color="info" size="small" />
              </TableCell>
              <TableCell>
                <Stack direction="row" spacing={1}>
                  <IconButton size="small" color="primary" onClick={() => onView(a)}><Visibility /></IconButton>
                  <IconButton size="small" color="warning" onClick={() => onEdit(a)}><Edit /></IconButton>
                  <IconButton size="small" color="error" onClick={() => onDelete(a)}><Delete /></IconButton>
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
        <Pagination
          count={Math.ceil(filtered.length / rowsPerPage)}
          page={page}
          onChange={(_, v) => onPageChange(v)}
          color="primary"
        />
    </Box>
    </Paper>
  );
}

function ScheduledActivities({ activities, onMarkCompleted, search, onSearch }) {
  const filtered = activities.filter(a => !a.completed && (
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    a.organizer?.toLowerCase().includes(search.toLowerCase()) ||
    a.category?.toLowerCase().includes(search.toLowerCase())
  ));
  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h5" gutterBottom>Scheduled Activities</Typography>
      <SearchBar value={search} onChange={onSearch} placeholder="Search scheduled..." />
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Title</TableCell>
            <TableCell>Date</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Category</TableCell>
            <TableCell>Action</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow><TableCell colSpan={5}>No scheduled activities.</TableCell></TableRow>
          ) : filtered.map((a) => (
            <TableRow key={a.id}>
              <TableCell>{a.title}</TableCell>
              <TableCell>{a.date ? new Date(a.date).toLocaleDateString() : ''}</TableCell>
              <TableCell>
                <Chip label="Scheduled" color="warning" size="small" />
              </TableCell>
              <TableCell>
                <Chip label={a.category} color="info" size="small" />
              </TableCell>
              <TableCell>
                <Button variant="contained" color="success" size="small" onClick={() => onMarkCompleted(a)}>
                  Mark as Completed
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
}

export default function Activity() {
  const [activities, setActivities] = useState([]);
  const [refresh, setRefresh] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [viewActivity, setViewActivity] = useState(null);
  const [editActivity, setEditActivity] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [searchScheduled, setSearchScheduled] = useState("");
  const [searchHistory, setSearchHistory] = useState("");
  const [page, setPage] = useState(1);
  const rowsPerPage = 5;
  const [openEventModal, setOpenEventModal] = useState(false);
  const [eventForm, setEventForm] = useState({ title: '', description: '', proposedBy: '', date: '', time: '', location: '' });
  const [eventSubmitting, setEventSubmitting] = useState(false);
  const [eventSnackbar, setEventSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Summary stats
  const stats = {
    total: activities.length,
    scheduled: activities.filter(a => !a.completed).length,
    completed: activities.filter(a => a.completed).length,
    categories: Array.from(new Set(activities.map(a => a.category))).length
  };

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const q = query(collection(db, "activities"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        setActivities(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (e) {
        setActivities([]);
      }
    };
    fetchActivities();
  }, [refresh]);

  const handleActivityAdded = () => setRefresh(r => !r);

  const handleMarkCompleted = async (activity) => {
    try {
      await updateDoc(doc(db, "activities", activity.id), { completed: true });
      setSnackbar({ open: true, message: "Marked as completed!", severity: "success" });
      setRefresh(r => !r);
    } catch (e) {
      setSnackbar({ open: true, message: "Error marking as completed.", severity: "error" });
    }
  };

  const handleView = (activity) => setViewActivity(activity);
  const handleEdit = (activity) => {
    setEditActivity(activity);
    setEditForm({ ...activity });
  };
  const handleDelete = async (activity) => {
    if (window.confirm(`Delete activity: ${activity.title}?`)) {
      try {
        await deleteDoc(doc(db, "activities", activity.id));
        await logActivity({ message: `Activity deleted: ${activity.title}`, type: 'delete_activity' });
        setSnackbar({ open: true, message: "Activity deleted.", severity: "success" });
        setRefresh(r => !r);
      } catch (e) {
        setSnackbar({ open: true, message: "Error deleting activity.", severity: "error" });
      }
    }
  };
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(f => ({ ...f, [name]: value }));
  };
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsEditSubmitting(true);
    try {
      await updateDoc(doc(db, "activities", editActivity.id), {
        ...editForm,
        updatedAt: new Date().toISOString(),
      });
      await logActivity({ message: `Activity updated: ${editForm.title}`, type: 'edit_activity' });
      setSnackbar({ open: true, message: "Activity updated!", severity: "success" });
      setEditActivity(null);
      setEditForm(null);
      setRefresh(r => !r);
    } catch (e) {
      setSnackbar({ open: true, message: "Error updating activity.", severity: "error" });
    }
    setIsEditSubmitting(false);
  };

  const handleEventFormChange = (e) => {
    const { name, value } = e.target;
    setEventForm(f => ({ ...f, [name]: value }));
  };
  const handleEventSubmit = async (e) => {
    e.preventDefault();
    setEventSubmitting(true);
    try {
      await addDoc(collection(db, 'events'), {
        ...eventForm,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
      setEventSnackbar({ open: true, message: 'Event proposal submitted for approval!', severity: 'success' });
      setOpenEventModal(false);
      setEventForm({ title: '', description: '', proposedBy: '', date: '', time: '', location: '' });
    } catch (e) {
      setEventSnackbar({ open: true, message: 'Failed to submit event proposal.', severity: 'error' });
    }
    setEventSubmitting(false);
  };

  return (
    <>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Button
            variant="contained"
            color="success"
            sx={{ mb: 2 }}
            onClick={() => setOpenEventModal(true)}
          >
            Schedule Event (for Approval)
          </Button>
        </Grid>
        <Grid item xs={12} md={5}>
          <SummaryCard stats={stats} />
          <ExportButton activities={activities} />
          <ActivityForm onActivityAdded={handleActivityAdded} />
        </Grid>
        <Grid item xs={12} md={7}>
          <Box>
            <ScheduledActivities activities={activities} onMarkCompleted={handleMarkCompleted} search={searchScheduled} onSearch={setSearchScheduled} />
            <ActivityHistory activities={activities} onView={handleView} onEdit={handleEdit} onDelete={handleDelete} search={searchHistory} onSearch={setSearchHistory} page={page} onPageChange={setPage} rowsPerPage={rowsPerPage} />
          </Box>
        </Grid>
      </Grid>
      {/* Schedule Event Modal */}
      <Dialog open={openEventModal} onClose={() => setOpenEventModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Schedule Event (for Approval)</DialogTitle>
        <DialogContent dividers>
          <form onSubmit={handleEventSubmit}>
            <TextField label="Title" name="title" value={eventForm.title} onChange={handleEventFormChange} fullWidth required sx={{ mb: 2 }} />
            <TextField label="Description" name="description" value={eventForm.description} onChange={handleEventFormChange} fullWidth required multiline minRows={2} sx={{ mb: 2 }} />
            <TextField label="Proposed By (Club/Org/Student)" name="proposedBy" value={eventForm.proposedBy} onChange={handleEventFormChange} fullWidth required sx={{ mb: 2 }} />
            <TextField label="Date" name="date" type="date" value={eventForm.date} onChange={handleEventFormChange} InputLabelProps={{ shrink: true }} fullWidth required sx={{ mb: 2 }} />
            <TextField label="Time" name="time" type="time" value={eventForm.time} onChange={handleEventFormChange} InputLabelProps={{ shrink: true }} fullWidth required sx={{ mb: 2 }} />
            <TextField label="Location" name="location" value={eventForm.location} onChange={handleEventFormChange} fullWidth required sx={{ mb: 2 }} />
            <DialogActions>
              <Button onClick={() => setOpenEventModal(false)} color="secondary">Cancel</Button>
              <Button type="submit" variant="contained" color="primary" disabled={eventSubmitting}>
                {eventSubmitting ? 'Submitting...' : 'Submit'}
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>
      <Snackbar open={eventSnackbar.open} autoHideDuration={4000} onClose={() => setEventSnackbar({ ...eventSnackbar, open: false })}>
        <Alert onClose={() => setEventSnackbar({ ...eventSnackbar, open: false })} severity={eventSnackbar.severity} sx={{ width: '100%' }}>
          {eventSnackbar.message}
        </Alert>
      </Snackbar>
      {/* View Activity Modal */}
      <Dialog open={!!viewActivity} onClose={() => setViewActivity(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Activity Details</DialogTitle>
        <DialogContent>
          {viewActivity && (
            <Box>
              <Typography variant="h6">{viewActivity.title}</Typography>
              <Typography>Date: {viewActivity.date ? new Date(viewActivity.date).toLocaleDateString() : ''}</Typography>
              <Typography>Status: {viewActivity.completed ? 'Completed' : 'Scheduled'}</Typography>
              <Typography>Organizer: {viewActivity.organizer}</Typography>
              <Typography>Location: {viewActivity.location}</Typography>
              <Typography>Category: {viewActivity.category}</Typography>
              <Typography>Max Participants: {viewActivity.maxParticipants}</Typography>
              <Typography>Description: {viewActivity.description}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewActivity(null)}>Close</Button>
        </DialogActions>
      </Dialog>
      {/* Edit Activity Modal */}
      <Dialog open={!!editActivity} onClose={() => setEditActivity(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Activity</DialogTitle>
        <DialogContent>
          {editForm && (
            <Box component="form" onSubmit={handleEditSubmit} sx={{ mt: 2 }}>
              <Stack spacing={2}>
                <TextField label="Title" name="title" value={editForm.title} onChange={handleEditChange} fullWidth required />
                <TextField label="Date" name="date" type="date" value={editForm.date} onChange={handleEditChange} InputLabelProps={{ shrink: true }} fullWidth required />
                <TextField label="Organizer" name="organizer" value={editForm.organizer} onChange={handleEditChange} fullWidth required />
                <TextField label="Location" name="location" value={editForm.location} onChange={handleEditChange} fullWidth required />
                <TextField label="Category" name="category" value={editForm.category} onChange={handleEditChange} select fullWidth required>
                  {categories.map((cat) => <MenuItem key={cat} value={cat}>{cat}</MenuItem>)}
                </TextField>
                <TextField label="Max Participants" name="maxParticipants" type="number" value={editForm.maxParticipants} onChange={handleEditChange} fullWidth required />
                <TextField label="Description" name="description" value={editForm.description} onChange={handleEditChange} fullWidth multiline minRows={2} required />
                <Stack direction="row" spacing={2}>
                  <Button type="submit" variant="contained" color="primary" disabled={isEditSubmitting}>
                    {isEditSubmitting ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button onClick={() => setEditActivity(null)} disabled={isEditSubmitting}>Cancel</Button>
                </Stack>
              </Stack>
            </Box>
          )}
        </DialogContent>
      </Dialog>
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
} 