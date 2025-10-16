import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  IconButton,
  Tooltip,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Snackbar,
  Alert,
  useTheme,
  Divider,
  Paper,
  Chip,
  Breadcrumbs,
  Link
} from '@mui/material';
import {
  ArrowBack,
  Delete,
  Person,
  School,
  Group,
  Class,
  Add
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';
import { validateStudentId } from '../utils/studentValidation';

export default function ClassroomDashboard({ currentUser }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const { course, yearLevel, section } = useParams();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [isDeletingStudent, setIsDeletingStudent] = useState(false);

  // Fetch students for this specific classroom
  useEffect(() => {
    if (!currentUser?.uid || !course || !yearLevel || !section) return;

    const fetchStudents = async () => {
      try {
        setLoading(true);
        
        const studentsQuery = query(
          collection(db, "students"),
          where("teacherId", "==", currentUser.uid),
          where("course", "==", course),
          where("yearLevel", "==", yearLevel),
          where("section", "==", section)
        );
        
        const studentsSnapshot = await getDocs(studentsQuery);
        const allStudentsData = studentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Validate each student against the main database
        const validStudents = [];
        const invalidStudents = [];
        
        for (const student of allStudentsData) {
          try {
            const validation = await validateStudentId(student.studentId);
            if (validation.isValid) {
              validStudents.push(student);
            } else {
              invalidStudents.push(student);
              console.log(`Invalid student found in classroom: ${student.name} (ID: ${student.studentId})`);
            }
          } catch (error) {
            console.error(`Error validating student ${student.studentId}:`, error);
            // If validation fails, consider the student invalid
            invalidStudents.push(student);
          }
        }
        
        // Log summary of validation results
        console.log(`Classroom student validation complete: ${validStudents.length} valid, ${invalidStudents.length} invalid`);
        if (invalidStudents.length > 0) {
          console.log('Invalid students that will be filtered out:', invalidStudents.map(s => `${s.name} (${s.studentId})`));
        }
        
        setStudents(validStudents);
        
        // Show notification if invalid students were found
        if (invalidStudents.length > 0) {
          setSnackbar({ 
            open: true, 
            message: `${invalidStudents.length} invalid student(s) were removed from this classroom. Only verified students are now displayed.`, 
            severity: 'warning' 
          });
        }
      } catch (error) {
        console.error('Error fetching students:', error);
        setSnackbar({ open: true, message: 'Error loading students', severity: 'error' });
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [currentUser, course, yearLevel, section]);

  const handleDeleteStudent = async (student) => {
    if (window.confirm(`Are you sure you want to remove ${student.name} from this classroom?`)) {
      setIsDeletingStudent(true);
      try {
        await deleteDoc(doc(db, "students", student.id));
        
        // Update local state
        setStudents(prev => prev.filter(s => s.id !== student.id));
        
        setSnackbar({ open: true, message: 'Student removed successfully', severity: 'success' });
      } catch (error) {
        console.error('Error deleting student:', error);
        setSnackbar({ open: true, message: 'Error removing student', severity: 'error' });
      } finally {
        setIsDeletingStudent(false);
      }
    }
  };

  const handleBackToClassrooms = () => {
    navigate('/teacher-my-students');
  };

  if (loading || !currentUser) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Typography>Loading classroom...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, bgcolor: '#44444E', minHeight: '100vh' }}>
      {/* Header with Back Button */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <IconButton 
            onClick={handleBackToClassrooms}
            sx={{ 
              mr: 2, 
              bgcolor: '#424242', 
              color: 'white'
            }}
          >
            <ArrowBack />
          </IconButton>
          <Breadcrumbs aria-label="breadcrumb">
            <Link 
              underline="none" 
              color="#e0e0e0" 
              onClick={handleBackToClassrooms}
              sx={{ cursor: 'pointer' }}
            >
              My Classrooms
            </Link>
            <Typography color="#ffffff">
              {course} - {yearLevel} - {section}
            </Typography>
          </Breadcrumbs>
        </Box>
        
        <Typography 
          variant="h4" 
          fontWeight={700} 
          color="#ffffff" 
          gutterBottom
        >
          Classroom Dashboard
        </Typography>
        <Typography 
          variant="body1" 
          color="#e0e0e0"
        >
          Manage students in {course} - {yearLevel} - {section}
        </Typography>
      </Box>

      {/* Classroom Overview Card */}
      <Card sx={{ mb: 4, border: '1px solid #666666', bgcolor: '#f8f9fa' }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={8}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Avatar sx={{ bgcolor: '#800000', width: 60, height: 60 }}>
                  <School sx={{ fontSize: 30 }} />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight={700} color="#2c3e2c">
                    {course}
                  </Typography>
                  <Typography variant="h6" color="#3d4f3d">
                    {yearLevel} - {section}
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Chip 
                  icon={<Group />} 
                  label={`${students.length} Students`} 
                  sx={{ bgcolor: '#B6CEB4', color: '#2c3e2c' }}
                />
                <Chip 
                  icon={<Class />} 
                  label="Active Classroom" 
                  sx={{ bgcolor: '#A8C4A6', color: '#2c3e2c' }}
                />
              </Box>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                <Typography variant="h2" fontWeight={700} color="#2c3e2c">
                  {students.length}
                </Typography>
                <Typography variant="body1" color="#3d4f3d">
                  {students.length === 1 ? 'Student' : 'Students'} Enrolled
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Students List */}
      <Card sx={{ border: '1px solid #666666', bgcolor: '#f8f9fa' }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" fontWeight={600} color="#2c3e2c">
              Students in this Classroom
            </Typography>
            <Button
              variant="outlined"
              startIcon={<Add />}
              onClick={() => navigate('/teacher-my-students')}
              sx={{
                borderColor: '#800000',
                color: '#800000'
              }}
            >
              Add Student
            </Button>
          </Box>

          {students.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Person sx={{ fontSize: 80, color: '#3d4f3d', mb: 2 }} />
              <Typography variant="h6" color="#3d4f3d" gutterBottom>
                No Students Yet
              </Typography>
              <Typography variant="body2" color="#3d4f3d" sx={{ mb: 3 }}>
                This classroom doesn't have any students yet. Add students to get started.
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => navigate('/teacher-my-students')}
                sx={{
                  bgcolor: '#800000',
                  color: 'white'
                }}
              >
                Add First Student
              </Button>
            </Box>
          ) : (
            <List>
              {students.map((student, index) => (
                <React.Fragment key={student.id}>
                  <ListItem 
                    sx={{ 
                      px: 0, 
                      py: 2
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: '#800000', width: 50, height: 50 }}>
                        <Person sx={{ fontSize: 24 }} />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography variant="h6" fontWeight={600} color="#2c3e2c">
                          {student.name}
                        </Typography>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="#3d4f3d" sx={{ mb: 0.5 }}>
                            Student ID: {student.studentId}
                          </Typography>
                          <Typography variant="caption" color="#3d4f3d">
                            Added: {new Date(student.createdAt).toLocaleDateString()}
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Tooltip title="Remove Student">
                        <IconButton
                          size="large"
                          onClick={() => handleDeleteStudent(student)}
                          disabled={isDeletingStudent}
                          sx={{ 
                            color: '#f44336'
                          }}
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < students.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mt: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            border: '1px solid #666666', 
            bgcolor: '#f8f9fa',
            textAlign: 'center',
            p: 2,
            '&:hover': {
              bgcolor: '#f8f9fa', // Keep the same color on hover
              transform: 'none', // Prevent any transform effects
              boxShadow: 'none' // Prevent shadow changes
            }
          }}>
            <CardContent>
              <Typography variant="h4" fontWeight={700} color="#2c3e2c">
                {students.length}
              </Typography>
              <Typography variant="body2" color="#3d4f3d">
                Total Students
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            border: '1px solid #666666', 
            bgcolor: '#f8f9fa',
            textAlign: 'center',
            p: 2,
            '&:hover': {
              bgcolor: '#f8f9fa', // Keep the same color on hover
              transform: 'none', // Prevent any transform effects
              boxShadow: 'none' // Prevent shadow changes
            }
          }}>
            <CardContent>
              <Typography variant="h4" fontWeight={700} color="#2c3e2c">
                {course}
              </Typography>
              <Typography variant="body2" color="#3d4f3d">
                Course
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            border: '1px solid #666666', 
            bgcolor: '#f8f9fa',
            textAlign: 'center',
            p: 2,
            '&:hover': {
              bgcolor: '#f8f9fa', // Keep the same color on hover
              transform: 'none', // Prevent any transform effects
              boxShadow: 'none' // Prevent shadow changes
            }
          }}>
            <CardContent>
              <Typography variant="h4" fontWeight={700} color="#2c3e2c">
                {yearLevel}
              </Typography>
              <Typography variant="body2" color="#3d4f3d">
                Year Level
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            border: '1px solid #666666', 
            bgcolor: '#f8f9fa',
            textAlign: 'center',
            p: 2,
            '&:hover': {
              bgcolor: '#f8f9fa', // Keep the same color on hover
              transform: 'none', // Prevent any transform effects
              boxShadow: 'none' // Prevent shadow changes
            }
          }}>
            <CardContent>
              <Typography variant="h4" fontWeight={700} color="#2c3e2c">
                {section}
              </Typography>
              <Typography variant="body2" color="#3d4f3d">
                Section
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
