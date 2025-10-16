import React, { useState } from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Typography,
  Box,
  Divider,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Settings,
  Logout,
  LightMode,
  DarkMode,
  Person
} from '@mui/icons-material';
import { useTheme } from '../contexts/ThemeContext';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';

/**
 * ProfileDropdown Component
 * 
 * A comprehensive profile dropdown that includes:
 * - User information display
 * - Profile settings navigation
 * - Theme toggle (Light/Dark mode)
 * - Logout functionality
 * 
 * Features:
 * - Clean, organized layout
 * - Theme switching with visual feedback
 * - Responsive design
 * - Accessible interactions
 */
const ProfileDropdown = ({ 
  currentUser, 
  userProfile, 
  profileRoute = '/profile',
  onProfileClick = null 
}) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const { theme, toggleTheme, isDark } = useTheme();
  const navigate = useNavigate();

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
    handleClose();
  };

  const handleProfileClick = () => {
    if (onProfileClick) {
      onProfileClick();
    } else {
      navigate(profileRoute);
    }
    handleClose();
  };

  // Get user display information
  const getUserDisplayInfo = () => {
    if (userProfile) {
      return {
        name: userProfile.fullName || userProfile.firstName + ' ' + userProfile.lastName || currentUser?.displayName || 'User',
        email: userProfile.email || currentUser?.email,
        photo: userProfile.profilePic || userProfile.image || currentUser?.photoURL,
        role: userProfile.role || 'User'
      };
    }
    return {
      name: currentUser?.displayName || 'User',
      email: currentUser?.email,
      photo: currentUser?.photoURL,
      role: 'User'
    };
  };

  const userInfo = getUserDisplayInfo();

  return (
    <>
      <Tooltip title="Account">
        <IconButton
          size="large"
          aria-label="account of current user"
          aria-controls="profile-menu"
          aria-haspopup="true"
          onClick={handleMenu}
          color="inherit"
          sx={{
            '&:hover': {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            }
          }}
        >
          <Avatar 
            src={userInfo.photo} 
            sx={{ 
              width: 32, 
              height: 32,
              bgcolor: userInfo.photo ? 'transparent' : '#1976d2',
              border: isDark ? '2px solid rgba(255, 255, 255, 0.2)' : '2px solid rgba(0, 0, 0, 0.1)'
            }}
          >
            {!userInfo.photo && (userInfo.name?.charAt(0) || userInfo.email?.charAt(0) || 'U')}
          </Avatar>
        </IconButton>
      </Tooltip>

      <Menu
        id="profile-menu"
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
        PaperProps={{
          sx: {
            minWidth: 280,
            maxWidth: 320,
            mt: 1,
            boxShadow: isDark 
              ? '0 8px 32px rgba(0, 0, 0, 0.4)' 
              : '0 8px 32px rgba(0, 0, 0, 0.15)',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
            borderRadius: 2,
            overflow: 'hidden'
          }
        }}
      >
        {/* User Info Header */}
        <MenuItem onClick={handleClose} sx={{ cursor: 'default', '&:hover': { bgcolor: 'transparent' } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', py: 1 }}>
            <Avatar 
              src={userInfo.photo} 
              sx={{ 
                width: 48, 
                height: 48,
                bgcolor: userInfo.photo ? 'transparent' : '#1976d2'
              }}
            >
              {!userInfo.photo && (userInfo.name?.charAt(0) || userInfo.email?.charAt(0) || 'U')}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography 
                variant="subtitle1" 
                sx={{ 
                  fontWeight: 600,
                  color: 'text.primary',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {userInfo.name}
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: 'text.secondary',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {userInfo.email}
              </Typography>
              <Typography 
                variant="caption" 
                sx={{ 
                  color: 'text.secondary',
                  fontWeight: 500,
                  textTransform: 'capitalize'
                }}
              >
                {userInfo.role}
              </Typography>
            </Box>
          </Box>
        </MenuItem>

        <Divider />

        {/* Profile Settings */}
        <MenuItem onClick={handleProfileClick}>
          <ListItemIcon>
            <Settings fontSize="small" />
          </ListItemIcon>
          <ListItemText 
            primary="Profile Settings"
            primaryTypographyProps={{ variant: 'body2' }}
          />
        </MenuItem>

        <Divider />

        {/* Theme Toggle Section */}
        <Box sx={{ px: 2, py: 1 }}>
          <Typography 
            variant="caption" 
            sx={{ 
              color: 'text.secondary',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: 0.5
            }}
          >
            Appearance
          </Typography>
        </Box>

        <MenuItem onClick={toggleTheme} sx={{ py: 0.5 }}>
          <ListItemIcon>
            {isDark ? (
              <LightMode fontSize="small" sx={{ color: '#ffeb3b' }} />
            ) : (
              <DarkMode fontSize="small" sx={{ color: '#9c27b0' }} />
            )}
          </ListItemIcon>
          <ListItemText 
            primary={isDark ? 'Light Mode' : 'Dark Mode'}
            secondary={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            primaryTypographyProps={{ variant: 'body2' }}
            secondaryTypographyProps={{ variant: 'caption' }}
          />
          <Switch
            checked={isDark}
            onChange={toggleTheme}
            size="small"
            sx={{
              '& .MuiSwitch-thumb': {
                bgcolor: isDark ? '#ffeb3b' : '#9c27b0',
              },
              '& .MuiSwitch-track': {
                bgcolor: isDark ? 'rgba(255, 235, 59, 0.3)' : 'rgba(156, 39, 176, 0.3)',
              },
            }}
          />
        </MenuItem>

        <Divider />

        {/* Logout */}
        <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <Logout fontSize="small" sx={{ color: 'error.main' }} />
          </ListItemIcon>
          <ListItemText 
            primary="Logout"
            primaryTypographyProps={{ variant: 'body2' }}
          />
        </MenuItem>
      </Menu>
    </>
  );
};

export default ProfileDropdown;
