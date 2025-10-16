import React, { useState, useEffect } from "react";
import { List, ListItem, ListItemIcon, ListItemText, Drawer, Divider, Box, Typography, Avatar, Badge, Chip } from "@mui/material";
import { 
  Dashboard, Notifications, Assignment, Announcement, Search, Person, Logout, 
  Warning, CheckCircle, Info, Settings, Assessment, Schedule, Report, Event, People
} from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, getDoc, getDocs } from 'firebase/firestore';

const teacherMenu = [
  { text: "Dashboard", icon: <Dashboard sx={{ color: 'inherit' }} />, path: "/teacher-dashboard" },
  { text: "My Classrooms", icon: <People sx={{ color: 'inherit' }} />, path: "/teacher-my-students" },
  { text: "Violation Records", icon: <Report sx={{ color: 'inherit' }} />, path: "/teacher-violation-records" },
  { text: "Activity Scheduler", icon: <Event sx={{ color: 'inherit' }} />, path: "/teacher-activity-scheduler" },
  { text: "Announcements", icon: <Announcement sx={{ color: 'inherit' }} />, path: "/teacher-announcements" },
  { text: "Activities", icon: <Schedule sx={{ color: 'inherit' }} />, path: "/activity" },
  { text: "Schedule", icon: <Schedule sx={{ color: 'inherit' }} />, path: "/teacher-schedule" },
  { text: "Notifications", icon: <Notifications sx={{ color: 'inherit' }} />, path: "/teacher-notifications" },
  { text: "Lost & Found", icon: <Search sx={{ color: 'inherit' }} />, path: "/teacher-lost-found" },
  { text: "Account Settings", icon: <Settings sx={{ color: 'inherit' }} />, path: "/teacher-profile" },
];

export default function TeacherSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMeetings, setUnreadMeetings] = useState(0);
  const [unreadLostFound, setUnreadLostFound] = useState(0);
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

    // Regular notifications
    const notificationsQuery = query(
      collection(db, "notifications"),
      where("recipientEmail", "==", currentUser.email),
      where("read", "==", false)
    );

    const unsubscribeNotifications = onSnapshot(notificationsQuery, (snapshot) => {
      setUnreadNotifications(snapshot.docs.length);
    });

    // Meeting notifications
    const meetingsQuery = query(
      collection(db, "meetings"),
      where("participants", "array-contains", currentUser.email)
    );

    const unsubscribeMeetings = onSnapshot(meetingsQuery, (snapshot) => {
      setUnreadMeetings(snapshot.docs.length);
    });

    // Lost & Found notifications
    const lostFoundQuery = query(collection(db, "lost_items"));
    const foundItemsQuery = query(collection(db, "found_items"));

    const unsubscribeLost = onSnapshot(lostFoundQuery, (snapshot) => {
      const lostCount = snapshot.docs.length;
      getDocs(foundItemsQuery).then(foundSnap => {
        const foundCount = foundSnap.docs.length;
        setUnreadLostFound(lostCount + foundCount);
      });
    });

    return () => {
      unsubscribeNotifications();
      unsubscribeMeetings();
      unsubscribeLost();
    };
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
    <Drawer
      variant="permanent"
      sx={{
        width: 280,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 280,
          boxSizing: 'border-box',
          bgcolor: '#2d3436',
          color: '#fff',
          borderRight: '1px solid #636e72',
          overflowX: 'hidden',
        },
      }}
    >
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Logo Section */}
        <Box sx={{ mb: 2 }}>
          <img src="gt.jpg" alt="Logo" style={{ width: 200, height: 160, borderRadius: 10, boxShadow: '0 2px 8px #0002' }} />
        </Box>
        <Divider sx={{ width: '100%', mb: 2, bgcolor: '#b2bec3' }} />
      </Box>
      
      <List sx={{ 
        flex: 1,
        overflowY: 'auto',
        '&::-webkit-scrollbar': {
          display: 'none'
        },
        scrollbarWidth: 'none', // Firefox
        msOverflowStyle: 'none' // IE and Edge
      }}>
        {teacherMenu.map((item, index) => (
          <ListItem
            key={index}
            button
            onClick={() => navigate(item.path)}
            sx={{
              mb: 1,
              borderRadius: 2,
              mx: 1,
              bgcolor: location.pathname === item.path ? '#636e72' : 'transparent',
              color: location.pathname === item.path ? '#fff' : '#b2bec3',
              transition: 'all 0.2s',
              '&:hover': {
                bgcolor: location.pathname === item.path ? '#636e72' : '#4a5568',
                transform: 'translateX(4px)',
                boxShadow: 2
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: 'white' }}>
              {item.text === "Notifications" ? (
                <Badge badgeContent={unreadNotifications + unreadMeetings + unreadLostFound} color="error">
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

        <Divider sx={{ my: 2, bgcolor: '#b2bec3' }} />

        <ListItem
          button
          onClick={handleLogout}
          sx={{
            borderRadius: 2,
            mx: 1,
            '&:hover': {
              bgcolor: '#d32f2f',
              transform: 'translateX(4px)',
              boxShadow: 2
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 40 }}>
            <Logout sx={{ color: '#ff6b6b' }} />
          </ListItemIcon>
          <ListItemText 
            primary="Logout" 
            sx={{ 
              '& .MuiListItemText-primary': {
                color: '#ff6b6b',
                fontWeight: 500,
              }
            }}
          />
        </ListItem>
      </List>

      {/* Notification Summary removed per requirement */}
    </Drawer>
  );
} 