import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  useTheme,
  Chip,
  CircularProgress,
  Alert,
  IconButton
} from '@mui/material';
import {
  School,
  Group,
  Class,
  Person
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';

export default function StudentClassroom({ currentUser }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [teacherInfo, setTeacherInfo] = useState(null);

  useEffect(() => {
    if (!currentUser?.email) return;

    const fetchStudentClassrooms = async () => {
      try {
        setLoading(true);
        
        // Get student's user profile to find their course, year, and section
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (!userDoc.exists()) {
          setError('Student profile not found');
          return;
        }

        const userData = userDoc.data();
        const { course, year, section } = userData;

        if (!course || !year || !section) {
          console.log('Missing classroom info:', { course, year, section, userData });
          setError('Student classroom information not found. Please ensure your profile has course, year, and section information.');
          return;
        }

        // Find all students in the same classroom
        // Query both 'students' collection (manually added) and 'users' collection (registered students)
        
        // Query students collection (uses yearLevel field)
        const studentsQuery = query(
          collection(db, "students"),
          where("course", "==", course),
          where("yearLevel", "==", year),
          where("section", "==", section)
        );

        // Query users collection (uses year field)
        const usersQuery = query(
          collection(db, "users"),
          where("role", "==", "Student"),
          where("course", "==", course),
          where("year", "==", year),
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

        // Combine and deduplicate (in case a student exists in both collections)
        const allClassmates = [...studentsFromStudentsCollection, ...studentsFromUsersCollection];
        const uniqueClassmates = allClassmates.filter((student, index, self) => 
          index === self.findIndex(s => s.studentId === student.studentId || s.email === student.email)
        );

        console.log('Found classmates:', uniqueClassmates.length, 'for classroom:', { course, year, section });
        console.log('From students collection:', studentsFromStudentsCollection.length);
        console.log('From users collection:', studentsFromUsersCollection.length);

        // Fetch teacher information if teacherId exists
        let teacherData = null;
        if (uniqueClassmates.length > 0 && uniqueClassmates[0].teacherId) {
          try {
            const teacherDoc = await getDoc(doc(db, 'users', uniqueClassmates[0].teacherId));
            if (teacherDoc.exists()) {
              teacherData = teacherDoc.data();
              console.log('Found teacher info:', teacherData);
            }
          } catch (teacherError) {
            console.error('Error fetching teacher info:', teacherError);
          }
        }

        // Create classroom object
        const classroom = {
          course,
          yearLevel: year,
          section,
          classmates: uniqueClassmates,
          teacherId: uniqueClassmates.length > 0 ? uniqueClassmates[0].teacherId : null,
          teacherInfo: teacherData
        };

        setClassrooms([classroom]);
        setTeacherInfo(teacherData);
      } catch (error) {
        console.error('Error fetching student classrooms:', error);
        setError('Error loading classroom information');
      } finally {
        setLoading(false);
      }
    };

    fetchStudentClassrooms();
  }, [currentUser]);

  const openClassroomDashboard = (classroom) => {
    const course = encodeURIComponent(classroom.course);
    const yearLevel = encodeURIComponent(classroom.yearLevel);
    const section = encodeURIComponent(classroom.section);
    navigate(`/classroom/${course}/${yearLevel}/${section}`);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading your classroom...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Typography variant="body1">
          {error === 'Student profile not found' 
            ? 'Your student profile was not found. Please contact your administrator to ensure your account is properly set up.'
            : error === 'Student classroom information not found. Please ensure your profile has course, year, and section information.'
            ? 'Your profile is missing classroom information (course, year, or section). Please contact your teacher or administrator to update your profile.'
            : 'There was an error loading your classroom information. Please try refreshing the page or contact support if the issue persists.'
          }
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>
        My Classroom
      </Typography>

      {classrooms.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <School sx={{ fontSize: 80, color: '#3d4f3d', mb: 2 }} />
            <Typography variant="h6" color="#3d4f3d" gutterBottom>
              No Classroom Assigned
            </Typography>
            <Typography variant="body2" color="#3d4f3d" sx={{ mb: 3 }}>
              You haven't been assigned to any classroom yet. Please contact your teacher.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3} justifyContent="flex-start">
          {classrooms.map((classroom, index) => (
            <Grid item xs={12} sm={6} md={4} lg={3} xl={2.4} key={index}>
              <Card sx={{ 
                borderRadius: 3,
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                maxWidth: '300px',
                width: '100%',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.15)'
                }
              }}>
                {/* Header with colored background */}
                <Box sx={{ 
                  bgcolor: '#1976d2', 
                  p: 2, 
                  position: 'relative',
                  minHeight: '120px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}>
                  {/* Course info */}
                  <Box>
                    <Typography variant="h6" fontWeight={700} color="white" sx={{ mb: 0.5, lineHeight: 1.2 }}>
                      {classroom.course}
                    </Typography>
                    <Typography variant="body2" color="rgba(255,255,255,0.9)" sx={{ mb: 0.5 }}>
                      {classroom.yearLevel} - {classroom.section}
                    </Typography>
                    {classroom.teacherInfo && (
                      <Typography variant="caption" color="rgba(255,255,255,0.8)" sx={{ fontSize: '0.7rem', display: 'block', mb: 0.5 }}>
                        {classroom.teacherInfo.fullName || `${classroom.teacherInfo.firstName || ''} ${classroom.teacherInfo.lastName || ''}`.trim() || 'Your Teacher'}
                      </Typography>
                    )}
                    <Typography variant="caption" color="rgba(255,255,255,0.7)" sx={{ fontSize: '0.65rem' }}>
                      {classroom.classmates.length === 1 && classroom.classmates[0].email === currentUser.email 
                        ? 'Only You' 
                        : `${classroom.classmates.length} Students`
                      }
                    </Typography>
                  </Box>
                  
                  {/* Decorative icon */}
                  <Box sx={{ 
                    position: 'absolute', 
                    top: 8, 
                    right: 8,
                    opacity: 0.3
                  }}>
                    <School sx={{ fontSize: 24, color: 'white' }} />
                  </Box>
                  
                  {/* Profile avatar overlapping */}
                  <Box sx={{ 
                    position: 'absolute', 
                    bottom: -20, 
                    right: 12,
                    border: '3px solid white',
                    borderRadius: '50%'
                  }}>
                    <Avatar sx={{ 
                      width: 40, 
                      height: 40, 
                      bgcolor: '#800000'
                    }}>
                      <Person sx={{ fontSize: 20 }} />
                    </Avatar>
                  </Box>
                </Box>

                {/* Body content */}
                <Box sx={{ p: 2, pt: 3, bgcolor: 'white' }}>
                  {/* Action icons at bottom */}
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-around', 
                    alignItems: 'center',
                    pt: 1,
                    borderTop: '1px solid #f0f0f0'
                  }}>
                    <IconButton 
                      size="small" 
                      onClick={() => openClassroomDashboard(classroom)}
                      sx={{ 
                        color: '#666',
                        '&:hover': { color: '#1976d2' }
                      }}
                    >
                      <Group sx={{ fontSize: 20 }} />
                    </IconButton>
                    <IconButton 
                      size="small"
                      sx={{ 
                        color: '#666',
                        '&:hover': { color: '#1976d2' }
                      }}
                    >
                      <Class sx={{ fontSize: 20 }} />
                    </IconButton>
                    <IconButton 
                      size="small"
                      sx={{ 
                        color: '#666',
                        '&:hover': { color: '#1976d2' }
                      }}
                    >
                      <School sx={{ fontSize: 20 }} />
                    </IconButton>
                  </Box>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
