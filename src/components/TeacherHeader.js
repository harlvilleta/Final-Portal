import React, { useState, useEffect } from 'react';
import { Box, AppBar, Toolbar, Typography, IconButton, Badge, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, useTheme } from '@mui/material';
import { Notifications } from '@mui/icons-material';
import ProfileDropdown from './ProfileDropdown';
import { db } from '../firebase';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, query, where, onSnapshot, orderBy, addDoc } from 'firebase/firestore';

export default function TeacherHeader({ currentUser, userProfile }) {
  const theme = useTheme();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [previousPage, setPreviousPage] = useState('/teacher-dashboard');
  const [isOnNotificationsPage, setIsOnNotificationsPage] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

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

  // Track location changes to update notification page state
  useEffect(() => {
    const currentPath = location.pathname;
    if (currentPath === '/teacher-notifications') {
      setIsOnNotificationsPage(true);
    } else {
      setIsOnNotificationsPage(false);
    }
  }, [location.pathname]);


  const handleNotificationClick = (event) => {
    // If we're currently on the notifications page, go back to previous page
    if (isOnNotificationsPage) {
      navigate(previousPage);
      setIsOnNotificationsPage(false);
    } else {
      // If we're not on notifications page, save current page and go to notifications
      setPreviousPage(location.pathname);
      navigate('/teacher-notifications');
      setIsOnNotificationsPage(true);
    }
  };



  return (
    <>
      {/* Profile and Notification Icons - Fixed Position */}
      <Box sx={{ 
        position: 'fixed', 
        top: '4px', 
        right: '16px', 
        display: 'flex', 
        alignItems: 'center', 
        gap: 2, 
        zIndex: 1300 
      }}>
        <IconButton
          size="large"
          aria-label="notifications"
          onClick={handleNotificationClick}
          color="inherit"
          sx={{ 
            bgcolor: unreadCount > 0 ? '#ffebee' : 'transparent',
            '&:hover': { bgcolor: unreadCount > 0 ? '#ffcdd2' : '#f5f5f5' },
            color: theme.palette.mode === 'dark' ? '#ffffff' : '#333'
          }}
        >
          <Badge badgeContent={unreadCount} color="error">
            <Notifications />
          </Badge>
        </IconButton>
        <ProfileDropdown 
          currentUser={currentUser} 
          userProfile={userProfile}
          profileRoute="/teacher-profile"
        />
      </Box>



    </>
  );
} 