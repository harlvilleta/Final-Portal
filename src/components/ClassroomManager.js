import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
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
  Chip,
  Paper
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  School,
  Add,
  Edit,
  Delete,
  Group,
  Person,
  Class,
  Book,
  Visibility,
  DeleteOutline
} from '@mui/icons-material';
import { db } from '../firebase';
import { collection, addDoc, getDocs, updateDoc, doc, deleteDoc, query, where, onSnapshot } from 'firebase/firestore';
import { validateStudentId } from '../utils/studentValidation';
import { withAuthCheck, authOperationQueue } from '../utils/authUtils';

const courses = ["BSIT", "BSBA", "BSCRIM", "BSHTM", "BEED", "BSED", "BSHM"];
const years = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

export default function ClassroomManager({ currentUser }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const [classrooms, setClassrooms] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openAddStudentDialog, setOpenAddStudentDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [isAddingStudent, setIsAddingStudent] = useState(false);

  // Student Form State - Now includes course, year, section
  const [studentForm, setStudentForm] = useState({
    name: '',
    studentId: '',
    course: '',
    yearLevel: '',
    section: ''
  });

  // Function to fetch and process student data (optimized - no validation on load)
  const fetchAndProcessStudentData = async () => {
    try {
      setLoading(true);
      
      // Fetch all students for this teacher (no validation on load for performance)
      const studentsQuery = query(
        collection(db, "students"),
        where("teacherId", "==", currentUser.uid)
      );
      
      const studentsSnapshot = await getDocs(studentsQuery);
      const allStudentsData = studentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log(`Loaded ${allStudentsData.length} students for teacher`);
      
      setStudents(allStudentsData);
      
      // Generate classroom boxes from all students (validation happens only when adding new students)
      generateClassroomBoxes(allStudentsData);
      
    } catch (error) {
      console.error('Error fetching data:', error);
      setSnackbar({ open: true, message: 'Error loading data', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Function to refresh classroom data without page reload
  const refreshClassroomData = async () => {
    console.log('🔄 Refreshing classroom data...');
    await fetchAndProcessStudentData();
    console.log('✅ Classroom data refreshed successfully');
  };

  // Fetch students and generate classroom boxes
  useEffect(() => {
    if (!currentUser?.uid) return;
    fetchAndProcessStudentData();
  }, [currentUser]);

  const generateClassroomBoxes = (studentsData) => {
    const classroomMap = {};
    
    studentsData.forEach(student => {
      const key = `${student.course}-${student.yearLevel}-${student.section}`;
      if (!classroomMap[key]) {
        classroomMap[key] = {
          course: student.course,
          yearLevel: student.yearLevel,
          section: student.section,
          students: []
        };
      }
      classroomMap[key].students.push(student);
    });
    
    const classroomBoxes = Object.values(classroomMap).map((classroom, index) => ({
      id: `${classroom.course}-${classroom.yearLevel}-${classroom.section}`,
      ...classroom,
      studentCount: classroom.students.length
    }));
    
    setClassrooms(classroomBoxes);
  };


  const removeInvalidStudents = async (invalidStudents) => {
    try {
      const deletePromises = invalidStudents.map(student => 
        deleteDoc(doc(db, "students", student.id))
      );
      
      await Promise.all(deletePromises);
      console.log(`Successfully removed ${invalidStudents.length} invalid students from database`);
      
      setSnackbar({ 
        open: true, 
        message: `${invalidStudents.length} invalid student(s) have been permanently removed from the system.`, 
        severity: 'info' 
      });
    } catch (error) {
      console.error('Error removing invalid students:', error);
      setSnackbar({ 
        open: true, 
        message: 'Error removing invalid students from database', 
        severity: 'error' 
      });
    }
  };

  const handleAddStudent = async () => {
    if (!studentForm.name.trim() || !studentForm.studentId.trim() || 
        !studentForm.course || !studentForm.yearLevel || !studentForm.section.trim()) {
      setSnackbar({ open: true, message: 'Please fill in all required fields', severity: 'error' });
      return;
    }

    // Use auth operation queue to prevent conflicts
    const operationKey = `add-student-${currentUser?.uid}`;
    
    await authOperationQueue.execute(operationKey, async () => {
      return await withAuthCheck(async () => {
        setIsAddingStudent(true);
        try {
          console.log('🔍 Validating student ID:', studentForm.studentId);
          
          // Validate student ID against main registration database
          const validation = await validateStudentId(studentForm.studentId);
          if (!validation.isValid) {
            console.log('❌ Student validation failed:', validation.error);
            setSnackbar({ open: true, message: validation.error || 'Student not found in the system.', severity: 'error' });
            return;
          }

          console.log('✅ Student validation passed, adding to database...');

          const newStudent = {
            name: studentForm.name.trim(),
            studentId: studentForm.studentId.trim(),
            course: studentForm.course,
            yearLevel: studentForm.yearLevel,
            section: studentForm.section.trim(),
            teacherId: currentUser.uid,
            createdAt: new Date().toISOString()
          };

          await addDoc(collection(db, "students"), newStudent);
          console.log('✅ Student added to database successfully');
          
          // Optimize: Update local state immediately instead of full refresh
          const newStudentWithId = { id: 'temp-id', ...newStudent };
          setStudents(prev => [...prev, newStudentWithId]);
          
          // Regenerate classroom boxes with the new student
          const updatedStudents = [...students, newStudentWithId];
          generateClassroomBoxes(updatedStudents);
          
          setSnackbar({ open: true, message: 'Student added successfully', severity: 'success' });
          setStudentForm({ name: '', studentId: '', course: '', yearLevel: '', section: '' });
          setOpenAddStudentDialog(false);
          
        } catch (error) {
          console.error('❌ Error adding student:', error);
          setSnackbar({ open: true, message: 'Error adding student. Please try again.', severity: 'error' });
          throw error;
        } finally {
          setIsAddingStudent(false);
        }
      }, (authError) => {
        console.error('❌ Authentication error:', authError);
        setSnackbar({ open: true, message: 'Authentication error. Please log in again.', severity: 'error' });
      });
    });
  };


  const openClassroomView = (classroom) => {
    // Navigate to the classroom dashboard with URL parameters
    const course = encodeURIComponent(classroom.course);
    const yearLevel = encodeURIComponent(classroom.yearLevel);
    const section = encodeURIComponent(classroom.section);
    navigate(`/classroom/${course}/${yearLevel}/${section}`);
  };

  const handleDeleteClassroom = async (classroom, event) => {
    // Prevent the card click event from firing
    event.stopPropagation();
    
    const classroomStudents = getStudentsForClassroom(classroom);
    const studentCount = classroomStudents.length;
    
    const confirmMessage = studentCount > 0 
      ? `Are you sure you want to delete the classroom "${classroom.course} - ${classroom.yearLevel} - ${classroom.section}"? This will permanently remove all ${studentCount} student(s) in this classroom.`
      : `Are you sure you want to delete the classroom "${classroom.course} - ${classroom.yearLevel} - ${classroom.section}"?`;
    
    if (window.confirm(confirmMessage)) {
      try {
        // Delete all students in this classroom
        const deletePromises = classroomStudents.map(student => 
          deleteDoc(doc(db, "students", student.id))
        );
        
        await Promise.all(deletePromises);
        
        setSnackbar({ 
          open: true, 
          message: `Classroom "${classroom.course} - ${classroom.yearLevel} - ${classroom.section}" and all its students have been deleted successfully.`, 
          severity: 'success' 
        });
        
        // Refresh the classroom data
        await refreshClassroomData();
        
      } catch (error) {
        console.error('Error deleting classroom:', error);
        setSnackbar({ 
          open: true, 
          message: 'Error deleting classroom. Please try again.', 
          severity: 'error' 
        });
      }
    }
  };

  const getStudentsForClassroom = (classroom) => {
    return students.filter(student => 
      student.course === classroom.course &&
      student.yearLevel === classroom.yearLevel &&
      student.section === classroom.section
    );
  };

  if (loading || !currentUser) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
        <Typography>Loading classrooms...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700} color="text.primary">
          My Classrooms
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenAddStudentDialog(true)}
          sx={{
            bgcolor: '#424242',
            color: 'white'
          }}
        >
          Add Student
        </Button>
      </Box>

      {/* Classrooms Grid */}
      {classrooms.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="text.secondary">
            👉 No classrooms created yet.
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {classrooms.map((classroom) => {
            const classroomStudents = getStudentsForClassroom(classroom);
            return (
              <Grid item xs={12} sm={6} md={4} key={classroom.id}>
                <Card
                  sx={{
                    border: '1px solid #e0e0e0',
                    borderRadius: 2,
                    bgcolor: '#B6CEB4',
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: '#B6CEB4', // Keep the same color on hover
                      transform: 'none', // Prevent any transform effects
                      boxShadow: 'none' // Prevent shadow changes
                    }
                  }}
                  onClick={() => openClassroomView(classroom)}
                >
                  <CardContent sx={{ pb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ bgcolor: '#800000', width: 40, height: 40 }}>
                          <Class />
                        </Avatar>
                        <Box>
                          <Typography variant="h6" fontWeight={600} color="#2c3e2c">
                            {classroom.course}
                          </Typography>
                          <Typography variant="body2" color="#3d4f3d">
                            {classroom.yearLevel} - {classroom.section}
                          </Typography>
                        </Box>
                      </Box>
                      <Tooltip title="Delete Classroom">
                        <IconButton
                          size="small"
                          onClick={(e) => handleDeleteClassroom(classroom, e)}
                          sx={{
                            color: '#d32f2f'
                          }}
                        >
                          <DeleteOutline fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="h4" fontWeight={700} color="#2c3e2c">
                        {classroomStudents.length}
                      </Typography>
                      <Typography variant="body2" color="#3d4f3d">
                        {classroomStudents.length === 1 ? 'Student' : 'Students'}
                      </Typography>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    {/* Students List Preview */}
                    <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                      {classroomStudents.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 2 }}>
                          <Person sx={{ fontSize: 32, color: '#3d4f3d', mb: 1 }} />
                          <Typography variant="body2" color="#3d4f3d">
                            No students yet
                          </Typography>
                        </Box>
                      ) : (
                        <List dense>
                          {classroomStudents.slice(0, 5).map((student, index) => (
                            <React.Fragment key={student.id}>
                              <ListItem sx={{ px: 0, py: 0.5 }}>
                                <ListItemAvatar>
                                  <Avatar sx={{ bgcolor: '#800000', width: 24, height: 24 }}>
                                    <Person sx={{ fontSize: 16 }} />
                                  </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                  primary={
                                    <Typography variant="body2" fontWeight={500} color="#2c3e2c">
                                      {student.name}
                                    </Typography>
                                  }
                                  secondary={
                                    <Typography variant="caption" color="#3d4f3d">
                                      ID: {student.studentId}
                                    </Typography>
                                  }
                                />
                              </ListItem>
                              {index < Math.min(classroomStudents.length, 5) - 1 && <Divider />}
                            </React.Fragment>
                          ))}
                          {classroomStudents.length > 5 && (
                            <ListItem sx={{ px: 0, py: 0.5 }}>
                              <Typography variant="caption" color="#3d4f3d" sx={{ ml: 4 }}>
                                +{classroomStudents.length - 5} more students
                              </Typography>
                            </ListItem>
                          )}
                        </List>
                      )}
                    </Box>
                  </CardContent>

                  <CardActions sx={{ p: 2, pt: 0 }}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<Visibility />}
                      sx={{
                        borderColor: '#800000',
                        color: '#800000'
                      }}
                    >
                      View Classroom
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Add Student Dialog */}
      <Dialog open={openAddStudentDialog} onClose={() => setOpenAddStudentDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Student</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Student Name"
              value={studentForm.name}
              onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Student ID"
              value={studentForm.studentId}
              onChange={(e) => setStudentForm({ ...studentForm, studentId: e.target.value })}
              margin="normal"
              required
            />
            <FormControl fullWidth margin="normal" required>
              <InputLabel>Course</InputLabel>
              <Select
                value={studentForm.course}
                onChange={(e) => setStudentForm({ ...studentForm, course: e.target.value })}
                label="Course"
              >
                {courses.map((course) => (
                  <MenuItem key={course} value={course}>
                    {course}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl fullWidth margin="normal" required>
              <InputLabel>Year Level</InputLabel>
              <Select
                value={studentForm.yearLevel}
                onChange={(e) => setStudentForm({ ...studentForm, yearLevel: e.target.value })}
                label="Year Level"
              >
                {years.map((year) => (
                  <MenuItem key={year} value={year}>
                    {year}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              fullWidth
              label="Section"
              value={studentForm.section}
              onChange={(e) => setStudentForm({ ...studentForm, section: e.target.value })}
              margin="normal"
              required
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddStudentDialog(false)} disabled={isAddingStudent}>
            Cancel
          </Button>
          <Button 
            onClick={handleAddStudent} 
            variant="contained" 
            disabled={isAddingStudent}
            sx={{ bgcolor: '#424242' }}
          >
            {isAddingStudent ? 'Adding...' : 'Add Student'}
          </Button>
        </DialogActions>
      </Dialog>


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