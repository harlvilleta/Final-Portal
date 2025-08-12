import React, { useState } from 'react';
import { Box, AppBar, Toolbar, Typography, Avatar, Chip, IconButton, Menu, MenuItem, Badge } from '@mui/material';
import { AccountCircle, Logout, Notifications, Settings } from '@mui/icons-material';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';

export default function TeacherHeader({ currentUser, userProfile }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationAnchorEl, setNotificationAnchorEl] = useState(null);
  const navigate = useNavigate();

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
            <Badge badgeContent={3} color="error">
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ color: '#fff' }}>
              {userInfo.name}
            </Typography>
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenu}
              sx={{ color: '#fff' }}
            >
              <Avatar 
                src={userInfo.photo} 
                sx={{ 
                  width: 32, 
                  height: 32,
                  bgcolor: userInfo.photo ? 'transparent' : '#1976d2'
                }}
              >
                {!userInfo.photo && (userInfo.name?.charAt(0) || userInfo.email?.charAt(0))}
              </Avatar>
            </IconButton>
          </Box>
          
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
              <Typography variant="body2">{userInfo.email}</Typography>
            </MenuItem>
            <MenuItem onClick={() => { handleClose(); navigate('/teacher-profile'); }}>
              <AccountCircle sx={{ mr: 1 }} />
              Profile
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <Logout sx={{ mr: 1 }} />
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
          >
            <MenuItem onClick={handleNotificationClose}>
              <Typography variant="body2">New violation recorded</Typography>
            </MenuItem>
            <MenuItem onClick={handleNotificationClose}>
              <Typography variant="body2">Meeting scheduled for tomorrow</Typography>
            </MenuItem>
            <MenuItem onClick={handleNotificationClose}>
              <Typography variant="body2">Grade submission deadline</Typography>
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
} 