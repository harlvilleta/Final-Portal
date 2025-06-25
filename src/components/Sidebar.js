import React from "react";
import { List, ListItem, ListItemIcon, ListItemText, Drawer, Divider, Box, Typography, Avatar } from "@mui/material";
import { Dashboard, People, Settings, Event, ExitToApp, Campaign, Report, ListAlt, History, Logout, Search } from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
// import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
// import { db } from "../firebase";

const menu = [
  { text: "Overview", icon: <Dashboard sx={{ color: '#1976d2' }} />, path: "/overview" },
  { text: "Students", icon: <People sx={{ color: '#43a047' }} />, path: "/students" },
  { text: "Violations", icon: <Report sx={{ color: '#d32f2f' }} />, path: "/violation-record" },
  { text: "Activity", icon: <Event sx={{ color: '#fbc02d' }} />, path: "/activity" },
  { text: "Announcements", icon: <ListAlt sx={{ color: '#0288d1' }} />, path: "/announcements" },
  { text: "Options", icon: <Settings sx={{ color: '#8e24aa' }} />, path: "/options" },
  { text: "Lost and Found Item", icon: <Search sx={{ color: '#00bcd4' }} />, path: "/students/lost-found" },
  { text: "Exit", icon: <Logout sx={{ color: '#757575' }} />, path: "/exit" }
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  // const [recent, setRecent] = useState([]);
  // const [loading, setLoading] = useState(true);

  // useEffect(() => {
  //   // Fetch recent activity logs from Firebase (activity_log collection)
  //   const fetchRecent = async () => {
  //     setLoading(true);
  //     try {
  //       const q = query(collection(db, "activity_log"), orderBy("timestamp", "desc"), limit(8));
  //       const snap = await getDocs(q);
  //       setRecent(snap.docs.map(doc => doc.data()));
  //     } catch (e) {
  //       setRecent([]);
  //     }
  //     setLoading(false);
  //   };
  //   fetchRecent();
  // }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
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
          <img src="2c.jpg" alt="Logo" style={{ width: 200, height: 160, borderRadius: 10, boxShadow: '0 2px 8px #0002' }} />
        </Box>
        <Divider sx={{ width: '100%', mb: 2, bgcolor: '#b2bec3' }} />
      </Box>
      <List>
        {menu.map((item) => (
          <ListItem
            button
            key={item.text}
            selected={location.pathname.startsWith(item.path)}
            onClick={() => item.text === "Exit" ? handleLogout() : navigate(item.path)}
            sx={{
              cursor: 'pointer',
              borderRadius: 2,
              m: 1,
              boxShadow: 1,
              transition: 'background 0.2s',
              "&.Mui-selected": { bgcolor: "#636e72" },
              "&:hover": { bgcolor: "#636e72", boxShadow: 3 }
            }}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
    </Drawer>
  );
} 