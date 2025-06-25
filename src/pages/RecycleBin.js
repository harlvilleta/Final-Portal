import React, { useEffect, useState } from "react";
import { Box, Typography, Paper, List, ListItem, ListItemText, Divider, IconButton, Snackbar, Alert, Tabs, Tab } from "@mui/material";
import RestoreIcon from '@mui/icons-material/Restore';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import { db } from "../firebase";
import { collection, getDocs, addDoc, deleteDoc, doc, orderBy, query } from "firebase/firestore";

export default function RecycleBin() {
  const [tab, setTab] = useState(0);
  const [announcements, setAnnouncements] = useState([]);
  const [activities, setActivities] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
    fetchActivities();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const q = query(collection(db, "recycle_bin_announcements"), orderBy("deletedAt", "desc"));
      const snap = await getDocs(q);
      setAnnouncements(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch {
      setAnnouncements([]);
    }
  };

  const fetchActivities = async () => {
    try {
      const q = query(collection(db, "recycle_bin_activities"), orderBy("deletedAt", "desc"));
      const snap = await getDocs(q);
      setActivities(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch {
      setActivities([]);
    }
  };

  const handleRestoreAnnouncement = async (item) => {
    setIsSubmitting(true);
    try {
      const { id, deletedAt, ...rest } = item;
      await addDoc(collection(db, "announcements"), { ...rest, restoredAt: new Date().toISOString() });
      await deleteDoc(doc(db, "recycle_bin_announcements", id));
      setSnackbar({ open: true, message: "Announcement restored.", severity: "success" });
      fetchAnnouncements();
    } catch {
      setSnackbar({ open: true, message: "Error restoring announcement", severity: "error" });
    }
    setIsSubmitting(false);
  };

  const handlePermanentDeleteAnnouncement = async (item) => {
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, "recycle_bin_announcements", item.id));
      setSnackbar({ open: true, message: "Announcement permanently deleted.", severity: "success" });
      fetchAnnouncements();
    } catch {
      setSnackbar({ open: true, message: "Error deleting announcement", severity: "error" });
    }
    setIsSubmitting(false);
  };

  const handleRestoreActivity = async (item) => {
    setIsSubmitting(true);
    try {
      const { id, deletedAt, ...rest } = item;
      await addDoc(collection(db, "activities"), { ...rest, restoredAt: new Date().toISOString() });
      await deleteDoc(doc(db, "recycle_bin_activities", id));
      setSnackbar({ open: true, message: "Activity restored.", severity: "success" });
      fetchActivities();
    } catch {
      setSnackbar({ open: true, message: "Error restoring activity", severity: "error" });
    }
    setIsSubmitting(false);
  };

  const handlePermanentDeleteActivity = async (item) => {
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, "recycle_bin_activities", item.id));
      setSnackbar({ open: true, message: "Activity permanently deleted.", severity: "success" });
      fetchActivities();
    } catch {
      setSnackbar({ open: true, message: "Error deleting activity", severity: "error" });
    }
    setIsSubmitting(false);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Recycle Bin</Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Announcements" />
        <Tab label="Activities" />
      </Tabs>
      {tab === 0 && (
        <Paper sx={{ maxWidth: 700, mx: "auto", p: 2, mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Deleted Announcements</Typography>
          <List>
            {announcements.length === 0 ? (
              <ListItem><ListItemText primary="Recycle bin is empty." /></ListItem>
            ) : announcements.map(a => (
              <React.Fragment key={a.id}>
                <ListItem alignItems="flex-start"
                  secondaryAction={
                    <>
                      <IconButton edge="end" aria-label="restore" onClick={() => handleRestoreAnnouncement(a)} disabled={isSubmitting}>
                        <RestoreIcon color="primary" />
                      </IconButton>
                      <IconButton edge="end" aria-label="permanently delete" onClick={() => handlePermanentDeleteAnnouncement(a)} disabled={isSubmitting} sx={{ ml: 1 }}>
                        <DeleteForeverIcon color="error" />
                      </IconButton>
                    </>
                  }
                >
                  <ListItemText
                    primary={<Typography fontWeight={700}>{a.title}</Typography>}
                    secondary={<>
                      <Typography variant="body2" color="text.secondary">{a.message}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {a.category} | {a.audience || "All"} | {a.priority || "Normal"} | {a.date ? new Date(a.date).toLocaleDateString() : ''}
                      </Typography>
                    </>}
                  />
                </ListItem>
                <Divider component="li" />
              </React.Fragment>
            ))}
          </List>
        </Paper>
      )}
      {tab === 1 && (
        <Paper sx={{ maxWidth: 700, mx: "auto", p: 2, mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Deleted Activities</Typography>
          <List>
            {activities.length === 0 ? (
              <ListItem><ListItemText primary="Recycle bin is empty." /></ListItem>
            ) : activities.map(a => (
              <React.Fragment key={a.id}>
                <ListItem alignItems="flex-start"
                  secondaryAction={
                    <>
                      <IconButton edge="end" aria-label="restore" onClick={() => handleRestoreActivity(a)} disabled={isSubmitting}>
                        <RestoreIcon color="primary" />
                      </IconButton>
                      <IconButton edge="end" aria-label="permanently delete" onClick={() => handlePermanentDeleteActivity(a)} disabled={isSubmitting} sx={{ ml: 1 }}>
                        <DeleteForeverIcon color="error" />
                      </IconButton>
                    </>
                  }
                >
                  <ListItemText
                    primary={<Typography fontWeight={700}>{a.title}</Typography>}
                    secondary={<>
                      <Typography variant="body2" color="text.secondary">{a.description}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {a.category} | {a.organizer || ""} | {a.date ? new Date(a.date).toLocaleDateString() : ''}
                      </Typography>
                    </>}
                  />
                </ListItem>
                <Divider component="li" />
              </React.Fragment>
            ))}
          </List>
        </Paper>
      )}
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
} 