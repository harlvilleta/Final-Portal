import React, { useEffect, useState } from 'react';
import { Box, Typography, Grid, Paper, TextField, Button, Snackbar, Alert, MenuItem, Card, CardContent, Chip, Avatar, useTheme, Tabs, Tab, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { Add, Search, ThumbUp, Comment, AdminPanelSettings, Person, LocationOn, AccessTime } from '@mui/icons-material';
import { db } from '../firebase';
import { collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function TeacherLostFound() {
  const theme = useTheme();
  const [currentUser, setCurrentUser] = useState(null);
  const [form, setForm] = useState({ type: 'lost', name: '', description: '', location: '' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [lostItems, setLostItems] = useState([]);
  const [foundItems, setFoundItems] = useState([]);
  const [lostSearch, setLostSearch] = useState('');
  const [foundSearch, setFoundSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [allItems, setAllItems] = useState([]);
  const [userLikes, setUserLikes] = useState({});
  const [newComment, setNewComment] = useState('');
  const [commentDialog, setCommentDialog] = useState({ open: false, itemId: null, itemType: '' });

  // Manage current user state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubLost = onSnapshot(query(collection(db, 'lost_items'), orderBy('createdAt', 'desc')), snap => {
      const lostData = snap.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'lost' }));
      setLostItems(lostData);
    });
    const unsubFound = onSnapshot(query(collection(db, 'found_items'), orderBy('createdAt', 'desc')), snap => {
      const foundData = snap.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'found' }));
      setFoundItems(foundData);
    });
    return () => { unsubLost(); unsubFound(); };
  }, []);

  // Combine all items for the social feed
  useEffect(() => {
    const combined = [...lostItems, ...foundItems].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    setAllItems(combined);
  }, [lostItems, foundItems]);

  // Load user's like status
  useEffect(() => {
    if (!currentUser?.email) return;

    const loadUserLikes = async () => {
      try {
        const allItems = [...lostItems, ...foundItems];
        const likeStatus = {};
        
        for (const item of allItems) {
          const collectionName = item.type === 'lost' ? 'lost_items' : 'found_items';
          const itemRef = doc(db, collectionName, item.id);
          const itemDoc = await getDoc(itemRef);
          
          if (itemDoc.exists()) {
            const itemData = itemDoc.data();
            const likes = itemData.likes || [];
            likeStatus[`${item.type}-${item.id}`] = likes.includes(currentUser.email);
          }
        }
        
        setUserLikes(likeStatus);
      } catch (err) {
        console.error('Error loading user likes:', err);
      }
    };

    loadUserLikes();
  }, [currentUser?.email, lostItems, foundItems]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setSnackbar({ open: true, message: 'Please enter an item name', severity: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      const payload = { ...form, resolved: false, createdAt: new Date().toISOString() };
      const col = form.type === 'lost' ? 'lost_items' : 'found_items';
      await addDoc(collection(db, col), payload);
      setForm({ type: form.type, name: '', description: '', location: '' });
      setSnackbar({ open: true, message: `${form.type === 'lost' ? 'Lost' : 'Found'} item submitted!`, severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: 'Submit failed: ' + err.message, severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  // Like functionality
  const handleLike = async (itemId, itemType) => {
    if (!currentUser?.email) {
      setSnackbar({ open: true, message: 'Please log in to like posts.', severity: 'error' });
      return;
    }

    try {
      const collectionName = itemType === 'lost' ? 'lost_items' : 'found_items';
      const itemRef = doc(db, collectionName, itemId);
      const itemDoc = await getDoc(itemRef);
      
      if (!itemDoc.exists()) {
        setSnackbar({ open: true, message: 'Post not found.', severity: 'error' });
        return;
      }

      const itemData = itemDoc.data();
      const currentLikes = itemData.likes || [];
      const isLiked = currentLikes.includes(currentUser.email);

      if (isLiked) {
        // Unlike
        await updateDoc(itemRef, {
          likes: arrayRemove(currentUser.email),
          likeCount: (itemData.likeCount || 0) - 1
        });
        setUserLikes(prev => ({ ...prev, [`${itemType}-${itemId}`]: false }));
      } else {
        // Like
        await updateDoc(itemRef, {
          likes: arrayUnion(currentUser.email),
          likeCount: (itemData.likeCount || 0) + 1
        });
        setUserLikes(prev => ({ ...prev, [`${itemType}-${itemId}`]: true }));
      }
    } catch (err) {
      console.error('Error toggling like:', err);
      setSnackbar({ open: true, message: 'Failed to update like.', severity: 'error' });
    }
  };


  // Check if user has liked a post
  const hasUserLiked = (item) => {
    return userLikes[`${item.type}-${item.id}`] || false;
  };

  // Comment functionality
  const handleAddComment = async () => {
    if (!newComment.trim() || !commentDialog.itemId) return;
    
    try {
      const collectionName = commentDialog.itemType === 'lost' ? 'lost_items' : 'found_items';
      const itemRef = doc(db, collectionName, commentDialog.itemId);
      
      await updateDoc(itemRef, {
        comments: arrayUnion({
          text: newComment.trim(),
          authorName: currentUser?.displayName || currentUser?.email || 'Anonymous',
          authorEmail: currentUser?.email,
          timestamp: serverTimestamp()
        })
      });
      
      setNewComment('');
      setCommentDialog({ open: false, itemId: null, itemType: '' });
      setSnackbar({ open: true, message: 'Comment added successfully!', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to add comment.', severity: 'error' });
    }
  };

  // Helper function to get poster info
  const getPosterInfo = (item) => {
    if (item.postedBy === 'admin' || (item.reportedBy && !item.reportedBy.includes('@'))) {
      return {
        name: 'Admin',
        icon: <AdminPanelSettings />,
        color: 'primary'
      };
    } else {
      return {
        name: 'Student',
        icon: <Person />,
        color: 'secondary'
      };
    }
  };

  const filteredLost = lostItems.filter(i =>
    (i.name || '').toLowerCase().includes(lostSearch.toLowerCase()) ||
    (i.description || '').toLowerCase().includes(lostSearch.toLowerCase()) ||
    (i.location || '').toLowerCase().includes(lostSearch.toLowerCase())
  );

  const filteredFound = foundItems.filter(i =>
    (i.name || '').toLowerCase().includes(foundSearch.toLowerCase()) ||
    (i.description || '').toLowerCase().includes(foundSearch.toLowerCase()) ||
    (i.location || '').toLowerCase().includes(foundSearch.toLowerCase())
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000', mb: 3 }}>
        Lost & Found
      </Typography>

      <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Report Lost Item" />
        <Tab label="Report Found Item" />
        <Tab label="Browse Items" />
      </Tabs>

      {activeTab === 0 && (
        <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
            <Add sx={{ mr: 1, verticalAlign: 'middle' }} /> Report Lost Item
            </Typography>
            <form onSubmit={handleSubmit}>
            <TextField fullWidth size="small" label="Item Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value, type: 'lost' }))} sx={{ mb: 2 }} />
              <TextField fullWidth size="small" label="Description" multiline minRows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} sx={{ mb: 2 }} />
              <TextField fullWidth size="small" label="Location" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} sx={{ mb: 2 }} />
              <Button type="submit" variant="outlined" disabled={submitting} sx={{
                textTransform: 'none', bgcolor: '#fff', color: '#000', borderColor: '#000',
                '&:hover': { bgcolor: '#800000', color: '#fff', borderColor: '#800000' }
              }}>
              {submitting ? 'Submitting...' : 'Submit Lost Item'}
              </Button>
            </form>
          </Paper>
      )}

      {activeTab === 1 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
            <Add sx={{ mr: 1, verticalAlign: 'middle' }} /> Report Found Item
          </Typography>
          <form onSubmit={handleSubmit}>
            <TextField fullWidth size="small" label="Item Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value, type: 'found' }))} sx={{ mb: 2 }} />
            <TextField fullWidth size="small" label="Description" multiline minRows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} sx={{ mb: 2 }} />
            <TextField fullWidth size="small" label="Location" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} sx={{ mb: 2 }} />
            <Button type="submit" variant="outlined" disabled={submitting} sx={{
              textTransform: 'none', bgcolor: '#fff', color: '#000', borderColor: '#000',
              '&:hover': { bgcolor: '#800000', color: '#fff', borderColor: '#800000' }
            }}>
              {submitting ? 'Submitting...' : 'Submit Found Item'}
            </Button>
          </form>
        </Paper>
      )}

      {activeTab === 2 && (
        <Box>
          {/* Social Media Feed Header */}
          <Paper sx={{ p: 3, mb: 3, bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#ffffff' }}>
            <Typography variant="h4" gutterBottom sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>
              Lost & Found Feed
            </Typography>
            <Typography variant="body1" sx={{ color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666' }}>
              View and interact with all lost and found posts from students and teachers
            </Typography>
          </Paper>

          {/* Search Bar */}
          <Paper sx={{ p: 2, mb: 3, bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#ffffff' }}>
            <TextField 
              fullWidth 
              placeholder="Search posts..." 
              value={lostSearch} 
              onChange={e => setLostSearch(e.target.value)} 
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Paper>

          {/* Social Media Feed */}
          <Box sx={{ maxWidth: 800, mx: 'auto' }}>
            {allItems.length === 0 ? (
              <Paper sx={{ p: 4, textAlign: 'center', bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#ffffff' }}>
                <Typography variant="h6" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>
                  No posts yet
                </Typography>
                <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666' }}>
                  Be the first to post a lost or found item!
                </Typography>
              </Paper>
            ) : allItems
              .filter(item => 
                item.name.toLowerCase().includes(lostSearch.toLowerCase()) ||
                item.description.toLowerCase().includes(lostSearch.toLowerCase()) ||
                item.location.toLowerCase().includes(lostSearch.toLowerCase())
              )
              .map(item => {
                const posterInfo = getPosterInfo(item);
                
                return (
                  <Paper 
                    key={`${item.type}-${item.id}`} 
                    sx={{ 
                      mb: 3, 
                      p: 3,
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#ffffff',
                      border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e0e0e0',
                      borderRadius: 2,
                      borderLeft: item.type === 'lost' ? '4px solid #f44336' : '4px solid #4caf50'
                    }}
                  >
                    {/* Post Header */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: posterInfo.color === 'primary' ? '#1976d2' : '#9c27b0' }}>
                          {posterInfo.icon}
                        </Avatar>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>
                            {item.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666' }}>
                            {posterInfo.name} • {new Date(item.createdAt).toLocaleDateString()}
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip 
                          label={item.type === 'lost' ? 'Lost' : 'Found'} 
                          color={item.type === 'lost' ? 'error' : 'success'} 
                          size="small" 
                        />
                      </Box>
                    </Box>

                    {/* Post Content */}
                    <Typography variant="body1" sx={{ mb: 2, color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>
                      {item.description}
                    </Typography>

                    {/* Location and Time */}
                    <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <LocationOn sx={{ fontSize: 16, color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666' }} />
                        <Typography variant="caption" sx={{ color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666' }}>
                          {item.location}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <AccessTime sx={{ fontSize: 16, color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666' }} />
                        <Typography variant="caption" sx={{ color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666' }}>
                          {item.type === 'lost' ? `Lost: ${item.timeLost}` : `Found: ${item.timeFound}`}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Status */}
                    <Box sx={{ mb: 2 }}>
                      {item.resolved ? (
                        <Chip label="Resolved" color="success" size="small" />
                      ) : (
                        <Chip label="Active" color="warning" size="small" />
                      )}
                    </Box>

                    {/* Comments Section */}
                    {item.comments && item.comments.length > 0 && (
                      <Box sx={{ mt: 2, p: 2, bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#f5f5f5', borderRadius: 1 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1, color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>
                          Comments ({item.comments.length})
                        </Typography>
                        {item.comments.map((comment, index) => (
                          <Box key={index} sx={{ mb: 1, p: 1, bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#ffffff', borderRadius: 1 }}>
                            <Typography variant="caption" sx={{ fontWeight: 600, color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>
                              {comment.authorName}
                            </Typography>
                            <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#cccccc' : '#333333' }}>
                              {comment.text}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    )}

                    {/* Action Buttons */}
                    <Box sx={{ display: 'flex', gap: 2, mt: 2, pt: 2, borderTop: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e0e0e0' }}>
                      <Button
                        startIcon={<Comment />}
                        onClick={() => setCommentDialog({ open: true, itemId: item.id, itemType: item.type })}
                        sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#666666' }}
                      >
                        Comment {item.comments?.length > 0 && `(${item.comments.length})`}
                      </Button>
                      <Button
                        startIcon={<ThumbUp />}
                        onClick={() => handleLike(item.id, item.type)}
                        sx={{ 
                          color: hasUserLiked(item) ? '#1976d2' : (theme.palette.mode === 'dark' ? '#ffffff' : '#666666'),
                          '&:hover': {
                            color: hasUserLiked(item) ? '#1565c0' : '#1976d2'
                          }
                        }}
                      >
                        Like {item.likeCount > 0 && `(${item.likeCount})`}
                      </Button>
                    </Box>
                  </Paper>
                );
              })}
          </Box>
        </Box>
      )}

      {/* Comment Dialog */}
      <Dialog open={commentDialog.open} onClose={() => setCommentDialog({ open: false, itemId: null, itemType: '' })} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>
          Add Comment
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Your comment"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            sx={{
              mt: 2,
              '& .MuiOutlinedInput-root': {
                color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                '& fieldset': {
                  borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
                },
                '&:hover fieldset': {
                  borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                },
              },
              '& .MuiInputLabel-root': {
                color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
              },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setCommentDialog({ open: false, itemId: null, itemType: '' })}
            sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#666666' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleAddComment}
            variant="contained"
            sx={{ bgcolor: '#800000', '&:hover': { bgcolor: '#6b0000' } }}
          >
            Add Comment
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}