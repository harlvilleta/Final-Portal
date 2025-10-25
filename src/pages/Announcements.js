import React, { useState, useEffect } from "react";
import { Box, Typography, Paper, TextField, Button, Stack, Snackbar, Alert, List, ListItem, ListItemText, Divider, MenuItem, Card, CardContent, CardHeader, Chip, Tabs, Tab, Badge, Dialog, DialogTitle, DialogContent, DialogActions, Select, InputAdornment, useTheme } from "@mui/material";
import { CloudUpload, Image, Delete } from "@mui/icons-material";
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, updateDoc, getDoc, where } from "firebase/firestore";
import { db, logActivity, storage } from "../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import PrintIcon from '@mui/icons-material/Print';
import DeleteIcon from '@mui/icons-material/Delete';
import IconButton from '@mui/material/IconButton';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import SearchIcon from '@mui/icons-material/Search';
import { Tooltip } from "@mui/material";
import { auth } from "../firebase"; // Added auth import
import { useLocation } from "react-router-dom";

const categories = ["General", "Event", "Urgent", "Reminder", "Other"];
const audiences = ["All", "Student", "Teacher"];
const priorities = ["Normal", "High", "Urgent"];

export default function Announcements() {
  const theme = useTheme();
  const location = useLocation();
  const [form, setForm] = useState({ title: "", message: "", date: "", audience: "All", scheduleDate: "", expiryDate: "", photo: null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [announcements, setAnnouncements] = useState([]);
  const [recycleBin, setRecycleBin] = useState([]);
  const [completedAnnouncements, setCompletedAnnouncements] = useState([]);
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState("");
  const [viewAnnouncement, setViewAnnouncement] = useState(null);
  const [editAnnouncement, setEditAnnouncement] = useState(null);
  const [selected, setSelected] = useState([]);
  const [bulkAction, setBulkAction] = useState(null);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState('Student');
  const [activities, setActivities] = useState([]);
  const [photoPreview, setPhotoPreview] = useState(null);

  useEffect(() => {
    // Get current user and role
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setUserRole(userDoc.data().role || 'Student');
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
        }
      }
    });

    fetchAnnouncements();
    fetchRecycleBin();
    fetchActivities();
    
    return unsubscribe;
  }, []);

  useEffect(() => {
    setCompletedAnnouncements(announcements.filter(a => a.completed));
  }, [announcements]);

  // Handle navigation from notification
  useEffect(() => {
    if (location.state?.fromNotification && location.state?.viewAnnouncementId && announcements.length > 0) {
      const targetAnnouncement = announcements.find(a => a.id === location.state.viewAnnouncementId);
      if (targetAnnouncement) {
        setViewAnnouncement(targetAnnouncement);
      }
    }
  }, [location.state, announcements]);

  const fetchAnnouncements = async () => {
    try {
      const q = query(collection(db, "announcements"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setAnnouncements(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) {
      setAnnouncements([]);
    }
  };

  const fetchRecycleBin = async () => {
    try {
      const q = query(collection(db, "recycle_bin_announcements"), orderBy("deletedAt", "desc"));
      const snap = await getDocs(q);
      setRecycleBin(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) {
      setRecycleBin([]);
    }
  };

  const fetchActivities = async () => {
    try {
      const q = query(collection(db, "activities"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setActivities(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) {
      setActivities([]);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setForm({ ...form, photo: file });
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setForm({ ...form, photo: null });
    setPhotoPreview(null);
  };

  const sendNotificationsToRole = async (role, announcementId, form, senderId, senderEmail, senderName) => {
    const usersQuery = query(
      collection(db, "users"),
      where("role", "==", role)
    );
    const usersSnapshot = await getDocs(usersQuery);
    
    // Create notifications for each user
    const notificationPromises = usersSnapshot.docs.map(doc => {
      const user = doc.data();
      return addDoc(collection(db, "notifications"), {
        recipientEmail: user.email,
        recipientName: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        title: `📢 New Announcement: ${form.title}`,
        message: form.message.length > 100 ? `${form.message.substring(0, 100)}...` : form.message,
        type: "announcement",
        announcementId: announcementId,
        senderId: senderId,
        senderEmail: senderEmail,
        senderName: senderName,
        read: false,
        createdAt: new Date().toISOString(),
        audience: form.audience
      });
    });
    
    await Promise.all(notificationPromises);
    console.log(`✅ Announcement notifications sent to ${usersSnapshot.docs.length} ${role.toLowerCase()}s`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) {
      setSnackbar({ open: true, message: "Title and message are required", severity: "error" });
      return;
    }
    setIsSubmitting(true);
    try {
      // Get current user information
      const currentUser = auth.currentUser;
      const userEmail = currentUser?.email || 'unknown@school.com';
      const userName = currentUser?.displayName || userEmail.split('@')[0];
      
      // Upload photo if provided
      let photoUrl = null;
      if (form.photo) {
        try {
          const photoRef = ref(storage, `announcements/${Date.now()}_${form.photo.name}`);
          const uploadResult = await uploadBytes(photoRef, form.photo);
          photoUrl = await getDownloadURL(uploadResult.ref);
        } catch (photoError) {
          console.error('Error uploading photo:', photoError);
          setSnackbar({ open: true, message: "Error uploading photo", severity: "error" });
          setIsSubmitting(false);
          return;
        }
      }

      const announcementRef = await addDoc(collection(db, "announcements"), {
        title: form.title,
        message: form.message,
        date: form.date || new Date().toISOString(),
        audience: form.audience,
        scheduleDate: form.scheduleDate,
        expiryDate: form.expiryDate,
        photoUrl: photoUrl,
        createdAt: new Date().toISOString(),
        postedBy: userName,
        postedByEmail: userEmail,
        postedByName: userName,
        status: 'Pending', // Default status for approval workflow
        reviewedBy: null,
        reviewedAt: null,
        reviewReason: null
      });

      // Create notifications based on audience
      if (form.audience === "All" || form.audience === "Student" || form.audience === "Teacher") {
        try {
          let targetRole = "Student";
          if (form.audience === "Teacher") {
            targetRole = "Teacher";
          } else if (form.audience === "All") {
            // For "All", we'll send to both students and teachers
            await sendNotificationsToRole("Student", announcementRef.id, form, currentUser.uid, userEmail, userName);
            await sendNotificationsToRole("Teacher", announcementRef.id, form, currentUser.uid, userEmail, userName);
          } else {
            await sendNotificationsToRole(targetRole, announcementRef.id, form, currentUser.uid, userEmail, userName);
          }
        } catch (notificationError) {
          console.error('❌ Error sending announcement notifications:', notificationError);
          // Don't fail the entire operation if notifications fail
        }
      }

      await logActivity({ message: `Announcement posted: ${form.title}`, type: 'add_announcement' });
      setSnackbar({ open: true, message: "Announcement submitted for approval!", severity: "success" });
      setForm({ title: "", message: "", date: "", audience: "All", scheduleDate: "", expiryDate: "", photo: null });
      setPhotoPreview(null);
      setFormModalOpen(false);
      fetchAnnouncements();
    } catch (e) {
      setSnackbar({ open: true, message: "Error posting announcement", severity: "error" });
    }
    setIsSubmitting(false);
  };

  const handlePrint = (announcement) => {
    const printWindow = window.open('', '', 'width=600,height=600');
    printWindow.document.write(`
      <html><head><title>Print Announcement</title></head><body>
      <h2>${announcement.title}</h2>
      <p><strong>Category:</strong> ${announcement.category}</p>
      <p><strong>Audience:</strong> ${announcement.audience}</p>
      <p><strong>Priority:</strong> ${announcement.priority}</p>
      <p><strong>Date:</strong> ${announcement.date ? new Date(announcement.date).toLocaleDateString() : ''}</p>
      <p>${announcement.message}</p>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const handleDelete = async (announcement) => {
    setIsSubmitting(true);
    try {
      // Move to recycle bin
      await addDoc(collection(db, "recycle_bin_announcements"), {
        ...announcement,
        deletedAt: new Date().toISOString(),
      });
      // Delete from announcements
      await deleteDoc(doc(db, "announcements", announcement.id));
      setSnackbar({ open: true, message: "Announcement moved to recycle bin.", severity: "success" });
      fetchAnnouncements();
    } catch (e) {
      setSnackbar({ open: true, message: "Error deleting announcement", severity: "error" });
    }
    setIsSubmitting(false);
  };

  const handleRestore = async (item) => {
    setIsSubmitting(true);
    try {
      // Add back to announcements
      const { id, deletedAt, ...rest } = item;
      await addDoc(collection(db, "announcements"), {
        ...rest,
        restoredAt: new Date().toISOString(),
      });
      // Remove from recycle bin
      await deleteDoc(doc(db, "recycle_bin_announcements", id));
      setSnackbar({ open: true, message: "Announcement restored.", severity: "success" });
      fetchAnnouncements();
      fetchRecycleBin();
    } catch (e) {
      setSnackbar({ open: true, message: "Error restoring announcement", severity: "error" });
    }
    setIsSubmitting(false);
  };

  const handlePermanentDelete = async (item) => {
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, "recycle_bin_announcements", item.id));
      setSnackbar({ open: true, message: "Announcement permanently deleted.", severity: "success" });
      fetchRecycleBin();
    } catch (e) {
      setSnackbar({ open: true, message: "Error deleting announcement", severity: "error" });
    }
    setIsSubmitting(false);
  };

  const handlePin = async (a, pin) => {
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, "announcements", a.id), { pinned: pin, pinnedAt: pin ? new Date().toISOString() : null });
      setSnackbar({ open: true, message: pin ? "Announcement pinned!" : "Unpinned.", severity: "success" });
      fetchAnnouncements();
    } catch (e) {
      setSnackbar({ open: true, message: "Error updating pin.", severity: "error" });
    }
    setIsSubmitting(false);
  };

  const handleEditSave = async (updated) => {
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, "announcements", updated.id), updated);
      setSnackbar({ open: true, message: "Announcement updated!", severity: "success" });
      setEditAnnouncement(null);
      fetchAnnouncements();
    } catch (e) {
      setSnackbar({ open: true, message: "Error updating announcement.", severity: "error" });
    }
    setIsSubmitting(false);
  };

  const handleMarkCompleted = async (a) => {
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, "announcements", a.id), { completed: true, completedAt: new Date().toISOString() });
      setSnackbar({ open: true, message: "Announcement marked as completed!", severity: "success" });
      fetchAnnouncements();
    } catch (e) {
      setSnackbar({ open: true, message: "Error marking as completed.", severity: "error" });
    }
    setIsSubmitting(false);
  };

  // Utility functions for each tab
  function getActiveAnnouncements(announcements, search) {
    const now = new Date();
    const allActive = announcements.filter(a =>
      !a.completed &&
      (!a.scheduleDate || new Date(a.scheduleDate) <= now) &&
      (!a.expiryDate || new Date(a.expiryDate) > now)
    );
    const sortedActive = [...allActive].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date);
    });
    const recent = sortedActive.slice(0, 3);
    const mainList = sortedActive.slice(3);
    const filteredMain = search
      ? mainList.filter(a =>
          (a.title?.toLowerCase().includes(search.toLowerCase()) ||
           a.message?.toLowerCase().includes(search.toLowerCase()))
        )
      : mainList;
    return { recent, mainList: filteredMain };
  }
  function getRecycleBinAnnouncements(recycleBin, search) {
    const sorted = [...recycleBin].sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));
    return search
      ? sorted.filter(a =>
          (a.title?.toLowerCase().includes(search.toLowerCase()) ||
           a.message?.toLowerCase().includes(search.toLowerCase()))
        )
      : sorted;
  }
  function getCompletedAnnouncements(announcements, search) {
    const completed = announcements.filter(a => a.completed);
    const sorted = [...completed].sort((a, b) => new Date(b.completedAt || b.date) - new Date(a.completedAt || a.date));
    return search
      ? sorted.filter(a =>
          (a.title?.toLowerCase().includes(search.toLowerCase()) ||
           a.message?.toLowerCase().includes(search.toLowerCase()))
        )
      : sorted;
  }
  function getScheduledAnnouncements(announcements, search) {
    const now = new Date();
    const scheduled = announcements.filter(a =>
      !a.completed && a.scheduleDate && new Date(a.scheduleDate) > now
    );
    const sorted = [...scheduled].sort((a, b) => new Date(a.scheduleDate) - new Date(b.scheduleDate));
    return search
      ? sorted.filter(a =>
          (a.title?.toLowerCase().includes(search.toLowerCase()) ||
           a.message?.toLowerCase().includes(search.toLowerCase()))
        )
      : sorted;
  }
  function getExpiredAnnouncements(announcements, search) {
    const now = new Date();
    const expired = announcements.filter(a =>
      !a.completed && a.expiryDate && new Date(a.expiryDate) <= now
    );
    const sorted = [...expired].sort((a, b) => new Date(b.expiryDate) - new Date(a.expiryDate));
    return search
      ? sorted.filter(a =>
          (a.title?.toLowerCase().includes(search.toLowerCase()) ||
           a.message?.toLowerCase().includes(search.toLowerCase()))
        )
      : sorted;
  }

  // Use utility functions for each tab
  const { recent, mainList } = getActiveAnnouncements(announcements, tab === 0 ? search : "");
  const filteredRecycleBin = getRecycleBinAnnouncements(recycleBin, tab === 1 ? search : "");
  const filteredCompleted = getCompletedAnnouncements(announcements, tab === 2 ? search : "");
  const scheduledList = getScheduledAnnouncements(announcements, tab === 3 ? search : "");
  const expiredList = getExpiredAnnouncements(announcements, tab === 4 ? search : "");

  const total = announcements.length;
  const pinnedCount = announcements.filter(a => a.pinned).length;
  const urgentCount = announcements.filter(a => a.priority === 'Urgent').length;

  useEffect(() => {
    if (!bulkAction || selected.length === 0) return;
    const doBulk = async () => {
      setIsSubmitting(true);
      try {
        if (bulkAction === 'delete') {
          for (const id of selected) {
            const a = announcements.find(x => x.id === id);
            await addDoc(collection(db, "recycle_bin_announcements"), { ...a, deletedAt: new Date().toISOString() });
            await deleteDoc(doc(db, "announcements", id));
          }
          setSnackbar({ open: true, message: "Deleted selected announcements.", severity: "success" });
        } else if (bulkAction === 'complete') {
          for (const id of selected) {
            await updateDoc(doc(db, "announcements", id), { completed: true, completedAt: new Date().toISOString() });
          }
          setSnackbar({ open: true, message: "Marked as completed.", severity: "success" });
        } else if (bulkAction === 'pin') {
          for (const id of selected) {
            await updateDoc(doc(db, "announcements", id), { pinned: true, pinnedAt: new Date().toISOString() });
          }
          setSnackbar({ open: true, message: "Pinned selected.", severity: "success" });
        } else if (bulkAction === 'unpin') {
          for (const id of selected) {
            await updateDoc(doc(db, "announcements", id), { pinned: false, pinnedAt: null });
          }
          setSnackbar({ open: true, message: "Unpinned selected.", severity: "success" });
        }
        setSelected([]);
        setBulkAction(null);
        fetchAnnouncements();
        fetchRecycleBin();
      } catch (e) {
        setSnackbar({ open: true, message: "Bulk action failed.", severity: "error" });
      }
      setIsSubmitting(false);
    };
    doBulk();
  }, [bulkAction]);

  return (
    <Box sx={{ pt: { xs: 2, sm: 3 }, pl: { xs: 2, sm: 3, md: 4 }, pr: { xs: 2, sm: 3, md: 4 } }}>
      <Typography variant="h4" gutterBottom sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000', mb: 2, mt: 1 }}>
        Announcements
      </Typography>
      
      <Box sx={{ maxWidth: 900, mx: 'auto', p: { xs: 1, sm: 3 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        {userRole === 'Admin' && (
          <Button 
            variant="outlined" 
            onClick={() => setFormModalOpen(true)}
            sx={{
              color: '#000000',
              backgroundColor: '#ffffff',
              borderColor: '#000000',
              borderWidth: '1px',
              fontWeight: 400,
              fontSize: '0.875rem',
              textTransform: 'none',
              fontFamily: 'inherit',
              '&:hover': {
                backgroundColor: '#800000',
                color: '#ffffff',
                borderColor: '#800000',
                borderWidth: '1px'
              }
            }}
          >
            + Create Announcement
          </Button>
        )}
      </Stack>
      <Tabs 
        value={tab} 
        onChange={(_, v) => { setTab(v); setSelected([]); }} 
        sx={{ 
          mb: 2,
          '& .MuiTab-root': {
            color: '#ffffff !important',
            fontWeight: 400,
            '&.Mui-selected': {
              color: '#ffffff !important',
              fontWeight: 700
            },
            '&:hover': {
              color: '#ffffff !important'
            }
          },
          '& .MuiTab-root.Mui-selected': {
            color: '#ffffff !important',
            fontWeight: 700
          },
          '& .MuiTab-root:not(.Mui-selected)': {
            color: '#ffffff !important',
            fontWeight: 400
          },
          '& .MuiTab-root *': {
            color: '#ffffff !important'
          },
          '& .MuiTab-root.Mui-selected *': {
            color: '#ffffff !important',
            fontWeight: 700
          },
          '& .MuiTabs-indicator': {
            display: 'none'
          }
        }}
      >
        <Tab 
          label="Active" 
          sx={{ 
            color: '#ffffff !important',
            fontWeight: tab === 0 ? 700 : 400,
            '&.Mui-selected': {
              color: '#ffffff !important',
              fontWeight: 700
            }
          }}
        />
        {userRole === 'Admin' && (
          <>
            <Tab 
              label="Recycle Bin" 
              sx={{ 
                color: '#ffffff !important',
                fontWeight: tab === 1 ? 700 : 400,
                '&.Mui-selected': {
                  color: '#ffffff !important',
                  fontWeight: 700
                }
              }}
              onClick={() => {
                setTab(1);
                setSelected([]);
              }}
            />
            <Tab 
              label="Completed" 
              sx={{ 
                color: '#ffffff !important',
                fontWeight: tab === 2 ? 700 : 400,
                '&.Mui-selected': {
                  color: '#ffffff !important',
                  fontWeight: 700
                }
              }}
              onClick={() => {
                setTab(2);
                setSelected([]);
              }}
            />
            <Tab 
              label="Scheduled" 
              sx={{ 
                color: '#ffffff !important',
                fontWeight: tab === 3 ? 700 : 400,
                '&.Mui-selected': {
                  color: '#ffffff !important',
                  fontWeight: 700
                }
              }}
              onClick={() => {
                setTab(3);
                setSelected([]);
              }}
            />
            <Tab 
              label="Expired" 
              sx={{ 
                color: '#ffffff !important',
                fontWeight: tab === 4 ? 700 : 400,
                '&.Mui-selected': {
                  color: '#ffffff !important',
                  fontWeight: 700
                }
              }}
              onClick={() => {
                setTab(4);
                setSelected([]);
              }}
            />
          </>
        )}
      </Tabs>
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, maxWidth: 500 }}>
        <TextField
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search announcements..."
          size="small"
          fullWidth
          autoFocus
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: search && (
              <IconButton size="small" onClick={() => setSearch("")}>×</IconButton>
            )
          }}
        />
      </Box>
      {/* Recent Announcements Section (only in Active tab) */}
      {tab === 0 && recent.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>Recent Announcements</Typography>
          <Stack spacing={2}>
            {recent.map(a => (
              <Card key={a.id} sx={{ borderLeft: a.priority === 'Urgent' ? '5px solid #d32f2f' : a.pinned ? '5px solid #0288d1' : '5px solid #eee', boxShadow: 2 }}>
                <CardHeader
                  title={<Stack direction="row" alignItems="center" spacing={1}>
                    <Typography fontWeight={700}>{a.title}</Typography>
                    {a.pinned && <Chip label="Pinned" color="info" size="small" icon={<PushPinIcon fontSize="small" />} />}
                    <Chip label={a.audience} color="secondary" size="small" />
                    {a.completed && <Chip label="Completed" color="success" size="small" />}
                  </Stack>}
                  subheader={a.date ? new Date(a.date).toLocaleDateString() : ''}
                  action={
                    <Stack direction="row" spacing={1}>
                        {userRole === 'Admin' && (
                          <>
                            <Tooltip title={a.pinned ? "Unpin" : "Pin"}><IconButton onClick={() => handlePin(a, !a.pinned)} disabled={isSubmitting}>{a.pinned ? <PushPinIcon /> : <PushPinOutlinedIcon />}</IconButton></Tooltip>
                            <Tooltip title="Edit"><IconButton 
                              onClick={() => setEditAnnouncement(a)}
                              sx={{
                                '&:hover': {
                                  color: '#f57c00',
                                  bgcolor: 'rgba(245, 124, 0, 0.04)'
                                }
                              }}
                            ><EditIcon /></IconButton></Tooltip>
                            <Tooltip title="Delete"><IconButton 
                              onClick={() => handleDelete(a)} 
                              disabled={isSubmitting}
                              sx={{
                                '&:hover': {
                                  color: '#f44336',
                                  bgcolor: 'rgba(244, 67, 54, 0.04)'
                                }
                              }}
                            ><DeleteIcon /></IconButton></Tooltip>
                            {!a.completed && <Tooltip title="Mark as Completed"><IconButton onClick={() => handleMarkCompleted(a)} disabled={isSubmitting}><Chip label="Complete" color="success" size="small" /></IconButton></Tooltip>}
                          </>
                        )}
                        <Tooltip title="View"><IconButton 
                          onClick={() => setViewAnnouncement(a)}
                          sx={{
                            '&:hover': {
                              color: '#1976d2',
                              bgcolor: 'rgba(25, 118, 210, 0.04)'
                            }
                          }}
                        ><VisibilityIcon /></IconButton></Tooltip>
                      <Tooltip title="Print"><IconButton 
                        onClick={() => handlePrint(a)}
                        sx={{
                          '&:hover': {
                            color: '#666666',
                            bgcolor: 'rgba(102, 102, 102, 0.04)'
                          }
                        }}
                      ><PrintIcon /></IconButton></Tooltip>
                    </Stack>
                  }
                />
                <CardContent>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{a.message}</Typography>
                  {a.photoUrl && (
                    <Box sx={{ mt: 2 }}>
                      <img
                        src={a.photoUrl}
                        alt="Announcement"
                        style={{
                          maxWidth: '100%',
                          maxHeight: '400px',
                          objectFit: 'cover',
                          borderRadius: '8px',
                          border: '1px solid #e0e0e0'
                        }}
                      />
                    </Box>
                  )}
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Box>
      )}
      {/* Main List for current tab */}
      {tab === 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>All Active Announcements</Typography>
          {selected.length > 0 && userRole === 'Admin' && (
            <Paper sx={{ mb: 2, p: 1, bgcolor: '#f5f5f5', display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography>{selected.length} selected</Typography>
              <Button size="small" color="error" onClick={() => setBulkAction('delete')}>Delete</Button>
              <Button size="small" color="success" onClick={() => setBulkAction('complete')}>Mark as Completed</Button>
              <Button size="small" color="info" onClick={() => setBulkAction('pin')}>Pin</Button>
              <Button size="small" color="warning" onClick={() => setBulkAction('unpin')}>Unpin</Button>
            </Paper>
          )}
          {mainList.length === 0 ? (
            <Typography align="center" color="text.secondary">No announcements yet.</Typography>
          ) : (
            <React.Fragment>
              {mainList.map(a => (
                <Card key={a.id} sx={{ mb: 2, borderLeft: a.priority === 'Urgent' ? '5px solid #d32f2f' : a.pinned ? '5px solid #0288d1' : '5px solid #eee', boxShadow: 2, position: 'relative' }}>
                  {userRole === 'Admin' && (
                    <Box sx={{ position: 'absolute', left: 8, top: 8 }}>
                      <input type="checkbox" checked={selected.includes(a.id)} onChange={e => setSelected(sel => e.target.checked ? [...sel, a.id] : sel.filter(id => id !== a.id))} />
                    </Box>
                  )}
                  <CardHeader
                    title={<Stack direction="row" alignItems="center" spacing={1}>
                      <Typography fontWeight={700}>{a.title}</Typography>
                      {a.pinned && <Chip label="Pinned" color="info" size="small" icon={<PushPinIcon fontSize="small" />} />}
                      <Chip label={a.audience} color="secondary" size="small" />
                      {a.completed && <Chip label="Completed" color="success" size="small" />}
                    </Stack>}
                    subheader={a.date ? new Date(a.date).toLocaleDateString() : ''}
                    action={
                      <Stack direction="row" spacing={1}>
                        {userRole === 'Admin' && (
                          <>
                            <Tooltip title={a.pinned ? "Unpin" : "Pin"}><IconButton onClick={() => handlePin(a, !a.pinned)} disabled={isSubmitting}>{a.pinned ? <PushPinIcon /> : <PushPinOutlinedIcon />}</IconButton></Tooltip>
                            <Tooltip title="Edit"><IconButton onClick={() => setEditAnnouncement(a)}><EditIcon /></IconButton></Tooltip>
                            <Tooltip title="Delete"><IconButton onClick={() => handleDelete(a)} disabled={isSubmitting}><DeleteIcon /></IconButton></Tooltip>
                            {!a.completed && <Tooltip title="Mark as Completed"><IconButton onClick={() => handleMarkCompleted(a)} disabled={isSubmitting}><Chip label="Complete" color="success" size="small" /></IconButton></Tooltip>}
                          </>
                        )}
                        <Tooltip title="View"><IconButton onClick={() => setViewAnnouncement(a)}><VisibilityIcon /></IconButton></Tooltip>
                        <Tooltip title="Print"><IconButton onClick={() => handlePrint(a)}><PrintIcon /></IconButton></Tooltip>
                      </Stack>
                    }
                  />
                  <CardContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{a.message}</Typography>
                    {a.photoUrl && (
                      <Box sx={{ mt: 2 }}>
                        <img
                          src={a.photoUrl}
                          alt="Announcement"
                          style={{
                            maxWidth: '100%',
                            maxHeight: '300px',
                            objectFit: 'cover',
                            borderRadius: '8px',
                            border: '1px solid #e0e0e0'
                          }}
                        />
                      </Box>
                    )}
                  </CardContent>
                </Card>
              ))}
            </React.Fragment>
          )}
        </Box>
      )}

      
      {tab === 2 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>Completed Announcements</Typography>
          {filteredCompleted.length === 0 ? (
            <Typography align="center" color="text.secondary">No completed announcements.</Typography>
          ) : filteredCompleted.map(a => (
            <Card key={a.id} sx={{ mb: 2, borderLeft: '5px solid #43a047', boxShadow: 2 }}>
              <CardHeader
                title={<Stack direction="row" alignItems="center" spacing={1}>
                  <Typography fontWeight={700}>{a.title}</Typography>
                  <Chip label="Completed" color="success" size="small" />
                  <Chip label={a.audience} color="secondary" size="small" />
                </Stack>}
                subheader={a.completedAt ? new Date(a.completedAt).toLocaleDateString() : a.date ? new Date(a.date).toLocaleDateString() : ''}
                action={
                  <Stack direction="row" spacing={1}>
                    <Tooltip title="View"><IconButton 
                      onClick={() => setViewAnnouncement(a)}
                      sx={{
                        '&:hover': {
                          color: '#1976d2',
                          bgcolor: 'rgba(25, 118, 210, 0.04)'
                        }
                      }}
                    ><VisibilityIcon /></IconButton></Tooltip>
                    <Tooltip title="Print"><IconButton 
                      onClick={() => handlePrint(a)}
                      sx={{
                        '&:hover': {
                          color: '#666666',
                          bgcolor: 'rgba(102, 102, 102, 0.04)'
                        }
                      }}
                    ><PrintIcon /></IconButton></Tooltip>
                  </Stack>
                }
              />
              <CardContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{a.message}</Typography>
                {a.photoUrl && (
                  <Box sx={{ mt: 2 }}>
                    <img
                      src={a.photoUrl}
                      alt="Announcement"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '300px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        border: '1px solid #e0e0e0'
                      }}
                    />
                  </Box>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
      {tab === 3 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>Scheduled Announcements</Typography>
          {scheduledList.length === 0 ? (
            <Typography align="center" color="text.secondary">No scheduled announcements.</Typography>
          ) : scheduledList.map(a => (
            <Card key={a.id} sx={{ mb: 2, borderLeft: '5px solid #0288d1', boxShadow: 2 }}>
              <CardHeader
                title={<Typography fontWeight={700}>{a.title}</Typography>}
                subheader={a.date ? new Date(a.date).toLocaleDateString() : ''}
                action={
                  <Stack direction="row" spacing={1}>
                    <Tooltip title="View"><IconButton onClick={() => setViewAnnouncement(a)}><VisibilityIcon /></IconButton></Tooltip>
                    <Tooltip title="Print"><IconButton onClick={() => handlePrint(a)}><PrintIcon /></IconButton></Tooltip>
                  </Stack>
                }
              />
              <CardContent>
                <Typography variant="body2" color="text.secondary">{a.message}</Typography>
                {a.photoUrl && (
                  <Box sx={{ mt: 2 }}>
                    <img
                      src={a.photoUrl}
                      alt="Announcement"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '300px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        border: '1px solid #e0e0e0'
                      }}
                    />
                  </Box>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
      {tab === 4 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>Expired Announcements</Typography>
          {expiredList.length === 0 ? (
            <Typography align="center" color="text.secondary">No expired announcements.</Typography>
          ) : expiredList.map(a => (
            <Card key={a.id} sx={{ mb: 2, borderLeft: '5px solid #d32f2f', boxShadow: 2 }}>
              <CardHeader
                title={<Typography fontWeight={700}>{a.title}</Typography>}
                subheader={a.date ? new Date(a.date).toLocaleDateString() : ''}
                action={
                  <Stack direction="row" spacing={1}>
                    <Tooltip title="View"><IconButton onClick={() => setViewAnnouncement(a)}><VisibilityIcon /></IconButton></Tooltip>
                    <Tooltip title="Print"><IconButton onClick={() => handlePrint(a)}><PrintIcon /></IconButton></Tooltip>
                  </Stack>
                }
              />
              <CardContent>
                <Typography variant="body2" color="text.secondary">{a.message}</Typography>
                {a.photoUrl && (
                  <Box sx={{ mt: 2 }}>
                    <img
                      src={a.photoUrl}
                      alt="Announcement"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '300px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        border: '1px solid #e0e0e0'
                      }}
                    />
                  </Box>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
      {tab === 1 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>Recycle Bin</Typography>
          {filteredRecycleBin.length === 0 ? (
            <Typography align="center" color="text.secondary">Recycle bin is empty.</Typography>
          ) : filteredRecycleBin.map(a => (
            <Card key={a.id} sx={{ mb: 2, borderLeft: '5px solid #bdbdbd', boxShadow: 1 }}>
              <CardHeader
                title={<Typography fontWeight={700}>{a.title}</Typography>}
                subheader={a.date ? new Date(a.date).toLocaleDateString() : ''}
                action={
                  <Stack direction="row" spacing={1}>
                    <Tooltip title="Restore"><IconButton 
                      onClick={() => handleRestore(a)} 
                      disabled={isSubmitting}
                      sx={{
                        '&:hover': {
                          color: '#f57c00',
                          bgcolor: 'rgba(245, 124, 0, 0.04)'
                        }
                      }}
                    ><EditIcon /></IconButton></Tooltip>
                    <Tooltip title="Delete Permanently"><IconButton 
                      onClick={() => handlePermanentDelete(a)} 
                      disabled={isSubmitting}
                      sx={{
                        '&:hover': {
                          color: '#f44336',
                          bgcolor: 'rgba(244, 67, 54, 0.04)'
                        }
                      }}
                    ><DeleteIcon /></IconButton></Tooltip>
                  </Stack>
                }
              />
              <CardContent>
                <Typography variant="body2" color="text.secondary">{a.message}</Typography>
                {a.photoUrl && (
                  <Box sx={{ mt: 2 }}>
                    <img
                      src={a.photoUrl}
                      alt="Announcement"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '300px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        border: '1px solid #e0e0e0'
                      }}
                    />
                  </Box>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
      {/* Create Announcement Modal */}
      <Dialog open={formModalOpen} onClose={() => setFormModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Announcement</DialogTitle>
        <DialogContent dividers>
          <form onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <TextField label="Title" name="title" value={form.title} onChange={handleChange} required fullWidth />
              <TextField label="Message" name="message" value={form.message} onChange={handleChange} required fullWidth multiline minRows={1} />
              <TextField label="Target Audience" name="audience" value={form.audience} onChange={handleChange} select fullWidth>
                {audiences.map((aud) => <MenuItem key={aud} value={aud}>{aud}</MenuItem>)}
              </TextField>
              <TextField label="Date" name="date" type="date" value={form.date} onChange={handleChange} InputLabelProps={{ shrink: true }} fullWidth />
              <TextField label="Schedule Date" name="scheduleDate" type="datetime-local" value={form.scheduleDate} onChange={handleChange} InputLabelProps={{ shrink: true }} fullWidth />
              <TextField label="Expiry Date" name="expiryDate" type="datetime-local" value={form.expiryDate} onChange={handleChange} InputLabelProps={{ shrink: true }} fullWidth />
              
              {/* Photo Upload Section - Moved to bottom */}
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                  Attach Photo (Optional)
                </Typography>
                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="photo-upload"
                  type="file"
                  onChange={handlePhotoChange}
                />
                <label htmlFor="photo-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<CloudUpload />}
                    sx={{
                      borderColor: '#800000',
                      color: '#800000',
                      '&:hover': {
                        borderColor: '#800000',
                        backgroundColor: 'rgba(128, 0, 0, 0.04)'
                      }
                    }}
                  >
                    Choose Photo
                  </Button>
                </label>
                
                {photoPreview && (
                  <Box sx={{ mt: 2, position: 'relative', display: 'inline-block' }}>
                    <img
                      src={photoPreview}
                      alt="Preview"
                      style={{
                        maxWidth: '300px',
                        maxHeight: '300px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        border: '2px solid #800000'
                      }}
                    />
                    <IconButton
                      onClick={removePhoto}
                      sx={{
                        position: 'absolute',
                        top: -10,
                        right: -10,
                        backgroundColor: 'error.main',
                        color: 'white',
                        '&:hover': {
                          backgroundColor: 'error.dark'
                        }
                      }}
                      size="small"
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                )}
              </Box>
              <DialogActions>
                <Button 
                  onClick={() => setFormModalOpen(false)} 
                  color="secondary"
                  sx={{
                    '&:hover': {
                      bgcolor: '#800000',
                      color: 'white',
                      borderColor: '#800000'
                    }
                  }}
                >Cancel</Button>
                <Button 
                  type="submit" 
                  variant="outlined" 
                  color="primary" 
                  disabled={isSubmitting}
                  sx={{
                    color: 'black',
                    borderColor: 'black',
                    '&:hover': {
                      bgcolor: '#800000',
                      color: 'white',
                      borderColor: '#800000'
                    },
                    '&:disabled': {
                      bgcolor: '#ccc',
                      color: '#666',
                      borderColor: '#ccc'
                    }
                  }}
                >
                  {isSubmitting ? "Posting..." : "Post Announcement"}
                </Button>
              </DialogActions>
            </Stack>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={!!viewAnnouncement} onClose={() => setViewAnnouncement(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Announcement Details</DialogTitle>
        <DialogContent dividers>
          {viewAnnouncement && (
            <Box>
              <Typography variant="h6" fontWeight={700}>{viewAnnouncement.title}</Typography>
              <Divider sx={{ my: 1 }} />
              <Typography><b>Audience:</b> {viewAnnouncement.audience}</Typography>
              <Typography><b>Date:</b> {viewAnnouncement.date ? new Date(viewAnnouncement.date).toLocaleDateString() : ''}</Typography>
              <Typography sx={{ mt: 2 }}>{viewAnnouncement.message}</Typography>
              {viewAnnouncement.photoUrl && (
                <Box sx={{ mt: 2 }}>
                  <img
                    src={viewAnnouncement.photoUrl}
                    alt="Announcement"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '500px',
                      objectFit: 'cover',
                      borderRadius: '8px',
                      border: '1px solid #e0e0e0'
                    }}
                  />
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewAnnouncement(null)} color="primary">Close</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={!!editAnnouncement} onClose={() => setEditAnnouncement(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Announcement</DialogTitle>
        <DialogContent dividers>
          {editAnnouncement && (
            <Box component="form" onSubmit={e => { e.preventDefault(); handleEditSave(editAnnouncement); }}>
              <TextField label="Title" value={editAnnouncement.title} onChange={e => setEditAnnouncement({ ...editAnnouncement, title: e.target.value })} fullWidth sx={{ mb: 1 }} />
              <TextField label="Message" value={editAnnouncement.message} onChange={e => setEditAnnouncement({ ...editAnnouncement, message: e.target.value })} fullWidth multiline minRows={1} sx={{ mb: 1 }} />
              <TextField label="Audience" value={editAnnouncement.audience} onChange={e => setEditAnnouncement({ ...editAnnouncement, audience: e.target.value })} select fullWidth sx={{ mb: 1 }}>
                {audiences.map((aud) => <MenuItem key={aud} value={aud}>{aud}</MenuItem>)}
              </TextField>
              <TextField label="Date" type="date" value={editAnnouncement.date} onChange={e => setEditAnnouncement({ ...editAnnouncement, date: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth sx={{ mb: 1 }} />
              <DialogActions>
                <Button onClick={() => setEditAnnouncement(null)} color="secondary">Cancel</Button>
                <Button type="submit" variant="contained" color="primary">Save</Button>
              </DialogActions>
            </Box>
          )}
        </DialogContent>
      </Dialog>
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
      </Box>
    </Box>
  );
} 