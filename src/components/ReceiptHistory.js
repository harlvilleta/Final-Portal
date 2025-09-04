import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  CardMedia,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Divider
} from '@mui/material';
import {
  Receipt,
  Visibility,
  CheckCircle,
  Cancel,
  Schedule,
  Close,
  Refresh
} from '@mui/icons-material';
import { auth, db } from '../firebase';
import {
  collection, 
  query, 
  orderBy, 
  getDocs, 
  where 
} from 'firebase/firestore';

const statusColors = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error'
};

const statusIcons = {
  pending: <Schedule />,
  approved: <CheckCircle />,
  rejected: <Cancel />
};

const receiptTypeLabels = {
  membership: 'Membership Fee',
  student_id: 'Sling ID',
  handbook: 'Handbook',
  other: 'Other'
};

export default function ReceiptHistory() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState('');
  const [imageDialog, setImageDialog] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const q = query(
        collection(db, 'receipt_submissions'),
        where('userId', '==', user.uid)
      );
      const querySnapshot = await getDocs(q);
      const submissionsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        submittedAt: doc.data().submittedAt?.toDate?.() || new Date(doc.data().submittedAt),
        reviewedAt: doc.data().reviewedAt?.toDate?.() || (doc.data().reviewedAt ? new Date(doc.data().reviewedAt) : null)
      })).sort((a, b) => (b.submittedAt?.getTime?.() || 0) - (a.submittedAt?.getTime?.() || 0));
      
      setSubmissions(submissionsData);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      setError('Failed to load your receipt submissions');
    } finally {
      setLoading(false);
    }
  };

  const handleViewImage = (imageUrl) => {
    setSelectedImage(imageUrl);
    setImageDialog(true);
  };

  const [statusFilter, setStatusFilter] = useState('all');

  const formatDate = (date) => {
    return new Date(date).toLocaleString();
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Receipt sx={{ fontSize: 32, color: 'primary.main', mr: 2 }} />
            <Typography variant="h4" color="primary">
              My Receipt Submissions
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchSubmissions}
          >
            Refresh
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Simple Status Filter */}
        <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
          <Button variant={statusFilter === 'all' ? 'contained' : 'outlined'} onClick={() => { setStatusFilter('all'); setPage(0); }}>All</Button>
          <Button variant={statusFilter === 'pending' ? 'contained' : 'outlined'} onClick={() => { setStatusFilter('pending'); setPage(0); }}>Pending</Button>
          <Button variant={statusFilter === 'approved' ? 'contained' : 'outlined'} onClick={() => { setStatusFilter('approved'); setPage(0); }}>Approved</Button>
          <Button variant={statusFilter === 'rejected' ? 'contained' : 'outlined'} onClick={() => { setStatusFilter('rejected'); setPage(0); }}>Rejected</Button>
        </Box>

        {/* Submissions List */}
        {submissions.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Receipt sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No receipt submissions found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              You haven't submitted any receipts yet. Go to the Receipt Submission page to submit your first receipt.
            </Typography>
          </Paper>
        ) : (
          <>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Receipt Type</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Submitted</TableCell>
                    <TableCell>Reviewed</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {submissions
                    .filter(s => statusFilter === 'all' ? true : s.status === statusFilter)
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {receiptTypeLabels[submission.receiptType] || submission.receiptType}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {formatAmount(submission.amount)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {submission.description}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={statusIcons[submission.status]}
                          label={submission.status}
                          color={statusColors[submission.status]}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(submission.submittedAt)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {submission.reviewedAt ? (
                          <Box>
                            <Typography variant="body2">
                              {formatDate(submission.reviewedAt)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              by {submission.reviewedBy}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Not reviewed
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton
                            size="small"
                            onClick={() => handleViewImage(submission.receiptImage)}
                            color="primary"
                          >
                            <Visibility />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={submissions.filter(s => statusFilter === 'all' ? true : s.status === statusFilter).length}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
            />
          </>
        )}

        {/* Admin Notes Section */}
        {submissions.some(sub => sub.adminNotes) && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Admin Feedback
            </Typography>
            {submissions
              .filter(sub => sub.adminNotes)
              .map((submission) => (
              <Card key={submission.id} sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {receiptTypeLabels[submission.receiptType]} - {formatAmount(submission.amount)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Submitted: {formatDate(submission.submittedAt)}
                      </Typography>
                    </Box>
                    <Chip
                      icon={statusIcons[submission.status]}
                      label={submission.status}
                      color={statusColors[submission.status]}
                      size="small"
                    />
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="body2">
                    <strong>Admin Notes:</strong> {submission.adminNotes}
                  </Typography>
                  {submission.reviewedBy && (
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                      Reviewed by: {submission.reviewedBy} on {formatDate(submission.reviewedAt)}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Paper>

      {/* Image Dialog */}
      <Dialog open={imageDialog} onClose={() => setImageDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          Receipt Image
          <IconButton
            onClick={() => setImageDialog(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <CardMedia
            component="img"
            image={selectedImage}
            alt="Receipt"
            sx={{ 
              width: '100%',
              objectFit: 'contain',
              borderRadius: 1
            }}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
} 