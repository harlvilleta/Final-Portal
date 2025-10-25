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
  CircularProgress,
  Tabs,
  Tab,
  TextField,
  InputAdornment
} from '@mui/material';
import {
  ArrowBack,
  Delete,
  Person,
  School,
  Group,
  Class,
  Add,
  PersonAdd,
  Info,
  Assignment,
  MoreVert,
  Search
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
  const [activeTab, setActiveTab] = useState(0);
  const [allClassmates, setAllClassmates] = useState([]);

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
        let teacherData = null;
        if (validStudents.length > 0 && validStudents[0].teacherId) {
          try {
            const teacherDoc = await getDoc(doc(db, 'users', validStudents[0].teacherId));
            if (teacherDoc.exists()) {
              teacherData = teacherDoc.data();
              setTeacherInfo(teacherData);
            }
          } catch (error) {
            console.error('Error fetching teacher info:', error);
          }
        }
        
        // Create allClassmates array including teacher
        const classmates = [...validStudents];
        if (teacherData) {
          classmates.unshift({
            id: teacherData.uid || 'teacher',
            name: teacherData.fullName || `${teacherData.firstName || ''} ${teacherData.lastName || ''}`.trim(),
            email: teacherData.email,
            role: 'Teacher',
            profilePic: teacherData.profilePic
          });
        }
        setAllClassmates(classmates);
        
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


  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const renderStreamContent = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={8}>
        <Card sx={{ borderRadius: 2, boxShadow: 'none', border: '1px solid #e0e0e0' }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600, color: '#333', mb: 2 }}>
              Coming soon
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '0.875rem', color: '#666', mb: 2 }}>
              Woohoo, no work to finish right away!
            </Typography>
            <Box sx={{ textAlign: 'right' }}>
              <Button 
                variant="text" 
                sx={{ 
                  fontSize: '0.875rem', 
                  color: '#1976d2', 
                  textTransform: 'none',
                  p: 0,
                  minWidth: 'auto'
                }}
              >
                See all
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={4}>
        <Card sx={{ borderRadius: 2, boxShadow: 'none', border: '1px solid #e0e0e0', mb: 2 }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: '#f0f0f0' }}>
                <Person sx={{ fontSize: 18, color: '#666' }} />
              </Avatar>
              <TextField
                placeholder="Advertise in your class"
                variant="outlined"
                size="small"
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '0.875rem',
                    '& fieldset': {
                      borderColor: '#e0e0e0',
                    },
                    '&:hover fieldset': {
                      borderColor: '#ccc',
                    },
                  },
                }}
              />
            </Box>
          </CardContent>
        </Card>
        
        {/* Assignment Cards */}
        <Card sx={{ borderRadius: 2, boxShadow: 'none', border: '1px solid #e0e0e0', mb: 2 }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              <Box sx={{ 
                width: 24, 
                height: 24, 
                bgcolor: '#4caf50', 
                borderRadius: 1, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Assignment sx={{ fontSize: 16, color: 'white' }} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontSize: '0.875rem', color: '#333', mb: 0.5, lineHeight: 1.4 }}>
                  Jhon Ericson Brigildo posted a new assignment: Research Fee: Proof of Payment
                </Typography>
                <Typography variant="caption" sx={{ fontSize: '0.75rem', color: '#999' }}>
                  Yesterday
                </Typography>
              </Box>
              <IconButton size="small" sx={{ color: '#666' }}>
                <MoreVert sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 2, boxShadow: 'none', border: '1px solid #e0e0e0' }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              <Box sx={{ 
                width: 24, 
                height: 24, 
                bgcolor: '#4caf50', 
                borderRadius: 1, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Assignment sx={{ fontSize: 16, color: 'white' }} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontSize: '0.875rem', color: '#333', mb: 0.5, lineHeight: 1.4 }}>
                  Jhon Ericson Brigildo posted a new assignment: Capstone Project: Final Presentation Defen...
                </Typography>
                <Typography variant="caption" sx={{ fontSize: '0.75rem', color: '#999' }}>
                  Yesterday (Edited Yesterday)
                </Typography>
              </Box>
              <IconButton size="small" sx={{ color: '#666' }}>
                <MoreVert sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderPeopleContent = () => (
    <Box>
      <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600, color: '#333', mb: 3 }}>
        People ({allClassmates.length})
      </Typography>
      <Grid container spacing={2}>
        {allClassmates.map((person, index) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={person.id || index}>
            <Card sx={{ 
              borderRadius: 2, 
              boxShadow: 'none', 
              border: '1px solid #e0e0e0',
              '&:hover': {
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }
            }}>
              <CardContent sx={{ p: 2, textAlign: 'center' }}>
                <Avatar 
                  src={person.profilePic} 
                  sx={{ 
                    width: 60, 
                    height: 60, 
                    mx: 'auto', 
                    mb: 1,
                    bgcolor: person.role === 'Teacher' ? '#1976d2' : '#800000'
                  }}
                >
                  {person.role === 'Teacher' ? 'T' : 'S'}
                </Avatar>
                <Typography variant="subtitle2" sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#333', mb: 0.5 }}>
                  {person.name || person.fullName || `${person.firstName || ''} ${person.lastName || ''}`.trim()}
                </Typography>
                <Typography variant="caption" sx={{ fontSize: '0.75rem', color: '#666', display: 'block', mb: 1 }}>
                  {person.email}
                </Typography>
                <Chip 
                  label={person.role === 'Teacher' ? 'Teacher' : 'Student'} 
                  size="small"
                  sx={{ 
                    fontSize: '0.7rem',
                    height: 20,
                    bgcolor: person.role === 'Teacher' ? '#1976d2' : '#800000',
                    color: 'white'
                  }} 
                />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  return (
    <Box sx={{ bgcolor: '#f5f5f5', minHeight: '100vh' }}>
      {/* Top Navigation */}
      <Box sx={{ p: 2, bgcolor: 'white', borderBottom: '1px solid #e0e0e0' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <IconButton 
            onClick={handleBackToClassrooms}
            sx={{ 
              mr: 1, 
              color: '#666',
              p: 0.5
            }}
          >
            <ArrowBack sx={{ fontSize: 20 }} />
          </IconButton>
          <Typography variant="body2" sx={{ fontSize: '0.875rem', color: '#666' }}>
            {course} - {yearLevel} - {section}
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ fontSize: '0.75rem', color: '#999', ml: 4 }}>
          {yearLevel} - {section}
        </Typography>
      </Box>

      {/* Blue Header Banner */}
      <Box sx={{ 
        bgcolor: '#1976d2', 
        p: 3, 
        position: 'relative',
        overflow: 'hidden'
      }}>
        <Box sx={{ position: 'relative', zIndex: 2 }}>
          <Typography variant="h4" sx={{ 
            fontSize: '1.5rem', 
            fontWeight: 700, 
            color: 'white', 
            mb: 1,
            textAlign: 'center'
          }}>
            {course} - {section} ({yearLevel.toUpperCase()})
          </Typography>
          <Typography variant="body1" sx={{ 
            fontSize: '1rem', 
            color: 'rgba(255,255,255,0.9)', 
            textAlign: 'center',
            mb: 1
          }}>
            {yearLevel} - {section}
          </Typography>
          {teacherInfo && (
            <Typography variant="body2" sx={{ 
              fontSize: '0.875rem', 
              color: 'rgba(255,255,255,0.8)', 
              textAlign: 'center'
            }}>
              {teacherInfo.fullName || `${teacherInfo.firstName || ''} ${teacherInfo.lastName || ''}`.trim()}
            </Typography>
          )}
        </Box>
        
        {/* Graduation Cap Icons */}
        <Box sx={{ 
          position: 'absolute', 
          top: 8, 
          right: 16,
          opacity: 0.3,
          zIndex: 1
        }}>
          <School sx={{ fontSize: 32, color: 'white', mr: 1 }} />
          <School sx={{ fontSize: 28, color: 'white' }} />
        </Box>
        
        {/* Info Icon */}
        <IconButton 
          sx={{ 
            position: 'absolute', 
            bottom: 8, 
            right: 8,
            color: 'white',
            zIndex: 2
          }}
        >
          <Info sx={{ fontSize: 20 }} />
        </IconButton>
      </Box>

      {/* Navigation Tabs */}
      <Box sx={{ bgcolor: 'white', borderBottom: '1px solid #e0e0e0' }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          sx={{
            '& .MuiTab-root': {
              fontSize: '0.875rem',
              fontWeight: 500,
              textTransform: 'none',
              minHeight: 48,
              color: '#666',
              '&.Mui-selected': {
                color: '#1976d2',
                fontWeight: 600
              }
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#1976d2',
              height: 2
            }
          }}
        >
          <Tab label="Stream" />
          <Tab label="Announcement" />
          <Tab label="People" />
        </Tabs>
      </Box>

      {/* Content Area */}
      <Box sx={{ p: 3 }}>
        {activeTab === 0 && renderStreamContent()}
        {activeTab === 1 && (
          <Card sx={{ borderRadius: 2, boxShadow: 'none', border: '1px solid #e0e0e0' }}>
            <CardContent sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600, color: '#333', mb: 2 }}>
                Announcements
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '0.875rem', color: '#666' }}>
                No announcements yet. Check back later for updates from your teacher.
              </Typography>
            </CardContent>
          </Card>
        )}
        {activeTab === 2 && renderPeopleContent()}
      </Box>

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
