import React, { useEffect, useState } from "react";
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, CircularProgress, Snackbar, Alert } from "@mui/material";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";

export default function AnnouncementReport() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    const fetchAnnouncements = async () => {
      setLoading(true);
      try {
        const qSnap = await getDocs(query(collection(db, "announcements"), orderBy("date", "desc")));
        setAnnouncements(qSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (e) {
        setAnnouncements([]);
        setSnackbar({ open: true, message: 'Failed to fetch announcements.', severity: 'error' });
      }
      setLoading(false);
    };
    fetchAnnouncements();
  }, []);

  const handleExport = () => {
    // Mock export functionality
    setSnackbar({ open: true, message: 'Report exported (mock functionality)', severity: 'success' });
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={700} color="primary.main">
        Announcement Report
      </Typography>
      <Paper sx={{ p: 2, mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="contained" color="primary" onClick={handleExport}>
          Export Report
        </Button>
      </Paper>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh' }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Content</TableCell>
                <TableCell>Posted By</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {announcements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">No announcements found.</TableCell>
                </TableRow>
              ) : announcements.map((a, idx) => (
                <TableRow key={a.id || idx}>
                  <TableCell>{a.date}</TableCell>
                  <TableCell>{a.title}</TableCell>
                  <TableCell>{a.content}</TableCell>
                  <TableCell>{a.postedBy || 'N/A'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
} 