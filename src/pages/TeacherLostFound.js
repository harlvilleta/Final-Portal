import React, { useEffect, useState } from 'react';
import { Box, Typography, Grid, Paper, TextField, Button, Snackbar, Alert, MenuItem, Card, CardContent, Chip, Avatar, useTheme } from '@mui/material';
import { Add, Search } from '@mui/icons-material';
import { db } from '../firebase';
import { collection, addDoc, query, orderBy, onSnapshot } from 'firebase/firestore';

export default function TeacherLostFound() {
  const theme = useTheme();
  const [form, setForm] = useState({ type: 'lost', name: '', description: '', location: '' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [lostItems, setLostItems] = useState([]);
  const [foundItems, setFoundItems] = useState([]);
  const [lostSearch, setLostSearch] = useState('');
  const [foundSearch, setFoundSearch] = useState('');
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

  const filteredLost = lostItems.filter(i =>
    (i.name || '').toLowerCase().includes(lostSearch.toLowerCase()) ||
    (i.description || '').toLowerCase().includes(lostSearch.toLowerCase()) ||
    (i.location || '').toLowerCase().includes(lostSearch.toLowerCase())
  );

  const filteredFound = foundItems.filter(i =>
    (i.name || '').toLowerCase().includes(foundSearch.toLowerCase()) ||
    (i.description || '').toLowerCase().includes(foundSearch.toLowerCase()) ||
    (i.location || '').toLowerCase().includes(foundSearch.toLowerCase())
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000', mb: 3 }}>
        Lost & Found
      </Typography>

      <Grid container spacing={3}>
        {/* Submit Item Panel */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
              <Add sx={{ mr: 1, verticalAlign: 'middle' }} /> Submit Item
            </Typography>
            <form onSubmit={handleSubmit}>
              <TextField
                select
                fullWidth
                size="small"
                label="Type"
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                sx={{ mb: 2 }}
              >
                <MenuItem value="lost">Lost</MenuItem>
                <MenuItem value="found">Found</MenuItem>
              </TextField>
              <TextField fullWidth size="small" label="Item Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} sx={{ mb: 2 }} />
              <TextField fullWidth size="small" label="Description" multiline minRows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} sx={{ mb: 2 }} />
              <TextField fullWidth size="small" label="Location" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} sx={{ mb: 2 }} />
              <Button type="submit" variant="outlined" disabled={submitting} sx={{
                textTransform: 'none', bgcolor: '#fff', color: '#000', borderColor: '#000',
                '&:hover': { bgcolor: '#800000', color: '#fff', borderColor: '#800000' }
              }}>
                {submitting ? 'Submitting...' : 'Submit'}
              </Button>
            </form>
          </Paper>
        </Grid>

        {/* Lists Panel */}
        <Grid item xs={12} md={7}>
          <Grid container spacing={3}>
            {/* Lost Items History */}
            <Grid item xs={12}>
              <Paper sx={{ 
                p: 3, 
                bgcolor: 'rgba(255,255,255,0.9)',
                border: '0.5px solid rgba(0,0,0,0.1)',
                borderLeft: '4px solid #f44336',
                borderRadius: 2,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, color: '#000' }}>
                  Lost Items History ({filteredLost.length})
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search lost items..."
                  value={lostSearch}
                  onChange={e => setLostSearch(e.target.value)}
                  sx={{ 
                    mb: 2,
                    '& .MuiOutlinedInput-root': {
                      '&:hover fieldset': {
                        borderColor: '#800000',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#800000',
                      },
                    },
                  }}
                  InputProps={{ startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} /> }}
                />
                {filteredLost.length === 0 ? (
                  <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 2 }}>
                    <Typography variant="body2" sx={{ color: '#333' }}>No lost items found.</Typography>
                  </Paper>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {filteredLost.map((item) => (
                      <Paper key={item.id} sx={{ 
                        p: 2, border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 2,
                        '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }, transition: 'all 0.2s'
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Avatar sx={{ width: 32, height: 32, mr: 2, bgcolor: '#ff9800', color: '#fff' }}>L</Avatar>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#000' }}>{item.name}</Typography>
                            <Typography variant="caption" sx={{ color: '#333' }}>{new Date(item.createdAt).toLocaleDateString()}</Typography>
                          </Box>
                          <Chip 
                            label={item.resolved ? 'Resolved' : 'Active'} 
                            size="small"
                            sx={{
                              backgroundColor: 'transparent',
                              color: item.resolved ? '#4caf50' : '#ff9800',
                              border: 'none',
                              '& .MuiChip-label': {
                                color: item.resolved ? '#4caf50' : '#ff9800'
                              }
                            }}
                          />
                        </Box>
                        {item.description && (
                          <Typography variant="body2" sx={{ color: '#000', mb: 1 }}>{item.description}</Typography>
                        )}
                        <Typography variant="caption" sx={{ color: '#333' }}>
                          <strong>Lost by:</strong> {item.lostBy || 'Unknown'} | <strong>Location:</strong> {item.location || 'Unknown'}
                        </Typography>
                      </Paper>
                    ))}
                  </Box>
                )}
              </Paper>
            </Grid>

            {/* Found Items Summary */}
            <Grid item xs={12}>
              <Paper sx={{ 
                p: 3, 
                bgcolor: 'rgba(255,255,255,0.9)',
                border: '0.5px solid rgba(0,0,0,0.1)',
                borderLeft: '4px solid #4caf50',
                borderRadius: 2,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, color: '#000' }}>
                  Found Items Summary ({filteredFound.length})
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search found items..."
                  value={foundSearch}
                  onChange={e => setFoundSearch(e.target.value)}
                  sx={{ 
                    mb: 2,
                    '& .MuiOutlinedInput-root': {
                      '&:hover fieldset': {
                        borderColor: '#800000',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#800000',
                      },
                    },
                  }}
                  InputProps={{ startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} /> }}
                />
                {filteredFound.length === 0 ? (
                  <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 2 }}>
                    <Typography variant="body2" sx={{ color: '#333' }}>No found items found.</Typography>
                  </Paper>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {filteredFound.map((item) => (
                      <Paper key={item.id} sx={{ 
                        p: 2, border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 2,
                        '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }, transition: 'all 0.2s'
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Avatar sx={{ width: 32, height: 32, mr: 2, bgcolor: '#4caf50', color: '#fff' }}>F</Avatar>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#000' }}>{item.name}</Typography>
                            <Typography variant="caption" sx={{ color: '#333' }}>{new Date(item.createdAt).toLocaleDateString()}</Typography>
                          </Box>
                          <Chip 
                            label={item.resolved ? 'Resolved' : 'Active'} 
                            size="small"
                            sx={{
                              backgroundColor: 'transparent',
                              color: item.resolved ? '#4caf50' : '#ff9800',
                              border: 'none',
                              '& .MuiChip-label': {
                                color: item.resolved ? '#4caf50' : '#ff9800'
                              }
                            }}
                          />
                        </Box>
                        {item.description && (
                          <Typography variant="body2" sx={{ color: '#000', mb: 1 }}>{item.description}</Typography>
                        )}
                        <Typography variant="caption" sx={{ color: '#333' }}>
                          <strong>Found by:</strong> {item.foundBy || 'Unknown'} | <strong>Location:</strong> {item.location || 'Unknown'}
                        </Typography>
                      </Paper>
                    ))}
                  </Box>
                )}
              </Paper>
            </Grid>
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


