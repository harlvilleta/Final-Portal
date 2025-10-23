import React, { useState, useEffect } from 'react';
import { Box, AppBar, Toolbar, Typography, IconButton, Badge, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, useTheme } from '@mui/material';
import { Notifications, Mail } from '@mui/icons-material';
import ProfileDropdown from './ProfileDropdown';
import { db } from '../firebase';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, query, where, onSnapshot, orderBy, addDoc } from 'firebase/firestore';

export default function TeacherHeader({ currentUser, userProfile }) {
  const theme = useTheme();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [composeOpen, setComposeOpen] = useState(false);
  const [compose, setCompose] = useState({ subject: '', message: '' });
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
      <AppBar position="static" sx={{ bgcolor: theme => theme.palette.mode === 'dark' ? '#424242' : 'background.paper', color: theme => theme.palette.mode === 'dark' ? '#ffffff' : 'text.primary', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', height: '32px' }}>
        <Toolbar sx={{ display: 'flex', alignItems: 'center', width: '100%', minHeight: '32px !important' }}>
          <Box sx={{ flex: 1 }}></Box>
        </Toolbar>
      </AppBar>
      {/* Profile and Notification Icons - Outside Header Box */}
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
          aria-label="mail to admin"
          onClick={() => setComposeOpen(true)}
          color="inherit"
          sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#333' }}
        >
          <Mail />
        </IconButton>
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
    </>
  );
} 