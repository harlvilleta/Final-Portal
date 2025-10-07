import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Card,
  CardContent,
  Avatar,
  Divider,
  IconButton,
  Tooltip,
  CircularProgress,
  Snackbar,
  Alert
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Visibility,
  Person,
  School,
  Email,
  Warning,
  Schedule,
  CheckCircleOutline,
  CancelOutlined
} from '@mui/icons-material';
import { collection, getDocs, query, orderBy, updateDoc, doc, addDoc, where } from 'firebase/firestore';
import { db } from '../firebase';

const statusColors = {
  'Pending': 'warning',
  'Approved': 'success',
  'Denied': 'error'
};

const severityColors = {
  'Minor': 'success',
  'Moderate': 'warning',
  'Major': 'error',
  'Critical': 'error'
};

export default function ViolationReview() {
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedViolation, setSelectedViolation] = useState(null);
  const [viewDialog, setViewDialog] = useState(false);
  const [approvalDialog, setApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState('');
  const [approvalReason, setApprovalReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchViolations();
  }, []);

  const fetchViolations = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'violations'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const violationsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setViolations(violationsData);
    } catch (error) {
      console.error('Error fetching violations:', error);
      setSnackbar({ open: true, message: 'Error fetching violations', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (violation) => {
    setSelectedViolation(violation);
    setViewDialog(true);
  };

  const handleApprovalAction = (violation, action) => {
    setSelectedViolation(violation);
    setApprovalAction(action);
    setApprovalReason('');
    setApprovalDialog(true);
  };

  const handleSubmitApproval = async () => {
    if (!selectedViolation) return;

    setProcessing(true);
    try {
      const newStatus = approvalAction === 'approve' ? 'Approved' : 'Denied';
      const actionText = approvalAction === 'approve' ? 'approved' : 'denied';

      // Update violation status
      await updateDoc(doc(db, 'violations', selectedViolation.id), {
        status: newStatus,
        adminReviewed: true,
        adminDecision: newStatus,
        adminReviewDate: new Date().toISOString(),
        adminReviewReason: approvalReason.trim() || null,
        updatedAt: new Date().toISOString()
      });

      // Create notification for the student
      await addDoc(collection(db, 'notifications'), {
        recipientId: selectedViolation.studentId,
        recipientEmail: selectedViolation.studentEmail,
        recipientName: selectedViolation.studentName,
        title: `Violation Case ${newStatus}`,
        message: `Your violation case (${selectedViolation.violationType}) has been ${newStatus.toLowerCase()}.${approvalReason ? ` Reason: ${approvalReason}` : ''}`,
        type: 'violation_decision',
        violationId: selectedViolation.id,
        senderId: 'admin',
        senderEmail: 'admin@school.com',
        senderName: 'Administration',
        read: false,
        createdAt: new Date().toISOString(),
        priority: 'high'
      });

      // Create notification for the teacher
      await addDoc(collection(db, 'notifications'), {
        recipientId: selectedViolation.reportedBy,
        recipientEmail: selectedViolation.reportedByEmail,
        recipientName: selectedViolation.reportedByName,
        title: `Violation Report ${newStatus}`,
        message: `Your violation report for ${selectedViolation.studentName} (${selectedViolation.violationType}) has been ${newStatus.toLowerCase()}.${approvalReason ? ` Reason: ${approvalReason}` : ''}`,
        type: 'violation_decision',
        violationId: selectedViolation.id,
        senderId: 'admin',
        senderEmail: 'admin@school.com',
        senderName: 'Administration',
        read: false,
        createdAt: new Date().toISOString(),
        priority: 'high'
      });

      // Log the admin decision
      await addDoc(collection(db, 'violation_reviews'), {
        violationId: selectedViolation.id,
        violationType: selectedViolation.violationType,
        studentName: selectedViolation.studentName,
        teacherName: selectedViolation.reportedByName,
        action: newStatus,
        reason: approvalReason.trim() || null,
        reviewedBy: 'Admin',
        reviewedAt: new Date().toISOString()
      });

      setSnackbar({ 
        open: true, 
        message: `Violation case ${actionText}! Notifications sent to student and teacher.`, 
        severity: 'success' 
      });

      setApprovalDialog(false);
      setSelectedViolation(null);
      fetchViolations(); // Refresh the list

    } catch (error) {
      console.error('Error updating violation:', error);
      setSnackbar({ 
        open: true, 
        message: 'Error processing approval. Please try again.', 
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

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Approved':
        return <CheckCircleOutline color="success" />;
      case 'Denied':
        return <CancelOutlined color="error" />;
      case 'Pending':
        return <Schedule color="warning" />;
      default:
        return <Warning color="default" />;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
        <Typography variant="h4" gutterBottom color="primary" sx={{ fontWeight: 700, mb: 3 }}>
          🚨 Violation Review & Approval
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Review teacher-reported violations and approve or deny cases. Both students and teachers will be notified of your decision.
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh' }}>
            <CircularProgress size={60} />
            <Typography variant="h6" sx={{ ml: 2 }}>
              Loading violations...
            </Typography>
          </Box>
        ) : (
          <TableContainer component={Paper} elevation={2}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'primary.main' }}>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>Date Reported</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>Student</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>Teacher</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>Violation Type</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>Severity</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {violations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography variant="h6" color="text.secondary">
                        No violations found.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : violations.map((violation) => (
                  <TableRow key={violation.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {formatDate(violation.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar 
                          sx={{ 
                            width: 32, 
                            height: 32, 
                            mr: 1,
                            bgcolor: 'primary.main'
                          }}
                        >
                          <Person />
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            {violation.studentName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ID: {violation.studentIdNumber}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar 
                          sx={{ 
                            width: 32, 
                            height: 32, 
                            mr: 1,
                            bgcolor: 'secondary.main'
                          }}
                        >
                          <School />
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            {violation.reportedByName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {violation.reportedByEmail}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {violation.violationType}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: violation.severity === 'Minor' ? '#4caf50' : 
                                violation.severity === 'Moderate' ? '#ff9800' : 
                                violation.severity === 'Major' ? '#f44336' : 
                                violation.severity === 'Critical' ? '#d32f2f' : '#000',
                          fontWeight: 500
                        }}
                      >
                        {violation.severity}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Schedule sx={{ fontSize: 16 }} />
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: violation.status === 'Pending' ? '#ff9800' : 
                                  violation.status === 'Approved' ? '#4caf50' : 
                                  violation.status === 'Denied' ? '#f44336' : '#000',
                            fontWeight: 500
                          }}
                        >
                          {violation.status}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="View Details">
                          <IconButton 
                            size="small" 
                            onClick={() => handleViewDetails(violation)}
                            color="primary"
                          >
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                        
                        {violation.status === 'Pending' && (
                          <>
                            <Tooltip title="Approve">
                              <IconButton 
                                size="small" 
                                onClick={() => handleApprovalAction(violation, 'approve')}
                                color="success"
                              >
                                <CheckCircle />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Deny">
                              <IconButton 
                                size="small" 
                                onClick={() => handleApprovalAction(violation, 'deny')}
                                color="error"
                              >
                                <Cancel />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
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
            <Visibility sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">
              Violation Details
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedViolation && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="h5" gutterBottom fontWeight={600}>
                    {selectedViolation.violationType}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Student Information
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Person sx={{ mr: 1, color: 'primary.main' }} />
                        <Typography variant="body1" fontWeight={500}>
                          {selectedViolation.studentName}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <School sx={{ mr: 1, color: 'primary.main' }} />
                        <Typography variant="body2" color="text.secondary">
                          ID: {selectedViolation.studentIdNumber}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Email sx={{ mr: 1, color: 'primary.main' }} />
                        <Typography variant="body2" color="text.secondary">
                          {selectedViolation.studentEmail}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Teacher Information
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Person sx={{ mr: 1, color: 'secondary.main' }} />
                        <Typography variant="body1" fontWeight={500}>
                          {selectedViolation.reportedByName}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Email sx={{ mr: 1, color: 'secondary.main' }} />
                        <Typography variant="body2" color="text.secondary">
                          {selectedViolation.reportedByEmail}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Violation Details
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2">
                          <strong>Type:</strong> {selectedViolation.violationType}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2">
                          <strong>Severity:</strong> 
                          <Chip 
                            label={selectedViolation.severity} 
                            size="small" 
                            color={severityColors[selectedViolation.severity]}
                            sx={{ ml: 1 }}
                          />
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2">
                          <strong>Date:</strong> {selectedViolation.date}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2">
                          <strong>Time:</strong> {selectedViolation.time}
                        </Typography>
                      </Grid>
                      {selectedViolation.location && (
                        <Grid item xs={12}>
                          <Typography variant="body2">
                            <strong>Location:</strong> {selectedViolation.location}
                          </Typography>
                        </Grid>
                      )}
                      <Grid item xs={12}>
                        <Typography variant="body2">
                          <strong>Description:</strong>
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 1, p: 2, bgcolor: 'white', borderRadius: 1 }}>
                          {selectedViolation.description}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
                
                {selectedViolation.adminReviewed && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Admin Review
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: '#e8f5e8' }}>
                      <Typography variant="body2">
                        <strong>Decision:</strong> {selectedViolation.adminDecision}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Reviewed:</strong> {formatDate(selectedViolation.adminReviewDate)}
                      </Typography>
                      {selectedViolation.adminReviewReason && (
                        <Typography variant="body2">
                          <strong>Reason:</strong> {selectedViolation.adminReviewReason}
                        </Typography>
                      )}
                    </Paper>
                  </Grid>
                )}
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
              {approvalAction === 'approve' ? 'Approve' : 'Deny'} Violation Case
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedViolation && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body1" gutterBottom>
                You are about to <strong>{approvalAction}</strong> the following violation case:
              </Typography>
              
              <Card variant="outlined" sx={{ p: 2, mb: 3, bgcolor: '#f5f5f5' }}>
                <Typography variant="h6" gutterBottom>
                  {selectedViolation.violationType}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Student: {selectedViolation.studentName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Reported by: {selectedViolation.reportedByName}
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
                helperText={`This reason will be included in notifications to both the student and teacher`}
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