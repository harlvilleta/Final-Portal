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
  Divider,
  useTheme
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
  const theme = useTheme();
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
    <Box sx={{ 
      p: { xs: 2, sm: 3 },
      bgcolor: theme.palette.mode === 'dark' ? '#1a1a1a' : 'transparent'
    }}>
      <Paper sx={{ 
        p: { xs: 2, sm: 3 },
        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.9)',
        border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
        borderRadius: 2,
        boxShadow: theme.palette.mode === 'dark' ? '0 2px 8px rgba(0, 0, 0, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.1)'
      }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          mb: 3,
          p: 2,
          borderRadius: 2,
          background: theme.palette.mode === 'dark' 
            ? 'rgba(255, 255, 255, 0.05)' 
            : 'rgba(255, 255, 255, 0.8)',
          border: theme.palette.mode === 'dark' 
            ? '1px solid rgba(255, 255, 255, 0.1)' 
            : '1px solid rgba(0, 0, 0, 0.08)',
          boxShadow: theme.palette.mode === 'dark' 
            ? '0 2px 8px rgba(0, 0, 0, 0.3)' 
            : '0 2px 8px rgba(0, 0, 0, 0.1)'
        }}>
          <Typography variant="h4" sx={{ 
            color: theme.palette.mode === 'dark' ? '#ffffff' : '#8B0000',
            fontWeight: 700,
            letterSpacing: '-0.5px'
          }}>
            My Receipt Submissions
          </Typography>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchSubmissions}
            size="small"
            sx={{
              borderRadius: 1,
              px: 2,
              py: 0.5,
              fontWeight: 600,
              textTransform: 'none',
              fontSize: '0.85rem',
              color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
              borderColor: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
              '&:hover': {
                bgcolor: '#800000',
                color: '#ffffff',
                borderColor: '#800000'
              }
            }}
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
          <Button 
            variant={statusFilter === 'all' ? 'contained' : 'outlined'} 
            onClick={() => { setStatusFilter('all'); setPage(0); }}
            sx={{
              borderRadius: 3,
              px: 3,
              py: 1,
              fontWeight: 600,
              textTransform: 'none',
              fontSize: '0.95rem',
              ...(statusFilter === 'all' ? {
                background: 'linear-gradient(45deg, #8B0000, #A52A2A)',
                color: '#ffffff',
                boxShadow: '0 4px 12px rgba(139, 0, 0, 0.3)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #660000, #8B0000)',
                  boxShadow: '0 6px 16px rgba(139, 0, 0, 0.4)',
                  transform: 'translateY(-2px)'
                }
              } : {
                color: theme.palette.mode === 'dark' ? '#ffffff' : '#8B0000',
                borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : '#8B0000',
                '&:hover': {
                  borderColor: '#A52A2A',
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(139, 0, 0, 0.1)' : 'rgba(139, 0, 0, 0.05)',
                  color: '#A52A2A',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 12px rgba(139, 0, 0, 0.2)'
                }
              }),
              transition: 'all 0.2s ease-in-out'
            }}
          >
            All
          </Button>
          <Button 
            variant={statusFilter === 'pending' ? 'contained' : 'outlined'} 
            onClick={() => { setStatusFilter('pending'); setPage(0); }}
            sx={{
              borderRadius: 3,
              px: 3,
              py: 1,
              fontWeight: 600,
              textTransform: 'none',
              fontSize: '0.95rem',
              ...(statusFilter === 'pending' ? {
                background: 'linear-gradient(45deg, #8B0000, #A52A2A)',
                color: '#ffffff',
                boxShadow: '0 4px 12px rgba(139, 0, 0, 0.3)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #660000, #8B0000)',
                  boxShadow: '0 6px 16px rgba(139, 0, 0, 0.4)',
                  transform: 'translateY(-2px)'
                }
              } : {
                color: theme.palette.mode === 'dark' ? '#ffffff' : '#8B0000',
                borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : '#8B0000',
                '&:hover': {
                  borderColor: '#A52A2A',
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(139, 0, 0, 0.1)' : 'rgba(139, 0, 0, 0.05)',
                  color: '#A52A2A',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 12px rgba(139, 0, 0, 0.2)'
                }
              }),
              transition: 'all 0.2s ease-in-out'
            }}
          >
            Pending
          </Button>
          <Button 
            variant={statusFilter === 'approved' ? 'contained' : 'outlined'} 
            onClick={() => { setStatusFilter('approved'); setPage(0); }}
            sx={{
              borderRadius: 3,
              px: 3,
              py: 1,
              fontWeight: 600,
              textTransform: 'none',
              fontSize: '0.95rem',
              ...(statusFilter === 'approved' ? {
                background: 'linear-gradient(45deg, #8B0000, #A52A2A)',
                color: '#ffffff',
                boxShadow: '0 4px 12px rgba(139, 0, 0, 0.3)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #660000, #8B0000)',
                  boxShadow: '0 6px 16px rgba(139, 0, 0, 0.4)',
                  transform: 'translateY(-2px)'
                }
              } : {
                color: theme.palette.mode === 'dark' ? '#ffffff' : '#8B0000',
                borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : '#8B0000',
                '&:hover': {
                  borderColor: '#A52A2A',
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(139, 0, 0, 0.1)' : 'rgba(139, 0, 0, 0.05)',
                  color: '#A52A2A',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 12px rgba(139, 0, 0, 0.2)'
                }
              }),
              transition: 'all 0.2s ease-in-out'
            }}
          >
            Approved
          </Button>
          <Button 
            variant={statusFilter === 'rejected' ? 'contained' : 'outlined'} 
            onClick={() => { setStatusFilter('rejected'); setPage(0); }}
            sx={{
              borderRadius: 3,
              px: 3,
              py: 1,
              fontWeight: 600,
              textTransform: 'none',
              fontSize: '0.95rem',
              ...(statusFilter === 'rejected' ? {
                background: 'linear-gradient(45deg, #8B0000, #A52A2A)',
                color: '#ffffff',
                boxShadow: '0 4px 12px rgba(139, 0, 0, 0.3)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #660000, #8B0000)',
                  boxShadow: '0 6px 16px rgba(139, 0, 0, 0.4)',
                  transform: 'translateY(-2px)'
                }
              } : {
                color: theme.palette.mode === 'dark' ? '#ffffff' : '#8B0000',
                borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : '#8B0000',
                '&:hover': {
                  borderColor: '#A52A2A',
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(139, 0, 0, 0.1)' : 'rgba(139, 0, 0, 0.05)',
                  color: '#A52A2A',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 12px rgba(139, 0, 0, 0.2)'
                }
              }),
              transition: 'all 0.2s ease-in-out'
            }}
          >
            Rejected
          </Button>
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
                  <TableRow sx={{ 
                    bgcolor: '#800000',
                    background: '#800000'
                  }}>
                    <TableCell sx={{ 
                      bgcolor: '#800000',
                      color: '#ffffff',
                      fontWeight: 'bold',
                      borderBottom: '1px solid #e0e0e0',
                      border: '1px solid #e0e0e0'
                    }}>
                      Receipt Type
                    </TableCell>
                    <TableCell sx={{ 
                      bgcolor: '#800000',
                      color: '#ffffff',
                      fontWeight: 'bold',
                      borderBottom: '1px solid #e0e0e0',
                      border: '1px solid #e0e0e0'
                    }}>
                      Amount
                    </TableCell>
                    <TableCell sx={{ 
                      bgcolor: '#800000',
                      color: '#ffffff',
                      fontWeight: 'bold',
                      borderBottom: '1px solid #e0e0e0',
                      border: '1px solid #e0e0e0'
                    }}>
                      Description
                    </TableCell>
                    <TableCell sx={{ 
                      bgcolor: '#800000',
                      color: '#ffffff',
                      fontWeight: 'bold',
                      borderBottom: '1px solid #e0e0e0',
                      border: '1px solid #e0e0e0'
                    }}>
                      Status
                    </TableCell>
                    <TableCell sx={{ 
                      bgcolor: '#800000',
                      color: '#ffffff',
                      fontWeight: 'bold',
                      borderBottom: '1px solid #e0e0e0',
                      border: '1px solid #e0e0e0'
                    }}>
                      Submitted
                    </TableCell>
                    <TableCell sx={{ 
                      bgcolor: '#800000',
                      color: '#ffffff',
                      fontWeight: 'bold',
                      borderBottom: '1px solid #e0e0e0',
                      border: '1px solid #e0e0e0'
                    }}>
                      Reviewed
                    </TableCell>
                    <TableCell sx={{ 
                      bgcolor: '#800000',
                      color: '#ffffff',
                      fontWeight: 'bold',
                      borderBottom: '1px solid #e0e0e0',
                      border: '1px solid #e0e0e0'
                    }}>
                      Actions
                    </TableCell>
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
                            {submission.status === 'approved' ? (
                              <CheckCircle sx={{ fontSize: 14, color: '#4caf50' }} />
                            ) : submission.status === 'rejected' ? (
                              <Cancel sx={{ fontSize: 14, color: '#f44336' }} />
                            ) : submission.status === 'pending' ? (
                              <Schedule sx={{ fontSize: 14, color: '#ff9800' }} />
                            ) : (
                              <Schedule sx={{ fontSize: 14, color: '#9e9e9e' }} />
                            )}
                          </Box>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: submission.status === 'pending' ? '#ff9800' : 
                                    submission.status === 'approved' ? '#4caf50' : 
                                    submission.status === 'rejected' ? '#f44336' : '#000',
                              fontWeight: 500,
                              textTransform: 'capitalize'
                            }}
                          >
                            {submission.status}
                          </Typography>
                        </Box>
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
                            sx={{
                              color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                              '&:hover': {
                                color: '#1976d2'
                              }
                            }}
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
              <Card key={submission.id} sx={{ mb: 2, bgcolor: '#80000015', borderLeft: '4px solid #800000' }}>
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