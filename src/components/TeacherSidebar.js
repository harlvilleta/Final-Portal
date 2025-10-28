import React, { useState, useEffect } from "react";
import { List, ListItem, ListItemIcon, ListItemText, Drawer, Divider, Box, Collapse, ListItemButton, Badge, Typography } from "@mui/material";
import { Dashboard, Settings, Event, Logout, Campaign, Report, ListAlt, History, Search, ExpandLess, ExpandMore, Assignment, Assessment, Schedule, Description } from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, getDoc, getDocs } from 'firebase/firestore';

const menu = [
  { text: "Dashboard", icon: <Dashboard sx={{ color: 'inherit' }} />, path: "/teacher-dashboard" },
  { text: "Violation Records", icon: <Report sx={{ color: 'inherit' }} />, path: "/teacher-violation-records" },
  { 
    text: "Activity", 
    icon: <Event sx={{ color: 'inherit' }} />, 
    hasSubmenu: true,
    submenu: [
      { text: "Activity Scheduler", icon: <Schedule sx={{ color: 'inherit' }} />, path: "/teacher-activity-scheduler" },
      { text: "Request", icon: <Assignment sx={{ color: 'inherit' }} />, path: "/teacher-activity-requests" }
    ]
  },
  { text: "Announcements", icon: <ListAlt sx={{ color: 'inherit' }} />, path: "/teacher-announcements" },
  { text: "Schedule", icon: <Schedule sx={{ color: 'inherit' }} />, path: "/teacher-schedule" },
  { text: "Lost & Found", icon: <Search sx={{ color: 'inherit' }} />, path: "/teacher-lost-found" },
  { text: "Account Settings", icon: <Settings sx={{ color: 'inherit' }} />, path: "/teacher-profile" }
];

export default function TeacherSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [openSubmenu, setOpenSubmenu] = useState({});
  const [unreadMeetings, setUnreadMeetings] = useState(0);
  const [unreadLostFound, setUnreadLostFound] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
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

    const meetingsQuery = query(
      collection(db, "meetings"),
      where("participants", "array-contains", currentUser.email)
    );
    const unsubscribeMeetings = onSnapshot(meetingsQuery, (snapshot) => {
      setUnreadMeetings(snapshot.docs.length);
    });

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

  const handleMenuClick = (item) => {
    if (item.hasSubmenu) {
      setOpenSubmenu(prev => ({
        ...prev,
        [item.text]: !prev[item.text]
      }));
    } else {
      navigate(item.path);
    }
  };

  const handleSubmenuClick = (subItem) => {
    navigate(subItem.path);
  };

  const isSubmenuOpen = (itemText) => openSubmenu[itemText] || false;

  const isItemSelected = (item) => {
    if (item.hasSubmenu) {
      return item.submenu.some(subItem => location.pathname.startsWith(subItem.path));
    }
    return location.pathname.startsWith(item.path);
  };

  const isSubItemSelected = (subItem) => location.pathname.startsWith(subItem.path);

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 230,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { width: 230, boxSizing: "border-box", bgcolor: "#8B0000", color: "#fff", display: 'flex', flexDirection: 'column', overflowX: 'hidden' }
      }}
    >
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Box sx={{ mb: 1 }}>
          <img src="/441.jpg" alt="Logo" style={{ width: 180, height: 144, borderRadius: 10, boxShadow: '0 2px 8px #0002' }} />
        </Box>
        {/* System Title */}
        <Typography 
          variant="caption" 
          sx={{ 
            color: '#ffffff', 
            fontWeight: 600, 
            fontSize: '0.7rem', 
            textAlign: 'center', 
            lineHeight: 1.2,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            mb: 1
          }}
        >
          Student Affairs Management System
        </Typography>
        <Divider sx={{ width: '100%', mb: 2, bgcolor: '#b2bec3' }} />
      </Box>

      <List sx={{ 
        flex: 1,
        overflowY: 'auto',
        '&::-webkit-scrollbar': { display: 'none' },
        scrollbarWidth: 'none',
        msOverflowStyle: 'none'
      }}>
        {menu.map((item) => (
          <Box key={item.text}>
            <ListItem
              button
              selected={isItemSelected(item)}
              onClick={() => handleMenuClick(item)}
              sx={{
                mb: 1,
                borderRadius: 2,
                bgcolor: isItemSelected(item) ? '#A52A2A' : 'transparent',
                color: isItemSelected(item) ? '#fff' : '#e8e8e8',
                '&:hover': {
                  bgcolor: isItemSelected(item) ? '#A52A2A' : '#8B0000',
                  transform: 'translateX(4px)',
                  boxShadow: 2,
                  color: '#fff'
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 32, color: 'white', '& .MuiSvgIcon-root': { fontSize: '1rem' } }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text} 
                primaryTypographyProps={{ noWrap: true }}
                sx={{ '& .MuiListItemText-primary': { fontWeight: isItemSelected(item) ? 600 : 400, fontSize: '0.875rem', lineHeight: 1.2, textAlign: 'left' } }}
              />
              {/* Removed dropdown icons - menu expands/collapses on click */}
            </ListItem>
            {item.hasSubmenu && (
              <Collapse in={isSubmenuOpen(item.text)} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  {item.submenu.map((subItem) => (
                    <ListItemButton
                      key={subItem.text}
                      selected={isSubItemSelected(subItem)}
                      onClick={() => handleSubmenuClick(subItem)}
                      sx={{
                        pl: 4,
                        borderRadius: 2,
                        mb: 0.5,
                        bgcolor: isSubItemSelected(subItem) ? '#A52A2A' : 'transparent',
                        color: isSubItemSelected(subItem) ? '#fff' : '#e8e8e8',
                        '&:hover': {
                          bgcolor: isSubItemSelected(subItem) ? '#A52A2A' : '#8B0000',
                          transform: 'translateX(4px)',
                          boxShadow: 2,
                          color: '#fff'
                        }
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 32, color: 'white', '& .MuiSvgIcon-root': { fontSize: '0.9rem' } }}>
                        {subItem.icon}
                      </ListItemIcon>
                      <ListItemText 
                        primary={subItem.text} 
                        primaryTypographyProps={{ noWrap: true }}
                        sx={{ '& .MuiListItemText-primary': { fontWeight: isSubItemSelected(subItem) ? 600 : 400, fontSize: '0.8rem', lineHeight: 1.2, textAlign: 'left' } }}
                      />
                    </ListItemButton>
                  ))}
                </List>
              </Collapse>
            )}
          </Box>
        ))}

        <Divider sx={{ my: 2, bgcolor: '#b2bec3' }} />

        <ListItem
          button
          onClick={handleLogout}
          sx={{
            borderRadius: 2,
            '&:hover': {
              bgcolor: '#d32f2f',
              transform: 'translateX(4px)',
              boxShadow: 2
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 32, '& .MuiSvgIcon-root': { fontSize: '1rem' } }}>
            <Logout sx={{ color: '#ff6b6b' }} />
          </ListItemIcon>
          <ListItemText 
            primary="Logout" 
            sx={{ '& .MuiListItemText-primary': { color: '#ff6b6b', fontWeight: 500, fontSize: '0.875rem', lineHeight: 1.2, textAlign: 'left' } }}
          />
        </ListItem>
      </List>
    </Drawer>
  );
}