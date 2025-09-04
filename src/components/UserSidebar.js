import React, { useState, useEffect } from "react";
import { List, ListItem, ListItemIcon, ListItemText, Drawer, Divider, Box, Typography, Avatar, Badge, Chip } from "@mui/material";
import { 
  Dashboard, Notifications, Assignment, Announcement, Search, Person, Logout, 
  Warning, CheckCircle, Info, Settings, Receipt, History
} from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';

const userMenu = [
  { text: "Dashboard", icon: <Dashboard sx={{ color: '#1976d2' }} />, path: "/" },
  { text: "My Violations", icon: <Assignment sx={{ color: '#d32f2f' }} />, path: "/violations" },
  { text: "Announcements", icon: <Announcement sx={{ color: '#0288d1' }} />, path: "/announcements" },
  { text: "Lost & Found", icon: <Search sx={{ color: '#43a047' }} />, path: "/lost-found" },
  { text: "Activities", icon: <History sx={{ color: '#00acc1' }} />, path: "/activity" },
  { text: "Receipt Submission", icon: <Receipt sx={{ color: '#ff9800' }} />, path: "/receipt-submission" },
  { text: "Notifications", icon: <Notifications sx={{ color: '#f57c00' }} />, path: "/notifications" },
  { text: "Account Settings", icon: <Settings sx={{ color: '#9c27b0' }} />, path: "/profile" },
];

export default function UserSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      
      if (user) {
        try {
          // Fetch user profile from Firestore
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setUserProfile(userDoc.data());
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!currentUser?.email) return;

    const notificationsQuery = query(
      collection(db, "notifications"),
      where("recipientEmail", "==", currentUser.email),
      where("read", "==", false)
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      setUnreadNotifications(snapshot.docs.length);
    });

    return unsubscribe;
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Get user display info
  const getUserDisplayInfo = () => {
    if (userProfile) {
      return {
        name: userProfile.fullName || currentUser?.displayName || 'Student',
        email: userProfile.email || currentUser?.email,
        photo: userProfile.profilePic || currentUser?.photoURL,
        role: userProfile.role || 'Student'
      };
    }
    return {
      name: currentUser?.displayName || 'Student',
      email: currentUser?.email,
      photo: currentUser?.photoURL,
      role: 'Student'
    };
  };

  const userInfo = getUserDisplayInfo();

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 280,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 280,
          boxSizing: 'border-box',
          bgcolor: '#fff',
          borderRight: '1px solid #e0e0e0',
        },
      }}
    >
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Logo Section */}
        <Box sx={{ mb: 2 }}>
          <img src="gt.jpg" alt="Logo" style={{ width: 200, height: 160, borderRadius: 10, boxShadow: '0 2px 8px #0002' }} />
        </Box>
        <Divider sx={{ width: '100%', mb: 2, bgcolor: '#e0e0e0' }} />
      </Box>
      
      <List sx={{ flex: 1 }}>
        {userMenu.map((item, index) => (
          <ListItem
            key={index}
            button
            onClick={() => navigate(item.path)}
            sx={{
              mb: 1,
              borderRadius: 2,
              bgcolor: location.pathname === item.path ? '#e3f2fd' : 'transparent',
              color: location.pathname === item.path ? '#1976d2' : 'inherit',
              '&:hover': {
                bgcolor: location.pathname === item.path ? '#e3f2fd' : '#f5f5f5',
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              {item.text === "Notifications" ? (
                <Badge badgeContent={unreadNotifications} color="error">
                  {item.icon}
                </Badge>
              ) : (
                item.icon
              )}
            </ListItemIcon>
            <ListItemText 
              primary={item.text} 
              sx={{ 
                '& .MuiListItemText-primary': {
                  fontWeight: location.pathname === item.path ? 600 : 400,
                }
              }}
            />
          </ListItem>
        ))}

        <Divider sx={{ my: 2 }} />

        <ListItem
          button
          onClick={handleLogout}
          sx={{
            borderRadius: 2,
            '&:hover': {
              bgcolor: '#ffebee',
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 40 }}>
            <Logout sx={{ color: '#d32f2f' }} />
          </ListItemIcon>
          <ListItemText 
            primary="Logout" 
            sx={{ 
              '& .MuiListItemText-primary': {
                color: '#d32f2f',
                fontWeight: 500,
              }
            }}
          />
        </ListItem>
      </List>

      {/* Notification Summary */}
      {unreadNotifications > 0 && (
        <Box sx={{ p: 2, mt: 'auto', borderTop: '1px solid #e0e0e0' }}>
          <Chip
            icon={<Warning />}
            label={`${unreadNotifications} unread notification${unreadNotifications > 1 ? 's' : ''}`}
            color="error"
            variant="outlined"
            sx={{ width: '100%', justifyContent: 'flex-start' }}
            onClick={() => navigate('/notifications')}
          />
        </Box>
      )}
    </Drawer>
  );
} 