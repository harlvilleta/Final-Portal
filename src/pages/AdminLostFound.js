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
  const [showFoundModal, setShowFoundModal] = useState(false);
  const [showLostModal, setShowLostModal] = useState(false);
  const [allItems, setAllItems] = useState([]);
  const [feedSearch, setFeedSearch] = useState('');

  // Combine all items for feed display
  useEffect(() => {
    const combinedItems = [
      ...lostItems.map(item => ({ ...item, type: 'lost' })),
      ...foundItems.map(item => ({ ...item, type: 'found' }))
    ].sort((a, b) => new Date(b.createdAt?.toDate?.() || b.createdAt) - new Date(a.createdAt?.toDate?.() || a.createdAt));
    setAllItems(combinedItems);
  }, [lostItems, foundItems]);

  // Filter items based on search
  const filteredItems = allItems.filter(item => 
    item.name.toLowerCase().includes(feedSearch.toLowerCase()) ||
    item.description?.toLowerCase().includes(feedSearch.toLowerCase()) ||
    item.location?.toLowerCase().includes(feedSearch.toLowerCase()) ||
    item[item.type === 'found' ? 'foundBy' : 'lostBy']?.toLowerCase().includes(feedSearch.toLowerCase())
  );

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
      setShowLostModal(false);
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
      setShowFoundModal(false);
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
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: '#ffffff', mb: 3 }}>
        Lost & Found Management
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ 
            bgcolor: 'rgba(255, 255, 255, 0.1)', 
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: 2,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
          }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ color: '#ffffff' }} gutterBottom>
                Lost Items Summary
              </Typography>
              <Grid container spacing={2}>
                <Grid item>
                  <Chip 
                    label={`Total: ${lostTotal}`} 
                    sx={{ 
                      bgcolor: 'rgba(255, 255, 255, 0.2)', 
                      color: '#ffffff',
                      backdropFilter: 'blur(5px)',
                      border: '1px solid rgba(255, 255, 255, 0.3)'
                    }} 
                  />
                </Grid>
                <Grid item>
                  <Chip 
                    label={`Completed: ${lostCompleted}`} 
                    sx={{ 
                      bgcolor: 'rgba(255, 255, 255, 0.2)', 
                      color: '#ffffff',
                      backdropFilter: 'blur(5px)',
                      border: '1px solid rgba(255, 255, 255, 0.3)'
                    }} 
                  />
                </Grid>
                <Grid item>
                  <Chip 
                    label={`Pending: ${lostPending}`} 
                    sx={{ 
                      bgcolor: 'rgba(255, 255, 255, 0.2)', 
                      color: '#ffffff',
                      backdropFilter: 'blur(5px)',
                      border: '1px solid rgba(255, 255, 255, 0.3)'
                    }} 
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ 
            bgcolor: 'rgba(255, 255, 255, 0.1)', 
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: 2,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
          }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ color: '#ffffff' }} gutterBottom>
                Found Items Summary
              </Typography>
              <Grid container spacing={2}>
                <Grid item>
                  <Chip 
                    label={`Total: ${foundTotal}`} 
                    sx={{ 
                      bgcolor: 'rgba(255, 255, 255, 0.2)', 
                      color: '#ffffff',
                      backdropFilter: 'blur(5px)',
                      border: '1px solid rgba(255, 255, 255, 0.3)'
                    }} 
                  />
                </Grid>
                <Grid item>
                  <Chip 
                    label={`Completed: ${foundCompleted}`} 
                    sx={{ 
                      bgcolor: 'rgba(255, 255, 255, 0.2)', 
                      color: '#ffffff',
                      backdropFilter: 'blur(5px)',
                      border: '1px solid rgba(255, 255, 255, 0.3)'
                    }} 
                  />
                </Grid>
                <Grid item>
                  <Chip 
                    label={`Pending: ${foundPending}`} 
                    sx={{ 
                      bgcolor: 'rgba(255, 255, 255, 0.2)', 
                      color: '#ffffff',
                      backdropFilter: 'blur(5px)',
                      border: '1px solid rgba(255, 255, 255, 0.3)'
                    }} 
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Action Buttons */}
      <Box sx={{ mb: 4, display: 'flex', gap: 1, justifyContent: 'flex-start' }}>
        <Button
          variant="contained"
          size="small"
          onClick={() => setShowFoundModal(true)}
          sx={{
            bgcolor: '#2e7d32',
            color: '#ffffff',
            px: 2,
            py: 1,
            fontSize: '0.75rem',
            fontWeight: 500,
            borderRadius: 1,
            '&:hover': {
              bgcolor: '#1b5e20',
              transform: 'translateY(-1px)',
              boxShadow: '0 2px 8px rgba(46, 125, 50, 0.3)'
            },
            transition: 'all 0.3s ease'
          }}
          startIcon={<Add sx={{ fontSize: '0.875rem' }} />}
        >
          Found Item
        </Button>
        <Button
          variant="contained"
          size="small"
          onClick={() => setShowLostModal(true)}
          sx={{
            bgcolor: '#e65100',
            color: '#ffffff',
            px: 2,
            py: 1,
            fontSize: '0.75rem',
            fontWeight: 500,
            borderRadius: 1,
            '&:hover': {
              bgcolor: '#bf360c',
              transform: 'translateY(-1px)',
              boxShadow: '0 2px 8px rgba(230, 81, 0, 0.3)'
            },
            transition: 'all 0.3s ease'
          }}
          startIcon={<Add sx={{ fontSize: '0.875rem' }} />}
        >
          Lost Item
        </Button>
      </Box>

      {/* Feed Layout */}
      <Box sx={{ maxWidth: 600, mx: 'auto' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#ffffff' }}>
            Lost & Found Feed
          </Typography>
          <TextField
            size="small"
            placeholder="Search items..."
            value={feedSearch}
            onChange={(e) => setFeedSearch(e.target.value)}
            sx={{
              width: 200,
              '& .MuiOutlinedInput-root': {
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 2,
                color: '#ffffff',
                '& fieldset': {
                  border: 'none'
                },
                '&:hover fieldset': {
                  border: 'none'
                },
                '&.Mui-focused fieldset': {
                  border: '1px solid rgba(255, 255, 255, 0.4)'
                }
              },
              '& .MuiInputBase-input': {
                color: '#ffffff',
                fontSize: '0.875rem',
                '&::placeholder': {
                  color: 'rgba(255, 255, 255, 0.7)',
                  opacity: 1
                }
              }
            }}
            InputProps={{
              startAdornment: (
                <Search sx={{ 
                  color: 'rgba(255, 255, 255, 0.7)', 
                  fontSize: '1rem',
                  mr: 1 
                }} />
              )
            }}
          />
        </Box>
        
        {filteredItems.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'rgba(255, 255, 255, 0.05)' }}>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
              {feedSearch ? 'No items found matching your search' : 'No items posted yet'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {feedSearch ? 'Try adjusting your search terms' : 'Click "Found Item" or "Lost Item" to create your first post'}
            </Typography>
          </Paper>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {filteredItems.map((item) => (
              <Paper 
                key={item.id} 
                sx={{ 
                  p: 3, 
                  bgcolor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 2,
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.08)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
                  },
                  transition: 'all 0.3s ease'
                }}
              >
                {/* Admin Profile Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar 
                    sx={{ 
                      bgcolor: item.type === 'found' ? '#2e7d32' : '#e65100',
                      width: 40,
                      height: 40,
                      mr: 2
                    }}
                  >
                    A
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#ffffff' }}>
                      Admin
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(item.createdAt?.toDate?.() || item.createdAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                  <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
                    <Tooltip title="Edit">
                      <IconButton 
                        size="small" 
                        onClick={() => setEditModal({ open: true, type: item.type, item })}
                        sx={{ color: '#666666', '&:hover': { color: '#1976d2' } }}
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton 
                        size="small" 
                        onClick={() => handleDelete(item.id, item.type)}
                        sx={{ color: '#666666', '&:hover': { color: '#d32f2f' } }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                {/* Item Image */}
                {item.image && (
                  <Box sx={{ mb: 2, textAlign: 'center' }}>
                    <img 
                      src={item.image} 
                      alt={item.name}
                      style={{ 
                        width: '100%',
                        maxHeight: '300px', 
                        objectFit: 'cover', 
                        borderRadius: '12px',
                        cursor: 'pointer'
                      }}
                      onClick={() => handleImagePreview(item.image, item.name)}
                    />
                  </Box>
                )}

                {/* Item Details */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#ffffff', mb: 1 }}>
                    {item.name}
                  </Typography>
                  {item.description && (
                    <Typography variant="body1" sx={{ color: '#ffffff', mb: 2, lineHeight: 1.6 }}>
                      {item.description}
                    </Typography>
                  )}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      <strong>{item.type === 'found' ? 'Found by:' : 'Lost by:'}</strong> {item[item.type === 'found' ? 'foundBy' : 'lostBy'] || 'Unknown'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Location:</strong> {item.location || 'Unknown'}
                    </Typography>
                  </Box>
                </Box>

                {/* Action Buttons */}
                <Box sx={{ display: 'flex', gap: 1, pt: 2, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <Button
                    size="small"
                    startIcon={<Visibility />}
                    onClick={() => handleImagePreview(item.image, item.name)}
                    sx={{ 
                      color: '#666666', 
                      '&:hover': { color: '#1976d2' },
                      fontSize: '0.75rem'
                    }}
                  >
                    View
                  </Button>
                  <Button
                    size="small"
                    startIcon={<CheckCircle />}
                    onClick={() => handleResolve(item.id, item.type)}
                    sx={{ 
                      color: '#666666', 
                      '&:hover': { color: '#2e7d32' },
                      fontSize: '0.75rem'
                    }}
                  >
                    Resolve
                  </Button>
                </Box>
              </Paper>
            ))}
          </Box>
        )}
      </Box>

      {/* Found Item Modal */}
      <Dialog open={showFoundModal} onClose={() => setShowFoundModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: '#ffffff', bgcolor: '#2e7d32' }}>
          <Add sx={{ mr: 1, verticalAlign: 'middle' }} />
          Found Item Entry
        </DialogTitle>
        <DialogContent sx={{ bgcolor: 'rgba(255, 255, 255, 0.05)' }}>
          <form onSubmit={handleFoundSubmit}>
            <TextField 
              fullWidth 
              size="small"
              label="Item Name" 
              value={foundForm.name} 
              onChange={e => setFoundForm(f => ({ ...f, name: e.target.value }))} 
              sx={{ mb: 1.5, mt: 2 }} 
              required
            />
              <TextField 
                fullWidth 
                size="small"
                label="Description" 
                multiline 
                minRows={2} 
                value={foundForm.description} 
                onChange={e => setFoundForm(f => ({ ...f, description: e.target.value }))} 
                sx={{ mb: 1.5 }} 
              />
              <TextField 
                fullWidth 
                size="small"
                label="Location Found" 
                value={foundForm.location} 
                onChange={e => setFoundForm(f => ({ ...f, location: e.target.value }))} 
                sx={{ mb: 1.5 }} 
              />
              <TextField 
                fullWidth 
                size="small"
                label="Person Who Found" 
                value={foundForm.foundBy || ""} 
                onChange={e => setFoundForm(f => ({ ...f, foundBy: e.target.value }))} 
                sx={{ mb: 1.5 }} 
                placeholder="Enter the name of the person who found the item"
              />
                             <Button 
                 variant="outlined" 
                 size="small"
                 component="label" 
                 sx={{ 
                   mb: 1.5,
                   fontSize: '0.75rem',
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
                     sx={{ fontSize: '0.75rem' }}
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
                  size="small"
                  type="submit" 
                  disabled={loading}
                  sx={{ 
                    bgcolor: '#800000', 
                    fontSize: '0.75rem',
                    '&:hover': { bgcolor: '#6b0000' } 
                  }}
                >
                  Submit Found Item
                </Button>
              </Box>
            </form>
          </DialogContent>
          <DialogActions sx={{ bgcolor: 'rgba(255, 255, 255, 0.05)' }}>
            <Button onClick={() => setShowFoundModal(false)}>
              Cancel
            </Button>
            <Button 
              variant="contained" 
              onClick={handleFoundSubmit}
              disabled={loading}
              sx={{ 
                bgcolor: '#2e7d32', 
                fontSize: '0.75rem',
                '&:hover': { bgcolor: '#1b5e20' } 
              }}
            >
              Submit Found Item
            </Button>
          </DialogActions>
        </Dialog>

      {/* Lost Item Modal */}
      <Dialog open={showLostModal} onClose={() => setShowLostModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: '#ffffff', bgcolor: '#e65100' }}>
          <Add sx={{ mr: 1, verticalAlign: 'middle' }} />
          Lost Item Entry
        </DialogTitle>
        <DialogContent sx={{ bgcolor: 'rgba(255, 255, 255, 0.05)' }}>
          <form onSubmit={handleLostSubmit}>
            <TextField 
              fullWidth 
              size="small"
              label="Item Name" 
              value={lostForm.name} 
              onChange={e => setLostForm(f => ({ ...f, name: e.target.value }))} 
              sx={{ mb: 1.5, mt: 2 }} 
              required
            />
            <TextField 
              fullWidth 
              size="small"
              label="Description" 
              multiline 
              minRows={2} 
              value={lostForm.description} 
              onChange={e => setLostForm(f => ({ ...f, description: e.target.value }))} 
              sx={{ mb: 1.5 }} 
            />
            <TextField 
              fullWidth 
              size="small"
              label="Location Lost" 
              value={lostForm.location} 
              onChange={e => setLostForm(f => ({ ...f, location: e.target.value }))} 
              sx={{ mb: 1.5 }} 
            />
            <TextField 
              fullWidth 
              size="small"
              label="Person Who Lost" 
              value={lostForm.lostBy || ""} 
              onChange={e => setLostForm(f => ({ ...f, lostBy: e.target.value }))} 
              sx={{ mb: 1.5 }} 
              placeholder="Enter the name of the person who lost the item"
            />
            <Button 
              variant="outlined" 
              size="small"
              component="label" 
              sx={{ 
                mb: 1.5,
                fontSize: '0.75rem',
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
                  sx={{ fontSize: '0.75rem' }}
                  onClick={() => {
                    setLostForm(f => ({ ...f, image: null }));
                    setLostImageFile(null);
                  }}
                >
                  Remove
                </Button>
              </Box>
            )}
          </form>
        </DialogContent>
        <DialogActions sx={{ bgcolor: 'rgba(255, 255, 255, 0.05)' }}>
          <Button onClick={() => setShowLostModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handleLostSubmit}
            disabled={loading}
            sx={{ 
              bgcolor: '#e65100', 
              fontSize: '0.75rem',
              '&:hover': { bgcolor: '#bf360c' } 
            }}
          >
            Submit Lost Item
          </Button>
        </DialogActions>
      </Dialog>

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
            sx={{ mb: 2 }}
            startIcon={<Upload />}
          >
            Upload New Image
            <input type="file" accept="image/*" hidden onChange={handleEditImage} />
          </Button>
          {editForm.imageFile && (
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="caption" sx={{ flex: 1 }}>
                Selected: {editForm.imageFile.name}
              </Typography>
              <Button 
                variant="outlined" 
                color="error" 
                size="small"
                onClick={() => setEditForm(f => ({ ...f, imageFile: null }))}
              >
                Remove
              </Button>
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
