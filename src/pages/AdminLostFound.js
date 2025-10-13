import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  TextField,
  Button,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  MenuItem,
  Card,
  CardContent,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Search,
  Add,
  Edit,
  Delete,
  CheckCircle,
  Visibility,
  Upload
} from '@mui/icons-material';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  where
} from 'firebase/firestore';
import { db } from '../firebase';

export default function AdminLostFound() {
  const [lostForm, setLostForm] = useState({ 
    name: '', 
    description: '', 
    location: '', 
    image: null, 
    timeLost: '', 
    lostBy: '' 
  });
  const [foundForm, setFoundForm] = useState({ 
    name: '', 
    description: '', 
    location: '', 
    image: null, 
    timeFound: '', 
    foundBy: '' 
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [lostItems, setLostItems] = useState([]);
  const [foundItems, setFoundItems] = useState([]);
  const [lostImageFile, setLostImageFile] = useState(null);
  const [foundImageFile, setFoundImageFile] = useState(null);
  const [lostSearch, setLostSearch] = useState('');
  const [foundSearch, setFoundSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [editModal, setEditModal] = useState({ open: false, type: '', item: null });
  const [editForm, setEditForm] = useState({ 
    name: '', 
    description: '', 
    location: '', 
    image: '', 
    imageFile: null, 
    timeLost: '', 
    timeFound: '' 
  });
  const [students, setStudents] = useState([]);
  const [imagePreview, setImagePreview] = useState({ open: false, image: null, title: '' });

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        // Fetch from 'students' collection (manually added students)
        const studentsQuerySnapshot = await getDocs(collection(db, "students"));
        const studentsData = studentsQuerySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Fetch from 'users' collection (registered students)
        const usersQuerySnapshot = await getDocs(query(collection(db, "users"), where("role", "==", "Student")));
        const registeredStudentsData = usersQuerySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            firstName: data.firstName || data.fullName?.split(' ')[0] || '',
            lastName: data.lastName || data.fullName?.split(' ').slice(1).join(' ') || '',
            email: data.email || '',
            course: data.course || '',
            year: data.year || '',
            section: data.section || '',
            studentId: data.studentId || '',
            createdAt: data.createdAt || '',
            updatedAt: data.updatedAt || '',
            profilePic: data.profilePic || '',
            isRegisteredUser: true
          };
        });
        
        // Combine both collections
        const allStudents = [...studentsData, ...registeredStudentsData];
        
                 // Sort students alphabetically by first name, then last name
         const sortedStudents = allStudents.sort((a, b) => {
           const nameA = `${a.firstName || ''} ${a.lastName || ''}`.toLowerCase().trim();
           const nameB = `${b.firstName || ''} ${b.lastName || ''}`.toLowerCase().trim();
           return nameA.localeCompare(nameB);
         });
        
        setStudents(sortedStudents);
      } catch (error) {
        console.error("Error fetching students:", error);
        setSnackbar({ 
          open: true, 
          message: "Error loading students: " + error.message, 
          severity: "error" 
        });
      }
    };

    fetchStudents();

    // Real-time listeners for lost and found items
    const unsubLost = onSnapshot(
      query(collection(db, 'lost_items'), orderBy('createdAt', 'desc')), 
      snap => {
        setLostItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    );
    
    const unsubFound = onSnapshot(
      query(collection(db, 'found_items'), orderBy('createdAt', 'desc')), 
      snap => {
        setFoundItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    );

    return () => { 
      unsubLost(); 
      unsubFound(); 
    };
  }, []);

  // Summary counts
  const lostTotal = lostItems.length;
  const lostCompleted = lostItems.filter(i => i.resolved).length;
  const lostPending = lostItems.filter(i => !i.resolved).length;
  const foundTotal = foundItems.length;
  const foundCompleted = foundItems.filter(i => i.resolved).length;
  const foundPending = foundItems.filter(i => !i.resolved).length;

  // Image handling functions
  const handleLostImage = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        setSnackbar({ open: true, message: "Please select a valid image file (JPEG, PNG, GIF)", severity: "error" });
        return;
      }
      if (file.size > 500 * 1024) {
        setSnackbar({ open: true, message: "Image file size must be less than 500KB", severity: "error" });
        return;
      }
      
      setSnackbar({ open: true, message: "Processing image...", severity: "info" });
      setLostImageFile(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setLostForm(f => ({ ...f, image: reader.result }));
        setSnackbar({ open: true, message: "Image uploaded successfully! Click on the preview to view full size.", severity: "success" });
      };
      reader.onerror = () => {
        setSnackbar({ open: true, message: "Error reading image file. Please try again.", severity: "error" });
        setLostImageFile(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFoundImage = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        setSnackbar({ open: true, message: "Please select a valid image file (JPEG, PNG, GIF)", severity: "error" });
        return;
      }
      if (file.size > 500 * 1024) {
        setSnackbar({ open: true, message: "Image file size must be less than 500KB", severity: "error" });
        return;
      }
      
      setSnackbar({ open: true, message: "Processing image...", severity: "info" });
      setFoundImageFile(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setFoundForm(f => ({ ...f, image: reader.result }));
        setSnackbar({ open: true, message: "Image uploaded successfully! Click on the preview to view full size.", severity: "success" });
      };
      reader.onerror = () => {
        setSnackbar({ open: true, message: "Error reading image file. Please try again.", severity: "error" });
        setFoundImageFile(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditImage = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        setSnackbar({ open: true, message: "Please select a valid image file (JPEG, PNG, GIF)", severity: "error" });
        return;
      }
      if (file.size > 500 * 1024) {
        setSnackbar({ open: true, message: "Image file size must be less than 500KB", severity: "error" });
        return;
      }
      
      setSnackbar({ open: true, message: "Processing image...", severity: "info" });
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditForm(f => ({ ...f, image: reader.result, imageFile: null }));
        setSnackbar({ open: true, message: "Image updated successfully! Click on the preview to view full size.", severity: "success" });
      };
      reader.onerror = () => {
        setSnackbar({ open: true, message: "Error reading image file. Please try again.", severity: "error" });
      };
      reader.readAsDataURL(file);
    }
  };

  // Form submission functions
  const handleLostSubmit = async (e) => {
    e.preventDefault();
    if (!lostForm.name.trim()) {
      setSnackbar({ open: true, message: 'Please enter an item name', severity: 'error' });
      return;
    }
    
    setLoading(true);
    try {
      const lostItemData = { 
        ...lostForm, 
        resolved: false, 
        createdAt: new Date().toISOString() 
      };
      
      await addDoc(collection(db, 'lost_items'), lostItemData);
      
      // Send notifications to all teachers about new lost item
      try {
        const teachersQuery = query(collection(db, "users"), where("role", "==", "Teacher"));
        const teachersSnapshot = await getDocs(teachersQuery);
        
        const notificationPromises = teachersSnapshot.docs.map(doc => {
          const teacher = doc.data();
          return addDoc(collection(db, 'notifications'), {
            recipientEmail: teacher.email,
            title: `New Lost Item: ${lostForm.name}`,
            message: `A new lost item has been reported: ${lostForm.name}. Location: ${lostForm.location || 'Unknown'}`,
            type: 'lost_found',
            read: false,
            createdAt: new Date().toISOString(),
            itemId: lostItemData.id
          });
        });
        
        await Promise.all(notificationPromises);
      } catch (notificationError) {
        console.error("Failed to send teacher notifications:", notificationError);
      }
      
      setSnackbar({ open: true, message: 'Lost item submitted successfully!', severity: 'success' });
      setLostForm({ name: '', description: '', location: '', image: null, timeLost: '', lostBy: '' });
      setLostImageFile(null);
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to submit lost item: ' + err.message, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleFoundSubmit = async (e) => {
    e.preventDefault();
    if (!foundForm.name.trim()) {
      setSnackbar({ open: true, message: 'Please enter an item name', severity: 'error' });
      return;
    }
    
    setLoading(true);
    try {
      const foundItemData = { 
        ...foundForm, 
        resolved: false, 
        createdAt: new Date().toISOString() 
      };
      
      await addDoc(collection(db, 'found_items'), foundItemData);
      
      // Send notifications to all teachers about new found item
      try {
        const teachersQuery = query(collection(db, "users"), where("role", "==", "Teacher"));
        const teachersSnapshot = await getDocs(teachersQuery);
        
        const notificationPromises = teachersSnapshot.docs.map(doc => {
          const teacher = doc.data();
          return addDoc(collection(db, 'notifications'), {
            recipientEmail: teacher.email,
            title: `New Found Item: ${foundForm.name}`,
            message: `A new found item has been reported: ${foundForm.name}. Location: ${foundForm.location || 'Unknown'}`,
            type: 'lost_found',
            read: false,
            createdAt: new Date().toISOString(),
            itemId: foundItemData.id
          });
        });
        
        await Promise.all(notificationPromises);
      } catch (notificationError) {
        console.error("Failed to send teacher notifications:", notificationError);
      }
      
      setSnackbar({ open: true, message: 'Found item submitted successfully!', severity: 'success' });
      setFoundForm({ name: '', description: '', location: '', image: null, timeFound: '', foundBy: '' });
      setFoundImageFile(null);
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to submit found item: ' + err.message, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditSave = async () => {
    if (!editForm.name.trim()) {
      setSnackbar({ open: true, message: 'Please enter an item name', severity: 'error' });
      return;
    }
    
    setLoading(true);
    try {
      await updateDoc(doc(db, editModal.type, editModal.item.id), {
        name: editForm.name,
        description: editForm.description,
        location: editForm.location,
        image: editForm.image,
        updatedAt: new Date().toISOString()
      });
      setSnackbar({ open: true, message: 'Item updated successfully!', severity: 'success' });
      setEditModal({ open: false, type: '', item: null });
      setEditForm({ name: '', description: '', location: '', image: '', imageFile: null });
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to update item: ' + err.message, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (type, id) => {
    try {
      await updateDoc(doc(db, type, id), { 
        resolved: true,
        resolvedAt: new Date().toISOString()
      });
      setSnackbar({ open: true, message: 'Item marked as resolved successfully!', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to resolve item: ' + err.message, severity: 'error' });
    }
  };

  const handleDelete = async (type, id) => {
    if (window.confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
      try {
        await deleteDoc(doc(db, type, id));
        setSnackbar({ open: true, message: 'Item deleted successfully!', severity: 'success' });
      } catch (err) {
        setSnackbar({ open: true, message: 'Failed to delete item: ' + err.message, severity: 'error' });
      }
    }
  };

  // Filter functions
  const filteredLost = lostItems.filter(item =>
    item.name.toLowerCase().includes(lostSearch.toLowerCase()) ||
    item.description.toLowerCase().includes(lostSearch.toLowerCase()) ||
    item.location.toLowerCase().includes(lostSearch.toLowerCase())
  );
  
  const filteredFound = foundItems.filter(item =>
    item.name.toLowerCase().includes(foundSearch.toLowerCase()) ||
    item.description.toLowerCase().includes(foundSearch.toLowerCase()) ||
    item.location.toLowerCase().includes(foundSearch.toLowerCase())
  );

  // Edit logic
  const handleEditOpen = (type, item) => {
    setEditForm({ 
      name: item.name, 
      description: item.description, 
      location: item.location, 
      image: item.image || '', 
      imageFile: null 
    });
    setEditModal({ open: true, type, item });
  };

  const handleImagePreview = (image, title) => {
    setImagePreview({ open: true, image, title });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: '#800000', mb: 3 }}>
        Lost & Found Management
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: '#80000015', borderLeft: '4px solid #800000' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ color: '#800000' }} gutterBottom>
                Lost Items Summary
              </Typography>
              <Grid container spacing={2}>
                <Grid item>
                  <Chip label={`Total: ${lostTotal}`} sx={{ bgcolor: '#800000', color: '#fff' }} />
                </Grid>
                <Grid item>
                  <Chip label={`Completed: ${lostCompleted}`} sx={{ bgcolor: '#800000', color: '#fff' }} />
                </Grid>
                <Grid item>
                  <Chip label={`Pending: ${lostPending}`} sx={{ bgcolor: '#800000', color: '#fff' }} />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: '#80000015', borderLeft: '4px solid #800000' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ color: '#800000' }} gutterBottom>
                Found Items Summary
              </Typography>
              <Grid container spacing={2}>
                <Grid item>
                  <Chip label={`Total: ${foundTotal}`} sx={{ bgcolor: '#800000', color: '#fff' }} />
                </Grid>
                <Grid item>
                  <Chip label={`Completed: ${foundCompleted}`} sx={{ bgcolor: '#800000', color: '#fff' }} />
                </Grid>
                <Grid item>
                  <Chip label={`Pending: ${foundPending}`} sx={{ bgcolor: '#800000', color: '#fff' }} />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
                 {/* Found Items Section */}
         <Grid item xs={12} md={6}>
           <Paper sx={{ p: 3, mb: 2, border: '1px solid #e0e0e0', minHeight: '600px' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, color: '#2e7d32' }}>
              <Add sx={{ mr: 1, verticalAlign: 'middle' }} />
              Found Item Entry
            </Typography>
            <form onSubmit={handleFoundSubmit}>
              <TextField 
                fullWidth 
                label="Item Name" 
                value={foundForm.name} 
                onChange={e => setFoundForm(f => ({ ...f, name: e.target.value }))} 
                sx={{ mb: 2 }} 
                required
              />
              <TextField 
                fullWidth 
                label="Description" 
                multiline 
                minRows={2} 
                value={foundForm.description} 
                onChange={e => setFoundForm(f => ({ ...f, description: e.target.value }))} 
                sx={{ mb: 2 }} 
              />
              <TextField 
                fullWidth 
                label="Location Found" 
                value={foundForm.location} 
                onChange={e => setFoundForm(f => ({ ...f, location: e.target.value }))} 
                sx={{ mb: 2 }} 
              />
              <TextField
                select
                fullWidth
                label="Student Who Found"
                value={foundForm.foundBy || ""}
                onChange={e => setFoundForm(f => ({ ...f, foundBy: e.target.value }))}
                sx={{ mb: 2 }}
              >
                <MenuItem value="">Select a student</MenuItem>
                {students.map(student => (
                  <MenuItem key={student.id} value={student.id}>
                    {student.id} - {student.firstName} {student.lastName}
                  </MenuItem>
                ))}
              </TextField>
                             <Button 
                 variant="outlined" 
                 component="label" 
                 sx={{ 
                   mb: 2,
                   color: foundForm.image ? '#1976d2' : '#000000',
                   borderColor: foundForm.image ? '#1976d2' : '#000000',
                   '&:hover': {
                     borderColor: foundForm.image ? '#1976d2' : '#000000',
                     backgroundColor: foundForm.image ? '#1976d210' : '#00000010'
                   }
                 }}
                 startIcon={<Upload />}
               >
                 Upload Image
                 <input type="file" accept="image/*" hidden onChange={handleFoundImage} />
               </Button>
               {foundImageFile && (
                 <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                   <Typography variant="caption" sx={{ flex: 1 }}>
                     Selected: {foundImageFile.name}
                   </Typography>
                   <Button 
                     variant="outlined" 
                     color="error" 
                     size="small"
                     onClick={() => {
                       setFoundForm(f => ({ ...f, image: null }));
                       setFoundImageFile(null);
                     }}
                   >
                     Remove
                   </Button>
                 </Box>
               )}
               {foundForm.image && (
                 <Box sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1, bgcolor: '#fafafa', minHeight: '160px' }}>
                   <Typography variant="subtitle2" sx={{ mb: 1 }}>Image Preview:</Typography>
                   <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                     <Avatar 
                       src={foundForm.image} 
                       variant="rounded" 
                       sx={{ width: 120, height: 120, cursor: 'pointer' }}
                       onClick={() => handleImagePreview(foundForm.image, foundForm.name || 'Found Item')}
                     />
                   </Box>
                 </Box>
               )}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Button 
                  variant="contained" 
                  type="submit" 
                  disabled={loading}
                  sx={{ bgcolor: '#800000', '&:hover': { bgcolor: '#6b0000' } }}
                >
                  Submit Found Item
                </Button>
              </Box>
            </form>
          </Paper>

          <Paper sx={{ p: 3, mb: 2, border: '1px solid #e0e0e0' }}>
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
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, color: '#2e7d32' }}>
              Found Items ({filteredFound.length})
            </Typography>
            {filteredFound.length === 0 ? (
              <Typography color="text.secondary">No found items yet.</Typography>
            ) : (
              filteredFound.map(item => (
                <Card key={item.id} sx={{ 
                  mb: 2, 
                  bgcolor: item.resolved ? '#c8e6c9' : '#e8f5e9', 
                  border: item.resolved ? '1px solid #66bb6a' : '1px solid #4caf50',
                  position: 'relative'
                }}>
                  <CardContent>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item>
                        {item.image && (
                          <Avatar 
                            src={item.image} 
                            variant="rounded" 
                            sx={{ width: 56, height: 56, cursor: 'pointer' }}
                            onClick={() => handleImagePreview(item.image, item.name)}
                          />
                        )}
                      </Grid>
                      <Grid item xs>
                        <Typography fontWeight={700} sx={item.resolved ? { textDecoration: 'line-through', color: 'gray' } : {}}>
                          {item.name}
                        </Typography>
                        <Typography variant="body2" sx={item.resolved ? { textDecoration: 'line-through', color: 'gray' } : {}}>
                          {item.description}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Location: {item.location}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                          {new Date(item.createdAt).toLocaleString()}
                        </Typography>
                      </Grid>
                      <Grid item>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {item.image && (
                            <Tooltip title="View Image">
                              <IconButton 
                                size="small" 
                                color="info" 
                                onClick={() => handleImagePreview(item.image, item.name)}
                              >
                                <Visibility />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Edit">
                            <IconButton 
                              size="small" 
                              color="info" 
                              onClick={() => handleEditOpen('found_items', item)}
                            >
                              <Edit />
                            </IconButton>
                          </Tooltip>
                          {!item.resolved && (
                            <Tooltip title="Mark as Resolved">
                              <IconButton 
                                size="small" 
                                color="success" 
                                onClick={() => handleResolve('found_items', item.id)}
                              >
                                <CheckCircle />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Delete">
                            <IconButton 
                              size="small" 
                              color="error" 
                              onClick={() => handleDelete('found_items', item.id)}
                            >
                              <Delete />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Grid>
                    </Grid>
                    {item.resolved && (
                      <Chip 
                        label="Resolved" 
                        color="success" 
                        size="small" 
                        sx={{ position: 'absolute', top: 8, right: 16 }} 
                      />
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </Paper>
        </Grid>

                 {/* Lost Items Section */}
         <Grid item xs={12} md={6}>
           <Paper sx={{ p: 3, mb: 2, border: '1px solid #e0e0e0', minHeight: '600px' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, color: '#e65100' }}>
              <Add sx={{ mr: 1, verticalAlign: 'middle' }} />
              Lost Item Entry
            </Typography>
            <form onSubmit={handleLostSubmit}>
              <TextField 
                fullWidth 
                label="Item Name" 
                value={lostForm.name} 
                onChange={e => setLostForm(f => ({ ...f, name: e.target.value }))} 
                sx={{ mb: 2 }} 
                required
              />
              <TextField 
                fullWidth 
                label="Description" 
                multiline 
                minRows={2} 
                value={lostForm.description} 
                onChange={e => setLostForm(f => ({ ...f, description: e.target.value }))} 
                sx={{ mb: 2 }} 
              />
              <TextField 
                fullWidth 
                label="Location Lost" 
                value={lostForm.location} 
                onChange={e => setLostForm(f => ({ ...f, location: e.target.value }))} 
                sx={{ mb: 2 }} 
              />
              <TextField
                select
                fullWidth
                label="Student Who Lost"
                value={lostForm.lostBy || ""}
                onChange={e => setLostForm(f => ({ ...f, lostBy: e.target.value }))}
                sx={{ mb: 2 }}
              >
                <MenuItem value="">Select a student</MenuItem>
                {students.map(student => (
                  <MenuItem key={student.id} value={student.id}>
                    {student.id} - {student.firstName} {student.lastName}
                  </MenuItem>
                ))}
              </TextField>
                             <Button 
                 variant="outlined" 
                 component="label" 
                 sx={{ 
                   mb: 2,
                   color: lostForm.image ? '#1976d2' : '#000000',
                   borderColor: lostForm.image ? '#1976d2' : '#000000',
                   '&:hover': {
                     borderColor: lostForm.image ? '#1976d2' : '#000000',
                     backgroundColor: lostForm.image ? '#1976d210' : '#00000010'
                   }
                 }}
                 startIcon={<Upload />}
               >
                 Upload Image
                 <input type="file" accept="image/*" hidden onChange={handleLostImage} />
               </Button>
               {lostImageFile && (
                 <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                   <Typography variant="caption" sx={{ flex: 1 }}>
                     Selected: {lostImageFile.name}
                   </Typography>
                   <Button 
                     variant="outlined" 
                     color="error" 
                     size="small"
                     onClick={() => {
                       setLostForm(f => ({ ...f, image: null }));
                       setLostImageFile(null);
                     }}
                   >
                     Remove
                   </Button>
                 </Box>
               )}
               {lostForm.image && (
                 <Box sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1, bgcolor: '#fafafa', minHeight: '160px' }}>
                   <Typography variant="subtitle2" sx={{ mb: 1 }}>Image Preview:</Typography>
                   <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                     <Avatar 
                       src={lostForm.image} 
                       variant="rounded" 
                       sx={{ width: 120, height: 120, cursor: 'pointer' }}
                       onClick={() => handleImagePreview(lostForm.image, lostForm.name || 'Lost Item')}
                     />
                   </Box>
                 </Box>
               )}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Button 
                  variant="contained" 
                  type="submit" 
                  disabled={loading}
                  sx={{ bgcolor: '#800000', '&:hover': { bgcolor: '#6b0000' } }}
                >
                  Submit Lost Item
                </Button>
              </Box>
            </form>
          </Paper>

          <Paper sx={{ p: 3, mb: 2, border: '1px solid #e0e0e0' }}>
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
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, color: '#e65100' }}>
              Lost Items ({filteredLost.length})
            </Typography>
            {filteredLost.length === 0 ? (
              <Typography color="text.secondary">No lost items yet.</Typography>
            ) : (
              filteredLost.map(item => (
                <Card key={item.id} sx={{ 
                  mb: 2, 
                  bgcolor: item.resolved ? '#ffe0b2' : '#fffde7', 
                  border: item.resolved ? '1px solid #ffb74d' : '1px solid #ff9800',
                  position: 'relative'
                }}>
                  <CardContent>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item>
                        {item.image && (
                          <Avatar 
                            src={item.image} 
                            variant="rounded" 
                            sx={{ width: 56, height: 56, cursor: 'pointer' }}
                            onClick={() => handleImagePreview(item.image, item.name)}
                          />
                        )}
                      </Grid>
                      <Grid item xs>
                        <Typography fontWeight={700} sx={item.resolved ? { textDecoration: 'line-through', color: 'gray' } : {}}>
                          {item.name}
                        </Typography>
                        <Typography variant="body2" sx={item.resolved ? { textDecoration: 'line-through', color: 'gray' } : {}}>
                          {item.description}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Location: {item.location}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                          {new Date(item.createdAt).toLocaleString()}
                        </Typography>
                      </Grid>
                      <Grid item>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {item.image && (
                            <Tooltip title="View Image">
                              <IconButton 
                                size="small" 
                                color="info" 
                                onClick={() => handleImagePreview(item.image, item.name)}
                              >
                                <Visibility />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Edit">
                            <IconButton 
                              size="small" 
                              color="info" 
                              onClick={() => handleEditOpen('lost_items', item)}
                            >
                              <Edit />
                            </IconButton>
                          </Tooltip>
                          {!item.resolved && (
                            <Tooltip title="Mark as Resolved">
                              <IconButton 
                                size="small" 
                                color="success" 
                                onClick={() => handleResolve('lost_items', item.id)}
                              >
                                <CheckCircle />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Delete">
                            <IconButton 
                              size="small" 
                              color="error" 
                              onClick={() => handleDelete('lost_items', item.id)}
                            >
                              <Delete />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Grid>
                    </Grid>
                    {item.resolved && (
                      <Chip 
                        label="Resolved" 
                        color="success" 
                        size="small" 
                        sx={{ position: 'absolute', top: 8, right: 16 }} 
                      />
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Edit Modal */}
      <Dialog open={editModal.open} onClose={() => setEditModal({ open: false, type: '', item: null })} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Item</DialogTitle>
        <DialogContent>
          <TextField 
            fullWidth 
            label="Item Name" 
            value={editForm.name} 
            onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} 
            sx={{ mb: 2 }} 
            required
          />
          <TextField 
            fullWidth 
            label="Description" 
            multiline 
            minRows={2} 
            value={editForm.description} 
            onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} 
            sx={{ mb: 2 }} 
          />
          <TextField 
            fullWidth 
            label="Location" 
            value={editForm.location} 
            onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))} 
            sx={{ mb: 2 }} 
          />
                     <Button 
             variant="outlined" 
             component="label" 
             sx={{ 
               mb: 2,
               color: editForm.image ? '#1976d2' : '#000000',
               borderColor: editForm.image ? '#1976d2' : '#000000',
               '&:hover': {
                 borderColor: editForm.image ? '#1976d2' : '#000000',
                 backgroundColor: editForm.image ? '#1976d210' : '#00000010'
               }
             }}
             startIcon={<Upload />}
           >
             Update Image
             <input type="file" accept="image/*" hidden onChange={handleEditImage} />
           </Button>
                       {editForm.image && (
              <Box sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1, bgcolor: '#fafafa', minHeight: '160px' }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Current Image:</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <Avatar 
                    src={editForm.image} 
                    variant="rounded" 
                    sx={{ width: 120, height: 120, cursor: 'pointer' }}
                    onClick={() => handleImagePreview(editForm.image, editForm.name)}
                  />
                </Box>
              </Box>
            )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditModal({ open: false, type: '', item: null })}>
            Cancel
          </Button>
          <Button onClick={handleEditSave} variant="contained" disabled={loading} sx={{ bgcolor: '#800000', '&:hover': { bgcolor: '#6b0000' } }}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Image Preview Modal */}
      <Dialog 
        open={imagePreview.open} 
        onClose={() => setImagePreview({ open: false, image: null, title: '' })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{imagePreview.title}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <img 
              src={imagePreview.image} 
              alt={imagePreview.title}
              style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain' }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImagePreview({ open: false, image: null, title: '' })}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

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
