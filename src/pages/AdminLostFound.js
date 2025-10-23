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
  Tooltip,
  Badge,
  useTheme
} from '@mui/material';
import {
  Search,
  Add,
  Edit,
  Delete,
  CheckCircle,
  Visibility,
  Upload,
  Pending,
  Done,
  Cancel,
  Person,
  LocationOn,
  AccessTime,
  School
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
  where,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';

export default function AdminLostFound() {
  const theme = useTheme();
  const navigate = useNavigate();
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
  const [pendingLostReports, setPendingLostReports] = useState([]);
  const [pendingFoundReports, setPendingFoundReports] = useState([]);
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
  const [activeFilter, setActiveFilter] = useState({ type: null, status: null });
  const [itemTypeFilter, setItemTypeFilter] = useState('all'); // 'all', 'lost', 'found'
  const [editReportDialog, setEditReportDialog] = useState({ open: false, report: null, type: '' });
  const [editReportForm, setEditReportForm] = useState({ description: '' });

  // Combine all items for feed display
  useEffect(() => {
    const combinedItems = [
      ...lostItems.map(item => ({ ...item, type: 'lost' })),
      ...foundItems.map(item => ({ ...item, type: 'found' }))
    ].sort((a, b) => new Date(b.createdAt?.toDate?.() || b.createdAt) - new Date(a.createdAt?.toDate?.() || a.createdAt));
    setAllItems(combinedItems);
  }, [lostItems, foundItems]);

  // Filter items based on search, active filter, and item type filter
  const filteredItems = allItems.filter(item => {
    // Search filter
    const matchesSearch = item.name.toLowerCase().includes(feedSearch.toLowerCase()) ||
      item.description?.toLowerCase().includes(feedSearch.toLowerCase()) ||
      item.location?.toLowerCase().includes(feedSearch.toLowerCase()) ||
      item[item.type === 'found' ? 'foundBy' : 'lostBy']?.toLowerCase().includes(feedSearch.toLowerCase());
    
    // Active filter (from summary chips)
    const matchesType = !activeFilter.type || item.type === activeFilter.type;
    const matchesStatus = !activeFilter.status || 
      (activeFilter.status === 'resolved' && item.resolved) ||
      (activeFilter.status === 'pending' && !item.resolved);
    
    // Item type filter (from filter buttons)
    const matchesItemType = itemTypeFilter === 'all' || item.type === itemTypeFilter;
    
    return matchesSearch && matchesType && matchesStatus && matchesItemType;
  });


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

    // Real-time listeners for pending reports
    const unsubPendingLost = onSnapshot(
      query(collection(db, 'pending_lost_reports'), orderBy('createdAt', 'desc')), 
      snap => {
        setPendingLostReports(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    );
    
    const unsubPendingFound = onSnapshot(
      query(collection(db, 'pending_found_reports'), orderBy('createdAt', 'desc')), 
      snap => {
        setPendingFoundReports(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    );

    return () => { 
      unsubLost(); 
      unsubFound(); 
      unsubPendingLost();
      unsubPendingFound();
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

  // Open edit report dialog
  const handleEditReport = (report, type) => {
    setEditReportDialog({ open: true, report, type });
    setEditReportForm({ description: report.description });
  };

  // Save edited report and approve
  const handleSaveAndApprove = async () => {
    const { report, type } = editReportDialog;
    setLoading(true);
    try {
      // Add to the main collection with edited description
      const itemData = {
        name: report.name,
        description: editReportForm.description,
        location: report.location,
        image: report.image,
        resolved: false,
        createdAt: new Date().toISOString(),
        reportedBy: report.submittedBy,
        postedBy: 'student',
        approvedBy: 'admin',
        originalReportId: report.id,
        adminDescription: editReportForm.description
      };

      if (type === 'lost') {
        await addDoc(collection(db, 'lost_items'), itemData);
      } else {
        await addDoc(collection(db, 'found_items'), itemData);
      }

      // Delete from pending reports
      await deleteDoc(doc(db, `pending_${type}_reports`, report.id));

      // Send notification to student
      await addDoc(collection(db, 'notifications'), {
        type: 'report_approved',
        title: 'Report Approved',
        message: `Your ${type} item report for "${report.name}" has been approved and posted.`,
        recipientEmail: report.submittedBy,
        recipientRole: 'Student',
        createdAt: serverTimestamp(),
        read: false
      });

      setSnackbar({ open: true, message: `${type} item report approved and posted!`, severity: 'success' });
      setEditReportDialog({ open: false, report: null, type: '' });
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to approve report: ' + err.message, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Approve student report without editing
  const handleApproveReport = async (report, type) => {
    setLoading(true);
    try {
      // Add to the main collection
      const itemData = {
        name: report.name,
        description: report.description,
        location: report.location,
        image: report.image,
        resolved: false,
        createdAt: new Date().toISOString(),
        reportedBy: report.submittedBy,
        postedBy: 'student',
        approvedBy: 'admin',
        originalReportId: report.id
      };

      if (type === 'lost') {
        await addDoc(collection(db, 'lost_items'), itemData);
      } else {
        await addDoc(collection(db, 'found_items'), itemData);
      }

      // Delete from pending reports
      await deleteDoc(doc(db, `pending_${type}_reports`, report.id));

      // Send notification to student
      await addDoc(collection(db, 'notifications'), {
        type: 'report_approved',
        title: 'Report Approved',
        message: `Your ${type} item report for "${report.name}" has been approved and posted.`,
        recipientEmail: report.submittedBy,
        recipientRole: 'Student',
        createdAt: serverTimestamp(),
        read: false
      });

      setSnackbar({ open: true, message: `${type} item report approved and posted!`, severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to approve report: ' + err.message, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Reject student report
  const handleRejectReport = async (report, type) => {
    setLoading(true);
    try {
      // Delete from pending reports
      await deleteDoc(doc(db, `pending_${type}_reports`, report.id));

      // Send notification to student
      await addDoc(collection(db, 'notifications'), {
        type: 'report_rejected',
        title: 'Report Rejected',
        message: `Your ${type} item report for "${report.name}" has been rejected. Please review the guidelines and submit again if needed.`,
        recipientEmail: report.submittedBy,
        recipientRole: 'Student',
        createdAt: serverTimestamp(),
        read: false
      });

      setSnackbar({ open: true, message: `${type} item report rejected.`, severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to reject report: ' + err.message, severity: 'error' });
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

  const handleFilterClick = (type, status) => {
    setActiveFilter({ type, status });
  };

  const clearFilter = () => {
    setActiveFilter({ type: null, status: null });
  };

  return (
    <Box sx={{ pt: { xs: 2, sm: 3 }, pl: { xs: 2, sm: 3, md: 4 }, pr: { xs: 2, sm: 3, md: 4 } }}>
      <Typography variant="h4" gutterBottom sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000', mb: 2, mt: 1 }}>
        Lost & Found Management
      </Typography>

      {/* Summary Cards */}
      <Box sx={{ p: 3 }}>
        <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ 
            bgcolor: 'rgba(255, 255, 255, 0.1)', 
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderLeft: '4px solid #f44336',
            borderRadius: 2,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
          }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }} gutterBottom>
                Lost Items Summary
              </Typography>
              <Grid container spacing={2}>
                <Grid item>
                  <Chip 
                    label={`Total: ${lostTotal}`} 
                    onClick={() => handleFilterClick('lost', null)}
                    sx={{ 
                      bgcolor: 'transparent',
                      color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                      border: theme.palette.mode === 'dark' ? '2px solid #ffffff' : '2px solid #000000',
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: '#800000',
                        color: '#ffffff',
                        border: '2px solid #800000'
                      },
                      transition: 'all 0.3s ease'
                    }} 
                  />
                </Grid>
                <Grid item>
                  <Chip 
                    label={`Completed: ${lostCompleted}`} 
                    onClick={() => handleFilterClick('lost', 'resolved')}
                    sx={{ 
                      bgcolor: 'transparent',
                      color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                      border: theme.palette.mode === 'dark' ? '2px solid #ffffff' : '2px solid #000000',
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: '#800000',
                        color: '#ffffff',
                        border: '2px solid #800000'
                      },
                      transition: 'all 0.3s ease'
                    }} 
                  />
                </Grid>
                <Grid item>
                  <Chip 
                    label={`Pending: ${lostPending}`} 
                    onClick={() => handleFilterClick('lost', 'pending')}
                    sx={{ 
                      bgcolor: 'transparent',
                      color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                      border: theme.palette.mode === 'dark' ? '2px solid #ffffff' : '2px solid #000000',
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: '#800000',
                        color: '#ffffff',
                        border: '2px solid #800000'
                      },
                      transition: 'all 0.3s ease'
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
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderLeft: '4px solid #4caf50',
            borderRadius: 2,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
          }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }} gutterBottom>
                Found Items Summary
              </Typography>
              <Grid container spacing={2}>
                <Grid item>
                  <Chip 
                    label={`Total: ${foundTotal}`} 
                    onClick={() => handleFilterClick('found', null)}
                    sx={{ 
                      bgcolor: 'transparent',
                      color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                      border: theme.palette.mode === 'dark' ? '2px solid #ffffff' : '2px solid #000000',
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: '#800000',
                        color: '#ffffff',
                        border: '2px solid #800000'
                      },
                      transition: 'all 0.3s ease'
                    }} 
                  />
                </Grid>
                <Grid item>
                  <Chip 
                    label={`Completed: ${foundCompleted}`} 
                    onClick={() => handleFilterClick('found', 'resolved')}
                    sx={{ 
                      bgcolor: 'transparent',
                      color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                      border: theme.palette.mode === 'dark' ? '2px solid #ffffff' : '2px solid #000000',
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: '#800000',
                        color: '#ffffff',
                        border: '2px solid #800000'
                      },
                      transition: 'all 0.3s ease'
                    }} 
                  />
                </Grid>
                <Grid item>
                  <Chip 
                    label={`Pending: ${foundPending}`} 
                    onClick={() => handleFilterClick('found', 'pending')}
                    sx={{ 
                      bgcolor: 'transparent',
                      color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                      border: theme.palette.mode === 'dark' ? '2px solid #ffffff' : '2px solid #000000',
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: '#800000',
                        color: '#ffffff',
                        border: '2px solid #800000'
                      },
                      transition: 'all 0.3s ease'
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
          variant="outlined"
          size="small"
          onClick={() => setShowFoundModal(true)}
          sx={{
            bgcolor: 'transparent',
            color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
            border: theme.palette.mode === 'dark' ? '1px solid #ffffff' : '1px solid #000000',
            px: 2,
            py: 1,
            fontSize: '0.75rem',
            fontWeight: 500,
            borderRadius: 1,
            '&:hover': {
              bgcolor: '#800000',
              color: '#ffffff',
              border: '1px solid #800000',
              transform: 'translateY(-1px)',
              boxShadow: '0 2px 8px rgba(128, 0, 0, 0.3)'
            },
            transition: 'all 0.3s ease'
          }}
          startIcon={<Add sx={{ fontSize: '0.875rem' }} />}
        >
          Found Item
        </Button>
        <Button
          variant="outlined"
          size="small"
          onClick={() => setShowLostModal(true)}
          sx={{
            bgcolor: 'transparent',
            color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
            border: theme.palette.mode === 'dark' ? '1px solid #ffffff' : '1px solid #000000',
            px: 2,
            py: 1,
            fontSize: '0.75rem',
            fontWeight: 500,
            borderRadius: 1,
            '&:hover': {
              bgcolor: '#800000',
              color: '#ffffff',
              border: '1px solid #800000',
              transform: 'translateY(-1px)',
              boxShadow: '0 2px 8px rgba(128, 0, 0, 0.3)'
            },
            transition: 'all 0.3s ease'
          }}
          startIcon={<Add sx={{ fontSize: '0.875rem' }} />}
        >
          Lost Item
        </Button>
        <Button
          variant="outlined"
          size="small"
          onClick={() => navigate('/students-lost-found')}
          sx={{
            bgcolor: 'transparent',
            color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
            border: theme.palette.mode === 'dark' ? '1px solid #ffffff' : '1px solid #000000',
            px: 2,
            py: 1,
            fontSize: '0.75rem',
            fontWeight: 500,
            borderRadius: 1,
            '&:hover': {
              bgcolor: '#800000',
              color: '#ffffff',
              border: '1px solid #800000',
              transform: 'translateY(-1px)',
              boxShadow: '0 2px 8px rgba(128, 0, 0, 0.3)'
            },
            transition: 'all 0.3s ease'
          }}
          startIcon={<School sx={{ fontSize: '0.875rem' }} />}
        >
          Student Lost and Found
        </Button>
      </Box>

      {/* Pending Reports Section */}
      {(pendingLostReports.length > 0 || pendingFoundReports.length > 0) && (
        <Paper sx={{ 
          p: 3, 
          mb: 3,
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.9)',
          border: theme.palette.mode === 'dark' ? '0.5px solid rgba(255, 255, 255, 0.2)' : '0.5px solid rgba(0, 0, 0, 0.1)',
          borderRadius: 2,
          boxShadow: theme.palette.mode === 'dark' ? '0 2px 8px rgba(0, 0, 0, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.1)'
        }}>
          <Typography variant="h4" gutterBottom sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000' }}>
            Pending Student Reports
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Review and approve student reports before they are posted to Browse Items.
          </Typography>
          
          <Grid container spacing={2}>
            {/* Pending Lost Reports */}
            {pendingLostReports.map((report) => (
              <Grid item xs={12} md={6} key={report.id}>
                <Card sx={{ 
                  p: 2, 
                  border: '1px solid', 
                  borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.5)'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar src={report.submittedByPhoto} sx={{ mr: 2, width: 40, height: 40 }}>
                      <Person />
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {report.submittedByName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(report.createdAt).toLocaleDateString()}
                      </Typography>
                    </Box>
                    <Chip 
                      label="Lost Item" 
                      color="warning" 
                      size="small" 
                      sx={{ ml: 'auto' }}
                    />
                  </Box>
                  
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                    {report.name}
                  </Typography>
                  
                  {report.image && (
                    <Box sx={{ mb: 2 }}>
                      <img 
                        src={report.image} 
                        alt={report.name}
                        style={{ 
                          width: '100%', 
                          height: '150px', 
                          objectFit: 'cover', 
                          borderRadius: '8px' 
                        }}
                      />
                    </Box>
                  )}
                  
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    {report.description}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                      <LocationOn sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                      <Typography variant="caption">{report.location}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <AccessTime sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                      <Typography variant="caption">{report.timeLost}</Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                      variant="contained"
                      color="success"
                      size="small"
                      startIcon={<Done />}
                      onClick={() => handleApproveReport(report, 'lost')}
                      disabled={loading}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="outlined"
                      color="primary"
                      size="small"
                      startIcon={<Edit />}
                      onClick={() => handleEditReport(report, 'lost')}
                      disabled={loading}
                    >
                      Edit & Approve
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      startIcon={<Cancel />}
                      onClick={() => handleRejectReport(report, 'lost')}
                      disabled={loading}
                    >
                      Reject
                    </Button>
                  </Box>
                </Card>
              </Grid>
            ))}
            
            {/* Pending Found Reports */}
            {pendingFoundReports.map((report) => (
              <Grid item xs={12} md={6} key={report.id}>
                <Card sx={{ 
                  p: 2, 
                  border: '1px solid', 
                  borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.5)'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar src={report.submittedByPhoto} sx={{ mr: 2, width: 40, height: 40 }}>
                      <Person />
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {report.submittedByName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(report.createdAt).toLocaleDateString()}
                      </Typography>
                    </Box>
                    <Chip 
                      label="Found Item" 
                      color="success" 
                      size="small" 
                      sx={{ ml: 'auto' }}
                    />
                  </Box>
                  
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                    {report.name}
                  </Typography>
                  
                  {report.image && (
                    <Box sx={{ mb: 2 }}>
                      <img 
                        src={report.image} 
                        alt={report.name}
                        style={{ 
                          width: '100%', 
                          height: '150px', 
                          objectFit: 'cover', 
                          borderRadius: '8px' 
                        }}
                      />
                    </Box>
                  )}
                  
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    {report.description}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                      <LocationOn sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                      <Typography variant="caption">{report.location}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <AccessTime sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                      <Typography variant="caption">{report.timeFound}</Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                      variant="contained"
                      color="success"
                      size="small"
                      startIcon={<Done />}
                      onClick={() => handleApproveReport(report, 'found')}
                      disabled={loading}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="outlined"
                      color="primary"
                      size="small"
                      startIcon={<Edit />}
                      onClick={() => handleEditReport(report, 'found')}
                      disabled={loading}
                    >
                      Edit & Approve
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      startIcon={<Cancel />}
                      onClick={() => handleRejectReport(report, 'found')}
                      disabled={loading}
                    >
                      Reject
                    </Button>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {/* Lost Items History and Found Items Summary Layout */}
      <Grid container spacing={2}>
        {/* Lost Items History Section */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ 
            p: 2, 
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.7)',
            border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
            borderRadius: 1,
            boxShadow: theme.palette.mode === 'dark' ? '0 1px 4px rgba(0, 0, 0, 0.2)' : '0 1px 4px rgba(0, 0, 0, 0.05)'
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="h6" gutterBottom sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000' }}>
                Lost Items History
              </Typography>
            </Box>
            <TextField
              size="small"
              placeholder="Search lost items..."
              value={lostSearch}
              onChange={(e) => setLostSearch(e.target.value)}
              sx={{
                mb: 2,
                width: '60%',
                '& .MuiOutlinedInput-root': {
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                  border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(0, 0, 0, 0.2)',
                  borderRadius: 2,
                  color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                  '& fieldset': {
                    border: 'none'
                  },
                  '&:hover fieldset': {
                    border: 'none'
                  },
                  '&.Mui-focused fieldset': {
                    border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.4)' : '1px solid rgba(0, 0, 0, 0.4)'
                  }
                },
                '& .MuiInputBase-input': {
                  color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                  fontSize: '0.875rem',
                  '&::placeholder': {
                    color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                    opacity: 1
                  }
                }
              }}
              InputProps={{
                startAdornment: (
                  <Search sx={{ 
                    color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)', 
                    fontSize: '1rem',
                    mr: 1 
                  }} />
                )
              }}
            />
            {filteredLost.length === 0 ? (
              <Paper sx={{ 
                p: 3, 
                textAlign: 'center', 
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
                borderRadius: 2
              }}>
                <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#cccccc' : '#333333' }}>
                  No lost items found.
                </Typography>
              </Paper>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {filteredLost.map((item) => (
                  <Paper 
                    key={item.id} 
                    sx={{ 
                      p: 1.5, 
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.9)',
                      border: theme.palette.mode === 'dark' ? '0.5px solid rgba(255, 255, 255, 0.1)' : '0.5px solid rgba(0, 0, 0, 0.1)',
                      borderLeft: '3px solid #f44336',
                      borderRadius: 1.5,
                      '&:hover': {
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 1)',
                        transform: 'translateY(-1px)',
                        boxShadow: theme.palette.mode === 'dark' ? '0 2px 8px rgba(0, 0, 0, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.15)'
                      },
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                      <Avatar 
                        sx={{ 
                          width: 24,
                          height: 24,
                          mr: 1.5,
                          fontSize: '0.75rem'
                        }}
                      >
                        L
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" sx={{ 
                          fontWeight: 600, 
                          color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                          fontSize: '0.95rem',
                          lineHeight: 1.2,
                          letterSpacing: '0.01em'
                        }}>
                          {item.name}
                        </Typography>
                        <Typography variant="caption" sx={{ 
                          color: theme.palette.mode === 'dark' ? '#b0b0b0' : '#555555',
                          fontSize: '0.7rem',
                          fontWeight: 500,
                          letterSpacing: '0.02em'
                        }}>
                          {new Date(item.createdAt?.toDate?.() || item.createdAt).toLocaleDateString()}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="View">
                          <IconButton 
                            size="small" 
                            onClick={() => handleImagePreview(item.image, item.name)}
                            sx={{ color: theme.palette.mode === 'dark' ? '#cccccc' : '#333333', '&:hover': { color: '#1976d2' } }}
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton 
                            size="small" 
                            onClick={() => handleEditOpen('lost_items', item)}
                            sx={{ 
                              color: theme.palette.mode === 'dark' ? '#cccccc' : '#333333',
                              padding: '4px',
                              '&:hover': { 
                                color: '#f57c00',
                                bgcolor: theme.palette.mode === 'dark' ? 'rgba(245, 124, 0, 0.1)' : 'rgba(245, 124, 0, 0.04)'
                              }
                            }}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton 
                            size="small" 
                            onClick={() => handleDelete('lost_items', item.id)}
                            sx={{ color: theme.palette.mode === 'dark' ? '#cccccc' : '#333333', '&:hover': { color: '#d32f2f' } }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                    {item.description && (
                      <Typography variant="body2" sx={{ 
                        color: theme.palette.mode === 'dark' ? '#e0e0e0' : '#333333', 
                        mb: 1,
                        fontSize: '0.8rem',
                        lineHeight: 1.4,
                        fontWeight: 400,
                        letterSpacing: '0.01em'
                      }}>
                        {item.description}
                      </Typography>
                    )}
                    {/* Comments Section */}
                    {item.comments && item.comments.length > 0 && (
                      <Box sx={{ mt: 1, p: 1.5, bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#f5f5f5', borderRadius: 1 }}>
                        <Typography variant="subtitle2" sx={{ 
                          mb: 1, 
                          color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          letterSpacing: '0.01em'
                        }}>
                          Comments ({item.comments.length})
                        </Typography>
                        {item.comments.map((comment, index) => (
                          <Box key={index} sx={{ mb: 0.5, p: 0.75, bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#ffffff', borderRadius: 1 }}>
                            <Typography variant="caption" sx={{ 
                              fontWeight: 600, 
                              color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                              fontSize: '0.75rem',
                              letterSpacing: '0.01em'
                            }}>
                              {comment.authorName}
                            </Typography>
                            <Typography variant="body2" sx={{ 
                              color: theme.palette.mode === 'dark' ? '#d0d0d0' : '#444444',
                              fontSize: '0.75rem',
                              lineHeight: 1.3,
                              fontWeight: 400,
                              letterSpacing: '0.01em'
                            }}>
                              {comment.text}
                            </Typography>
                            <Typography variant="caption" sx={{ 
                              color: theme.palette.mode === 'dark' ? '#a0a0a0' : '#666666', 
                              fontSize: '0.65rem',
                              fontWeight: 500,
                              letterSpacing: '0.02em'
                            }}>
                              {new Date(comment.createdAt).toLocaleString()}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    )}

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                      <Typography variant="caption" sx={{ color: theme.palette.mode === 'dark' ? '#cccccc' : '#333333', fontSize: '0.7rem' }}>
                        <strong>Lost by:</strong> {item.lostBy || 'Unknown'} | <strong>Location:</strong> {item.location || 'Unknown'}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {!item.resolved && (
                          <Chip label="Active" color="warning" size="small" sx={{ fontSize: '0.65rem', height: 20 }} />
                        )}
                        <Button
                          size="small"
                          startIcon={<CheckCircle sx={{ fontSize: '0.75rem' }} />}
                          onClick={() => handleResolve('lost_items', item.id)}
                          sx={{ 
                            color: item.resolved ? '#2e7d32' : (theme.palette.mode === 'dark' ? '#cccccc' : '#333333'), 
                            '&:hover': { color: '#2e7d32' },
                            fontSize: '0.7rem',
                            minWidth: 'auto',
                            px: 1
                          }}
                        >
                          Resolve
                        </Button>
                      </Box>
                    </Box>
                  </Paper>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Found Items Summary Section */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ 
            p: 2, 
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.7)',
            border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
            borderRadius: 1,
            boxShadow: theme.palette.mode === 'dark' ? '0 1px 4px rgba(0, 0, 0, 0.2)' : '0 1px 4px rgba(0, 0, 0, 0.05)'
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="h6" gutterBottom sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000' }}>
                Found Items Summary
              </Typography>
            </Box>
            <TextField
              size="small"
              placeholder="Search found items..."
              value={foundSearch}
              onChange={(e) => setFoundSearch(e.target.value)}
              sx={{
                mb: 2,
                width: '60%',
                '& .MuiOutlinedInput-root': {
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                  border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(0, 0, 0, 0.2)',
                  borderRadius: 2,
                  color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                  '& fieldset': {
                    border: 'none'
                  },
                  '&:hover fieldset': {
                    border: 'none'
                  },
                  '&.Mui-focused fieldset': {
                    border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.4)' : '1px solid rgba(0, 0, 0, 0.4)'
                  }
                },
                '& .MuiInputBase-input': {
                  color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                  fontSize: '0.875rem',
                  '&::placeholder': {
                    color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                    opacity: 1
                  }
                }
              }}
              InputProps={{
                startAdornment: (
                  <Search sx={{ 
                    color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)', 
                    fontSize: '1rem',
                    mr: 1 
                  }} />
                )
              }}
            />
            {filteredFound.length === 0 ? (
              <Paper sx={{ 
                p: 3, 
                textAlign: 'center', 
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
                borderRadius: 2
              }}>
                <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#cccccc' : '#333333' }}>
                  No found items found.
                </Typography>
              </Paper>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {filteredFound.map((item) => (
                  <Paper 
                    key={item.id} 
                    sx={{ 
                      p: 1.5, 
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.9)',
                      border: theme.palette.mode === 'dark' ? '0.5px solid rgba(255, 255, 255, 0.1)' : '0.5px solid rgba(0, 0, 0, 0.1)',
                      borderLeft: '3px solid #4caf50',
                      borderRadius: 1.5,
                      '&:hover': {
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 1)',
                        transform: 'translateY(-1px)',
                        boxShadow: theme.palette.mode === 'dark' ? '0 2px 8px rgba(0, 0, 0, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.15)'
                      },
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                      <Avatar 
                        sx={{ 
                          width: 24,
                          height: 24,
                          mr: 1.5,
                          fontSize: '0.75rem'
                        }}
                      >
                        F
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" sx={{ 
                          fontWeight: 600, 
                          color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                          fontSize: '0.95rem',
                          lineHeight: 1.2,
                          letterSpacing: '0.01em'
                        }}>
                          {item.name}
                        </Typography>
                        <Typography variant="caption" sx={{ 
                          color: theme.palette.mode === 'dark' ? '#b0b0b0' : '#555555',
                          fontSize: '0.7rem',
                          fontWeight: 500,
                          letterSpacing: '0.02em'
                        }}>
                          {new Date(item.createdAt?.toDate?.() || item.createdAt).toLocaleDateString()}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="View">
                          <IconButton 
                            size="small" 
                            onClick={() => handleImagePreview(item.image, item.name)}
                            sx={{ color: theme.palette.mode === 'dark' ? '#cccccc' : '#333333', '&:hover': { color: '#1976d2' } }}
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton 
                            size="small" 
                            onClick={() => handleEditOpen('found_items', item)}
                            sx={{ 
                              color: theme.palette.mode === 'dark' ? '#cccccc' : '#333333',
                              padding: '4px',
                              '&:hover': { 
                                color: '#f57c00',
                                bgcolor: theme.palette.mode === 'dark' ? 'rgba(245, 124, 0, 0.1)' : 'rgba(245, 124, 0, 0.04)'
                              }
                            }}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton 
                            size="small" 
                            onClick={() => handleDelete('found_items', item.id)}
                            sx={{ color: theme.palette.mode === 'dark' ? '#cccccc' : '#333333', '&:hover': { color: '#d32f2f' } }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                    {item.description && (
                      <Typography variant="body2" sx={{ 
                        color: theme.palette.mode === 'dark' ? '#e0e0e0' : '#333333', 
                        mb: 1,
                        fontSize: '0.8rem',
                        lineHeight: 1.4,
                        fontWeight: 400,
                        letterSpacing: '0.01em'
                      }}>
                        {item.description}
                      </Typography>
                    )}

                    {/* Comments Section */}
                    {item.comments && item.comments.length > 0 && (
                      <Box sx={{ mt: 1, p: 1.5, bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#f5f5f5', borderRadius: 1 }}>
                        <Typography variant="subtitle2" sx={{ 
                          mb: 1, 
                          color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          letterSpacing: '0.01em'
                        }}>
                          Comments ({item.comments.length})
                        </Typography>
                        {item.comments.map((comment, index) => (
                          <Box key={index} sx={{ mb: 0.5, p: 0.75, bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#ffffff', borderRadius: 1 }}>
                            <Typography variant="caption" sx={{ 
                              fontWeight: 600, 
                              color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                              fontSize: '0.75rem',
                              letterSpacing: '0.01em'
                            }}>
                              {comment.authorName}
                            </Typography>
                            <Typography variant="body2" sx={{ 
                              color: theme.palette.mode === 'dark' ? '#d0d0d0' : '#444444',
                              fontSize: '0.75rem',
                              lineHeight: 1.3,
                              fontWeight: 400,
                              letterSpacing: '0.01em'
                            }}>
                              {comment.text}
                            </Typography>
                            <Typography variant="caption" sx={{ 
                              color: theme.palette.mode === 'dark' ? '#a0a0a0' : '#666666', 
                              fontSize: '0.65rem',
                              fontWeight: 500,
                              letterSpacing: '0.02em'
                            }}>
                              {new Date(comment.createdAt).toLocaleString()}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    )}

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                      <Typography variant="caption" sx={{ color: theme.palette.mode === 'dark' ? '#cccccc' : '#333333', fontSize: '0.7rem' }}>
                        <strong>Found by:</strong> {item.foundBy || 'Unknown'} | <strong>Location:</strong> {item.location || 'Unknown'}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {!item.resolved && (
                          <Chip label="Active" color="warning" size="small" sx={{ fontSize: '0.65rem', height: 20 }} />
                        )}
                        <Button
                          size="small"
                          startIcon={<CheckCircle sx={{ fontSize: '0.75rem' }} />}
                          onClick={() => handleResolve('found_items', item.id)}
                          sx={{ 
                            color: item.resolved ? '#2e7d32' : (theme.palette.mode === 'dark' ? '#cccccc' : '#333333'), 
                            '&:hover': { color: '#2e7d32' },
                            fontSize: '0.7rem',
                            minWidth: 'auto',
                            px: 1
                          }}
                        >
                          Resolve
                        </Button>
                      </Box>
                    </Box>
                  </Paper>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Found Item Modal */}
      <Dialog open={showFoundModal} onClose={() => setShowFoundModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>
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
                  textTransform: 'none',
                  bgcolor: '#fff',
                  color: '#000',
                  borderColor: '#000',
                  '&:hover': { 
                    bgcolor: '#800000', 
                    color: '#fff', 
                    borderColor: '#800000' 
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
              {/* Removed inline submit button to avoid duplicate actions (use dialog actions below) */}
            </form>
          </DialogContent>
          <DialogActions sx={{ bgcolor: 'rgba(255, 255, 255, 0.05)' }}>
          <Button 
            onClick={() => setShowFoundModal(false)}
            variant="outlined"
            size="small"
            sx={{ 
              textTransform: 'none',
              bgcolor: '#fff', 
              color: '#000', 
              borderColor: '#000', 
              fontSize: '0.75rem',
              '&:hover': { 
                bgcolor: '#800000', 
                color: '#fff', 
                borderColor: '#800000' 
              }
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleFoundSubmit}
            variant="outlined"
            size="small"
            disabled={loading}
            sx={{ 
              textTransform: 'none',
              bgcolor: '#fff', 
              color: '#000', 
              borderColor: '#000', 
              fontSize: '0.75rem',
              '&:hover': { 
                bgcolor: '#800000', 
                color: '#fff', 
                borderColor: '#800000' 
              }
            }}
          >
            Submit Found Item
          </Button>
          </DialogActions>
        </Dialog>

      {/* Lost Item Modal */}
      <Dialog open={showLostModal} onClose={() => setShowLostModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>
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
                textTransform: 'none',
                bgcolor: '#fff',
                color: '#000',
                borderColor: '#000',
                '&:hover': { 
                  bgcolor: '#800000', 
                  color: '#fff', 
                  borderColor: '#800000' 
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
          <Button 
            onClick={() => setShowLostModal(false)}
            variant="outlined"
            size="small"
            sx={{ 
              textTransform: 'none',
              bgcolor: '#fff', 
              color: '#000', 
              borderColor: '#000', 
              fontSize: '0.75rem',
              '&:hover': { 
                bgcolor: '#800000', 
                color: '#fff', 
                borderColor: '#800000' 
              }
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleLostSubmit}
            variant="outlined"
            size="small"
            disabled={loading}
            sx={{ 
              textTransform: 'none',
              bgcolor: '#fff', 
              color: '#000', 
              borderColor: '#000', 
              fontSize: '0.75rem',
              '&:hover': { 
                bgcolor: '#800000', 
                color: '#fff', 
                borderColor: '#800000' 
              }
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
      {/* Edit Report Dialog */}
      <Dialog 
        open={editReportDialog.open} 
        onClose={() => setEditReportDialog({ open: false, report: null, type: '' })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Edit Report Description
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              {editReportDialog.report?.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Submitted by: {editReportDialog.report?.submittedByName}
            </Typography>
          </Box>
          
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Description"
            value={editReportForm.description}
            onChange={(e) => setEditReportForm({ description: e.target.value })}
            placeholder="Edit the description for this report..."
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setEditReportDialog({ open: false, report: null, type: '' })}
            color="inherit"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSaveAndApprove}
            variant="contained"
            color="success"
            disabled={loading}
          >
            Save & Approve
          </Button>
        </DialogActions>
      </Dialog>

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
    </Box>
  );
}
