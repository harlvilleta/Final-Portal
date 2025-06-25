import React, { useEffect, useState } from "react";
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Stack, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Snackbar, Alert, Chip, Select, InputLabel, FormControl
} from "@mui/material";
import { collection, getDocs, updateDoc, doc, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";

const statusOptions = ["pending", "approved", "rejected"];

export default function EventSchedulingAdmin() {
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState("pending");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "events"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setEvents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) {
      setSnackbar({ open: true, message: "Failed to fetch events", severity: "error" });
    }
    setLoading(false);
  };

  const handleApprove = async (event) => {
    setLoading(true);
    try {
      await updateDoc(doc(db, "events", event.id), { status: "approved", adminRemarks: remarks });
      setSnackbar({ open: true, message: "Event approved!", severity: "success" });
      setSelectedEvent(null);
      setRemarks("");
      fetchEvents();
    } catch (e) {
      setSnackbar({ open: true, message: "Failed to approve event", severity: "error" });
    }
    setLoading(false);
  };

  const handleReject = async (event) => {
    setLoading(true);
    try {
      await updateDoc(doc(db, "events", event.id), { status: "rejected", adminRemarks: remarks });
      setSnackbar({ open: true, message: "Event rejected!", severity: "success" });
      setSelectedEvent(null);
      setRemarks("");
      fetchEvents();
    } catch (e) {
      setSnackbar({ open: true, message: "Failed to reject event", severity: "error" });
    }
    setLoading(false);
  };

  const filteredEvents = events.filter(e => filter === "all" ? true : e.status === filter);

  return (
    <Box sx={{ maxWidth: 1000, mx: "auto", p: 3 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>Event Scheduling (Admin)</Typography>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <FormControl sx={{ minWidth: 180 }}>
            <InputLabel>Status Filter</InputLabel>
            <Select
              value={filter}
              label="Status Filter"
              onChange={e => setFilter(e.target.value)}
              size="small"
            >
              <MenuItem value="all">All</MenuItem>
              {statusOptions.map(status => (
                <MenuItem key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="outlined" onClick={fetchEvents} disabled={loading}>Refresh</Button>
        </Stack>
      </Paper>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Proposed By</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredEvents.length === 0 ? (
              <TableRow><TableCell colSpan={6} align="center">No events found.</TableCell></TableRow>
            ) : filteredEvents.map(event => (
              <TableRow key={event.id}>
                <TableCell>{event.title}</TableCell>
                <TableCell>{event.proposedBy}</TableCell>
                <TableCell>{event.date}</TableCell>
                <TableCell>{event.location}</TableCell>
                <TableCell>
                  <Chip label={event.status} color={event.status === "approved" ? "success" : event.status === "rejected" ? "error" : "warning"} />
                </TableCell>
                <TableCell>
                  <Button size="small" onClick={() => { setSelectedEvent(event); setRemarks(event.adminRemarks || ""); }}>View</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {/* Event Details Dialog */}
      <Dialog open={!!selectedEvent} onClose={() => setSelectedEvent(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Event Details</DialogTitle>
        <DialogContent dividers>
          {selectedEvent && (
            <Box>
              <Typography variant="h6">{selectedEvent.title}</Typography>
              <Typography><b>Description:</b> {selectedEvent.description}</Typography>
              <Typography><b>Proposed By:</b> {selectedEvent.proposedBy}</Typography>
              <Typography><b>Date:</b> {selectedEvent.date}</Typography>
              <Typography><b>Time:</b> {selectedEvent.time}</Typography>
              <Typography><b>Location:</b> {selectedEvent.location}</Typography>
              <Typography><b>Status:</b> {selectedEvent.status}</Typography>
              <TextField
                label="Admin Remarks"
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                fullWidth
                multiline
                minRows={2}
                sx={{ mt: 2 }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedEvent(null)} color="secondary">Close</Button>
          {selectedEvent && selectedEvent.status === "pending" && (
            <>
              <Button onClick={() => handleApprove(selectedEvent)} color="success" variant="contained" disabled={loading}>Approve</Button>
              <Button onClick={() => handleReject(selectedEvent)} color="error" variant="contained" disabled={loading}>Reject</Button>
            </>
          )}
        </DialogActions>
      </Dialog>
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
} 