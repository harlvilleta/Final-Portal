import React, { useState, useEffect } from 'react';
import { Badge, IconButton, Tooltip, Menu, MenuItem, Typography, Box, Divider, List, ListItem, ListItemText, ListItemIcon, Avatar, Chip } from '@mui/material';
import { Notifications, CheckCircle, Cancel, PersonAddAlt1, Warning, Search, Event, Assignment, Share } from '@mui/icons-material';
import { collection, query, where, orderBy, getDocs, onSnapshot, limit, updateDoc, doc } from 'firebase/firestore';
import { db, auth } from '../firebase';

export default function NotificationBadge() {
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!currentUser?.email) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const fetchUserNotifications = async () => {
      try {
        // Fetch notifications for the current user only
        const notificationsQuery = query(
          collection(db, "notifications"),
          where("recipientEmail", "==", currentUser.email),
          orderBy("createdAt", "desc"),
          limit(20)
        );

        const unsubscribeNotifications = onSnapshot(notificationsQuery, (snapshot) => {
          const allNotifications = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            type: doc.data().type || 'general',
            timestamp: doc.data().createdAt
          }));
          
          // Filter out enrollment/joining related notifications for students
          const filteredNotifications = allNotifications.filter(notification => {
            // Exclude notifications related to student enrollment, joining, or registration
            const title = notification.title?.toLowerCase() || '';
            const message = notification.message?.toLowerCase() || '';
            const type = notification.type?.toLowerCase() || '';
            
            // Keywords to exclude (but allow classroom_addition notifications)
            const excludeKeywords = [
              'enrollment', 'enroll', 'joining', 'joined', 'registration', 'register',
              'student added', 'new student', 'student created', 'account created',
              'welcome new student', 'student registration', 'enrolled student'
            ];
            
            // Allow classroom_addition notifications
            if (type === 'classroom_addition') {
              return true;
            }
            
            // Check if notification contains any exclusion keywords
            const shouldExclude = excludeKeywords.some(keyword => 
              title.includes(keyword) || message.includes(keyword) || type.includes(keyword)
            );
            
            // Only show lost and found, announcements, and other non-enrollment notifications
            return !shouldExclude;
          });
          
          const unreadCount = filteredNotifications.filter(n => !n.read).length;
          console.log('NotificationBadge: Updated notifications count:', unreadCount);
          
          setNotifications(filteredNotifications);
          setUnreadCount(unreadCount);
        }, (error) => {
          console.error('Error listening to notifications:', error);
        });

        return unsubscribeNotifications;
      } catch (error) {
        console.error('Error setting up notification listeners:', error);
        return () => {};
      }
    };

    const unsubscribe = fetchUserNotifications();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [currentUser]);

  const markAsRead = async (notificationId) => {
    try {
      await updateDoc(doc(db, "notifications", notificationId), {
        read: true
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read if not already read
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    
    // Close the menu
    handleClose();
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'teacher_request':
        return <PersonAddAlt1 />;
      case 'violation':
        return <Warning />;
      case 'lost_found':
        return <Search />;
      case 'activity_request':
        return <Event />;
      case 'activity':
        return <Event />;
      case 'event':
        return <Event />;
      case 'meeting':
        return <Assignment />;
      case 'announcement':
        return <Notifications />;
      case 'classroom_addition':
        return <PersonAddAlt1 />;
      case 'post_shared':
        return <Share />;
      default:
        return <Notifications />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'teacher_request':
        return 'warning';
      case 'violation':
        return 'error';
      case 'lost_found':
        return 'info';
      case 'activity_request':
        return 'success';
      case 'activity':
        return 'success';
      case 'event':
        return 'success';
      case 'meeting':
        return 'primary';
      case 'announcement':
        return 'secondary';
      case 'classroom_addition':
        return 'success';
      case 'post_shared':
        return 'info';
      default:
        return 'primary';
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now - time) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton
          color="inherit"
          onClick={handleClick}
          sx={{ position: 'relative' }}
        >
          <Badge badgeContent={unreadCount} color="error">
            <Notifications />
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: { width: 350, maxHeight: 400 }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            All Notifications
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </Typography>
        </Box>

        {notifications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No notifications
            </Typography>
          </Box>
        ) : (
          <List sx={{ maxHeight: 300, overflow: 'auto' }}>
            {notifications.map((notification, index) => (
              <React.Fragment key={notification.id}>
                <ListItem 
                  sx={{ 
                    py: 1.5,
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: 'action.hover'
                    }
                  }}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <ListItemIcon>
                    <Avatar sx={{ bgcolor: `${getNotificationColor(notification.type)}.light`, width: 32, height: 32 }}>
                      {getNotificationIcon(notification.type)}
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: notification.read ? 400 : 600 }}>
                          {notification.title || 'Notification'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ 
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {notification.message || 'No message'}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          {formatTimeAgo(notification.timestamp)}
                        </Typography>
                        <Chip
                          label={notification.type?.replace('_', ' ').toUpperCase() || 'GENERAL'}
                          size="small"
                          color={getNotificationColor(notification.type)}
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                        {!notification.read && (
                          <Chip
                            label="NEW"
                            size="small"
                            color="error"
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        )}
                      </Box>
                    }
                  />
                </ListItem>
                {index < notifications.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}

        <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0', textAlign: 'center' }}>
          <Typography 
            variant="body2" 
            color="primary" 
            sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
            onClick={() => {
              handleClose();
              // Navigate to appropriate notifications page based on user role
              const currentPath = window.location.pathname;
              if (currentPath.includes('/teacher-')) {
                window.location.href = '/teacher-notifications';
              } else if (currentPath.includes('/user-') || currentPath === '/') {
                window.location.href = '/notifications';
              } else {
                window.location.href = '/notifications';
              }
            }}
          >
            View All Notifications
          </Typography>
        </Box>
      </Menu>
    </>
  );
}





