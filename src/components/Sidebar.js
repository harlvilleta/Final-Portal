import React, { useState, useEffect } from "react";
import { List, ListItem, ListItemIcon, ListItemText, Drawer, Divider, Box, Typography, Avatar, Collapse, ListItemButton, Chip } from "@mui/material";
import { Dashboard, Settings, Event, ExitToApp, Campaign, Report, ListAlt, History, Logout, Search, ExpandLess, ExpandMore, Assignment, MeetingRoom, Timeline, Assessment, Description, School, Receipt, PersonAdd } from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

const menu = [
  { text: "Overview", icon: <Dashboard sx={{ color: 'inherit' }} />, path: "/overview" },
  { text: "Student List", icon: <School sx={{ color: 'inherit' }} />, path: "/students" },
  { text: "Teacher Request", icon: <PersonAdd sx={{ color: 'inherit' }} />, path: "/teacher-request" },
  { 
    text: "Violations", 
    icon: <Report sx={{ color: 'inherit' }} />, 
    path: "/violation-record",
    hasSubmenu: true,
    submenu: [
      { text: "Record", icon: <Assignment sx={{ color: 'inherit' }} />, path: "/violation-record" },
      { text: "Review Cases", icon: <Assessment sx={{ color: 'inherit' }} />, path: "/violation-review" },
      { text: "Create Meeting", icon: <MeetingRoom sx={{ color: 'inherit' }} />, path: "/violation-record/create-meeting" },
      { text: "Status", icon: <Assessment sx={{ color: 'inherit' }} />, path: "/violation-record/status" }
    ]
  },
{ text: "Receipt Review", icon: <Receipt sx={{ color: 'inherit' }} />, path: "/receipt-review" },
{ text: "Lost & Found", icon: <Search sx={{ color: 'inherit' }} />, path: "/lost-found" },
  { 
    text: "Activity", 
    icon: <Event sx={{ color: 'inherit' }} />,
    path: "/activity",
    hasSubmenu: true,
    submenu: [
      { text: "View Activities", icon: <Event sx={{ color: 'inherit' }} />, path: "/activity" },
      { text: "Activity Scheduler", icon: <Event sx={{ color: 'inherit' }} />, path: "/admin-activity-scheduler" },
      { text: "Requests", icon: <History sx={{ color: 'inherit' }} />, path: "/activity/requests" }
    ]
  },
  { 
    text: "Announcements", 
    icon: <ListAlt sx={{ color: 'inherit' }} />, 
    path: "/announcements",
    hasSubmenu: true,
    submenu: [
      { text: "Announcements", icon: <Campaign sx={{ color: 'inherit' }} />, path: "/announcements" },
      { text: "Report", icon: <Description sx={{ color: 'inherit' }} />, path: "/announcements/report" }
    ]
  },
{ text: "Options", icon: <Settings sx={{ color: 'inherit' }} />, path: "/options" }
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
        width: 230,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { width: 230, boxSizing: "border-box", bgcolor: "#2d3436", color: "#fff", display: 'flex', flexDirection: 'column', overflowX: 'hidden' }
      }}
    >
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Logo Section */}
        <Box sx={{ mb: 2 }}>
          <img src="/gt.jpg" alt="Logo" style={{ width: 180, height: 144, borderRadius: 10, boxShadow: '0 2px 8px #0002' }} />
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
        {menu.map((item) => (
          <Box key={item.text}>
            <ListItem
              button
              selected={isItemSelected(item)}
              onClick={() => handleMenuClick(item)}
              sx={{
                mb: 1,
                borderRadius: 2,
                bgcolor: isItemSelected(item) ? '#636e72' : 'transparent',
                color: isItemSelected(item) ? '#fff' : '#e8e8e8',
                '&:hover': {
                  bgcolor: isItemSelected(item) ? '#636e72' : '#4a5568',
                  transform: 'translateX(4px)',
                  boxShadow: 2,
                  color: '#fff'
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: 'white' }}>{item.icon}</ListItemIcon>
              <ListItemText 
                primary={item.text} 
                primaryTypographyProps={{ noWrap: true }}
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
                        mb: 0.5,
                        bgcolor: isSubItemSelected(subItem) ? '#636e72' : 'transparent',
                        color: isSubItemSelected(subItem) ? '#fff' : '#e8e8e8',
                        '&:hover': {
                          bgcolor: isSubItemSelected(subItem) ? '#636e72' : '#4a5568',
                          transform: 'translateX(4px)',
                          boxShadow: 2,
                          color: '#fff'
                        }
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 40, color: 'white' }}>
                        {subItem.icon}
                      </ListItemIcon>
                      <ListItemText 
                        primary={subItem.text} 
                        primaryTypographyProps={{ noWrap: true }}
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
    </Drawer>
  );
} 