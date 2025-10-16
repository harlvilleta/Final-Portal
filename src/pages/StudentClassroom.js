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
  Alert
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

        // Create classroom object
        const classroom = {
          course,
          yearLevel: year,
          section,
          classmates: uniqueClassmates,
          teacherId: uniqueClassmates.length > 0 ? uniqueClassmates[0].teacherId : null
        };

        setClassrooms([classroom]);
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
        <Grid container spacing={3}>
          {classrooms.map((classroom, index) => (
            <Grid item xs={12} key={index}>
              <Card sx={{ 
                border: '1px solid #666666', 
                bgcolor: theme.palette.mode === 'dark' ? '#2d2d2d' : '#f8f9fa',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4
                }
              }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <Avatar sx={{ bgcolor: '#800000', width: 60, height: 60 }}>
                      <School sx={{ fontSize: 30 }} />
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h4" fontWeight={700} color="#2c3e2c">
                        {classroom.course}
                      </Typography>
                      <Typography variant="h6" color="#3d4f3d">
                        {classroom.yearLevel} - {classroom.section}
                      </Typography>
                    </Box>
                    <Button
                      variant="contained"
                      onClick={() => openClassroomDashboard(classroom)}
                      sx={{
                        bgcolor: '#800000',
                        color: 'white',
                        fontWeight: 600,
                        '&:hover': {
                          bgcolor: '#600000'
                        }
                      }}
                    >
                      View Classroom
                    </Button>
                  </Box>
                  
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
                    <Chip 
                      icon={<Group />} 
                      label={classroom.classmates.length === 1 && classroom.classmates[0].email === currentUser.email 
                        ? 'Only You' 
                        : `${classroom.classmates.length} Students`
                      } 
                      sx={{ bgcolor: '#B6CEB4', color: '#2c3e2c' }}
                    />
                    <Chip 
                      icon={<Class />} 
                      label="Active Classroom" 
                      sx={{ bgcolor: '#A8C4A6', color: '#2c3e2c' }}
                    />
                  </Box>

                  {classroom.classmates.length > 0 && (
                    <Box>
                      <Typography variant="h6" fontWeight={600} color="#2c3e2c" sx={{ mb: 2 }}>
                        {classroom.classmates.length === 1 && classroom.classmates[0].email === currentUser.email 
                          ? 'You (Only Student)' 
                          : `Your Classmates (${classroom.classmates.length})`
                        }
                      </Typography>
                      <List sx={{ maxHeight: 200, overflow: 'auto' }}>
                        {classroom.classmates.slice(0, 5).map((classmate, idx) => (
                          <ListItem key={classmate.id} sx={{ px: 0, py: 0.5 }}>
                            <ListItemAvatar>
                              <Avatar sx={{ bgcolor: '#800000', width: 32, height: 32 }}>
                                <Person sx={{ fontSize: 18 }} />
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={
                                <Typography variant="body2" fontWeight={500} color="#2c3e2c">
                                  {classmate.email === currentUser.email ? 'You' : classmate.name}
                                </Typography>
                              }
                              secondary={
                                <Typography variant="caption" color="#3d4f3d">
                                  ID: {classmate.studentId}
                                </Typography>
                              }
                            />
                          </ListItem>
                        ))}
                        {classroom.classmates.length > 5 && (
                          <ListItem sx={{ px: 0, py: 0.5 }}>
                            <ListItemText
                              primary={
                                <Typography variant="body2" color="#3d4f3d" sx={{ fontStyle: 'italic' }}>
                                  ... and {classroom.classmates.length - 5} more classmates
                                </Typography>
                              }
                            />
                          </ListItem>
                        )}
                      </List>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
