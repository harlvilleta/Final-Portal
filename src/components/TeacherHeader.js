import React, { useState, useEffect } from 'react';
import { Box, AppBar, Toolbar, Typography, Avatar, Chip, IconButton, Menu, MenuItem, Badge, ListItemText, ListItemIcon, Divider, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button } from '@mui/material';
import { AccountCircle, Logout, Notifications, Settings, CheckCircle, Warning, Info, Mail } from '@mui/icons-material';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, orderBy, addDoc } from 'firebase/firestore';

export default function TeacherHeader({ currentUser, userProfile }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationAnchorEl, setNotificationAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [composeOpen, setComposeOpen] = useState(false);
  const [compose, setCompose] = useState({ subject: '', message: '' });
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser?.email) return;

    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('recipientEmail', '==', currentUser.email),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const notificationsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotifications(notificationsData);
      setUnreadCount(notificationsData.filter(n => !n.read).length);
    });

    return unsubscribe;
  }, [currentUser]);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationMenu = (event) => {
    setNotificationAnchorEl(event.currentTarget);
  };

  const handleNotificationClose = () => {
    setNotificationAnchorEl(null);
  };

  const handleNotificationClick = (notification) => {
    // Mark notification as read
    // Navigate based on notification type
    if (notification.type === 'violation_decision') {
      navigate('/teacher-reports');
    } else if (notification.type === 'announcement_decision') {
      navigate('/teacher-announcements');
    }
    handleNotificationClose();
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'violation_decision':
        return <CheckCircle color="success" />;
      case 'announcement_decision':
        return <Info color="info" />;
      case 'violation_report':
        return <Warning color="warning" />;
      default:
        return <Info color="info" />;
    }
  };

  const formatNotificationTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
    return date.toLocaleDateString();
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getUserDisplayInfo = () => {
    if (userProfile) {
      return {
        name: userProfile.fullName || currentUser?.displayName || 'Teacher',
        email: userProfile.email || currentUser?.email,
        photo: userProfile.profilePic || currentUser?.photoURL,
        role: userProfile.role || 'Teacher'
      };
    }
    return {
      name: currentUser?.displayName || 'Teacher',
      email: currentUser?.email,
      photo: currentUser?.photoURL,
      role: 'Teacher'
    };
  };

  const userInfo = getUserDisplayInfo();

  return (
    <AppBar position="static" sx={{ bgcolor: '#fff', color: '#333', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <Box sx={{ flex: 0.5 }}></Box>
        <Typography variant="h4" component="div" sx={{ fontWeight: 700, color: '#800000', flex: 1, textAlign: 'center', ml: -2 }}>
          Student Affairs Management System
        </Typography>
        <Box sx={{ flex: 0.5, display: 'flex', justifyContent: 'flex-end' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton
              size="large"
              aria-label="mail to admin"
              onClick={() => setComposeOpen(true)}
              color="inherit"
            >
              <Mail />
            </IconButton>
            <IconButton
              size="large"
              aria-label="settings"
              onClick={() => navigate('/teacher-profile')}
              color="inherit"
            >
              <Settings />
            </IconButton>
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenu}
              color="inherit"
            >
              <Avatar 
                sx={{ width: 32, height: 32, bgcolor: userInfo.photo ? 'transparent' : '#1976d2' }}
                src={userInfo.photo}
              >
                {userInfo.name?.charAt(0) || 'T'}
              </Avatar>
            </IconButton>
          </Box>
        </Box>
      </Toolbar>

      {/* User Menu */}
      <Menu
        id="menu-appbar"
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        keepMounted
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        <MenuItem onClick={handleClose}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar sx={{ width: 24, height: 24, bgcolor: '#1976d2' }}>
              {userInfo.name?.charAt(0) || 'T'}
            </Avatar>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                {userInfo.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {userInfo.email}
              </Typography>
            </Box>
          </Box>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { navigate('/teacher-profile'); handleClose(); }}>
          <ListItemIcon>
            <Settings fontSize="small" />
          </ListItemIcon>
          Profile Settings
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <Logout fontSize="small" />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>

      {/* Compose Message Dialog */}
      <Dialog open={composeOpen} onClose={() => setComposeOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Message Admin</DialogTitle>
        <DialogContent>
          <TextField label="Subject" fullWidth sx={{ mt: 1 }} value={compose.subject} onChange={e => setCompose({ ...compose, subject: e.target.value })} />
          <TextField label="Message" fullWidth multiline minRows={3} sx={{ mt: 2 }} value={compose.message} onChange={e => setCompose({ ...compose, message: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setComposeOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!compose.subject.trim() || !compose.message.trim()}
            onClick={async () => {
              try {
                await addDoc(collection(db, 'admin_messages'), {
                  fromId: currentUser?.uid || null,
                  fromEmail: currentUser?.email || null,
                  subject: compose.subject.trim(),
                  message: compose.message.trim(),
                  createdAt: new Date().toISOString(),
                });
                await addDoc(collection(db, 'admin_notifications'), {
                  title: 'New Message from Teacher',
                  message: compose.subject.trim(),
                  type: 'teacher_message',
                  read: false,
                  createdAt: new Date().toISOString(),
                  senderEmail: currentUser?.email || null,
                });
                setCompose({ subject: '', message: '' });
                setComposeOpen(false);
              } catch (e) {
                // optionally show error
              }
            }}
          >
            Send
          </Button>
        </DialogActions>
      </Dialog>
    </AppBar>
  );
} 