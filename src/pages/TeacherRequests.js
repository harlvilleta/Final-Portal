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
  Avatar,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
  CircularProgress,
  Badge,
  Divider,
  Stack,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  InputAdornment
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Visibility,
  Person,
  Email,
  Phone,
  LocationOn,
  School,
  CalendarToday,
  Security,
  Notifications,
  Refresh,
  FilterList,
  Search
} from '@mui/icons-material';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  updateDoc, 
  doc, 
  addDoc,
  onSnapshot,
  limit
} from 'firebase/firestore';
import { db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';

export default function TeacherRequests() {
  const [teacherRequests, setTeacherRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [approvalDialog, setApprovalDialog] = useState({ open: false, request: null, action: '' });
  const [viewDialog, setViewDialog] = useState({ open: false, request: null });
  const [reviewNotes, setReviewNotes] = useState('');
  const [filter, setFilter] = useState('all'); // all, pending, approved, denied
  const [newRequestsCount, setNewRequestsCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        fetchTeacherRequests();
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchTeacherRequests = async () => {
    setLoading(true);
    try {
      let q;
      if (filter === 'all') {
        q = query(collection(db, "teacher_approval_requests"), orderBy("requestDate", "desc"));
      } else {
        q = query(
          collection(db, "teacher_approval_requests"), 
          where("status", "==", filter),
          orderBy("requestDate", "desc")
        );
      }
      
      const snap = await getDocs(q);
      const requests = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTeacherRequests(requests);
      
      // Count new requests (pending status)
      const pendingCount = requests.filter(req => req.status === 'pending').length;
      setNewRequestsCount(pendingCount);
    } catch (error) {
      console.error('Error fetching teacher requests:', error);
      setSnackbar({ 
        open: true, 
        message: 'Failed to fetch teacher requests', 
        severity: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (requestId, action) => {
    try {
      const request = teacherRequests.find(r => r.id === requestId);
      if (!request) return;

      // Update the teacher approval request
      await updateDoc(doc(db, "teacher_approval_requests", requestId), {
        status: action,
        reviewedBy: currentUser?.uid,
        reviewedAt: new Date().toISOString(),
        reviewNotes: reviewNotes
      });

      if (action === 'approved') {
        // Update the user's teacher info to mark as approved
        await updateDoc(doc(db, "users", request.userId), {
          'teacherInfo.isApproved': true,
          'teacherInfo.approvalStatus': 'approved',
          'teacherInfo.approvedBy': currentUser?.uid,
          'teacherInfo.approvedAt': new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        // Log activity
        await addDoc(collection(db, 'activity_log'), {
          message: `Teacher ${request.fullName} (${request.email}) was approved by admin`,
          type: 'teacher_approval',
          user: currentUser?.uid,
          userEmail: currentUser?.email,
          timestamp: new Date().toISOString(),
          details: {
            approvedTeacher: request.email,
            reviewNotes: reviewNotes
          }
        });

        setSnackbar({ 
          open: true, 
          message: `Teacher ${request.fullName} has been approved successfully!`, 
          severity: 'success' 
        });
      } else {
        // Update the user's teacher info to mark as denied
        await updateDoc(doc(db, "users", request.userId), {
          'teacherInfo.isApproved': false,
          'teacherInfo.approvalStatus': 'denied',
          'teacherInfo.deniedBy': currentUser?.uid,
          'teacherInfo.deniedAt': new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        // Log activity for denial
        await addDoc(collection(db, 'activity_log'), {
          message: `Teacher ${request.fullName} (${request.email}) was denied by admin`,
          type: 'teacher_denial',
          user: currentUser?.uid,
          userEmail: currentUser?.email,
          timestamp: new Date().toISOString(),
          details: {
            deniedTeacher: request.email,
            reviewNotes: reviewNotes
          }
        });

        setSnackbar({ 
          open: true, 
          message: `Teacher ${request.fullName} has been denied.`, 
          severity: 'info' 
        });
      }

      // Refresh the teacher requests list
      await fetchTeacherRequests();
      setApprovalDialog({ open: false, request: null, action: '' });
      setReviewNotes('');
    } catch (error) {
      console.error('Error handling teacher approval:', error);
      setSnackbar({ 
        open: true, 
        message: 'Failed to process teacher approval. Please try again.', 
        severity: 'error' 
      });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'denied': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Notifications sx={{ color: 'gray' }} />;
      case 'approved': return <CheckCircle sx={{ color: 'gray' }} />;
      case 'denied': return <Cancel sx={{ color: 'gray' }} />;
      default: return <Person sx={{ color: 'gray' }} />;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredRequests = teacherRequests.filter(request => {
    // Filter by status
    const statusMatch = filter === 'all' || request.status === filter;
    
    // Filter by search term (name or email)
    const searchMatch = !searchTerm || 
      (request.fullName && request.fullName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (request.email && request.email.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return statusMatch && searchMatch;
  });

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'black', mb: 1 }}>
          Teacher Account Approval
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage teacher registration requests and approve or deny access to the system
        </Typography>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            bgcolor: theme.palette.mode === 'dark' ? '#404040' : '#f5f5f5', 
            borderLeft: '4px solid #800000',
            border: '1px solid #ffffff',
            minHeight: 'auto',
            transition: 'box-shadow 0.2s',
            '&:hover': {
              boxShadow: 4
            }
          }}>
            <CardContent sx={{ py: 1.5, px: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h5" sx={{ 
                    fontWeight: 700, 
                    color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000', 
                    lineHeight: 1.2 
                  }}>
                    {teacherRequests.filter(r => r.status === 'pending').length}
                  </Typography>
                  <Typography variant="caption" sx={{ 
                    fontSize: '0.75rem',
                    color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666'
                  }}>
                    Pending
                  </Typography>
                </Box>
                <Badge badgeContent={newRequestsCount} color="error">
                  <Notifications sx={{ fontSize: 24, color: 'gray' }} />
                </Badge>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            bgcolor: theme.palette.mode === 'dark' ? '#404040' : '#f5f5f5', 
            borderLeft: '4px solid #800000',
            border: '1px solid #ffffff',
            minHeight: 'auto',
            transition: 'box-shadow 0.2s',
            '&:hover': {
              boxShadow: 4
            }
          }}>
            <CardContent sx={{ py: 1.5, px: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h5" sx={{ 
                    fontWeight: 700, 
                    color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000', 
                    lineHeight: 1.2 
                  }}>
                    {teacherRequests.filter(r => r.status === 'approved').length}
                  </Typography>
                  <Typography variant="caption" sx={{ 
                    fontSize: '0.75rem',
                    color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666'
                  }}>
                    Approved
                  </Typography>
                </Box>
                <CheckCircle sx={{ fontSize: 24, color: 'gray' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            bgcolor: theme.palette.mode === 'dark' ? '#404040' : '#f5f5f5', 
            borderLeft: '4px solid #800000',
            border: '1px solid #ffffff',
            minHeight: 'auto',
            transition: 'box-shadow 0.2s',
            '&:hover': {
              boxShadow: 4
            }
          }}>
            <CardContent sx={{ py: 1.5, px: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h5" sx={{ 
                    fontWeight: 700, 
                    color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000', 
                    lineHeight: 1.2 
                  }}>
                    {teacherRequests.filter(r => r.status === 'denied').length}
                  </Typography>
                  <Typography variant="caption" sx={{ 
                    fontSize: '0.75rem',
                    color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666'
                  }}>
                    Denied
                  </Typography>
                </Box>
                <Cancel sx={{ fontSize: 24, color: 'gray' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            bgcolor: theme.palette.mode === 'dark' ? '#404040' : '#f5f5f5', 
            borderLeft: '4px solid #800000',
            border: '1px solid #ffffff',
            minHeight: 'auto',
            transition: 'box-shadow 0.2s',
            '&:hover': {
              boxShadow: 4
            }
          }}>
            <CardContent sx={{ py: 1.5, px: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h5" sx={{ 
                    fontWeight: 700, 
                    color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000', 
                    lineHeight: 1.2 
                  }}>
                    {teacherRequests.length}
                  </Typography>
                  <Typography variant="caption" sx={{ 
                    fontSize: '0.75rem',
                    color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666'
                  }}>
                    Total
                  </Typography>
                </Box>
                <Person sx={{ fontSize: 24, color: 'gray' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search Bar */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <TextField
            placeholder="Search by teacher name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            sx={{
              maxWidth: 400,
              '& .MuiOutlinedInput-root': {
                '&:hover fieldset': {
                  borderColor: '#800000',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#800000',
                },
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search color="action" />
                </InputAdornment>
              ),
            }}
          />
          {searchTerm && (
            <Button
              variant="outlined"
              size="small"
              onClick={() => setSearchTerm('')}
              sx={{
                minWidth: 'auto',
                px: 2,
                color: '#666',
                borderColor: '#ddd',
                '&:hover': {
                  bgcolor: '#800000',
                  color: '#fff',
                  borderColor: '#800000'
                }
              }}
            >
              Clear
            </Button>
          )}
        </Box>
        {searchTerm && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Showing {filteredRequests.length} result(s) for "{searchTerm}"
          </Typography>
        )}
      </Paper>

      {/* Filter and Actions */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <FilterList color="action" />
            <Button
              variant={filter === 'all' ? 'contained' : 'outlined'}
              onClick={() => setFilter('all')}
              size="small"
            >
              All
            </Button>
            <Button
              variant={filter === 'pending' ? 'contained' : 'outlined'}
              onClick={() => setFilter('pending')}
              size="small"
              color="warning"
            >
              Pending
            </Button>
            <Button
              variant={filter === 'approved' ? 'contained' : 'outlined'}
              onClick={() => setFilter('approved')}
              size="small"
              color="success"
            >
              Approved
            </Button>
            <Button
              variant={filter === 'denied' ? 'contained' : 'outlined'}
              onClick={() => setFilter('denied')}
              size="small"
              color="error"
            >
              Denied
            </Button>
          </Box>
          
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchTeacherRequests}
            disabled={loading}
            sx={{
              color: 'black',
              borderColor: 'black',
              '&:hover': {
                color: '#1976d2',
                borderColor: '#1976d2'
              }
            }}
          >
            Refresh
          </Button>
        </Box>
      </Paper>

      {/* Teacher Requests Table */}
      <Paper sx={{ 
        boxShadow: 2
      }}>
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: '#800000' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, color: 'white' }}>Teacher</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'white' }}>Contact Info</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'white' }}>Request Date</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'white' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'white' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4 }}>
                    <CircularProgress />
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Loading teacher requests...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      No teacher requests found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequests.map((request) => (
                  <TableRow key={request.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar 
                          src={request.profilePic} 
                          sx={{ width: 50, height: 50 }}
                        >
                          {request.fullName?.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            {request.fullName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            ID: {request.userId?.substring(0, 8)}...
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Email sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="body2">{request.email}</Typography>
                        </Box>
                        {request.phone && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Phone sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="body2">{request.phone}</Typography>
                          </Box>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(request.requestDate)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={getStatusIcon(request.status)}
                        label={request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        color={getStatusColor(request.status)}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => setViewDialog({ open: true, request })}
                            sx={{ 
                              color: 'gray',
                              '&:hover': { color: '#1976d2' }
                            }}
                          >
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                        
                        {request.status === 'pending' && (
                          <>
                            <Tooltip title="Approve">
                              <IconButton
                                size="small"
                                onClick={() => setApprovalDialog({ open: true, request, action: 'approved' })}
                                sx={{ 
                                  color: 'gray',
                                  '&:hover': { color: '#4caf50' }
                                }}
                              >
                                <CheckCircle />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Deny">
                              <IconButton
                                size="small"
                                onClick={() => setApprovalDialog({ open: true, request, action: 'denied' })}
                                sx={{ 
                                  color: 'gray',
                                  '&:hover': { color: '#f44336' }
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
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* View Details Dialog */}
      <Dialog 
        open={viewDialog.open} 
        onClose={() => setViewDialog({ open: false, request: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: '#f5f5f5', fontWeight: 700 }}>
          Teacher Request Details
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {viewDialog.request && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Avatar 
                    src={viewDialog.request.profilePic} 
                    sx={{ width: 120, height: 120, mx: 'auto', mb: 2 }}
                  >
                    {viewDialog.request.fullName?.charAt(0)}
                  </Avatar>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {viewDialog.request.fullName}
                  </Typography>
                  <Chip
                    icon={getStatusIcon(viewDialog.request.status)}
                    label={viewDialog.request.status.charAt(0).toUpperCase() + viewDialog.request.status.slice(1)}
                    color={getStatusColor(viewDialog.request.status)}
                    sx={{ mt: 1 }}
                  />
                </Box>
              </Grid>
              
              <Grid item xs={12} md={8}>
                <List>
                  <ListItem>
                    <ListItemIcon><Email sx={{ color: 'gray' }} /></ListItemIcon>
                    <ListItemText 
                      primary="Email Address" 
                      secondary={viewDialog.request.email}
                    />
                  </ListItem>
                  
                  {viewDialog.request.phone && (
                    <ListItem>
                      <ListItemIcon><Phone sx={{ color: 'gray' }} /></ListItemIcon>
                      <ListItemText 
                        primary="Phone Number" 
                        secondary={viewDialog.request.phone}
                      />
                    </ListItem>
                  )}
                  
                  {viewDialog.request.address && (
                    <ListItem>
                      <ListItemIcon><LocationOn sx={{ color: 'gray' }} /></ListItemIcon>
                      <ListItemText 
                        primary="Address" 
                        secondary={viewDialog.request.address}
                      />
                    </ListItem>
                  )}
                  
                  <ListItem>
                    <ListItemIcon><CalendarToday sx={{ color: 'gray' }} /></ListItemIcon>
                    <ListItemText 
                      primary="Request Date" 
                      secondary={formatDate(viewDialog.request.requestDate)}
                    />
                  </ListItem>
                  
                  {viewDialog.request.reviewedAt && (
                    <ListItem>
                      <ListItemIcon><Security sx={{ color: 'gray' }} /></ListItemIcon>
                      <ListItemText 
                        primary="Reviewed At" 
                        secondary={formatDate(viewDialog.request.reviewedAt)}
                      />
                    </ListItem>
                  )}
                  
                  {viewDialog.request.reviewNotes && (
                    <ListItem>
                      <ListItemIcon><School sx={{ color: 'gray' }} /></ListItemIcon>
                      <ListItemText 
                        primary="Review Notes" 
                        secondary={viewDialog.request.reviewNotes}
                      />
                    </ListItem>
                  )}
                </List>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setViewDialog({ open: false, request: null })}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog 
        open={approvalDialog.open} 
        onClose={() => setApprovalDialog({ open: false, request: null, action: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: '#f5f5f5', fontWeight: 700 }}>
          {approvalDialog.action === 'approved' ? 'Approve Teacher' : 'Deny Teacher Request'}
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {approvalDialog.request && (
            <Box>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {approvalDialog.action === 'approved' 
                  ? `Are you sure you want to approve ${approvalDialog.request.fullName}?`
                  : `Are you sure you want to deny ${approvalDialog.request.fullName}'s request?`
                }
              </Typography>
              
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Review Notes (Optional)"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add any notes about this decision..."
                sx={{ mt: 2 }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={() => setApprovalDialog({ open: false, request: null, action: '' })}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button
            onClick={() => handleApproval(approvalDialog.request.id, approvalDialog.action)}
            variant="contained"
            color={approvalDialog.action === 'approved' ? 'success' : 'error'}
            size="large"
          >
            {approvalDialog.action === 'approved' ? 'Approve Teacher' : 'Deny Request'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
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
