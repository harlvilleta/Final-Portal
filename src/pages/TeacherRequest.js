import React, { useState, useEffect } from 'react';
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
  Avatar,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  useTheme,
  Card,
  CardContent,
  Snackbar,
  Alert,
  IconButton,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  Person,
  Email,
  Phone,
  LocationOn,
  CheckCircle,
  Cancel,
  Visibility,
  School,
  AccessTime,
  Badge,
  Delete,
  Edit
} from '@mui/icons-material';
import { collection, getDocs, updateDoc, doc, addDoc, query, orderBy, where, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function TeacherRequest() {
  const theme = useTheme();
  const [teacherRequests, setTeacherRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [viewDialog, setViewDialog] = useState(false);
  const [approvalDialog, setApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState('');
  const [approvalReason, setApprovalReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');

  useEffect(() => {
    fetchTeacherRequests();
  }, []);

  const fetchTeacherRequests = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'teacher_requests'), orderBy('requestDate', 'desc'));
      const querySnapshot = await getDocs(q);
      const requestsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTeacherRequests(requestsData);
    } catch (error) {
      console.error('Error fetching teacher requests:', error);
      setSnackbar({ open: true, message: 'Error fetching teacher requests', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setViewDialog(true);
  };

  const handleApprovalAction = (request, action) => {
    setSelectedRequest(request);
    setApprovalAction(action);
    setApprovalReason('');
    setApprovalDialog(true);
  };

  const handleDeleteRequest = (request) => {
    setSelectedRequest(request);
    setDeleteReason('');
    setDeleteDialog(true);
  };

  const handleSubmitApproval = async () => {
    if (!selectedRequest) return;

    setProcessing(true);
    try {
      const newStatus = approvalAction === 'approve' ? 'approved' : 'denied';
      const actionText = approvalAction === 'approve' ? 'approved' : 'denied';

      // Update teacher request status
      await updateDoc(doc(db, 'teacher_requests', selectedRequest.id), {
        status: newStatus,
        reviewedBy: 'admin',
        reviewDate: new Date().toISOString(),
        reviewReason: approvalReason.trim() || null,
        updatedAt: new Date().toISOString()
      });

      // Update user document with approval status
      await updateDoc(doc(db, 'users', selectedRequest.userId), {
        'teacherInfo.isApproved': approvalAction === 'approve',
        'teacherInfo.approvalStatus': newStatus,
        'teacherInfo.approvedBy': 'admin',
        'teacherInfo.approvedDate': new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Create notification for the teacher
      await addDoc(collection(db, 'notifications'), {
        recipientId: selectedRequest.userId,
        recipientEmail: selectedRequest.email,
        recipientName: selectedRequest.fullName,
        title: `Teacher Account ${newStatus === 'approved' ? 'Approved' : 'Denied'}`,
        message: `Your teacher account has been ${newStatus}.${approvalReason ? ` Reason: ${approvalReason}` : ''}`,
        type: 'teacher_approval',
        requestId: selectedRequest.id,
        senderId: 'admin',
        senderEmail: 'admin@school.com',
        senderName: 'Administration',
        read: false,
        createdAt: new Date().toISOString(),
        priority: 'high'
      });

      setSnackbar({ 
        open: true, 
        message: `Teacher request ${actionText}! Notification sent to teacher.`, 
        severity: 'success' 
      });

      setApprovalDialog(false);
      setSelectedRequest(null);
      fetchTeacherRequests(); // Refresh the list

    } catch (error) {
      console.error('Error processing teacher request:', error);
      setSnackbar({ 
        open: true, 
        message: 'Error processing request. Please try again.', 
        severity: 'error' 
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleSubmitDelete = async () => {
    if (!selectedRequest) return;

    setProcessing(true);
    try {
      // Delete the teacher request
      await deleteDoc(doc(db, 'teacher_requests', selectedRequest.id));

      // Delete the user document
      await deleteDoc(doc(db, 'users', selectedRequest.userId));

      // Create notification for the teacher (optional - since account is deleted)
      try {
        await addDoc(collection(db, 'notifications'), {
          recipientId: selectedRequest.userId,
          recipientEmail: selectedRequest.email,
          recipientName: selectedRequest.fullName,
          title: 'Teacher Account Deleted',
          message: `Your teacher account has been deleted by the administrator.${deleteReason ? ` Reason: ${deleteReason}` : ''}`,
          type: 'account_deleted',
          requestId: selectedRequest.id,
          senderId: 'admin',
          senderEmail: 'admin@school.com',
          senderName: 'Administration',
          read: false,
          createdAt: new Date().toISOString(),
          priority: 'high'
        });
      } catch (notificationError) {
        console.warn('Failed to send deletion notification:', notificationError);
      }

      setSnackbar({ 
        open: true, 
        message: 'Teacher account deleted successfully!', 
        severity: 'success' 
      });

      setDeleteDialog(false);
      setSelectedRequest(null);
      fetchTeacherRequests(); // Refresh the list

    } catch (error) {
      console.error('Error deleting teacher account:', error);
      setSnackbar({ 
        open: true, 
        message: 'Error deleting teacher account. Please try again.', 
        severity: 'error' 
      });
    } finally {
      setProcessing(false);
    }
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'approved':
        return 'success';
      case 'denied':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircle color="success" />;
      case 'denied':
        return <Cancel color="error" />;
      case 'pending':
        return <AccessTime color="warning" />;
      default:
        return <Badge color="default" />;
    }
  };

  const pendingRequests = teacherRequests.filter(req => req.status === 'pending');
  const approvedRequests = teacherRequests.filter(req => req.status === 'approved');
  const deniedRequests = teacherRequests.filter(req => req.status === 'denied');

  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ 
          fontWeight: 700, 
          color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000', 
          mb: 3 
        }}>
          🎓 Teacher Request Management
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Review and approve teacher registration requests. Teachers cannot log in until their accounts are approved.
        </Typography>

        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
            <Card sx={{ bgcolor: '#ffffff', borderLeft: '4px solid #ffc107', border: '1px solid #e0e0e0' }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} sx={{ color: '#000000' }} gutterBottom>
                  Pending Requests
                </Typography>
                <Typography variant="h4" fontWeight={700} sx={{ color: '#856404' }}>
                  {pendingRequests.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ bgcolor: '#ffffff', borderLeft: '4px solid #28a745', border: '1px solid #e0e0e0' }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} sx={{ color: '#000000' }} gutterBottom>
                  Approved
                </Typography>
                <Typography variant="h4" fontWeight={700} sx={{ color: '#155724' }}>
                  {approvedRequests.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ bgcolor: '#ffffff', borderLeft: '4px solid #dc3545', border: '1px solid #e0e0e0' }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} sx={{ color: '#000000' }} gutterBottom>
                  Denied
                </Typography>
                <Typography variant="h4" fontWeight={700} sx={{ color: '#721c24' }}>
                  {deniedRequests.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh' }}>
            <CircularProgress size={60} />
            <Typography variant="h6" sx={{ ml: 2 }}>
              Loading teacher requests...
            </Typography>
          </Box>
        ) : (
          <TableContainer component={Paper} elevation={2}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'primary.main' }}>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>Teacher</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>Email</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>Request Date</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {teacherRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                      <Typography variant="h6" color="text.secondary">
                        No teacher requests found.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : teacherRequests.map((request) => (
                  <TableRow key={request.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar 
                          src={request.profilePic} 
                          sx={{ 
                            width: 40, 
                            height: 40, 
                            mr: 2,
                            bgcolor: 'primary.main'
                          }}
                        >
                          <Person />
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            {request.fullName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ID: {request.userId?.substring(0, 8)}...
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Email sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2">
                          {request.email}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {formatDate(request.requestDate)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getStatusIcon(request.status)}
                        {request.status === 'approved' ? (
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: '#4caf50', 
                              fontWeight: 500,
                              textTransform: 'capitalize'
                            }}
                          >
                            {request.status}
                          </Typography>
                        ) : request.status === 'denied' ? (
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: '#f44336', 
                              fontWeight: 500,
                              textTransform: 'capitalize'
                            }}
                          >
                            {request.status}
                          </Typography>
                        ) : (
                          <Chip 
                            label={request.status.charAt(0).toUpperCase() + request.status.slice(1)} 
                            color={getStatusColor(request.status)} 
                            size="small" 
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="View Details">
                          <IconButton 
                            size="small" 
                            onClick={() => handleViewDetails(request)}
                            sx={{ 
                              color: '#666',
                              '&:hover': { color: '#1976d2' }
                            }}
                          >
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                        
                        <Tooltip title="Edit Status">
                          <IconButton 
                            size="small" 
                            onClick={() => handleApprovalAction(request, request.status === 'approved' ? 'deny' : 'approve')}
                            sx={{ 
                              color: '#666',
                              '&:hover': { color: '#ff9800' }
                            }}
                          >
                            <Edit />
                          </IconButton>
                        </Tooltip>
                        
                        {request.status === 'pending' && (
                          <>
                            <Tooltip title="Approve">
                              <IconButton 
                                size="small" 
                                onClick={() => handleApprovalAction(request, 'approve')}
                                sx={{ 
                                  color: '#666',
                                  '&:hover': { color: '#4caf50' }
                                }}
                              >
                                <CheckCircle />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Deny">
                              <IconButton 
                                size="small" 
                                onClick={() => handleApprovalAction(request, 'deny')}
                                sx={{ 
                                  color: '#666',
                                  '&:hover': { color: '#f44336' }
                                }}
                              >
                                <Cancel />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                        <Tooltip title="Delete Account">
                          <IconButton 
                            size="small" 
                            onClick={() => handleDeleteRequest(request)}
                            sx={{ 
                              color: '#666',
                              '&:hover': { color: '#d32f2f' }
                            }}
                          >
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* View Details Dialog */}
      <Dialog 
        open={viewDialog} 
        onClose={() => setViewDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <School sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">
              Teacher Request Details
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedRequest && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Personal Information
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Avatar 
                          src={selectedRequest.profilePic} 
                          sx={{ width: 60, height: 60, mr: 2 }}
                        >
                          <Person />
                        </Avatar>
                        <Box>
                          <Typography variant="h6" fontWeight={600}>
                            {selectedRequest.fullName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Teacher Applicant
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Email sx={{ mr: 1, color: 'primary.main' }} />
                        <Typography variant="body2">
                          {selectedRequest.email}
                        </Typography>
                      </Box>
                      {selectedRequest.phone && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Phone sx={{ mr: 1, color: 'primary.main' }} />
                          <Typography variant="body2">
                            {selectedRequest.phone}
                          </Typography>
                        </Box>
                      )}
                      {selectedRequest.address && (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <LocationOn sx={{ mr: 1, color: 'primary.main' }} />
                          <Typography variant="body2">
                            {selectedRequest.address}
                          </Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Request Information
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Request Date:</strong> {formatDate(selectedRequest.requestDate)}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Status:</strong> 
                        <Chip 
                          label={selectedRequest.status.charAt(0).toUpperCase() + selectedRequest.status.slice(1)} 
                          color={getStatusColor(selectedRequest.status)} 
                          size="small" 
                          sx={{ ml: 1 }}
                        />
                      </Typography>
                      {selectedRequest.reviewDate && (
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Reviewed:</strong> {formatDate(selectedRequest.reviewDate)}
                        </Typography>
                      )}
                      {selectedRequest.reviewReason && (
                        <Typography variant="body2">
                          <strong>Review Reason:</strong> {selectedRequest.reviewReason}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
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
              <CheckCircle sx={{ mr: 1, color: 'success.main' }} />
            ) : (
              <Cancel sx={{ mr: 1, color: 'error.main' }} />
            )}
            <Typography variant="h6">
              {approvalAction === 'approve' ? 'Approve' : 'Deny'} Teacher Request
              {selectedRequest && selectedRequest.status !== 'pending' && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  (Changing from {selectedRequest.status})
                </Typography>
              )}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedRequest && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body1" gutterBottom>
                You are about to <strong>{approvalAction}</strong> the teacher request for:
                {selectedRequest.status !== 'pending' && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Current status: <strong>{selectedRequest.status}</strong> → New status: <strong>{approvalAction === 'approve' ? 'approved' : 'denied'}</strong>
                  </Typography>
                )}
              </Typography>
              
              <Card variant="outlined" sx={{ p: 2, mb: 3, bgcolor: '#f5f5f5' }}>
                <Typography variant="h6" gutterBottom>
                  {selectedRequest.fullName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Email: {selectedRequest.email}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Request Date: {formatDate(selectedRequest.requestDate)}
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
                helperText={`This reason will be included in the notification to the teacher`}
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

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteDialog} 
        onClose={() => setDeleteDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Delete sx={{ mr: 1, color: 'error.main' }} />
            <Typography variant="h6">
              Delete Teacher Account
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedRequest && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="warning" sx={{ mb: 3 }}>
                <Typography variant="body2" fontWeight={600}>
                  Warning: This action cannot be undone!
                </Typography>
                <Typography variant="body2">
                  This will permanently delete the teacher's account and all associated data.
                </Typography>
              </Alert>
              
              <Typography variant="body1" gutterBottom>
                You are about to delete the teacher account for:
              </Typography>
              
              <Card variant="outlined" sx={{ p: 2, mb: 3, bgcolor: '#f5f5f5' }}>
                <Typography variant="h6" gutterBottom>
                  {selectedRequest.fullName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Email: {selectedRequest.email}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Request Date: {formatDate(selectedRequest.requestDate)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Status: {selectedRequest.status.charAt(0).toUpperCase() + selectedRequest.status.slice(1)}
                </Typography>
              </Card>
              
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Reason for Deletion (Optional)"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Enter reason for account deletion..."
                helperText="This reason will be included in the notification to the teacher"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteDialog(false)}
            disabled={processing}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleSubmitDelete}
            disabled={processing}
            startIcon={processing ? <CircularProgress size={20} /> : <Delete />}
          >
            {processing ? 'Deleting...' : 'Delete Account'}
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
