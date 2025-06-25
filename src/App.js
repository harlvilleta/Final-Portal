import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Box } from "@mui/material";
import Sidebar from "./components/Sidebar";
import Overview from "./pages/Overview";
import Students from "./pages/Students";
import Activity from "./pages/Activity";
import History from "./pages/History";
import Profile from "./pages/Profile";
import ViolationRecord from "./pages/ViolationRecord";
import Options from "./pages/Options";
import Announcements from "./pages/Announcements";
import RecycleBin from "./pages/RecycleBin";
import Login from './pages/Login';
import Register from './pages/Register';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/*" element={
          <Box sx={{ display: "flex", height: "100vh", bgcolor: "#f5f6fa" }}>
            <Sidebar />
            <Box sx={{ flex: 1, p: 3, overflowY: "auto" }}>
              <Routes>
                <Route path="/" element={<Navigate to="/overview" />} />
                <Route path="/overview" element={<Overview />} />
                <Route path="/students/*" element={<Students />} />
                <Route path="/activity/*" element={<Activity />} />
                <Route path="/history" element={<History />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/violation-record/*" element={<ViolationRecord />} />
                <Route path="/options" element={<Options />} />
                <Route path="/announcements" element={<Announcements />} />
                <Route path="/recycle-bin" element={<RecycleBin />} />
              </Routes>
            </Box>
          </Box>
        } />
      </Routes>
    </Router>
  );
}

export default App; 