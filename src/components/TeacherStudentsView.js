import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Alert,
  CircularProgress
} from '@mui/material';
import Students from '../pages/Students';

export default function TeacherStudentsView({ currentUser }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading...</Typography>
      </Box>
    );
  }

  if (!currentUser) {
    return (
      <Alert severity="error">
        You must be logged in to view this page.
      </Alert>
    );
  }

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Access Restricted
        </Typography>
        <Typography>
          As a teacher, you can only view and manage students in your own classrooms. 
          To manage your students, please use the "My Classrooms" section in the sidebar.
        </Typography>
      </Alert>
      
      <Box sx={{ 
        textAlign: 'center', 
        py: 4,
        border: '2px dashed #e0e0e0',
        borderRadius: 2,
        bgcolor: '#fafafa'
      }}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Teacher Access Control
        </Typography>
        <Typography variant="body2" color="text.secondary">
          This page shows all students in the system, which is restricted to administrators only.
          <br />
          Teachers can only view and manage students in their own classrooms.
        </Typography>
      </Box>
    </Box>
  );
}
