import React, { useState, useEffect } from "react";
import { 
  Box, Grid, Card, CardContent, Typography, TextField, Button, Paper, Avatar, Snackbar, Alert, 
  Tabs, Tab, Chip, Divider, Badge, IconButton, Tooltip
} from "@mui/material";
import { 
  Search, Add, CloudUpload, AdminPanelSettings, Person, Visibility, 
  LocationOn, AccessTime, ContactSupport
} from "@mui/icons-material";
import { db } from "../firebase";
import { collection, addDoc, query, orderBy, onSnapshot } from "firebase/firestore";

export default function UserLostFound({ currentUser }) {
  const [lostForm, setLostForm] = useState({ 
    name: '', 
    description: '', 
    location: '', 
    image: null, 
    timeLost: '', 
    contactInfo: currentUser?.email || '' 
  });
  const [foundForm, setFoundForm] = useState({ 
    name: '', 
    description: '', 
    location: '', 
    image: null, 
    timeFound: '', 
    contactInfo: currentUser?.email || '' 
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [lostItems, setLostItems] = useState([]);
  const [foundItems, setFoundItems] = useState([]);
  const [lostSearch, setLostSearch] = useState('');
  const [foundSearch, setFoundSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [viewMode, setViewMode] = useState('all'); // 'all', 'student', 'admin'

  useEffect(() => {
    const unsubLost = onSnapshot(query(collection(db, 'lost_items'), orderBy('createdAt', 'desc')), snap => {
      setLostItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubFound = onSnapshot(query(collection(db, 'found_items'), orderBy('createdAt', 'desc')), snap => {
      setFoundItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => { unsubLost(); unsubFound(); };
  }, []);

  const handleLostImage = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        setSnackbar({ open: true, message: "Please select a valid image file", severity: "error" });
        return;
      }
      if (file.size > 200 * 1024) {
        setSnackbar({ open: true, message: "Image file size must be less than 200KB", severity: "error" });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLostForm(f => ({ ...f, image: reader.result }));
        setSnackbar({ open: true, message: "Image loaded!", severity: "success" });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFoundImage = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        setSnackbar({ open: true, message: "Please select a valid image file", severity: "error" });
        return;
      }
      if (file.size > 200 * 1024) {
        setSnackbar({ open: true, message: "Image file size must be less than 200KB", severity: "error" });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFoundForm(f => ({ ...f, image: reader.result }));
        setSnackbar({ open: true, message: "Image loaded!", severity: "success" });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLostSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'lost_items'), { 
        ...lostForm, 
        resolved: false, 
        createdAt: new Date().toISOString(),
        reportedBy: currentUser?.email,
        postedBy: 'student'
      });
      setSnackbar({ open: true, message: 'Lost item reported successfully!', severity: 'success' });
      setLostForm({ name: '', description: '', location: '', image: null, timeLost: '', contactInfo: currentUser?.email || '' });
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to report lost item.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleFoundSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'found_items'), { 
        ...foundForm, 
        resolved: false, 
        createdAt: new Date().toISOString(),
        reportedBy: currentUser?.email,
        postedBy: 'student'
      });
      setSnackbar({ open: true, message: 'Found item reported successfully!', severity: 'success' });
      setFoundForm({ name: '', description: '', location: '', image: null, timeFound: '', contactInfo: currentUser?.email || '' });
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to report found item.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Filter items based on search and view mode
  const getFilteredItems = (items, search) => {
    let filtered = items.filter(item =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase()) ||
      item.location.toLowerCase().includes(search.toLowerCase())
    );

    // Filter by view mode
    if (viewMode === 'student') {
      filtered = filtered.filter(item => item.postedBy === 'student' || !item.postedBy);
    } else if (viewMode === 'admin') {
      filtered = filtered.filter(item => item.postedBy === 'admin');
    }

    return filtered;
  };

  const filteredLost = getFilteredItems(lostItems, lostSearch);
  const filteredFound = getFilteredItems(foundItems, foundSearch);

  // Helper function to determine if item is posted by admin
  const isAdminPost = (item) => {
    return item.postedBy === 'admin' || 
           (item.reportedBy && !item.reportedBy.includes('@') && item.reportedBy !== currentUser?.email);
  };

  // Helper function to get poster info
  const getPosterInfo = (item) => {
    if (isAdminPost(item)) {
      return {
        name: 'Admin',
        icon: <AdminPanelSettings />,
        color: 'primary'
      };
    } else {
      return {
        name: 'Student',
        icon: <Person />,
        color: 'secondary'
      };
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Lost and Found</Typography>
      
      <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Report Lost Item" />
        <Tab label="Report Found Item" />
        <Tab label="Browse Items" />
      </Tabs>

      {activeTab === 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Report Lost Item</Typography>
          <form onSubmit={handleLostSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  label="Item Name" 
                  value={lostForm.name} 
                  onChange={e => setLostForm(f => ({ ...f, name: e.target.value }))} 
                  required 
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  label="Location Lost" 
                  value={lostForm.location} 
                  onChange={e => setLostForm(f => ({ ...f, location: e.target.value }))} 
                  required 
                />
              </Grid>
              <Grid item xs={12}>
                <TextField 
                  fullWidth 
                  label="Description" 
                  multiline 
                  rows={3} 
                  value={lostForm.description} 
                  onChange={e => setLostForm(f => ({ ...f, description: e.target.value }))} 
                  required 
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  label="Time Lost" 
                  type="datetime-local" 
                  value={lostForm.timeLost} 
                  onChange={e => setLostForm(f => ({ ...f, timeLost: e.target.value }))} 
                  InputLabelProps={{ shrink: true }} 
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  label="Contact Information" 
                  value={lostForm.contactInfo} 
                  onChange={e => setLostForm(f => ({ ...f, contactInfo: e.target.value }))} 
                  required 
                />
              </Grid>
              <Grid item xs={12}>
                <Button variant="outlined" component="label" sx={{ mb: 2 }} startIcon={<CloudUpload />}>
                  Upload Image
                  <input type="file" accept="image/*" hidden onChange={handleLostImage} />
                </Button>
                {lostForm.image && (
                  <Box sx={{ mt: 2 }}>
                    <img src={lostForm.image} alt="Lost item" style={{ maxWidth: '200px', maxHeight: '200px' }} />
                  </Box>
                )}
              </Grid>
              <Grid item xs={12}>
                <Button variant="contained" type="submit" disabled={loading}>
                  Report Lost Item
                </Button>
              </Grid>
            </Grid>
          </form>
        </Paper>
      )}

      {activeTab === 1 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Report Found Item</Typography>
          <form onSubmit={handleFoundSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  label="Item Name" 
                  value={foundForm.name} 
                  onChange={e => setFoundForm(f => ({ ...f, name: e.target.value }))} 
                  required 
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  label="Location Found" 
                  value={foundForm.location} 
                  onChange={e => setFoundForm(f => ({ ...f, location: e.target.value }))} 
                  required 
                />
              </Grid>
              <Grid item xs={12}>
                <TextField 
                  fullWidth 
                  label="Description" 
                  multiline 
                  rows={3} 
                  value={foundForm.description} 
                  onChange={e => setFoundForm(f => ({ ...f, description: e.target.value }))} 
                  required 
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  label="Time Found" 
                  type="datetime-local" 
                  value={foundForm.timeFound} 
                  onChange={e => setFoundForm(f => ({ ...f, timeFound: e.target.value }))} 
                  InputLabelProps={{ shrink: true }} 
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  label="Contact Information" 
                  value={foundForm.contactInfo} 
                  onChange={e => setFoundForm(f => ({ ...f, contactInfo: e.target.value }))} 
                  required 
                />
              </Grid>
              <Grid item xs={12}>
                <Button variant="outlined" component="label" sx={{ mb: 2 }} startIcon={<CloudUpload />}>
                  Upload Image
                  <input type="file" accept="image/*" hidden onChange={handleFoundImage} />
                </Button>
                {foundForm.image && (
                  <Box sx={{ mt: 2 }}>
                    <img src={foundForm.image} alt="Found item" style={{ maxWidth: '200px', maxHeight: '200px' }} />
                  </Box>
                )}
              </Grid>
              <Grid item xs={12}>
                <Button variant="contained" type="submit" disabled={loading}>
                  Report Found Item
                </Button>
              </Grid>
            </Grid>
          </form>
        </Paper>
      )}

      {activeTab === 2 && (
        <Box>
          {/* View Mode Filter */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Filter Items</Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Chip 
                label="All Items" 
                color={viewMode === 'all' ? 'primary' : 'default'}
                onClick={() => setViewMode('all')}
                clickable
              />
              <Chip 
                label="Student Posts" 
                color={viewMode === 'student' ? 'primary' : 'default'}
                onClick={() => setViewMode('student')}
                clickable
                icon={<Person />}
              />
              <Chip 
                label="Admin Posts" 
                color={viewMode === 'admin' ? 'primary' : 'default'}
                onClick={() => setViewMode('admin')}
                clickable
                icon={<AdminPanelSettings />}
              />
            </Box>
          </Paper>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Lost Items</Typography>
                  <Badge badgeContent={filteredLost.length} color="primary">
                    <Search />
                  </Badge>
                </Box>
                <TextField 
                  fullWidth 
                  placeholder="Search lost items..." 
                  value={lostSearch} 
                  onChange={e => setLostSearch(e.target.value)} 
                  sx={{ mb: 2 }} 
                  InputProps={{
                    startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
                {filteredLost.length === 0 ? (
                  <Card sx={{ p: 3, textAlign: 'center' }}>
                    <Typography color="textSecondary">No lost items found.</Typography>
                  </Card>
                ) : filteredLost.map(item => {
                  const posterInfo = getPosterInfo(item);
                  return (
                    <Card key={item.id} sx={{ mb: 2, 
                      border: isAdminPost(item) ? '2px solid #1976d2' : '1px solid #e0e0e0',
                      bgcolor: isAdminPost(item) ? '#f3f6ff' : 'white'
                    }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Typography variant="h6" sx={{ fontWeight: isAdminPost(item) ? 600 : 400 }}>
                            {item.name}
                          </Typography>
                          <Chip 
                            icon={posterInfo.icon}
                            label={posterInfo.name}
                            color={posterInfo.color}
                            size="small"
                            variant={isAdminPost(item) ? 'filled' : 'outlined'}
                          />
                        </Box>
                        
                        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                          {item.description}
                        </Typography>
                        
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <LocationOn sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="caption" color="textSecondary">
                              {item.location}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <AccessTime sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="caption" color="textSecondary">
                              {new Date(item.createdAt).toLocaleDateString()}
                            </Typography>
                          </Box>
                        </Box>

                        {item.image && (
                          <Box sx={{ mt: 2 }}>
                            <img 
                              src={item.image} 
                              alt={item.name} 
                              style={{ 
                                width: '100px', 
                                height: '100px', 
                                objectFit: 'cover',
                                borderRadius: '4px',
                                border: '1px solid #e0e0e0'
                              }} 
                            />
                          </Box>
                        )}

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                          {item.resolved ? (
                            <Chip label="Resolved" color="success" size="small" />
                          ) : (
                            <Chip label="Active" color="warning" size="small" />
                          )}
                          {item.contactInfo && (
                            <Tooltip title="Contact Information">
                              <IconButton size="small">
                                <ContactSupport />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  );
                })}
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Found Items</Typography>
                  <Badge badgeContent={filteredFound.length} color="primary">
                    <Search />
                  </Badge>
                </Box>
                <TextField 
                  fullWidth 
                  placeholder="Search found items..." 
                  value={foundSearch} 
                  onChange={e => setFoundSearch(e.target.value)} 
                  sx={{ mb: 2 }} 
                  InputProps={{
                    startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
                {filteredFound.length === 0 ? (
                  <Card sx={{ p: 3, textAlign: 'center' }}>
                    <Typography color="textSecondary">No found items found.</Typography>
                  </Card>
                ) : filteredFound.map(item => {
                  const posterInfo = getPosterInfo(item);
                  return (
                    <Card key={item.id} sx={{ mb: 2, 
                      border: isAdminPost(item) ? '2px solid #1976d2' : '1px solid #e0e0e0',
                      bgcolor: isAdminPost(item) ? '#f3f6ff' : 'white'
                    }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Typography variant="h6" sx={{ fontWeight: isAdminPost(item) ? 600 : 400 }}>
                            {item.name}
                          </Typography>
                          <Chip 
                            icon={posterInfo.icon}
                            label={posterInfo.name}
                            color={posterInfo.color}
                            size="small"
                            variant={isAdminPost(item) ? 'filled' : 'outlined'}
                          />
                        </Box>
                        
                        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                          {item.description}
                        </Typography>
                        
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <LocationOn sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="caption" color="textSecondary">
                              {item.location}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <AccessTime sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="caption" color="textSecondary">
                              {new Date(item.createdAt).toLocaleDateString()}
                            </Typography>
                          </Box>
                        </Box>

                        {item.image && (
                          <Box sx={{ mt: 2 }}>
                            <img 
                              src={item.image} 
                              alt={item.name} 
                              style={{ 
                                width: '100px', 
                                height: '100px', 
                                objectFit: 'cover',
                                borderRadius: '4px',
                                border: '1px solid #e0e0e0'
                              }} 
                            />
                          </Box>
                        )}

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                          {item.resolved ? (
                            <Chip label="Resolved" color="success" size="small" />
                          ) : (
                            <Chip label="Active" color="warning" size="small" />
                          )}
                          {item.contactInfo && (
                            <Tooltip title="Contact Information">
                              <IconButton size="small">
                                <ContactSupport />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  );
                })}
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
} 