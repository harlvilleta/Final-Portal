import React, { useState, useEffect } from 'react';
import { Box, AppBar, Toolbar, Typography, Avatar, Chip, IconButton, Menu, MenuItem, Badge, ListItemText, ListItemIcon, Divider } from '@mui/material';
import { AccountCircle, Logout, Notifications, Settings, CheckCircle, Warning, Info } from '@mui/icons-material';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';

export default function TeacherHeader({ currentUser, userProfile }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationAnchorEl, setNotificationAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
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
    <AppBar position="static" sx={{ bgcolor: '#2d3436', color: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="h5" component="div" sx={{ fontWeight: 700, color: '#fff', mr: 3 }}>
            Teacher Portal
          </Typography>
          <Chip 
            label={userInfo.role} 
            size="small" 
            sx={{ 
              bgcolor: '#1976d2', 
              color: 'white',
              fontWeight: 600
            }} 
          />
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Notifications */}
          <IconButton
            size="large"
            aria-label="notifications"
            aria-controls="notifications-menu"
            aria-haspopup="true"
            onClick={handleNotificationMenu}
            sx={{ color: '#fff' }}
          >
            <Badge badgeContent={unreadCount} color="error">
              <Notifications />
            </Badge>
          </IconButton>
          
          {/* Settings */}
          <IconButton
            size="large"
            aria-label="settings"
            onClick={() => navigate('/teacher-profile')}
            sx={{ color: '#fff' }}
          >
            <Settings />
          </IconButton>
          
          {/* User Menu */}
          <IconButton
            size="large"
            aria-label="account of current user"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={handleMenu}
            sx={{ color: '#fff' }}
          >
            <Avatar 
              sx={{ width: 32, height: 32, bgcolor: '#1976d2' }}
              src={userInfo.photo}
            >
              {userInfo.name?.charAt(0) || 'T'}
            </Avatar>
          </IconButton>
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

      {/* Notifications Menu */}
      <Menu
        id="notifications-menu"
        anchorEl={notificationAnchorEl}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        keepMounted
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        open={Boolean(notificationAnchorEl)}
        onClose={handleNotificationClose}
        PaperProps={{
          sx: { width: 400, maxHeight: 500 }
        }}
      >
        <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
          <Typography variant="h6" fontWeight={600}>
            Notifications ({notifications.length})
          </Typography>
        </Box>
        
        {notifications.length === 0 ? (
          <MenuItem disabled>
            <Typography variant="body2" color="text.secondary">
              No notifications
            </Typography>
          </MenuItem>
        ) : (
          notifications.slice(0, 10).map((notification) => (
            <MenuItem 
              key={notification.id} 
              onClick={() => handleNotificationClick(notification)}
              sx={{ 
                borderBottom: '1px solid #f0f0f0',
                '&:hover': { bgcolor: '#f5f5f5' }
              }}
            >
              <ListItemIcon>
                {getNotificationIcon(notification.type)}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography variant="subtitle2" fontWeight={600} sx={{ color: notification.read ? 'text.secondary' : 'text.primary' }}>
                    {notification.title}
                  </Typography>
                }
                secondary={
                  <Box>
                    <Typography variant="body2" sx={{ color: notification.read ? 'text.secondary' : 'text.primary', mb: 0.5 }}>
                      {notification.message}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatNotificationTime(notification.createdAt)}
                    </Typography>
                  </Box>
                }
              />
            </MenuItem>
          ))
        )}
        
        {notifications.length > 10 && (
          <MenuItem onClick={() => { navigate('/teacher-notifications'); handleNotificationClose(); }}>
            <Typography variant="body2" color="primary" sx={{ textAlign: 'center', width: '100%' }}>
              View All Notifications
            </Typography>
          </MenuItem>
        )}
      </Menu>
    </AppBar>
  );
} 