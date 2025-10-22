import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Chip, Snackbar, Alert, useTheme } from '@mui/material';
import { Visibility, CheckCircle, Cancel, Schedule, Warning } from '@mui/icons-material';
import { collection, getDocs, updateDoc, addDoc, doc, query, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';

export default function ActivityRequestsAdmin() {
  const theme = useTheme();
  const [requests, setRequests] = useState([]);
  const [selected, setSelected] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const load = async () => {
    try {
      const q = query(collection(db, 'activity_bookings'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      setRequests([]);
      setSnackbar({ open: true, message: 'Failed to load booking requests', severity: 'error' });
    }
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (req, status) => {
    try {
      await updateDoc(doc(db, 'activity_bookings', req.id), { 
        status, 
        adminNotes: remarks || '', 
        updatedAt: new Date().toISOString(),
        reviewedBy: auth.currentUser?.email || 'Admin' 
      });
      // notify teacher (store a notification)
      try {
        await addDoc(collection(db, 'notifications'), {
          recipientId: req.teacherId || null,
          recipientEmail: req.teacherEmail || null,
          recipientName: req.teacherName || null,
          title: 'Activity Booking ' + (status === 'approved' ? 'Approved' : 'Rejected'),
          message: `Your activity booking "${req.activity}" for ${req.resource} on ${new Date(req.date).toLocaleDateString()} was ${status}. ${remarks ? `Remarks: ${remarks}` : ''}`,
          type: 'activity_booking',
          read: false,
          createdAt: new Date().toISOString(),
          priority: 'normal'
        });
      } catch {}
      setSnackbar({ open: true, message: `Booking request ${status}`, severity: 'success' });
      setSelected(null);
      setRemarks('');
      load();
    } catch (e) {
      setSnackbar({ open: true, message: 'Failed to update booking request', severity: 'error' });
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>All Booking Requests</Typography>
      <TableContainer component={Paper} sx={{
        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
        backdropFilter: theme.palette.mode === 'dark' ? 'blur(10px)' : 'none',
        border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : 'none'
      }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ 
                color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                fontWeight: 'bold',
                borderBottom: theme.palette.mode === 'dark' ? '1px solid #404040' : '1px solid #e0e0e0',
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#ffffff',
                backdropFilter: theme.palette.mode === 'dark' ? 'blur(10px)' : 'none'
              }}>Teacher</TableCell>
              <TableCell sx={{ 
                color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                fontWeight: 'bold',
                borderBottom: theme.palette.mode === 'dark' ? '1px solid #404040' : '1px solid #e0e0e0',
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#ffffff',
                backdropFilter: theme.palette.mode === 'dark' ? 'blur(10px)' : 'none'
              }}>Department</TableCell>
              <TableCell sx={{ 
                color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                fontWeight: 'bold',
                borderBottom: theme.palette.mode === 'dark' ? '1px solid #404040' : '1px solid #e0e0e0',
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#ffffff',
                backdropFilter: theme.palette.mode === 'dark' ? 'blur(10px)' : 'none'
              }}>Activity</TableCell>
              <TableCell sx={{ 
                color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                fontWeight: 'bold',
                borderBottom: theme.palette.mode === 'dark' ? '1px solid #404040' : '1px solid #e0e0e0',
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#ffffff',
                backdropFilter: theme.palette.mode === 'dark' ? 'blur(10px)' : 'none'
              }}>Resource</TableCell>
              <TableCell sx={{ 
                color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                fontWeight: 'bold',
                borderBottom: theme.palette.mode === 'dark' ? '1px solid #404040' : '1px solid #e0e0e0',
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#ffffff',
                backdropFilter: theme.palette.mode === 'dark' ? 'blur(10px)' : 'none'
              }}>Date</TableCell>
              <TableCell sx={{ 
                color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                fontWeight: 'bold',
                borderBottom: theme.palette.mode === 'dark' ? '1px solid #404040' : '1px solid #e0e0e0',
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#ffffff',
                backdropFilter: theme.palette.mode === 'dark' ? 'blur(10px)' : 'none'
              }}>Time Range</TableCell>
              <TableCell sx={{ 
                color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                fontWeight: 'bold',
                borderBottom: theme.palette.mode === 'dark' ? '1px solid #404040' : '1px solid #e0e0e0',
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#ffffff',
                backdropFilter: theme.palette.mode === 'dark' ? 'blur(10px)' : 'none'
              }}>Status</TableCell>
              <TableCell sx={{ 
                color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                fontWeight: 'bold',
                borderBottom: theme.palette.mode === 'dark' ? '1px solid #404040' : '1px solid #e0e0e0',
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#ffffff',
                backdropFilter: theme.palette.mode === 'dark' ? 'blur(10px)' : 'none'
              }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {requests.map(r => (
              <TableRow key={r.id} sx={{ 
                '&:hover': {
                  backgroundColor: '#f5f5f5'
                }
              }}>
                <TableCell sx={{
                  color: 'black',
                  borderBottom: '1px solid #e0e0e0',
                  backgroundColor: 'white'
                }}>{r.teacherName}</TableCell>
                <TableCell sx={{
                  color: 'black',
                  borderBottom: '1px solid #e0e0e0',
                  backgroundColor: 'white'
                }}>{r.department}</TableCell>
                <TableCell sx={{
                  color: 'black',
                  borderBottom: '1px solid #e0e0e0',
                  backgroundColor: 'white'
                }}>{r.activity}</TableCell>
                <TableCell sx={{
                  color: 'black',
                  borderBottom: '1px solid #e0e0e0',
                  backgroundColor: 'white'
                }}>{r.resource}</TableCell>
                <TableCell sx={{
                  color: 'black',
                  borderBottom: '1px solid #e0e0e0',
                  backgroundColor: 'white'
                }}>{new Date(r.date).toLocaleDateString()}</TableCell>
                <TableCell sx={{
                  color: 'black',
                  borderBottom: '1px solid #e0e0e0',
                  backgroundColor: 'white'
                }}>
                  {r.startTime && r.endTime 
                    ? `${r.startTime} - ${r.endTime}`
                    : r.time || 'N/A'
                  }
                </TableCell>
                <TableCell sx={{
                  borderBottom: '1px solid #e0e0e0',
                  backgroundColor: 'white'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ 
                      width: 20, 
                      height: 20, 
                      bgcolor: 'transparent', 
                      borderRadius: 1, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {r.status === 'approved' ? (
                        <CheckCircle sx={{ fontSize: 14, color: '#4caf50' }} />
                      ) : r.status === 'rejected' ? (
                        <Cancel sx={{ fontSize: 14, color: '#f44336' }} />
                      ) : r.status === 'pending' ? (
                        <Schedule sx={{ fontSize: 14, color: '#ff9800' }} />
                      ) : (
                        <Warning sx={{ fontSize: 14, color: '#9e9e9e' }} />
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
                <TableCell sx={{
                  borderBottom: '1px solid #e0e0e0',
                  backgroundColor: 'white'
                }}>
                  <IconButton 
                    onClick={() => setSelected(r)} 
                    size="small"
                    sx={{
                      '&:hover': { 
                        color: '#1976d2',
                        bgcolor: 'rgba(25, 118, 210, 0.04)'
                      }
                    }}
                  >
                    <Visibility />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={!!selected} onClose={() => setSelected(null)} maxWidth="md" fullWidth>
        <DialogTitle>Booking Request Details</DialogTitle>
        <DialogContent>
          {selected && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="h6" gutterBottom>{selected.activity}</Typography>
              <Typography variant="subtitle2" color="text.secondary">Teacher Name</Typography>
              <Typography variant="body1" gutterBottom>{selected.teacherName}</Typography>
              <Typography variant="subtitle2" color="text.secondary">Department</Typography>
              <Typography variant="body1" gutterBottom>{selected.department}</Typography>
              <Typography variant="subtitle2" color="text.secondary">Resource/Place</Typography>
              <Typography variant="body1" gutterBottom>{selected.resource}</Typography>
              <Typography variant="subtitle2" color="text.secondary">Date</Typography>
              <Typography variant="body1" gutterBottom>{new Date(selected.date).toLocaleDateString()}</Typography>
              <Typography variant="subtitle2" color="text.secondary">Time Range</Typography>
              <Typography variant="body1" gutterBottom>
                {selected.startTime && selected.endTime 
                  ? `${selected.startTime} - ${selected.endTime}`
                  : selected.time || 'N/A'
                }
              </Typography>
              <Typography variant="subtitle2" color="text.secondary">Status</Typography>
              <Typography variant="body1" gutterBottom sx={{ textTransform: 'capitalize' }}>{selected.status}</Typography>
              <Typography variant="subtitle2" color="text.secondary">Notes</Typography>
              <Typography variant="body1" gutterBottom>{selected.notes || 'No additional notes'}</Typography>
              <TextField 
                label="Admin Remarks" 
                value={remarks} 
                onChange={e => setRemarks(e.target.value)} 
                fullWidth 
                multiline 
                minRows={2} 
                sx={{ mt: 2 }} 
                placeholder="Add your review notes here..."
              />
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


