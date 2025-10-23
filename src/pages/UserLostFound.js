import React, { useState, useEffect } from "react";
import { 
  Box, Grid, Card, CardContent, Typography, TextField, Button, Paper, Avatar, Snackbar, Alert, 
  Tabs, Tab, Chip, Divider, Badge, IconButton, Tooltip, useTheme, Dialog, DialogTitle, DialogContent, DialogActions
} from "@mui/material";
import { 
  Search, Add, CloudUpload, AdminPanelSettings, Person, Visibility, 
  LocationOn, AccessTime, ContactSupport, Comment, Delete, ThumbUp, Reply, Favorite
} from "@mui/icons-material";
import { db } from "../firebase";
import { collection, addDoc, query, orderBy, onSnapshot, doc, deleteDoc, updateDoc, arrayUnion, arrayRemove, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

export default function UserLostFound({ currentUser }) {
  const theme = useTheme();
  const [lostForm, setLostForm] = useState({ 
    name: '', 
    description: '', 
    location: '', 
    image: null, 
    timeLost: '', 
    contactInfo: currentUser?.email || '' 
  });
  const [foundForm, setFoundForm] = useState({ 
    name: '', 
    description: '', 
    location: '', 
    image: null, 
    timeFound: '', 
    contactInfo: currentUser?.email || '' 
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [lostItems, setLostItems] = useState([]);
  const [foundItems, setFoundItems] = useState([]);
  const [lostSearch, setLostSearch] = useState('');
  const [foundSearch, setFoundSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [viewMode, setViewMode] = useState('all'); // 'all', 'student', 'admin'
  const [comments, setComments] = useState({});
  const [newComment, setNewComment] = useState('');
  const [commentDialog, setCommentDialog] = useState({ open: false, itemId: null, itemType: '' });
  const [replyDialog, setReplyDialog] = useState({ open: false, itemId: null, itemType: '', parentCommentId: null });
  const [newReply, setNewReply] = useState('');
  const [commentLikes, setCommentLikes] = useState({});
  const [allItems, setAllItems] = useState([]);
  const [likes, setLikes] = useState({});
  const [shares, setShares] = useState({});
  const [userLikes, setUserLikes] = useState({});
  const [shareDialog, setShareDialog] = useState({ open: false, item: null });

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

  // Combine all items for the social feed
  useEffect(() => {
    const combined = [...lostItems, ...foundItems].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    setAllItems(combined);
  }, [lostItems, foundItems]);

  const handleLostImage = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        setSnackbar({ open: true, message: "Please select a valid image file", severity: "error" });
        return;
      }
      if (file.size > 200 * 1024) {
        setSnackbar({ open: true, message: "Image file size must be less than 200KB", severity: "error" });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLostForm(f => ({ ...f, image: reader.result }));
        setSnackbar({ open: true, message: "Image loaded!", severity: "success" });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFoundImage = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        setSnackbar({ open: true, message: "Please select a valid image file", severity: "error" });
        return;
      }
      if (file.size > 200 * 1024) {
        setSnackbar({ open: true, message: "Image file size must be less than 200KB", severity: "error" });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFoundForm(f => ({ ...f, image: reader.result }));
        setSnackbar({ open: true, message: "Image loaded!", severity: "success" });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLostSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'lost_items'), { 
        ...lostForm, 
        resolved: false, 
        createdAt: new Date().toISOString(),
        reportedBy: currentUser?.email,
        postedBy: 'student'
      });
      setSnackbar({ open: true, message: 'Lost item reported successfully!', severity: 'success' });
      setLostForm({ name: '', description: '', location: '', image: null, timeLost: '', contactInfo: currentUser?.email || '' });
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to report lost item.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleFoundSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'found_items'), { 
        ...foundForm, 
        resolved: false, 
        createdAt: new Date().toISOString(),
        reportedBy: currentUser?.email,
        postedBy: 'student'
      });
      setSnackbar({ open: true, message: 'Found item reported successfully!', severity: 'success' });
      setFoundForm({ name: '', description: '', location: '', image: null, timeFound: '', contactInfo: currentUser?.email || '' });
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to report found item.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Comment functionality
  const handleAddComment = async () => {
    if (!newComment.trim() || !commentDialog.itemId) return;
    
    try {
      const commentData = {
        id: Date.now().toString(),
        text: newComment.trim(),
        author: currentUser?.email || 'Anonymous',
        authorName: currentUser?.displayName || 'Student',
        authorProfilePic: currentUser?.photoURL || '',
        createdAt: new Date().toISOString(),
        timestamp: serverTimestamp(),
        likes: [],
        likeCount: 0,
        replies: []
      };
      
      const collectionName = commentDialog.itemType === 'lost' ? 'lost_items' : 'found_items';
      await updateDoc(doc(db, collectionName, commentDialog.itemId), {
        comments: arrayUnion(commentData)
      });

      // Send notification to admin about the comment
      try {
        await addDoc(collection(db, 'notifications'), {
          recipientEmail: 'admin@school.com', // Admin email
          recipientName: 'Administrator',
          title: `💬 New Comment on ${commentDialog.itemType === 'lost' ? 'Lost' : 'Found'} Item`,
          message: `${currentUser?.displayName || 'Student'} commented on a ${commentDialog.itemType} item: "${newComment.substring(0, 50)}${newComment.length > 50 ? '...' : ''}"`,
          type: 'lost_found_comment',
          itemId: commentDialog.itemId,
          itemType: commentDialog.itemType,
          commentId: commentData.createdAt,
          senderId: currentUser?.uid,
          senderEmail: currentUser?.email,
          senderName: currentUser?.displayName || 'Student',
          read: false,
          createdAt: new Date().toISOString(),
          priority: 'medium'
        });
      } catch (notificationError) {
        console.error('Failed to send admin notification:', notificationError);
        // Don't fail the comment if notification fails
      }
      
      setNewComment('');
      setCommentDialog({ open: false, itemId: null, itemType: '' });
      setSnackbar({ open: true, message: 'Comment added successfully!', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to add comment.', severity: 'error' });
    }
  };

  // Reply functionality
  const handleAddReply = async () => {
    if (!newReply.trim() || !replyDialog.itemId) return;
    
    try {
      const replyData = {
        id: Date.now().toString(),
        text: newReply.trim(),
        author: currentUser?.email || 'Anonymous',
        authorName: currentUser?.displayName || 'Student',
        authorProfilePic: currentUser?.photoURL || '',
        createdAt: new Date().toISOString(),
        timestamp: serverTimestamp(),
        likes: [],
        likeCount: 0
      };
      
      const collectionName = replyDialog.itemType === 'lost' ? 'lost_items' : 'found_items';
      const itemRef = doc(db, collectionName, replyDialog.itemId);
      
      // Get current item data
      const itemDoc = await getDoc(itemRef);
      if (itemDoc.exists()) {
        const itemData = itemDoc.data();
        const comments = itemData.comments || [];
        
        // Find and update the parent comment
        const updatedComments = comments.map(comment => {
          if (comment.id === replyDialog.parentCommentId) {
            return {
              ...comment,
              replies: [...(comment.replies || []), replyData]
            };
          }
          return comment;
        });
        
        await updateDoc(itemRef, { comments: updatedComments });
      }
      
      setNewReply('');
      setReplyDialog({ open: false, itemId: null, itemType: '', parentCommentId: null });
      setSnackbar({ open: true, message: 'Reply added successfully!', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to add reply.', severity: 'error' });
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

  // Delete post functionality (only for own posts)
  const handleDeletePost = async (itemId, itemType) => {
    try {
      const collectionName = itemType === 'lost' ? 'lost_items' : 'found_items';
      await deleteDoc(doc(db, collectionName, itemId));
      setSnackbar({ open: true, message: 'Post deleted successfully!', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to delete post.', severity: 'error' });
    }
  };

  // Check if user can delete post
  const canDeletePost = (item) => {
    return item.reportedBy === currentUser?.email && item.postedBy === 'student';
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

  // Filter items based on search and view mode
  const getFilteredItems = (items, search) => {
    let filtered = items.filter(item =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase()) ||
      item.location.toLowerCase().includes(search.toLowerCase())
    );

    // Filter by view mode
    if (viewMode === 'student') {
      filtered = filtered.filter(item => item.postedBy === 'student' || !item.postedBy);
    } else if (viewMode === 'admin') {
      filtered = filtered.filter(item => item.postedBy === 'admin');
    }

    return filtered;
  };

  const filteredLost = getFilteredItems(lostItems, lostSearch);
  const filteredFound = getFilteredItems(foundItems, foundSearch);

  // Helper function to determine if item is posted by admin
  const isAdminPost = (item) => {
    return item.postedBy === 'admin' || 
           (item.reportedBy && !item.reportedBy.includes('@') && item.reportedBy !== currentUser?.email);
  };

  // Helper function to get poster info
  const getPosterInfo = (item) => {
    if (isAdminPost(item)) {
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

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Lost and Found</Typography>
      
      <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Report Lost Item" />
        <Tab label="Report Found Item" />
        <Tab label="Browse Items" />
      </Tabs>

      {activeTab === 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Report Lost Item</Typography>
          <form onSubmit={handleLostSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  label="Item Name" 
                  value={lostForm.name} 
                  onChange={e => setLostForm(f => ({ ...f, name: e.target.value }))} 
                  required 
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  label="Location Lost" 
                  value={lostForm.location} 
                  onChange={e => setLostForm(f => ({ ...f, location: e.target.value }))} 
                  required 
                />
              </Grid>
              <Grid item xs={12}>
                <TextField 
                  fullWidth 
                  label="Description" 
                  multiline 
                  rows={3} 
                  value={lostForm.description} 
                  onChange={e => setLostForm(f => ({ ...f, description: e.target.value }))} 
                  required 
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  label="Time Lost" 
                  type="datetime-local" 
                  value={lostForm.timeLost} 
                  onChange={e => setLostForm(f => ({ ...f, timeLost: e.target.value }))} 
                  InputLabelProps={{ shrink: true }} 
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  label="Contact Information" 
                  value={lostForm.contactInfo} 
                  onChange={e => setLostForm(f => ({ ...f, contactInfo: e.target.value }))} 
                  required 
                />
              </Grid>
              <Grid item xs={12}>
                <Button variant="outlined" component="label" sx={{ mb: 2 }} startIcon={<CloudUpload />}>
                  Upload Image
                  <input type="file" accept="image/*" hidden onChange={handleLostImage} />
                </Button>
                {lostForm.image && (
                  <Box sx={{ mt: 2 }}>
                    <img src={lostForm.image} alt="Lost item" style={{ maxWidth: '200px', maxHeight: '200px' }} />
                  </Box>
                )}
              </Grid>
              <Grid item xs={12}>
                <Button variant="contained" type="submit" disabled={loading} sx={{ bgcolor: '#800000', '&:hover': { bgcolor: '#6b0000' } }}>
                  Report Lost Item
                </Button>
              </Grid>
            </Grid>
          </form>
        </Paper>
      )}

      {activeTab === 1 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Report Found Item</Typography>
          <form onSubmit={handleFoundSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  label="Item Name" 
                  value={foundForm.name} 
                  onChange={e => setFoundForm(f => ({ ...f, name: e.target.value }))} 
                  required 
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  label="Location Found" 
                  value={foundForm.location} 
                  onChange={e => setFoundForm(f => ({ ...f, location: e.target.value }))} 
                  required 
                />
              </Grid>
              <Grid item xs={12}>
                <TextField 
                  fullWidth 
                  label="Description" 
                  multiline 
                  rows={3} 
                  value={foundForm.description} 
                  onChange={e => setFoundForm(f => ({ ...f, description: e.target.value }))} 
                  required 
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  label="Time Found" 
                  type="datetime-local" 
                  value={foundForm.timeFound} 
                  onChange={e => setFoundForm(f => ({ ...f, timeFound: e.target.value }))} 
                  InputLabelProps={{ shrink: true }} 
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  label="Contact Information" 
                  value={foundForm.contactInfo} 
                  onChange={e => setFoundForm(f => ({ ...f, contactInfo: e.target.value }))} 
                  required 
                />
              </Grid>
              <Grid item xs={12}>
                <Button variant="outlined" component="label" sx={{ mb: 2 }} startIcon={<CloudUpload />}>
                  Upload Image
                  <input type="file" accept="image/*" hidden onChange={handleFoundImage} />
                </Button>
                {foundForm.image && (
                  <Box sx={{ mt: 2 }}>
                    <img src={foundForm.image} alt="Found item" style={{ maxWidth: '200px', maxHeight: '200px' }} />
                  </Box>
                )}
              </Grid>
              <Grid item xs={12}>
                <Button variant="contained" type="submit" disabled={loading} sx={{ bgcolor: '#800000', '&:hover': { bgcolor: '#6b0000' } }}>
                  Report Found Item
                </Button>
              </Grid>
            </Grid>
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
                const isOwnPost = item.reportedBy === currentUser?.email;
                
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
                        {isOwnPost && (
                          <IconButton 
                            size="small" 
                            onClick={() => handleDeletePost(item.id, item.type)}
                            sx={{ color: '#f44336' }}
                          >
                            <Delete />
                          </IconButton>
                        )}
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
                                    onClick={() => setReplyDialog({ open: true, itemId: item.id, itemType: item.type, parentCommentId: comment.id })}
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