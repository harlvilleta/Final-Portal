import React, { useEffect, useState } from 'react';
import { Box, Typography, Grid, Paper, TextField, Button, Snackbar, Alert, MenuItem, Card, CardContent, Chip, Avatar } from '@mui/material';
import { Add, Search } from '@mui/icons-material';
import { db } from '../firebase';
import { collection, addDoc, query, orderBy, onSnapshot } from 'firebase/firestore';

export default function TeacherLostFound() {
  const [form, setForm] = useState({ type: 'lost', name: '', description: '', location: '' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [lostItems, setLostItems] = useState([]);
  const [foundItems, setFoundItems] = useState([]);
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsubLost = onSnapshot(query(collection(db, 'lost_items'), orderBy('createdAt', 'desc')), snap => {
      setLostItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubFound = onSnapshot(query(collection(db, 'found_items'), orderBy('createdAt', 'desc')), snap => {
      setFoundItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubLost(); unsubFound(); };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setSnackbar({ open: true, message: 'Please enter an item name', severity: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      const payload = { ...form, resolved: false, createdAt: new Date().toISOString() };
      const col = form.type === 'lost' ? 'lost_items' : 'found_items';
      await addDoc(collection(db, col), payload);
      setForm({ type: form.type, name: '', description: '', location: '' });
      setSnackbar({ open: true, message: `${form.type === 'lost' ? 'Lost' : 'Found'} item submitted!`, severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: 'Submit failed: ' + err.message, severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = (items) => items.filter(i =>
    (i.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (i.description || '').toLowerCase().includes(search.toLowerCase()) ||
    (i.location || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: '#1976d2' }}>
        Lost & Found
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
              <Add sx={{ mr: 1, verticalAlign: 'middle' }} /> Submit Item
            </Typography>
            <form onSubmit={handleSubmit}>
              <TextField
                select
                fullWidth
                label="Type"
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                sx={{ mb: 2 }}
              >
                <MenuItem value="lost">Lost</MenuItem>
                <MenuItem value="found">Found</MenuItem>
              </TextField>
              <TextField fullWidth label="Item Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} sx={{ mb: 2 }} />
              <TextField fullWidth label="Description" multiline minRows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} sx={{ mb: 2 }} />
              <TextField fullWidth label="Location" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} sx={{ mb: 2 }} />
              <Button type="submit" variant="contained" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit'}
              </Button>
            </form>
          </Paper>
        </Grid>

        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3, mb: 2 }}>
            <TextField
              fullWidth
              placeholder="Search items..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              InputProps={{ startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} /> }}
            />
          </Paper>

          <Grid container spacing={2}>
            {[{ title: 'Recent Lost Items', items: filtered(lostItems), color: '#e65100', chip: 'warning' }, { title: 'Recent Found Items', items: filtered(foundItems), color: '#2e7d32', chip: 'success' }].map(section => (
              <Grid item xs={12} key={section.title}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, color: section.color }}>
                  {section.title} ({section.items.length})
                </Typography>
                {section.items.length === 0 ? (
                  <Typography color="text.secondary">No items yet.</Typography>
                ) : (
                  section.items.slice(0, 10).map(item => (
                    <Card key={item.id} sx={{ mb: 2 }}>
                      <CardContent>
                        <Grid container spacing={2} alignItems="center">
                          <Grid item>
                            {item.image && (<Avatar src={item.image} variant="rounded" sx={{ width: 56, height: 56 }} />)}
                          </Grid>
                          <Grid item xs>
                            <Typography fontWeight={700}>{item.name}</Typography>
                            <Typography variant="body2" color="text.secondary">{item.description}</Typography>
                            <Typography variant="caption" color="text.secondary">Location: {item.location}</Typography>
                          </Grid>
                          <Grid item>
                            <Chip label={section.title.includes('Lost') ? 'Lost' : 'Found'} color={section.chip} size="small" />
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  ))
                )}
              </Grid>
            ))}
          </Grid>
        </Grid>
      </Grid>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}


