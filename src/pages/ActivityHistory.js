import React, { useState, useEffect } from "react";
import { Box, Typography, Grid, Card, CardContent, TextField, Button, MenuItem, Paper, List, ListItem, ListItemText, Divider, Stack, Snackbar, Alert, IconButton, Table, TableHead, TableBody, TableRow, TableCell, Dialog, DialogTitle, DialogContent, DialogActions, Chip, InputAdornment, Pagination } from "@mui/material";
import { EventNote, History, CheckCircle, Edit, Delete, Visibility } from "@mui/icons-material";
import { collection, getDocs, updateDoc, doc, orderBy, query, deleteDoc } from "firebase/firestore";
import { db, logActivity } from "../firebase";
import SearchIcon from '@mui/icons-material/Search';

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

function ActivityHistoryTable({ activities, onView, onEdit, onDelete, search, onSearch, page, onPageChange, rowsPerPage }) {
  // Filter and paginate
  const filtered = activities.filter(a =>
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    a.organizer?.toLowerCase().includes(search.toLowerCase()) ||
    a.category?.toLowerCase().includes(search.toLowerCase())
  );
  const paginated = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  
  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <History />
        Activity History
      </Typography>
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

export default function ActivityHistory() {
  const [activities, setActivities] = useState([]);
  const [refresh, setRefresh] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [viewActivity, setViewActivity] = useState(null);
  const [editActivity, setEditActivity] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [searchHistory, setSearchHistory] = useState("");
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

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

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: '#1976d2', mb: 3 }}>
        Activity History
      </Typography>
      
      <ActivityHistoryTable 
        activities={activities} 
        onView={handleView} 
        onEdit={handleEdit} 
        onDelete={handleDelete} 
        search={searchHistory} 
        onSearch={setSearchHistory} 
        page={page} 
        onPageChange={setPage} 
        rowsPerPage={rowsPerPage} 
      />

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
                  {["Seminar", "Meeting", "Workshop", "Event", "Other"].map((cat) => <MenuItem key={cat} value={cat}>{cat}</MenuItem>)}
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
    </Box>
  );
}
