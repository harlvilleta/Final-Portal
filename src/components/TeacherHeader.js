import React, { useState, useEffect } from 'react';
import { Box, AppBar, Toolbar, Typography, Avatar, Chip, IconButton, Menu, MenuItem, Badge, ListItemText, ListItemIcon, Divider, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, useTheme } from '@mui/material';
import { AccountCircle, Logout, Notifications, Settings, CheckCircle, Warning, Info, Mail } from '@mui/icons-material';
import ProfileDropdown from './ProfileDropdown';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, orderBy, addDoc } from 'firebase/firestore';

export default function TeacherHeader({ currentUser, userProfile }) {
  const theme = useTheme();
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


  return (
    <AppBar position="static" sx={{ bgcolor: 'background.paper', color: 'text.primary', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <Box sx={{ flex: 0.5 }}></Box>
        <Typography variant="h4" component="div" sx={{ 
          fontWeight: 700, 
          color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000', 
          flex: 1, 
          textAlign: 'center', 
          ml: -2 
        }}>
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
              aria-label="notifications"
              onClick={handleNotificationMenu}
              color="inherit"
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
        </Box>
      </Toolbar>


      {/* Notifications Menu */}
      <Menu
        anchorEl={notificationAnchorEl}
        open={Boolean(notificationAnchorEl)}
        onClose={handleNotificationClose}
        PaperProps={{
          style: {
            maxHeight: 400,
            width: 350,
          },
        }}
      >
        <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Notifications
          </Typography>
        </Box>
        {notifications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No notifications
            </Typography>
          </Box>
        ) : (
          notifications.slice(0, 10).map((notification) => (
            <MenuItem
              key={notification.id}
              onClick={() => {
                // Mark as read if not already read
                if (!notification.read) {
                  // You can add a function to mark as read here
                }
                handleNotificationClose();
              }}
              sx={{
                borderBottom: '1px solid #f0f0f0',
                backgroundColor: notification.read ? 'transparent' : '#f8f9fa',
                '&:hover': {
                  backgroundColor: notification.read ? '#f5f5f5' : '#e3f2fd',
                },
              }}
            >
              <Box sx={{ width: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                  <Box sx={{ mt: 0.5 }}>
                    {notification.type === 'booking_approval' ? (
                      notification.status === 'approved' ? (
                        <CheckCircle sx={{ color: '#4caf50', fontSize: 20 }} />
                      ) : (
                        <Warning sx={{ color: '#f44336', fontSize: 20 }} />
                      )
                    ) : (
                      <Info sx={{ color: '#2196f3', fontSize: 20 }} />
                    )}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: notification.read ? 400 : 600,
                        color: notification.read ? 'text.secondary' : 'text.primary',
                        mb: 0.5,
                      }}
                    >
                      {notification.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: 'text.secondary',
                        fontSize: '0.875rem',
                        lineHeight: 1.4,
                      }}
                    >
                      {notification.message}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'text.secondary',
                        fontSize: '0.75rem',
                        mt: 0.5,
                        display: 'block',
                      }}
                    >
                      {new Date(notification.createdAt).toLocaleString()}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </MenuItem>
          ))
        )}
        {notifications.length > 10 && (
          <Box sx={{ p: 2, textAlign: 'center', borderTop: '1px solid #e0e0e0' }}>
            <Typography variant="caption" color="text.secondary">
              Showing latest 10 notifications
            </Typography>
          </Box>
        )}
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