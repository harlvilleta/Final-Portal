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
  Card,
  CardContent,
  Chip,
  IconButton,
  Tooltip,
  useTheme
} from '@mui/material';
import {
  Search,
  CheckCircle,
  Cancel,
  Edit,
  Visibility,
  Person,
  LocationOn,
  AccessTime,
  Done
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

export default function StudentsLostFound() {
  const theme = useTheme();
  const [pendingLostReports, setPendingLostReports] = useState([]);
  const [pendingFoundReports, setPendingFoundReports] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [imagePreview, setImagePreview] = useState({ open: false, image: null, title: '' });
  const [editReportDialog, setEditReportDialog] = useState({ open: false, report: null, type: '' });
  const [editReportForm, setEditReportForm] = useState({ description: '' });

  useEffect(() => {
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
      unsubPendingLost();
      unsubPendingFound();
    };
  }, []);

  // Filter reports based on search term
  const filteredLostReports = pendingLostReports.filter(report =>
    report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.submittedByName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredFoundReports = pendingFoundReports.filter(report =>
    report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.submittedByName.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const handleImagePreview = (image, title) => {
    setImagePreview({ open: true, image, title });
  };

  const renderReportCard = (report, type) => (
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
            label={type === 'lost' ? 'Lost Item' : 'Found Item'} 
            color={type === 'lost' ? 'warning' : 'success'} 
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
                borderRadius: '8px',
                cursor: 'pointer'
              }}
              onClick={() => handleImagePreview(report.image, report.name)}
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
            <Typography variant="caption">
              {type === 'lost' ? report.timeLost : report.timeFound}
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            color="success"
            size="small"
            startIcon={<Done />}
            onClick={() => handleApproveReport(report, type)}
            disabled={loading}
          >
            Approve
          </Button>
          <Button
            variant="outlined"
            color="primary"
            size="small"
            startIcon={<Edit />}
            onClick={() => handleEditReport(report, type)}
            disabled={loading}
          >
            Edit & Approve
          </Button>
          <Button
            variant="outlined"
            color="error"
            size="small"
            startIcon={<Cancel />}
            onClick={() => handleRejectReport(report, type)}
            disabled={loading}
          >
            Reject
          </Button>
        </Box>
      </Card>
    </Grid>
  );

  return (
    <Box sx={{ pt: { xs: 2, sm: 3 }, pl: { xs: 2, sm: 3, md: 4 }, pr: { xs: 2, sm: 3, md: 4 } }}>
      <Typography variant="h4" gutterBottom sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000', mb: 2, mt: 1 }}>
        Students Lost and Found Reports
      </Typography>

      {/* Search Bar */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search reports by item name, description, or reporter name..."
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

      {/* Pending Reports */}
      {(filteredLostReports.length > 0 || filteredFoundReports.length > 0) ? (
        <Paper sx={{ 
          p: 3, 
          mb: 3,
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.9)',
          border: theme.palette.mode === 'dark' ? '0.5px solid rgba(255, 255, 255, 0.2)' : '0.5px solid rgba(0, 0, 0, 0.1)',
          borderRadius: 2,
          boxShadow: theme.palette.mode === 'dark' ? '0 2px 8px rgba(0, 0, 0, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.1)'
        }}>
          <Typography variant="h5" gutterBottom sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000' }}>
            Pending Student Reports
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Review and approve student reports before they are posted to the main Lost & Found section.
          </Typography>
          
          <Grid container spacing={2}>
            {/* Pending Lost Reports */}
            {filteredLostReports.map((report) => renderReportCard(report, 'lost'))}
            
            {/* Pending Found Reports */}
            {filteredFoundReports.map((report) => renderReportCard(report, 'found'))}
          </Grid>
        </Paper>
      ) : (
        <Paper sx={{ 
          p: 4, 
          textAlign: 'center',
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
          border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
          borderRadius: 2
        }}>
          <Typography variant="h6" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000', mb: 1 }}>
            No Pending Reports
          </Typography>
          <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666' }}>
            {searchTerm ? 'No reports match your search criteria.' : 'There are currently no pending student reports to review.'}
          </Typography>
        </Paper>
      )}

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
