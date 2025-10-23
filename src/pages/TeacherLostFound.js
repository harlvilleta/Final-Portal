import React, { useEffect, useState } from 'react';
import { Box, Typography, Grid, Paper, TextField, Button, Snackbar, Alert, MenuItem, Card, CardContent, Chip, Avatar, useTheme, Tabs, Tab, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { Add, Search, ThumbUp, Comment, AdminPanelSettings, Person, LocationOn, AccessTime, CloudUpload, Reply, Favorite } from '@mui/icons-material';
import { db } from '../firebase';
import { collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function TeacherLostFound({ currentUser: propCurrentUser, userProfile }) {
  const theme = useTheme();
  const [currentUser, setCurrentUser] = useState(null);
  const [form, setForm] = useState({ type: 'lost', name: '', description: '', location: '', image: null });
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
  const [replyDialog, setReplyDialog] = useState({ open: false, itemId: null, itemType: '', parentCommentId: null });
  const [newReply, setNewReply] = useState('');
  const [commentLikes, setCommentLikes] = useState({});

  // Use passed currentUser prop or fallback to auth state
  useEffect(() => {
    if (propCurrentUser) {
      setCurrentUser(propCurrentUser);
    } else {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setCurrentUser(user);
      });
      return () => unsubscribe();
    }
  }, [propCurrentUser]);

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

  // Image upload handler
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setSnackbar({ open: true, message: "Please select a valid image file", severity: "error" });
      return;
    }

    if (file.size > 200 * 1024) { // 200KB limit
      setSnackbar({ open: true, message: "Image file size must be less than 200KB", severity: "error" });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setForm(f => ({ ...f, image: e.target.result }));
      setSnackbar({ open: true, message: "Image loaded!", severity: "success" });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setSnackbar({ open: true, message: 'Please enter an item name', severity: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      const payload = { 
        ...form, 
        resolved: false, 
        createdAt: new Date().toISOString(),
        postedBy: (userProfile?.role === 'Teacher' || currentUser?.role === 'Teacher') ? 'teacher' : 'student',
        reportedBy: currentUser?.email
      };
      const col = form.type === 'lost' ? 'lost_items' : 'found_items';
      await addDoc(collection(db, col), payload);
      setForm({ type: form.type, name: '', description: '', location: '', image: null });
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
      
      const commentData = {
        id: Date.now().toString(),
        text: newComment.trim(),
        authorName: currentUser?.displayName || currentUser?.email || 'Anonymous',
        authorEmail: currentUser?.email,
        authorProfilePic: currentUser?.photoURL || '',
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        likes: [],
        likeCount: 0,
        replies: []
      };
      
      await updateDoc(itemRef, {
        comments: arrayUnion(commentData)
      });
      
      setNewComment('');
      setCommentDialog({ open: false, itemId: null, itemType: '' });
      setSnackbar({ open: true, message: 'Comment added successfully!', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to add comment.', severity: 'error' });
    }
  };

  // Reply functionality
  const handleAddReply = async () => {
    if (!newReply.trim() || !replyDialog.itemId) {
      setSnackbar({ open: true, message: 'Please enter a reply.', severity: 'error' });
      return;
    }
    
    try {
      console.log('Adding reply:', {
        itemId: replyDialog.itemId,
        itemType: replyDialog.itemType,
        parentCommentId: replyDialog.parentCommentId,
        replyText: newReply.trim()
      });

      const collectionName = replyDialog.itemType === 'lost' ? 'lost_items' : 'found_items';
      const itemRef = doc(db, collectionName, replyDialog.itemId);
      
      const replyData = {
        id: Date.now().toString(),
        text: newReply.trim(),
        authorName: currentUser?.displayName || currentUser?.email || 'Anonymous',
        authorEmail: currentUser?.email,
        authorProfilePic: currentUser?.photoURL || '',
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        likes: [],
        likeCount: 0
      };
      
      // Get current item data
      const itemDoc = await getDoc(itemRef);
      if (!itemDoc.exists()) {
        setSnackbar({ open: true, message: 'Item not found.', severity: 'error' });
        return;
      }

      const itemData = itemDoc.data();
      const comments = itemData.comments || [];
      
      console.log('Current comments:', comments);
      console.log('Looking for parent comment ID:', replyDialog.parentCommentId);
      
      // Find the parent comment and add reply
      let found = false;
      const updatedComments = comments.map((comment, index) => {
        console.log(`Checking comment ${index}:`, {
          commentId: comment.id,
          parentCommentId: replyDialog.parentCommentId,
          index: index.toString()
        });
        
        // Try multiple matching strategies
        const isMatch = comment.id === replyDialog.parentCommentId || 
                       (index.toString() === replyDialog.parentCommentId) ||
                       (comment.id && comment.id.toString() === replyDialog.parentCommentId);
        
        if (isMatch) {
          console.log('Found matching comment, adding reply');
          found = true;
          return {
              ...comment,
              id: comment.id || `comment_${Date.now()}_${index}`,
              replies: [...(comment.replies || []), replyData]
            };
        }
        return comment;
      });
      
      if (!found) {
        console.error('Parent comment not found');
        setSnackbar({ open: true, message: 'Parent comment not found.', severity: 'error' });
        return;
      }
      
      console.log('Updating comments:', updatedComments);
      await updateDoc(itemRef, { comments: updatedComments });
      
      setNewReply('');
      setReplyDialog({ open: false, itemId: null, itemType: '', parentCommentId: null });
      setSnackbar({ open: true, message: 'Reply added successfully!', severity: 'success' });
    } catch (err) {
      console.error('Error adding reply:', err);
      setSnackbar({ open: true, message: 'Failed to add reply: ' + err.message, severity: 'error' });
    }
  };

  // Comment like functionality
  const handleCommentLike = async (itemId, itemType, commentId, isReply = false, parentCommentId = null) => {
    if (!currentUser?.email) {
      setSnackbar({ open: true, message: 'Please log in to like comments.', severity: 'error' });
      return;
    }

    try {
      const collectionName = itemType === 'lost' ? 'lost_items' : 'found_items';
      const itemRef = doc(db, collectionName, itemId);
      const itemDoc = await getDoc(itemRef);
      
      if (!itemDoc.exists()) return;
      
      const itemData = itemDoc.data();
      const comments = itemData.comments || [];
      
      const updatedComments = comments.map(comment => {
        if (isReply && comment.id === parentCommentId) {
          // Handle reply like
          const updatedReplies = comment.replies.map(reply => {
            if (reply.id === commentId) {
              const currentLikes = reply.likes || [];
              const isLiked = currentLikes.includes(currentUser.email);
              
              return {
                ...reply,
                likes: isLiked 
                  ? currentLikes.filter(email => email !== currentUser.email)
                  : [...currentLikes, currentUser.email],
                likeCount: isLiked ? (reply.likeCount || 0) - 1 : (reply.likeCount || 0) + 1
              };
            }
            return reply;
          });
          
          return { ...comment, replies: updatedReplies };
        } else if (!isReply && comment.id === commentId) {
          // Handle main comment like
          const currentLikes = comment.likes || [];
          const isLiked = currentLikes.includes(currentUser.email);
          
          return {
            ...comment,
            likes: isLiked 
              ? currentLikes.filter(email => email !== currentUser.email)
              : [...currentLikes, currentUser.email],
            likeCount: isLiked ? (comment.likeCount || 0) - 1 : (comment.likeCount || 0) + 1
          };
        }
        return comment;
      });
      
      await updateDoc(itemRef, { comments: updatedComments });
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to update comment like.', severity: 'error' });
    }
  };

  // Check if user has liked a comment
  const hasUserLikedComment = (comment, isReply = false) => {
    if (!currentUser?.email) return false;
    const likes = comment.likes || [];
    return likes.includes(currentUser.email);
  };

  // Helper function to get poster info
  const getPosterInfo = (item) => {
    if (item.postedBy === 'admin' || (item.reportedBy && !item.reportedBy.includes('@'))) {
      return {
        name: 'Admin',
        icon: <AdminPanelSettings />,
        color: 'primary'
      };
    } else if (item.postedBy === 'teacher' || (item.reportedBy && item.reportedBy === currentUser?.email && (userProfile?.role === 'Teacher' || currentUser?.role === 'Teacher'))) {
      return {
        name: 'Teacher',
        icon: <Person />,
        color: 'secondary'
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
              
              {/* Image Upload */}
              <Box sx={{ mb: 2 }}>
                <Button
                  component="label"
                  variant="outlined"
                  startIcon={<CloudUpload />}
                  sx={{ mb: 1 }}
                >
                  Upload Image
                  <input type="file" accept="image/*" hidden onChange={handleImageUpload} />
                </Button>
                {form.image && (
                  <Box sx={{ mt: 1 }}>
                    <img src={form.image} alt="Lost item" style={{ maxWidth: '200px', maxHeight: '200px', borderRadius: '4px' }} />
                  </Box>
                )}
              </Box>
              
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
            
            {/* Image Upload */}
            <Box sx={{ mb: 2 }}>
              <Button
                component="label"
                variant="outlined"
                startIcon={<CloudUpload />}
                sx={{ mb: 1 }}
              >
                Upload Image
                <input type="file" accept="image/*" hidden onChange={handleImageUpload} />
              </Button>
              {form.image && (
                <Box sx={{ mt: 1 }}>
                  <img src={form.image} alt="Found item" style={{ maxWidth: '200px', maxHeight: '200px', borderRadius: '4px' }} />
                </Box>
              )}
            </Box>
            
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
                        <Avatar 
                          src={posterInfo.name === 'Teacher' && currentUser?.photoURL ? currentUser.photoURL : undefined}
                          sx={{ bgcolor: posterInfo.color === 'primary' ? '#1976d2' : '#9c27b0' }}
                        >
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

                    {/* Image */}
                    {item.image && (
                      <Box sx={{ mb: 2 }}>
                        <img 
                          src={item.image} 
                          alt={item.name} 
                          style={{ 
                            width: '100%', 
                            maxWidth: '400px',
                            height: 'auto', 
                            objectFit: 'cover',
                            borderRadius: '8px',
                            border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e0e0e0'
                            }}
                          />
                        </Box>
                    )}

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
                        <Typography variant="subtitle2" sx={{ mb: 2, color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>
                          Comments ({item.comments.length})
                        </Typography>
                        {item.comments.map((comment, index) => (
                          <Box key={comment.id || index} sx={{ mb: 2, p: 2, bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#ffffff', borderRadius: 1 }}>
                            {/* Main Comment */}
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                              <Avatar 
                                sx={{ width: 24, height: 24, fontSize: '0.75rem' }}
                                src={comment.authorProfilePic}
                              >
                                {comment.authorName?.charAt(0) || 'U'}
                              </Avatar>
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="caption" sx={{ fontWeight: 600, color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>
                                  {comment.authorName}
                                </Typography>
                                <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#cccccc' : '#333333', mt: 0.5 }}>
                                  {comment.text}
                                </Typography>
                                
                                {/* Comment Actions */}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleCommentLike(item.id, item.type, comment.id)}
                                    sx={{ 
                                      color: hasUserLikedComment(comment) ? '#f44336' : (theme.palette.mode === 'dark' ? '#cccccc' : '#666666'),
                                      p: 0.5
                                    }}
                                  >
                                    <Favorite sx={{ fontSize: 14 }} />
                                  </IconButton>
                                  <Typography variant="caption" sx={{ color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666' }}>
                                    {comment.likeCount || 0}
                                  </Typography>
                                  <Button
                                    size="small"
                                    startIcon={<Reply sx={{ fontSize: 14 }} />}
                                    onClick={() => setReplyDialog({ open: true, itemId: item.id, itemType: item.type, parentCommentId: comment.id || index.toString() })}
                                    sx={{ 
                                      textTransform: 'none', 
                                      color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666',
                                      minWidth: 'auto',
                                      p: 0.5
                                    }}
                                  >
                                    Reply
                                  </Button>
                                </Box>
                              </Box>
                            </Box>
                            
                            {/* Replies */}
                            {comment.replies && comment.replies.length > 0 && (
                              <Box sx={{ ml: 4, mt: 1 }}>
                                {comment.replies.map((reply, replyIndex) => (
                                  <Box key={reply.id || replyIndex} sx={{ mb: 1, p: 1, bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#f8f9fa', borderRadius: 1 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                      <Avatar 
                                        sx={{ width: 20, height: 20, fontSize: '0.6rem' }}
                                        src={reply.authorProfilePic}
                                      >
                                        {reply.authorName?.charAt(0) || 'U'}
                                      </Avatar>
                                      <Box sx={{ flex: 1 }}>
                                        <Typography variant="caption" sx={{ fontWeight: 600, color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>
                                          {reply.authorName}
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#cccccc' : '#333333', mt: 0.5 }}>
                                          {reply.text}
                                        </Typography>
                                        
                                        {/* Reply Actions */}
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                          <IconButton
                                            size="small"
                                            onClick={() => handleCommentLike(item.id, item.type, reply.id, true, comment.id)}
                                            sx={{ 
                                              color: hasUserLikedComment(reply, true) ? '#f44336' : (theme.palette.mode === 'dark' ? '#cccccc' : '#666666'),
                                              p: 0.25
                                            }}
                                          >
                                            <Favorite sx={{ fontSize: 12 }} />
                                          </IconButton>
                                          <Typography variant="caption" sx={{ color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666', fontSize: '0.7rem' }}>
                                            {reply.likeCount || 0}
                                          </Typography>
                                        </Box>
                                      </Box>
                                    </Box>
                                  </Box>
                                ))}
                              </Box>
                            )}
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

      {/* Reply Dialog */}
      <Dialog open={replyDialog.open} onClose={() => setReplyDialog({ open: false, itemId: null, itemType: '', parentCommentId: null })} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>
          Reply to Comment
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Your reply"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={newReply}
            onChange={e => setNewReply(e.target.value)}
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
            onClick={() => setReplyDialog({ open: false, itemId: null, itemType: '', parentCommentId: null })}
            sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#666666' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleAddReply}
            variant="contained"
            sx={{ bgcolor: '#800000', '&:hover': { bgcolor: '#6b0000' } }}
          >
            Add Reply
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