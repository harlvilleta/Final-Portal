import React, { useState, useEffect } from "react";
import { List, ListItem, ListItemIcon, ListItemText, Drawer, Divider, Box, Typography, Avatar, Collapse, ListItemButton, Chip } from "@mui/material";
import { Dashboard, People, Settings, Event, ExitToApp, Campaign, Report, ListAlt, History, Logout, Search, ExpandLess, ExpandMore, Assignment, MeetingRoom, Timeline, Assessment, Description, PersonAdd, School, Receipt } from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

const menu = [
  { text: "Overview", icon: <Dashboard sx={{ color: '#1976d2' }} />, path: "/overview" },
  { 
    text: "Students", 
    icon: <People sx={{ color: '#43a047' }} />, 
    path: "/students",
    hasSubmenu: true,
    submenu: [
      { text: "Student List", icon: <School sx={{ color: '#1976d2' }} />, path: "/students" },
      { text: "Add Student", icon: <PersonAdd sx={{ color: '#43a047' }} />, path: "/students/add-student" }
    ]
  },
  { 
    text: "Violations", 
    icon: <Report sx={{ color: '#d32f2f' }} />, 
    path: "/violation-record",
    hasSubmenu: true,
    submenu: [
      { text: "Record", icon: <Assignment sx={{ color: '#1976d2' }} />, path: "/violation-record" },
      { text: "Review Cases", icon: <Assessment sx={{ color: '#ff9800' }} />, path: "/violation-review" },
      { text: "Create Meeting", icon: <MeetingRoom sx={{ color: '#43a047' }} />, path: "/violation-record/create-meeting" },
      { text: "History", icon: <Timeline sx={{ color: '#fbc02d' }} />, path: "/violation-record/history" },
      { text: "Status", icon: <Assessment sx={{ color: '#8e24aa' }} />, path: "/violation-record/status" }
    ]
  },
  { text: "Receipt Review", icon: <Receipt sx={{ color: '#ff9800' }} />, path: "/receipt-review" },
  { text: "Lost & Found", icon: <Search sx={{ color: '#ff9800' }} />, path: "/lost-found" },
  { 
    text: "Activity", 
    icon: <Event sx={{ color: '#fbc02d' }} />, 
    path: "/activity",
    hasSubmenu: true,
    submenu: [
      { text: "Schedule Activity", icon: <Event sx={{ color: '#fbc02d' }} />, path: "/activity" },
      { text: "History", icon: <History sx={{ color: '#9c27b0' }} />, path: "/activity/history" }
    ]
  },
  { 
    text: "Announcements", 
    icon: <ListAlt sx={{ color: '#0288d1' }} />, 
    path: "/announcements",
    hasSubmenu: true,
    submenu: [
      { text: "Announcements", icon: <Campaign sx={{ color: '#0288d1' }} />, path: "/announcements" },
      { text: "Report", icon: <Description sx={{ color: '#ff9800' }} />, path: "/announcements/report" }
    ]
  },
  { text: "Options", icon: <Settings sx={{ color: '#8e24aa' }} />, path: "/options" },
  { text: "Exit", icon: <Logout sx={{ color: '#757575' }} />, path: "/exit" }
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [openSubmenu, setOpenSubmenu] = useState({});

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleMenuClick = (item) => {
    if (item.text === "Exit") {
      handleLogout();
    } else if (item.hasSubmenu) {
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

  const isSubmenuOpen = (itemText) => {
    return openSubmenu[itemText] || false;
  };

  const isItemSelected = (item) => {
    if (item.hasSubmenu) {
      return item.submenu.some(subItem => location.pathname.startsWith(subItem.path));
    }
    return location.pathname.startsWith(item.path);
  };

  const isSubItemSelected = (subItem) => {
    return location.pathname.startsWith(subItem.path);
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 220,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { width: 220, boxSizing: "border-box", bgcolor: "#2d3436", color: "#fff", display: 'flex', flexDirection: 'column' }
      }}
    >
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Logo Section */}
        <Box sx={{ mb: 2 }}>
          <img src="gt.jpg" alt="Logo" style={{ width: 200, height: 160, borderRadius: 10, boxShadow: '0 2px 8px #0002' }} />
        </Box>
        <Divider sx={{ width: '100%', mb: 2, bgcolor: '#b2bec3' }} />
      </Box>
      
      <List sx={{ flex: 1 }}>
        {menu.map((item) => (
          <Box key={item.text}>
            <ListItem
              button
              selected={isItemSelected(item)}
              onClick={() => handleMenuClick(item)}
              sx={{
                cursor: 'pointer',
                borderRadius: 2,
                m: 1,
                boxShadow: 1,
                transition: 'all 0.2s',
                "&.Mui-selected": { 
                  bgcolor: "#636e72",
                  boxShadow: 3,
                  transform: 'translateX(4px)'
                },
                "&:hover": { 
                  bgcolor: "#636e72", 
                  boxShadow: 3,
                  transform: 'translateX(2px)'
                }
              }}
            >
              <ListItemIcon sx={{ color: 'white' }}>{item.icon}</ListItemIcon>
              <ListItemText 
                primary={item.text} 
                sx={{ 
                  '& .MuiListItemText-primary': { 
                    fontWeight: isItemSelected(item) ? 600 : 400 
                  } 
                }}
              />
              {item.hasSubmenu && (
                isSubmenuOpen(item.text) ? <ExpandLess /> : <ExpandMore />
              )}
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
                        mx: 1,
                        mb: 0.5,
                        transition: 'all 0.2s',
                        "&.Mui-selected": { 
                          bgcolor: "#636e72",
                          transform: 'translateX(4px)'
                        },
                        "&:hover": { 
                          bgcolor: "#636e72",
                          transform: 'translateX(2px)'
                        }
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 36, color: 'white' }}>
                        {subItem.icon}
                      </ListItemIcon>
                      <ListItemText 
                        primary={subItem.text} 
                        sx={{ 
                          '& .MuiListItemText-primary': { 
                            fontWeight: isSubItemSelected(subItem) ? 600 : 400 
                          } 
                        }}
                      />
                    </ListItemButton>
                  ))}
                </List>
              </Collapse>
            )}
          </Box>
        ))}
      </List>
    </Drawer>
  );
} 