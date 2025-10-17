import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Chip, Snackbar, Alert } from '@mui/material';
import { Visibility, CheckCircle, Cancel, Schedule, Warning } from '@mui/icons-material';
import { collection, getDocs, updateDoc, addDoc, doc, query, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';

export default function ActivityRequestsAdmin() {
  const [requests, setRequests] = useState([]);
  const [selected, setSelected] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const load = async () => {
    try {
      const q = query(collection(db, 'activity_requests'), orderBy('requestedAt', 'desc'));
      const snap = await getDocs(q);
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      setRequests([]);
      setSnackbar({ open: true, message: 'Failed to load activity requests', severity: 'error' });
    }
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (req, status) => {
    try {
      await updateDoc(doc(db, 'activity_requests', req.id), { status, adminRemarks: remarks || '', reviewedAt: new Date().toISOString(), reviewedBy: auth.currentUser?.email || 'Admin' });
      // notify teacher (store a notification)
      try {
        await addDoc(collection(db, 'notifications'), {
          recipientId: req.requestedBy || null,
          recipientEmail: req.requestedByEmail || null,
          recipientName: null,
          title: 'Activity Request ' + (status === 'approved' ? 'Approved' : 'Rejected'),
          message: `Your activity request "${req.title}" was ${status}. ${remarks ? `Remarks: ${remarks}` : ''}`,
          type: 'activity_request',
          read: false,
          createdAt: new Date().toISOString(),
          priority: 'normal'
        });
      } catch {}
      setSnackbar({ open: true, message: `Request ${status}`, severity: 'success' });
      setSelected(null);
      setRemarks('');
      load();
    } catch (e) {
      setSnackbar({ open: true, message: 'Failed to update request', severity: 'error' });
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Activity Requests</Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Requested By</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {requests.map(r => (
              <TableRow key={r.id}>
                <TableCell>{r.title}</TableCell>
                <TableCell>{r.date}</TableCell>
                <TableCell>{r.location}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ 
                      width: 20, 
                      height: 20, 
                      bgcolor: r.status === 'approved' ? '#4caf50' : 
                              r.status === 'rejected' ? '#f44336' : 
                              r.status === 'pending' ? '#ff9800' : '#9e9e9e', 
                      borderRadius: 1, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {r.status === 'approved' ? (
                        <CheckCircle sx={{ fontSize: 14, color: 'white' }} />
                      ) : r.status === 'rejected' ? (
                        <Cancel sx={{ fontSize: 14, color: 'white' }} />
                      ) : r.status === 'pending' ? (
                        <Schedule sx={{ fontSize: 14, color: 'white' }} />
                      ) : (
                        <Warning sx={{ fontSize: 14, color: 'white' }} />
                      )}
                    </Box>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: r.status === 'pending' ? '#ff9800' : 
                              r.status === 'approved' ? '#4caf50' : 
                              r.status === 'rejected' ? '#f44336' : '#000',
                        fontWeight: 500,
                        textTransform: 'capitalize'
                      }}
                    >
                      {r.status}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>{r.requestedByEmail || r.requestedBy}</TableCell>
                <TableCell>
                  <IconButton onClick={() => setSelected(r)} size="small"><Visibility /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={!!selected} onClose={() => setSelected(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Request Details</DialogTitle>
        <DialogContent>
          {selected && (
            <Box>
              <Typography variant="h6">{selected.title}</Typography>
              <Typography>Description: {selected.description}</Typography>
              <Typography>Date: {selected.date}</Typography>
              <Typography>Location: {selected.location}</Typography>
              <Typography>Status: {selected.status}</Typography>
              <TextField label="Admin Remarks" value={remarks} onChange={e => setRemarks(e.target.value)} fullWidth multiline minRows={2} sx={{ mt: 2 }} />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelected(null)}>Close</Button>
          {selected && selected.status === 'pending' && (
            <>
              <Button variant="outlined" color="error" onClick={() => updateStatus(selected, 'rejected')}>Reject</Button>
              <Button variant="contained" color="success" onClick={() => updateStatus(selected, 'approved')}>Approve</Button>
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


