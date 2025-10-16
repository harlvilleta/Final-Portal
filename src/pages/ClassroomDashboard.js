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
  Link,
  CircularProgress
} from '@mui/material';
import {
  ArrowBack,
  Delete,
  Person,
  School,
  Group,
  Class,
  Add,
  PersonAdd
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs, deleteDoc, doc, query, where, getDoc } from 'firebase/firestore';
import { validateStudentId } from '../utils/studentValidation';

export default function ClassroomDashboard({ currentUser }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const { course, yearLevel, section } = useParams();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [isDeletingStudent, setIsDeletingStudent] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [teacherInfo, setTeacherInfo] = useState(null);

  // Fetch user role
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!currentUser?.uid) return;
      
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserRole(userData.role || 'Student');
        } else {
          setUserRole('Student'); // Default role
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        setUserRole('Student'); // Default role
      }
    };

    fetchUserRole();
  }, [currentUser]);

  // Fetch students for this specific classroom
  useEffect(() => {
    if (!currentUser?.uid || !course || !yearLevel || !section || !userRole) return;

    const fetchStudents = async () => {
      try {
        setLoading(true);
        
        let studentsQuery;
        
        if (userRole === 'Teacher') {
          // For teachers, fetch students they manage
          studentsQuery = query(
            collection(db, "students"),
            where("teacherId", "==", currentUser.uid),
            where("course", "==", course),
            where("yearLevel", "==", yearLevel),
            where("section", "==", section)
          );
        } else {
          // For students, fetch all students in the same classroom from both collections
          const studentsQuery = query(
            collection(db, "students"),
            where("course", "==", course),
            where("yearLevel", "==", yearLevel),
            where("section", "==", section)
          );
          
          const usersQuery = query(
            collection(db, "users"),
            where("role", "==", "Student"),
            where("course", "==", course),
            where("year", "==", yearLevel),
            where("section", "==", section)
          );
          
          const [studentsSnapshot, usersSnapshot] = await Promise.all([
            getDocs(studentsQuery),
            getDocs(usersQuery)
          ]);
          
          // Combine results from both collections
          const studentsFromStudentsCollection = studentsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            source: 'students_collection'
          }));
          
          const studentsFromUsersCollection = usersSnapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().fullName || `${doc.data().firstName || ''} ${doc.data().lastName || ''}`.trim(),
            studentId: doc.data().studentId || '',
            course: doc.data().course,
            yearLevel: doc.data().year, // Map year to yearLevel for consistency
            section: doc.data().section,
            email: doc.data().email,
            source: 'users_collection'
          }));
          
          // Combine and deduplicate
          const allStudentsData = [...studentsFromStudentsCollection, ...studentsFromUsersCollection];
          const uniqueStudents = allStudentsData.filter((student, index, self) => 
            index === self.findIndex(s => s.studentId === student.studentId || s.email === student.email)
          );
          
          console.log('Found students in classroom:', uniqueStudents.length);
          console.log('From students collection:', studentsFromStudentsCollection.length);
          console.log('From users collection:', studentsFromUsersCollection.length);
          
          // For students, fetch teacher information from any student record
          if (uniqueStudents.length > 0 && uniqueStudents[0].teacherId) {
            try {
              const teacherDoc = await getDoc(doc(db, 'users', uniqueStudents[0].teacherId));
              if (teacherDoc.exists()) {
                setTeacherInfo(teacherDoc.data());
              }
            } catch (error) {
              console.error('Error fetching teacher info for student view:', error);
            }
          }
          
          // Set the students data
          setStudents(uniqueStudents);
          setLoading(false);
          return; // Exit early since we handled the data
        }
        
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
        
        // Fetch teacher information if students exist
        if (validStudents.length > 0 && validStudents[0].teacherId) {
          try {
            const teacherDoc = await getDoc(doc(db, 'users', validStudents[0].teacherId));
            if (teacherDoc.exists()) {
              setTeacherInfo(teacherDoc.data());
            }
          } catch (error) {
            console.error('Error fetching teacher info:', error);
          }
        }
        
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
  }, [currentUser, course, yearLevel, section, userRole]);

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
    if (userRole === 'Teacher') {
      navigate('/teacher-my-students');
    } else {
      navigate('/user-dashboard');
    }
  };

  if (loading || !currentUser || !userRole) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading classroom...</Typography>
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
              {userRole === 'Teacher' ? 'My Classrooms' : 'Dashboard'}
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
          {userRole === 'Teacher' 
            ? `Manage students in ${course} - ${yearLevel} - ${section}`
            : `View your classmates in ${course} - ${yearLevel} - ${section}`
          }
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
                  label={userRole === 'Teacher' ? `${students.length} Students` : `${students.length} ${students.length === 1 ? 'Student' : 'Students'}`} 
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
                  {userRole === 'Teacher' 
                    ? `${students.length === 1 ? 'Student' : 'Students'} Enrolled`
                    : `${students.length === 1 ? 'Student' : 'Students'} in Class`
                  }
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Teacher Information Card - Always show for students */}
      {userRole === 'Student' && (
        <Card sx={{ mb: 4, border: '1px solid #666666', bgcolor: '#f8f9fa' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Avatar sx={{ bgcolor: '#1976d2', width: 50, height: 50 }}>
                <PersonAdd sx={{ fontSize: 24 }} />
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight={600} color="#2c3e2c">
                  Your Teacher
                </Typography>
                <Typography variant="body2" color="#3d4f3d">
                  Classroom instructor information
                </Typography>
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, bgcolor: '#ffffff', borderRadius: 2, border: '1px solid #e0e0e0' }}>
              <Avatar 
                src={teacherInfo?.profilePic} 
                sx={{ 
                  width: 60, 
                  height: 60, 
                  bgcolor: teacherInfo?.profilePic ? 'transparent' : '#1976d2',
                  border: '2px solid #1976d2'
                }}
              >
                {!teacherInfo?.profilePic && (teacherInfo?.fullName?.charAt(0) || 'T')}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" fontWeight={600} color="#2c3e2c">
                  {teacherInfo?.fullName || 'Your Teacher'}
                </Typography>
                <Typography variant="body2" color="#3d4f3d" sx={{ mb: 1 }}>
                  {teacherInfo?.email || 'Teacher information will be available soon'}
                </Typography>
                <Chip 
                  label="Teacher" 
                  size="small" 
                  sx={{ 
                    bgcolor: '#1976d2', 
                    color: 'white',
                    fontWeight: 600
                  }} 
                />
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Students List */}
      <Card sx={{ border: '1px solid #666666', bgcolor: '#f8f9fa' }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" fontWeight={600} color="#2c3e2c">
              {userRole === 'Teacher' ? 'Students in this Classroom' : 'Your Classmates'}
            </Typography>
            {userRole === 'Teacher' && (
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
            )}
          </Box>

          {students.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Person sx={{ fontSize: 80, color: '#3d4f3d', mb: 2 }} />
              <Typography variant="h6" color="#3d4f3d" gutterBottom>
                {userRole === 'Teacher' ? 'No Students Yet' : 'No Classmates Yet'}
              </Typography>
              <Typography variant="body2" color="#3d4f3d" sx={{ mb: 3 }}>
                {userRole === 'Teacher' 
                  ? "This classroom doesn't have any students yet. Add students to get started."
                  : "This classroom doesn't have any classmates yet. Check back later."
                }
              </Typography>
              {userRole === 'Teacher' && (
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
              )}
            </Box>
          ) : userRole === 'Student' && students.length === 1 && students[0].email === currentUser.email ? (
            // Special case: Student viewing their own classroom with no other students
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Avatar sx={{ 
                width: 100, 
                height: 100, 
                bgcolor: '#800000', 
                mx: 'auto', 
                mb: 3,
                fontSize: 40
              }}>
                <Person sx={{ fontSize: 50 }} />
              </Avatar>
              <Typography variant="h4" fontWeight={600} color="#2c3e2c" gutterBottom>
                You
              </Typography>
              <Typography variant="h6" color="#3d4f3d" gutterBottom>
                {students[0].name}
              </Typography>
              <Typography variant="body2" color="#3d4f3d" sx={{ mb: 3 }}>
                Student ID: {students[0].studentId}
              </Typography>
              <Typography variant="body1" color="#3d4f3d" sx={{ mb: 3 }}>
                You are currently the only student in this classroom. Your teacher may add more students later.
              </Typography>
              <Chip 
                label="Only Student" 
                sx={{ 
                  bgcolor: '#e3f2fd', 
                  color: '#1976d2',
                  fontWeight: 600,
                  fontSize: '0.9rem'
                }} 
              />
            </Box>
          ) : (
            <Grid container spacing={2}>
              {students.map((student, index) => (
                <Grid item xs={12} sm={6} md={4} key={student.id}>
                  <Card 
                    sx={{ 
                      border: '1px solid #e0e0e0',
                      bgcolor: '#ffffff',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: 2
                      }
                    }}
                  >
                    <CardContent sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Avatar sx={{ bgcolor: '#800000', width: 50, height: 50 }}>
                          <Person sx={{ fontSize: 24 }} />
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6" fontWeight={600} color="#2c3e2c" sx={{ mb: 0.5 }}>
                            {userRole === 'Student' && student.email === currentUser.email ? 'You' : student.name}
                          </Typography>
                          <Typography variant="body2" color="#3d4f3d">
                            ID: {student.studentId}
                          </Typography>
                        </Box>
                        {userRole === 'Teacher' && (
                          <Tooltip title="Remove Student">
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteStudent(student)}
                              disabled={isDeletingStudent}
                              sx={{ 
                                color: '#f44336'
                              }}
                            >
                              <Delete />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                      
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip 
                          label={userRole === 'Student' && student.email === currentUser.email ? "You" : "Student"} 
                          size="small" 
                          sx={{ 
                            bgcolor: userRole === 'Student' && student.email === currentUser.email ? '#800000' : '#e3f2fd', 
                            color: userRole === 'Student' && student.email === currentUser.email ? 'white' : '#1976d2',
                            fontWeight: 600
                          }} 
                        />
                        <Chip 
                          label={course} 
                          size="small" 
                          variant="outlined"
                          sx={{ 
                            borderColor: '#800000',
                            color: '#800000',
                            fontWeight: 500
                          }} 
                        />
                      </Box>
                      
                      <Typography variant="caption" color="#3d4f3d" sx={{ mt: 1, display: 'block' }}>
                        Joined: {new Date(student.createdAt).toLocaleDateString()}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
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
