import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  TextField,
  Button,
  Avatar,
  Snackbar,
  Alert,
  Card,
  CardContent,
  Chip,
  IconButton,
  Tooltip,
  useTheme
} from '@mui/material';
import {
  Search,
  ArrowBack,
  Person,
  LocationOn,
  AccessTime,
  CheckCircle
} from '@mui/icons-material';
import {
  collection,
  query,
  orderBy,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';

export default function LostItemRecords() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [lostItems, setLostItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    const fetchLostItems = async () => {
      try {
        const lostSnap = await getDocs(query(collection(db, 'lost_items'), orderBy('createdAt', 'desc')));
        setLostItems(lostSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error fetching lost items:", error);
        setSnackbar({ 
          open: true, 
          message: "Error loading lost items: " + error.message, 
          severity: "error" 
        });
      }
    };

    fetchLostItems();
  }, []);

  // Filter items based on search term
  const filteredItems = lostItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.lostBy?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Separate active and resolved items
  const activeItems = filteredItems.filter(item => !item.resolved);
  const resolvedItems = filteredItems.filter(item => item.resolved);

  return (
    <Box sx={{ pt: { xs: 2, sm: 3 }, pl: { xs: 2, sm: 3, md: 4 }, pr: { xs: 2, sm: 3, md: 4 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, mt: 1 }}>
        <Tooltip title="Back to Lost & Found">
          <IconButton 
            onClick={() => navigate('/lost-found')}
            sx={{ 
              mr: 1,
              color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000',
              '&:hover': {
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(128, 0, 0, 0.1)',
                transform: 'translateX(-2px)'
              },
              transition: 'all 0.2s ease'
            }}
          >
            <ArrowBack />
          </IconButton>
        </Tooltip>
        <Typography variant="h4" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000' }}>
          Lost Item Records
        </Typography>
      </Box>

      {/* Summary Cards */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card sx={{ 
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.9)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: 2,
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
            }}>
              <CardContent>
                <Typography variant="h4" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000' }}>
                  {lostItems.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Lost Items
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ 
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.9)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: 2,
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
            }}>
              <CardContent>
                <Typography variant="h4" sx={{ color: '#f44336' }}>
                  {activeItems.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Active Cases
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ 
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.9)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: 2,
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
            }}>
              <CardContent>
                <Typography variant="h4" sx={{ color: '#4caf50' }}>
                  {resolvedItems.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Resolved Cases
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Search Bar */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search lost items by name, description, location, or person..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
              border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(0, 0, 0, 0.2)',
              borderRadius: 2,
            }
          }}
        />
      </Box>

      <Grid container spacing={2}>
        {/* Active Lost Items */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ 
            p: 2, 
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.7)',
            border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
            borderRadius: 1,
            boxShadow: theme.palette.mode === 'dark' ? '0 1px 4px rgba(0, 0, 0, 0.2)' : '0 1px 4px rgba(0, 0, 0, 0.05)'
          }}>
            <Typography variant="h6" gutterBottom sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000' }}>
              Active Lost Items ({activeItems.length})
            </Typography>
            {activeItems.length === 0 ? (
              <Paper sx={{ 
                p: 3, 
                textAlign: 'center', 
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
                borderRadius: 2
              }}>
                <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#cccccc' : '#333333' }}>
                  No active lost items found.
                </Typography>
              </Paper>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: '400px', overflowY: 'auto' }}>
                {activeItems.map((item) => (
                  <Paper 
                    key={item.id} 
                    sx={{ 
                      p: 1.5, 
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.9)',
                      border: theme.palette.mode === 'dark' ? '0.5px solid rgba(255, 255, 255, 0.1)' : '0.5px solid rgba(0, 0, 0, 0.1)',
                      borderLeft: '3px solid #f44336',
                      borderRadius: 1.5
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                      <Avatar sx={{ width: 24, height: 24, mr: 1.5, fontSize: '0.75rem', bgcolor: '#f44336' }}>
                        L
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" sx={{ 
                          fontWeight: 600, 
                          color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                          fontSize: '0.95rem'
                        }}>
                          {item.name}
                        </Typography>
                        <Typography variant="caption" sx={{ 
                          color: theme.palette.mode === 'dark' ? '#b0b0b0' : '#555555',
                          fontSize: '0.7rem'
                        }}>
                          {new Date(item.createdAt?.toDate?.() || item.createdAt).toLocaleDateString()}
                        </Typography>
                      </Box>
                      <Chip label="Active" color="warning" size="small" sx={{ fontSize: '0.65rem', height: 20 }} />
                    </Box>
                    <Typography variant="caption" sx={{ color: theme.palette.mode === 'dark' ? '#cccccc' : '#333333', fontSize: '0.7rem' }}>
                      <strong>Lost by:</strong> {item.lostBy || 'Unknown'} | <strong>Location:</strong> {item.location || 'Unknown'}
                    </Typography>
                  </Paper>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Resolved Lost Items */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ 
            p: 2, 
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.7)',
            border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
            borderRadius: 1,
            boxShadow: theme.palette.mode === 'dark' ? '0 1px 4px rgba(0, 0, 0, 0.2)' : '0 1px 4px rgba(0, 0, 0, 0.05)'
          }}>
            <Typography variant="h6" gutterBottom sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000' }}>
              Resolved Lost Items ({resolvedItems.length})
            </Typography>
            {resolvedItems.length === 0 ? (
              <Paper sx={{ 
                p: 3, 
                textAlign: 'center', 
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
                borderRadius: 2
              }}>
                <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#cccccc' : '#333333' }}>
                  No resolved lost items found.
                </Typography>
              </Paper>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: '400px', overflowY: 'auto' }}>
                {resolvedItems.map((item) => (
                  <Paper 
                    key={item.id} 
                    sx={{ 
                      p: 1.5, 
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(76, 175, 80, 0.05)',
                      border: theme.palette.mode === 'dark' ? '0.5px solid rgba(76, 175, 80, 0.3)' : '0.5px solid rgba(76, 175, 80, 0.2)',
                      borderLeft: '3px solid #4caf50',
                      borderRadius: 1.5
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                      <Avatar sx={{ width: 24, height: 24, mr: 1.5, fontSize: '0.75rem', bgcolor: '#4caf50' }}>
                        L
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" sx={{ 
                          fontWeight: 600, 
                          color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                          fontSize: '0.95rem'
                        }}>
                          {item.name}
                        </Typography>
                        <Typography variant="caption" sx={{ 
                          color: theme.palette.mode === 'dark' ? '#b0b0b0' : '#555555',
                          fontSize: '0.7rem'
                        }}>
                          Resolved: {new Date(item.resolvedAt).toLocaleDateString()}
                        </Typography>
                      </Box>
                      <Chip label="Resolved" color="success" size="small" sx={{ fontSize: '0.65rem', height: 20 }} />
                    </Box>
                    <Typography variant="caption" sx={{ color: theme.palette.mode === 'dark' ? '#cccccc' : '#333333', fontSize: '0.7rem' }}>
                      <strong>Lost by:</strong> {item.lostBy || 'Unknown'} | <strong>Location:</strong> {item.location || 'Unknown'}
                    </Typography>
                  </Paper>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Snackbar for notifications */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={4000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity} 
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
