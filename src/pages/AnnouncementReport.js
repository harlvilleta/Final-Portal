import { 
  collection, 
  getDocs, 
  orderBy, 
  query, 
  updateDoc, 
  doc, 
  addDoc 
} from "firebase/firestore";
import { db } from "../firebase";
import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Avatar,
  Divider,
  IconButton,
  Tooltip
} from "@mui/material";
import {
  CheckCircle,
  Cancel,
  Visibility,
  Email,
  Person,
  Schedule,
  Warning,
  CheckCircleOutline,
  CancelOutlined
} from "@mui/icons-material";




const priorityColors = {
  'Normal': 'default',
  'High': 'warning',
  
  'Urgent': 'error'
};

export default function AnnouncementReport() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [viewDialog, setViewDialog] = useState(false);
  const [approvalDialog, setApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState('');
  const [approvalReason, setApprovalReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {

      const qSnap = await getDocs(query(collection(db, "announcements"), orderBy("createdAt", "desc")));
      const announcementsData = qSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAnnouncements(announcementsData);
    } catch (e) {
      console.error('Error fetching announcements:', e);
      setAnnouncements([]);
      setSnackbar({ open: true, message: 'Failed to fetch announcements.', severity: 'error' });
    }
    setLoading(false);
  };


  const handleViewDetails = (announcement) => {
    setSelectedAnnouncement(announcement);
    setViewDialog(true);
  };

  const handleApprovalAction = (announcement, action) => {
    setSelectedAnnouncement(announcement);
    setApprovalAction(action);
    setApprovalReason('');
    setApprovalDialog(true);
  };

  const handleSubmitApproval = async () => {
    if (!selectedAnnouncement) return;

    setProcessing(true);
    try {
      const newStatus = approvalAction === 'approve' ? 'Approved' : 'Denied';
      const actionText = approvalAction === 'approve' ? 'approved' : 'denied';

      // Update announcement status
      await updateDoc(doc(db, "announcements", selectedAnnouncement.id), {
        status: newStatus,
        reviewedBy: 'Admin',
        reviewedAt: new Date().toISOString(),
        reviewReason: approvalReason.trim() || null,
        reviewedByEmail: 'admin@school.com' // You can get this from current user
      });

      // Log the approval action
      await addDoc(collection(db, "announcement_reviews"), {
        announcementId: selectedAnnouncement.id,
        announcementTitle: selectedAnnouncement.title,
        action: newStatus,
        reason: approvalReason.trim() || null,
        reviewedBy: 'Admin',
        reviewedAt: new Date().toISOString(),
        teacherEmail: selectedAnnouncement.postedByEmail || selectedAnnouncement.postedBy,
        teacherName: selectedAnnouncement.postedByName || selectedAnnouncement.postedBy
      });

      // Send email notification (mock implementation)
      await sendEmailNotification(selectedAnnouncement, newStatus, approvalReason);

      setSnackbar({ 
        open: true, 
        message: `Announcement ${actionText} successfully! Email notification sent.`, 
        severity: 'success' 
      });

      setApprovalDialog(false);
      setSelectedAnnouncement(null);
      fetchAnnouncements(); // Refresh the list

    } catch (error) {
      console.error('Error updating announcement:', error);
      setSnackbar({ 
        open: true, 
        message: 'Error processing approval. Please try again.', 
        severity: 'error' 
      });
    } finally {
      setProcessing(false);
    }
  };

  const sendEmailNotification = async (announcement, status, reason) => {
    // This is a mock implementation
    // In a real application, you would integrate with an email service
    console.log('Sending email notification:', {
      to: announcement.postedByEmail || announcement.postedBy,
      subject: `Announcement ${status}: ${announcement.title}`,
      body: `Your announcement "${announcement.title}" has been ${status.toLowerCase()}.${reason ? ` Reason: ${reason}` : ''}`
    });

    // Simulate email sending
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  const getTeacherInfo = (announcement) => {
    const postedBy = announcement.postedBy || announcement.postedByName || 'Unknown';
    const email = announcement.postedByEmail || announcement.postedBy || 'No email';
    return { name: postedBy, email };
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Approved':
        return <CheckCircleOutline />;
      case 'Denied':
        return <CancelOutlined />;
      case 'Pending':
        return <Schedule />;
      default:
        return <Warning />;
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={700} color="primary.main">
        Announcement Report
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh' }}>
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ ml: 2 }}>
            Loading announcements...
          </Typography>
        </Box>
      ) : (
        <TableContainer component={Paper} elevation={3}>
          <Table>
            <TableHead>
              <TableRow >
                <TableCell sx={{ fontWeight: 600 }}>Date Submitted</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Title</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Teacher</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Priority</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {announcements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography variant="h6" color="text.secondary">
                      No announcements found.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : announcements.map((announcement) => {
                const teacherInfo = getTeacherInfo(announcement);
                const status = announcement.status || 'Pending';
                
                return (
                  <TableRow key={announcement.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {formatDate(announcement.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body1" fontWeight={600} sx={{ maxWidth: 200 }}>
                        {announcement.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {announcement.message?.substring(0, 50)}...
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          {teacherInfo.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {teacherInfo.email}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {announcement.category || 'General'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={announcement.priority || 'Normal'} 
                        size="small" 
                        color={priorityColors[announcement.priority || 'Normal']}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ 
                          width: 20, 
                          height: 20, 
                          bgcolor: 'transparent',
                          borderRadius: 1, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {status === 'Approved' ? (
                            <CheckCircle sx={{ fontSize: 14, color: '#4caf50' }} />
                          ) : status === 'Denied' ? (
                            <Cancel sx={{ fontSize: 14, color: '#f44336' }} />
                          ) : status === 'Pending' ? (
                            <Schedule sx={{ fontSize: 14, color: '#ff9800' }} />
                          ) : (
                            <Warning sx={{ fontSize: 14, color: '#9e9e9e' }} />
                          )}
                        </Box>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: status === 'Pending' ? '#ff9800' : 
                                  status === 'Approved' ? '#4caf50' : 
                                  status === 'Denied' ? '#f44336' : '#000',
                            fontWeight: 500
                          }}
                        >
                          {status}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="View Details">
                          <IconButton 
                            size="small" 
                            onClick={() => handleViewDetails(announcement)}
                            sx={{
                              '&:hover': {
                                color: '#1976d2',
                                bgcolor: 'rgba(25, 118, 210, 0.04)'
                              }
                            }}
                          >
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                        
                        {status === 'Pending' && (
                          <>
                            <Tooltip title="Approve">
                              <IconButton 
                                size="small" 
                                onClick={() => handleApprovalAction(announcement, 'approve')}
                                sx={{
                                  '&:hover': {
                                    color: '#4caf50',
                                    bgcolor: 'rgba(76, 175, 80, 0.04)'
                                  }
                                }}
                              >
                                <CheckCircle />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Deny">
                              <IconButton 
                                size="small" 
                                onClick={() => handleApprovalAction(announcement, 'deny')}
                                sx={{
                                  '&:hover': {
                                    color: '#f44336',
                                    bgcolor: 'rgba(244, 67, 54, 0.04)'
                                  }
                                }}
                              >
                                <Cancel />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}


      {/* View Details Dialog */}
      <Dialog 
        open={viewDialog} 
        onClose={() => setViewDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Visibility sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">
              Announcement Details
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedAnnouncement && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="h5" gutterBottom fontWeight={600}>
                    {selectedAnnouncement.title}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Teacher Information
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Person sx={{ mr: 1, color: '#86B0BD' }} />
                        <Typography variant="body1" fontWeight={500}>
                          {getTeacherInfo(selectedAnnouncement).name}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Email sx={{ mr: 1, color: '#86B0BD' }} />
                        <Typography variant="body2" color="text.secondary">
                          {getTeacherInfo(selectedAnnouncement).email}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Announcement Details
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">Category:</Typography>
                        <Typography variant="body2" fontWeight={500}>
                          {selectedAnnouncement.category || 'General'}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">Priority:</Typography>
                        <Chip 
                          label={selectedAnnouncement.priority || 'Normal'} 
                          size="small" 
                          color={priorityColors[selectedAnnouncement.priority || 'Normal']}
                        />
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">Status:</Typography>
                        <Chip 
                          label={selectedAnnouncement.status || 'Pending'} 
                          size="small" 
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Message Content
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                    <Typography variant="body1">
                      {selectedAnnouncement.message}
                    </Typography>
                  </Paper>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Additional Information
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        <strong>Submitted:</strong> {formatDate(selectedAnnouncement.createdAt)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        <strong>Audience:</strong> {selectedAnnouncement.audience || 'All'}
                      </Typography>
                    </Grid>
                    {selectedAnnouncement.reviewedAt && (
                      <Grid item xs={12}>
                        <Typography variant="body2">
                          <strong>Reviewed:</strong> {formatDate(selectedAnnouncement.reviewedAt)} by {selectedAnnouncement.reviewedBy}
                        </Typography>
                        {selectedAnnouncement.reviewReason && (
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            <strong>Reason:</strong> {selectedAnnouncement.reviewReason}
                          </Typography>
                        )}
                      </Grid>
                    )}
                  </Grid>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialog(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog 
        open={approvalDialog} 
        onClose={() => setApprovalDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {approvalAction === 'approve' ? (
              <CheckCircle sx={{ mr: 1 }} />
            ) : (
              <Cancel sx={{ mr: 1 }} />
            )}
            <Typography variant="h6">
              {approvalAction === 'approve' ? 'Approve' : 'Deny'} Announcement
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedAnnouncement && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body1" gutterBottom>
                You are about to <strong>{approvalAction}</strong> the following announcement:
              </Typography>
              
              <Card variant="outlined" sx={{ p: 2, mb: 3, bgcolor: '#f5f5f5' }}>
                <Typography variant="h6" gutterBottom>
                  {selectedAnnouncement.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  By: {getTeacherInfo(selectedAnnouncement).name}
                </Typography>
              </Card>
              
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Reason (Optional)"
                value={approvalReason}
                onChange={(e) => setApprovalReason(e.target.value)}
                placeholder={`Enter reason for ${approvalAction === 'approve' ? 'approval' : 'denial'}...`}
                helperText={`This reason will be included in the email notification to ${getTeacherInfo(selectedAnnouncement).name}`}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setApprovalDialog(false)}
            disabled={processing}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color={approvalAction === 'approve' ? 'success' : 'error'}
            onClick={handleSubmitApproval}
            disabled={processing}
            startIcon={processing ? <CircularProgress size={20} /> : null}
          >
            {processing ? 'Processing...' : `${approvalAction === 'approve' ? 'Approve' : 'Deny'} & Notify`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
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