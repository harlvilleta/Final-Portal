import React, { useEffect, useState } from 'react';
import { Box, Typography, Grid, Card, CardContent, CardHeader, Chip, TextField, Stack, Button, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { collection, getDocs, orderBy, query, addDoc, serverTimestamp, where } from 'firebase/firestore';
import { db, auth } from '../firebase';

export default function ActivitiesView() {
  const [activities, setActivities] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [requestOpen, setRequestOpen] = useState(false);
  const [request, setRequest] = useState({ title: '', description: '', date: '', location: '' });
  const [requestHistory, setRequestHistory] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyStatus, setHistoryStatus] = useState('all');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const q = query(collection(db, 'activities'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        setActivities(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        // load teacher's request history
        try {
          const user = auth.currentUser;
          if (user) {
            const rq = query(collection(db, 'activity_requests'));
            const rsnap = await getDocs(rq);
            const all = rsnap.docs.map(d => ({ id: d.id, ...d.data() }));
            const mine = all.filter(r => (r.requestedBy === user.uid) || (r.requestedByEmail === user.email));
            setRequestHistory(mine);
          } else {
            setRequestHistory([]);
          }
        } catch {}
      } catch (e) {
        setActivities([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = activities.filter(a =>
    (a.title || '').toLowerCase().includes(search.toLowerCase()) ||
    (a.organizer || '').toLowerCase().includes(search.toLowerCase()) ||
    (a.category || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" gutterBottom sx={{ mb: 0 }}>Activities</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" onClick={() => setHistoryOpen(true)}>Request History</Button>
          <Button variant="contained" onClick={() => setRequestOpen(true)}>Request Activity</Button>
        </Box>
      </Box>
      <TextField fullWidth placeholder="Search activities..." value={search} onChange={e => setSearch(e.target.value)} sx={{ mb: 2 }} />
      
      {loading ? (
        <Typography>Loading activities...</Typography>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="textSecondary">No activities available</Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {filtered.map((act) => (
            <Grid item xs={12} key={act.id}>
              <Card>
                <CardHeader
                  title={
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography fontWeight={700}>{act.title}</Typography>
                      <Chip label={act.category || 'General'} color="default" size="small" />
                      <Chip label={act.completed ? 'Completed' : 'Scheduled'} color={act.completed ? 'success' : 'warning'} size="small" />
                    </Stack>
                  }
                  subheader={act.date ? new Date(act.date).toLocaleDateString() : ''}
                />
                <CardContent>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {act.description || ''}
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    {act.organizer && <Chip label={`Organizer: ${act.organizer}`} size="small" variant="outlined" />}
                    {act.location && <Chip label={`Location: ${act.location}`} size="small" variant="outlined" />}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Request history dialog */}
      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>My Activity Requests</DialogTitle>
        <DialogContent>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <Button variant={historyStatus === 'all' ? 'contained' : 'outlined'} onClick={() => setHistoryStatus('all')}>All</Button>
            <Button variant={historyStatus === 'pending' ? 'contained' : 'outlined'} onClick={() => setHistoryStatus('pending')}>Pending</Button>
            <Button variant={historyStatus === 'approved' ? 'contained' : 'outlined'} onClick={() => setHistoryStatus('approved')}>Approved</Button>
            <Button variant={historyStatus === 'rejected' ? 'contained' : 'outlined'} onClick={() => setHistoryStatus('rejected')}>Rejected</Button>
          </Stack>
          <Grid container spacing={2}>
            {requestHistory
              .filter(r => historyStatus === 'all' ? true : (r.status || 'pending') === historyStatus)
              .map(r => (
              <Grid item xs={12} md={6} key={r.id}>
                <Card>
                  <CardHeader title={r.title} subheader={r.date} />
                  <CardContent>
                    <Typography variant="body2" sx={{ mb: 1 }}>{r.description}</Typography>
                    <Stack direction="row" spacing={1}>
                      <Chip label={r.status || 'pending'} color={(r.status === 'approved' && 'success') || (r.status === 'rejected' && 'error') || 'warning'} size="small" />
                      {r.location && <Chip label={`Location: ${r.location}`} size="small" variant="outlined" />}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
            {requestHistory.filter(r => historyStatus === 'all' ? true : (r.status || 'pending') === historyStatus).length === 0 && (
              <Box sx={{ p: 2, color: 'text.secondary' }}>No requests found.</Box>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={requestOpen} onClose={() => setRequestOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Request Activity</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Title" value={request.title} onChange={e => setRequest({ ...request, title: e.target.value })} fullWidth />
            <TextField label="Description" value={request.description} onChange={e => setRequest({ ...request, description: e.target.value })} fullWidth multiline rows={3} />
            <TextField type="date" label="Date" InputLabelProps={{ shrink: true }} value={request.date} onChange={e => setRequest({ ...request, date: e.target.value })} fullWidth />
            <TextField label="Location" value={request.location} onChange={e => setRequest({ ...request, location: e.target.value })} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRequestOpen(false)} disabled={submitting}>Cancel</Button>
          <Button
            variant="contained"
            disabled={submitting || !request.title || !request.date}
            onClick={async () => {
              setSubmitting(true);
              try {
                const user = auth.currentUser;
                await addDoc(collection(db, 'activity_requests'), {
                  title: request.title.trim(),
                  description: request.description.trim(),
                  date: request.date,
                  location: request.location.trim(),
                  status: 'pending',
                  requestedBy: user?.uid || null,
                  requestedByEmail: user?.email || null,
                  requestedAt: serverTimestamp()
                });
                setRequestOpen(false);
                setRequest({ title: '', description: '', date: '', location: '' });
              } catch (e) {
                // noop (could add snackbar)
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {submitting ? 'Submitting...' : 'Submit Request'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}


