import React, { useState, useEffect } from "react";
import { Routes, Route, Link } from "react-router-dom";
import { 
  Box, Grid, Card, CardActionArea, CardContent, Typography, TextField, Button, Paper, MenuItem, Avatar, Snackbar, Alert, 
  TableContainer, Table, TableHead, TableBody, TableRow, TableCell, Stack, Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText,
  IconButton, Tooltip, Chip, InputAdornment, Accordion, AccordionSummary, AccordionDetails, CircularProgress, useTheme
} from "@mui/material";
import { Assignment, PersonAdd, ListAlt, Report, ImportExport, Dashboard, Visibility, Edit, Delete, Search, ExpandMore, Folder, ArrowBack, CloudUpload } from "@mui/icons-material";
import { db, storage, logActivity } from "../firebase";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, where, query, onSnapshot, orderBy, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { validateStudentId } from "../utils/studentValidation";

const courses = ["BSIT", "BSBA", "BSCRIM", "BSHTM", "BEED", "BSED", "BSHM"];
const years = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
const positions = ["Student", "President", "Vice President", "Secretary", "Treasurer"];

function MenuCard({ icon, title, to }) {
  return (
    <Grid item xs={12} sm={6} md={4}>
      <Card>
        <CardActionArea component={Link} to={to}>
          <CardContent sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            {icon}
            <Typography variant="h6">{title}</Typography>
          </CardContent>
        </CardActionArea>
      </Card>
    </Grid>
  );
}

function AddStudent({ onClose, isModal = false }) {
  const theme = useTheme();
  const [profile, setProfile] = useState({
    id: "",
    lastName: "",
    firstName: "",
    middleInitial: "",
    sex: "",
    age: "",
    birthdate: "",
    contact: "",
    course: "",
    year: "",
    section: "",
    email: "",
    image: null
  });
  const [imageFile, setImageFile] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentIdError, setStudentIdError] = useState('');
  const [isValidatingStudentId, setIsValidatingStudentId] = useState(false);

  // Test Firebase connectivity on component mount
  useEffect(() => {
    const testConnection = async () => {
      const isConnected = await testFirebaseConnection();
      if (!isConnected) {
        setSnackbar({ 
          open: true, 
          message: "Warning: Firebase connection test failed. Form submission may not work.", 
          severity: "warning" 
        });
      } else {
        // Try to sync offline data if connection is restored
        syncOfflineData();
      }
    };
    testConnection();
  }, []);

  // Sync offline data to Firebase
  const syncOfflineData = async () => {
    try {
      const offlineData = JSON.parse(localStorage.getItem('offlineStudents') || '[]');
      if (offlineData.length > 0) {
        console.log(`Found ${offlineData.length} offline records to sync`);
        
        for (const record of offlineData) {
          try {
            // Remove offline flags before saving
            const { offlineSaved, offlineTimestamp, ...cleanRecord } = record;
            await addDoc(collection(db, "students"), cleanRecord);
            console.log("Synced offline record:", cleanRecord.id);
          } catch (error) {
            console.error("Failed to sync offline record:", error);
          }
        }
        
        // Clear offline data after successful sync
        localStorage.removeItem('offlineStudents');
        setSnackbar({ 
          open: true, 
          message: `Successfully synced ${offlineData.length} offline records to database!`, 
          severity: "success" 
        });
      }
    } catch (error) {
      console.error("Error syncing offline data:", error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleImage = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setSnackbar({ open: true, message: "Please select a valid image file (JPEG, PNG, GIF)", severity: "error" });
        return;
      }
      
      // Validate file size (max 500KB for better quality)
      if (file.size > 500 * 1024) {
        setSnackbar({ open: true, message: "Image file size must be less than 500KB", severity: "error" });
        return;
      }
      
      // Show loading message
      setSnackbar({ open: true, message: "Processing image...", severity: "info" });
      
      setImageFile(file);
      
      // Convert to base64 with error handling
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile((prev) => ({ ...prev, image: reader.result }));
        setSnackbar({ open: true, message: "Profile image uploaded successfully!", severity: "success" });
      };
      reader.onerror = () => {
        setSnackbar({ open: true, message: "Error reading image file. Please try again.", severity: "error" });
        setImageFile(null);
      };
      reader.readAsDataURL(file);
    }
  };

  // Manual reset function in case form gets stuck
  const handleReset = () => {
    setIsSubmitting(false);
    setSnackbar({ open: true, message: "Form reset. You can try submitting again.", severity: "info" });
  };

  // Handle student ID validation
  const handleStudentIdChange = async (e) => {
    const studentId = e.target.value;
    setProfile(prev => ({ ...prev, id: studentId }));
    
    // Clear error if field is empty
    if (!studentId.trim()) {
      setStudentIdError('');
      return;
    }
    
    setIsValidatingStudentId(true);
    setStudentIdError('');
    
    try {
      const validation = await validateStudentId(studentId.trim());
      if (!validation.isValid) {
        setStudentIdError(validation.error || 'Student ID is not registered in the system');
      } else {
        setStudentIdError('');
      }
    } catch (error) {
      console.error('Error validating student ID:', error);
      setStudentIdError('Error validating student ID. Please try again.');
    } finally {
      setIsValidatingStudentId(false);
    }
  };

  // Remove selected image
  const handleRemoveImage = () => {
    setImageFile(null);
    setProfile((prev) => ({ ...prev, image: null }));
    setSnackbar({ open: true, message: "Profile image removed", severity: "info" });
    console.log("Image removed");
  };

  // Test Firebase connectivity
  const testFirebaseConnection = async () => {
    try {
      console.log("Testing Firebase connection...");
      console.log("DB object:", db);
      console.log("Storage object:", storage);
      
      if (!db) {
        throw new Error("Firebase Firestore is not initialized");
      }
      
      if (!storage) {
        throw new Error("Firebase Storage is not initialized");
      }
      
      // Try to get a collection reference
      const testCollection = collection(db, "test");
      console.log("Firebase connection test successful");
      return true;
    } catch (error) {
      console.error("Firebase connection test failed:", error);
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log("=== FORM SUBMISSION STARTED ===");
    
    // Prevent double submission
    if (isSubmitting) {
      console.log("Form is already submitting, ignoring click");
      return;
    }
    
    // Basic validation
    if (!profile.id || !profile.firstName || !profile.lastName || !profile.sex) {
      console.log("Validation failed - missing required fields");
      setSnackbar({ open: true, message: "Please fill in all required fields (ID, First Name, Last Name, Sex)", severity: "error" });
      return;
    }

    // Validate student ID exists in system
    if (studentIdError) {
      console.log("Validation failed - student ID error");
      setSnackbar({ open: true, message: studentIdError, severity: "error" });
      return;
    }

    // Double-check student ID validation before submission
    const validation = await validateStudentId(profile.id.trim());
    if (!validation.isValid) {
      console.log("Validation failed - student ID not registered");
      setSnackbar({ open: true, message: validation.error || 'Student ID is not registered in the system', severity: "error" });
      return;
    }

    console.log("Setting isSubmitting to true");
    setIsSubmitting(true);
    console.log("handleSubmit called", profile);
    
    // Test Firebase connection first
    console.log("Testing Firebase connection...");
    const isFirebaseConnected = await testFirebaseConnection();
    if (!isFirebaseConnected) {
      console.log("Firebase connection test failed");
      setSnackbar({ open: true, message: "Firebase connection failed. Please check your internet connection and try again.", severity: "error" });
      setIsSubmitting(false);
      return;
    }
    
    console.log("Firebase connection test passed");
    let imageUrl = profile.image || "";
    
    // Add timeout protection
    const timeoutId = setTimeout(() => {
      console.error("Form submission timed out - forcing reset");
      setSnackbar({ open: true, message: "Submission timed out. Please try again.", severity: "error" });
      setIsSubmitting(false);
    }, 15000); // Reduced to 15 seconds timeout
    
    try {
      // Prepare data for Firebase
      const dataToSave = {
        ...profile,
        image: imageUrl || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Remove the temporary image URL from the data
      delete dataToSave.imageFile;
      
      console.log("Attempting to save to Firestore:", dataToSave);
      
      // Add timeout for Firestore save operation (10 seconds)
      const savePromise = setDoc(doc(db, "students", dataToSave.id), dataToSave);
      const saveTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database save timed out')), 10000)
      );
      
      await Promise.race([savePromise, saveTimeout]);
      console.log("Successfully saved to Firestore with ID:", dataToSave.id);
      
      // Log activity
      await logActivity({ message: `Added student: ${profile.firstName} ${profile.lastName}`, type: 'add_student' });
      
      // Show success message based on whether image was uploaded
      if (imageUrl) {
        setSnackbar({ open: true, message: "Student saved to database successfully with image!", severity: "success" });
      } else {
        setSnackbar({ open: true, message: "Student saved to database successfully!", severity: "success" });
      }
      
      // Reset form
      console.log("Resetting form...");
      setProfile({
        id: "",
        lastName: "",
        firstName: "",
        middleInitial: "",
        sex: "",
        age: "",
        birthdate: "",
        contact: "",
        course: "",
        year: "",
        section: "",
        email: "",
        image: null
      });
      setImageFile(null);
      
      // Close modal if provided
      if (onClose) {
        console.log("Closing modal...");
        onClose();
      }
      
      console.log("=== FORM SUBMISSION COMPLETED SUCCESSFULLY ===");
      
    } catch (error) {
      console.error("=== FORM SUBMISSION FAILED ===");
      console.error("Error saving student:", error);
      clearTimeout(timeoutId);
      
      // Provide more specific error messages
      let errorMessage = "Unknown error occurred";
      if (error.code === 'permission-denied') {
        errorMessage = "Permission denied. Please check your Firebase security rules.";
      } else if (error.code === 'unavailable') {
        errorMessage = "Firebase service is unavailable. Please try again later.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Fallback: Save to localStorage if Firebase fails
      try {
        const offlineData = {
          ...dataToSave,
          offlineSaved: true,
          offlineTimestamp: new Date().toISOString()
        };
        
        const existingOfflineData = JSON.parse(localStorage.getItem('offlineStudents') || '[]');
        existingOfflineData.push(offlineData);
        localStorage.setItem('offlineStudents', JSON.stringify(existingOfflineData));
        
        setSnackbar({ 
          open: true, 
          message: `Student data saved offline due to connection issues. Will sync when connection is restored.`, 
          severity: "warning" 
        });
        
        // Reset form even if saved offline
        setProfile({
          id: "",
          lastName: "",
          firstName: "",
          middleInitial: "",
          sex: "",
          age: "",
          birthdate: "",
          contact: "",
          course: "",
          year: "",
          section: "",
          email: "",
          image: null
        });
        setImageFile(null);
        
        if (onClose) onClose();
        
      } catch (offlineError) {
        console.error("Offline save also failed:", offlineError);
        setSnackbar({ 
          open: true, 
          message: `Error saving student: ${errorMessage}`, 
          severity: "error" 
        });
      }
    } finally {
      console.log("Clearing timeout and setting isSubmitting to false");
      clearTimeout(timeoutId);
      setIsSubmitting(false);
      console.log("=== FORM SUBMISSION PROCESS ENDED ===");
    }
  };

  const formContent = (
        <form onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField 
                fullWidth 
                label="Student ID" 
                name="id" 
                value={profile.id} 
                onChange={handleStudentIdChange} 
                required 
                error={!!studentIdError}
                helperText={studentIdError}
                InputProps={{
                  endAdornment: isValidatingStudentId ? (
                    <InputAdornment position="end">
                      <CircularProgress size={20} />
                    </InputAdornment>
                  ) : null
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Email Address" name="email" value={profile.email} onChange={handleChange} type="email" />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Last Name" name="lastName" value={profile.lastName} onChange={handleChange} required />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="First Name" name="firstName" value={profile.firstName} onChange={handleChange} required />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Middle Initial" name="middleInitial" value={profile.middleInitial} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField fullWidth label="Sex" name="sex" value={profile.sex} onChange={handleChange} select required>
                <MenuItem value="Male">Male</MenuItem>
                <MenuItem value="Female">Female</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField fullWidth label="Age" name="age" value={profile.age} onChange={handleChange} type="number" />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField fullWidth label="Birthdate" name="birthdate" value={profile.birthdate} onChange={handleChange} type="date" InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField fullWidth label="Contact Number" name="contact" value={profile.contact} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Course" name="course" value={profile.course} onChange={handleChange} select>
                {courses.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Year" name="year" value={profile.year} onChange={handleChange} select>
                {years.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
              </TextField>
            </Grid>
            {/* Section removed per new registration alignment */}
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mt: 2, mb: 2 }}>Profile Image</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Button 
                variant="contained" 
                component="label" 
                startIcon={<CloudUpload />}
                sx={{ 
                  mt: 2,
                  backgroundColor: 'white',
                  color: 'black',
                  border: '1px solid #ccc',
                  '&:hover': {
                    backgroundColor: '#1976d2',
                    color: 'white',
                    border: '1px solid #1976d2'
                  }
                }}
              >
                Upload Profile Image
                <input type="file" accept="image/*" hidden onChange={handleImage} />
              </Button>
              {profile.image && (
                <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar src={profile.image} sx={{ width: 80, height: 80 }} />
                  <Button 
                    variant="outlined" 
                    color="error" 
                    size="small"
                    onClick={handleRemoveImage}
                  >
                    Remove
                  </Button>
                </Box>
              )}
            </Grid>
            <Grid item xs={12}>
          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            <Button 
              type="submit" 
              variant="contained" 
              color="primary" 
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save Student"}
            </Button>
            {isSubmitting && (
              <Button 
                variant="outlined" 
                color="secondary" 
                onClick={handleReset}
              >
                Reset Form
              </Button>
            )}
          </Stack>
            </Grid>
          </Grid>
        </form>
  );

  if (isModal) {
    return (
      <Box>
        {formContent}
        <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Add Student</Typography>
      <Paper sx={{ p: 3, maxWidth: 900, mx: "auto" }}>
        {formContent}
      </Paper>
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

function LostFound() {
  const theme = useTheme();
  const [lostForm, setLostForm] = useState({ name: '', description: '', location: '', image: null, timeLost: '', lostBy: '' });
  const [foundForm, setFoundForm] = useState({ name: '', description: '', location: '', image: null, timeFound: '', foundBy: '' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [lostItems, setLostItems] = useState([]);
  const [foundItems, setFoundItems] = useState([]);
  const [lostImageFile, setLostImageFile] = useState(null);
  const [foundImageFile, setFoundImageFile] = useState(null);
  const [lostSearch, setLostSearch] = useState('');
  const [foundSearch, setFoundSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [editModal, setEditModal] = useState({ open: false, type: '', item: null });
  const [editForm, setEditForm] = useState({ name: '', description: '', location: '', image: '', imageFile: null, timeLost: '', timeFound: '' });
  // Add students state
  const [students, setStudents] = useState([]);
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        console.log("Fetching students from Firebase...");
        
        // Fetch from 'students' collection (manually added students)
        const studentsQuerySnapshot = await getDocs(collection(db, "students"));
        const studentsData = studentsQuerySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Fetch from 'users' collection (registered students)
        const usersQuerySnapshot = await getDocs(query(collection(db, "users"), where("role", "==", "Student")));
        const registeredStudentsData = usersQuerySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            firstName: data.firstName || data.fullName?.split(' ')[0] || '',
            lastName: data.lastName || data.fullName?.split(' ').slice(1).join(' ') || '',
            email: data.email || '',
            course: data.course || '',
            year: data.year || '',
            section: data.section || '',
            studentId: data.studentId || '',
            createdAt: data.createdAt || '',
            updatedAt: data.updatedAt || '',
            profilePic: data.profilePic || '',
            isRegisteredUser: true // Flag to identify registered users
          };
        });
        
        // Combine both collections
        const allStudents = [...studentsData, ...registeredStudentsData];
        
        // Sort students by creation date (newest first)
        const sortedStudents = allStudents.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
          const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
          return dateB - dateA; // Descending order (newest first)
        });
        
        console.log("Students fetched successfully:", sortedStudents.length);
        console.log("Manual students:", studentsData.length);
        console.log("Registered students:", registeredStudentsData.length);
        setStudents(sortedStudents);
      } catch (error) {
        console.error("Error fetching students:", error);
        
        // Try to load from localStorage as fallback
        try {
          const offlineStudents = JSON.parse(localStorage.getItem('offlineStudents') || '[]');
          if (offlineStudents.length > 0) {
            console.log("Loading students from offline storage:", offlineStudents.length);
            setStudents(offlineStudents);
            setSnackbar({ 
              open: true, 
              message: `Loaded ${offlineStudents.length} students from offline storage. Some features may be limited.`, 
              severity: "warning" 
            });
          } else {
            setStudents([]);
            setSnackbar({ 
              open: true, 
              message: "Error loading students: " + error.message, 
              severity: "error" 
            });
          }
        } catch (offlineError) {
          console.error("Error loading offline students:", offlineError);
          setStudents([]);
          setSnackbar({ 
            open: true, 
            message: "Error loading students: " + error.message, 
            severity: "error" 
          });
        }
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
    const unsubLost = onSnapshot(query(collection(db, 'lost_items'), orderBy('createdAt', 'desc')), snap => {
      setLostItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubFound = onSnapshot(query(collection(db, 'found_items'), orderBy('createdAt', 'desc')), snap => {
      setFoundItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => { unsubLost(); unsubFound(); };
  }, []);

  // Summary counts
  const lostTotal = lostItems.length;
  const lostCompleted = lostItems.filter(i => i.resolved).length;
  const lostPending = lostItems.filter(i => !i.resolved).length;
  const foundTotal = foundItems.length;
  const foundCompleted = foundItems.filter(i => i.resolved).length;
  const foundPending = foundItems.filter(i => !i.resolved).length;

  // --- LostFound: handleLostImage ---
  const handleLostImage = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        setSnackbar({ open: true, message: "Please select a valid image file", severity: "error" });
        return;
      }
      // Validate file size (max 200KB)
      if (file.size > 200 * 1024) {
        setSnackbar({ open: true, message: "Image file size must be less than 200KB", severity: "error" });
        return;
      }
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        setLostForm(f => ({ ...f, image: reader.result }));
        setSnackbar({ open: true, message: "Image loaded as base64!", severity: "success" });
      };
      reader.readAsDataURL(file);
    }
  };
  // --- LostFound: handleFoundImage ---
  const handleFoundImage = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        setSnackbar({ open: true, message: "Please select a valid image file", severity: "error" });
        return;
      }
      // Validate file size (max 200KB)
      if (file.size > 200 * 1024) {
        setSnackbar({ open: true, message: "Image file size must be less than 200KB", severity: "error" });
        return;
      }
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        setFoundForm(f => ({ ...f, image: reader.result }));
        setSnackbar({ open: true, message: "Image loaded as base64!", severity: "success" });
      };
      reader.readAsDataURL(file);
    }
  };
  // --- LostFound: handleEditImage ---
  const handleEditImage = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        setSnackbar({ open: true, message: "Please select a valid image file", severity: "error" });
        return;
      }
      // Validate file size (max 200KB)
      if (file.size > 200 * 1024) {
        setSnackbar({ open: true, message: "Image file size must be less than 200KB", severity: "error" });
        return;
      }
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditForm(f => ({ ...f, image: reader.result, imageFile: null }));
        setSnackbar({ open: true, message: "Image loaded as base64!", severity: "success" });
      };
      reader.readAsDataURL(file);
    }
  };
  // --- LostFound: handleLostSubmit ---
  const handleLostSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'lost_items'), { ...lostForm, resolved: false, createdAt: new Date().toISOString() });
      setSnackbar({ open: true, message: 'Lost item submitted!', severity: 'success' });
      setLostForm({ name: '', description: '', location: '', image: null, timeLost: '' });
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to submit lost item.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };
  // --- LostFound: handleFoundSubmit ---
  const handleFoundSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'found_items'), { ...foundForm, resolved: false, createdAt: new Date().toISOString() });
      setSnackbar({ open: true, message: 'Found item submitted!', severity: 'success' });
      setFoundForm({ name: '', description: '', location: '', image: null });
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to submit found item.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };
  // --- LostFound: handleEditSave ---
  const handleEditSave = async () => {
    setLoading(true);
    try {
      await updateDoc(doc(db, editModal.type, editModal.item.id), {
        name: editForm.name,
        description: editForm.description,
        location: editForm.location,
        image: editForm.image
      });
      setSnackbar({ open: true, message: 'Item updated!', severity: 'success' });
      setEditModal({ open: false, type: '', item: null });
      setEditForm({ name: '', description: '', location: '', image: '', imageFile: null });
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to update item.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (type, id) => {
    try {
      await updateDoc(doc(db, type, id), { resolved: true });
      setSnackbar({ open: true, message: 'Item marked as resolved.', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Failed to resolve item.', severity: 'error' });
    }
  };
  const handleDelete = async (type, id) => {
    try {
      await deleteDoc(doc(db, type, id));
      setSnackbar({ open: true, message: 'Item deleted.', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Failed to delete item.', severity: 'error' });
    }
  };

  const filteredLost = lostItems.filter(item =>
    item.name.toLowerCase().includes(lostSearch.toLowerCase()) ||
    item.description.toLowerCase().includes(lostSearch.toLowerCase()) ||
    item.location.toLowerCase().includes(lostSearch.toLowerCase())
  );
  const filteredFound = foundItems.filter(item =>
    item.name.toLowerCase().includes(foundSearch.toLowerCase()) ||
    item.description.toLowerCase().includes(foundSearch.toLowerCase()) ||
    item.location.toLowerCase().includes(foundSearch.toLowerCase())
  );

  // Edit logic
  const handleEditOpen = (type, item) => {
    setEditForm({ name: item.name, description: item.description, location: item.location, image: item.image || '', imageFile: null });
    setEditModal({ open: true, type, item });
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Lost and Found</Typography>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, mb: 2, bgcolor: '#80000015', borderLeft: '4px solid #800000' }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#800000' }}>Lost Items Summary</Typography>
            <Grid container spacing={2}>
              <Grid item><Typography sx={{ color: '#800000' }}>Total: <b>{lostTotal}</b></Typography></Grid>
              <Grid item><Typography sx={{ color: '#800000' }}>Completed: <b>{lostCompleted}</b></Typography></Grid>
              <Grid item><Typography sx={{ color: '#800000' }}>Pending: <b>{lostPending}</b></Typography></Grid>
            </Grid>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, mb: 2, bgcolor: '#80000015', borderLeft: '4px solid #800000' }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#800000' }}>Found Items Summary</Typography>
            <Grid container spacing={2}>
              <Grid item><Typography sx={{ color: '#800000' }}>Total: <b>{foundTotal}</b></Typography></Grid>
              <Grid item><Typography sx={{ color: '#800000' }}>Completed: <b>{foundCompleted}</b></Typography></Grid>
              <Grid item><Typography sx={{ color: '#800000' }}>Pending: <b>{foundPending}</b></Typography></Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, mb: 2 }}>
            <Typography variant="h6" gutterBottom>Found Item Entry</Typography>
            <form onSubmit={handleFoundSubmit}>
              <TextField fullWidth label="Item Name" value={foundForm.name} onChange={e => setFoundForm(f => ({ ...f, name: e.target.value }))} sx={{ mb: 2 }} />
              <TextField fullWidth label="Description" multiline minRows={2} value={foundForm.description} onChange={e => setFoundForm(f => ({ ...f, description: e.target.value }))} sx={{ mb: 2 }} />
              <TextField fullWidth label="Location Found" value={foundForm.location} onChange={e => setFoundForm(f => ({ ...f, location: e.target.value }))} sx={{ mb: 2 }} />
              {/* Student Who Found Dropdown */}
              <TextField
                select
                fullWidth
                label="Student Who Found"
                value={foundForm.foundBy || ""}
                onChange={e => setFoundForm(f => ({ ...f, foundBy: e.target.value }))}
                sx={{ mb: 2 }}
              >
                {students.map(student => (
                  <MenuItem key={student.id} value={student.id}>
                    {student.id} - {student.firstName} {student.lastName}
                  </MenuItem>
                ))}
              </TextField>
              <Button variant="outlined" component="label" sx={{ mb: 2 }}>
                Upload Image
                <input type="file" accept="image/*" hidden onChange={handleFoundImage} />
              </Button>
              {foundImageFile && <Typography variant="caption">{foundImageFile.name}</Typography>}
              <Button variant="contained" type="submit" disabled={loading} sx={{ bgcolor: '#800000', '&:hover': { bgcolor: '#6b0000' } }}>Submit Found Item</Button>
            </form>
          </Paper>
          <Paper sx={{ p: 3, mb: 2 }}>
            <TextField fullWidth placeholder="Search found items..." value={foundSearch} onChange={e => setFoundSearch(e.target.value)} sx={{ mb: 2 }} />
            <Typography variant="h6" gutterBottom>Found Items</Typography>
            {filteredFound.length === 0 ? <Typography>No found items yet.</Typography> : filteredFound.map(item => (
              <Box key={item.id} sx={{ mb: 2, p: 2, bgcolor: item.resolved ? '#c8e6c9' : '#e8f5e9', borderRadius: 2, position: 'relative' }}>
                <Grid container spacing={1} alignItems="center">
                  <Grid item>
                    {item.image && <Avatar src={item.image} variant="rounded" sx={{ width: 56, height: 56, mr: 2 }} />}
                  </Grid>
                  <Grid item xs>
                    <Typography fontWeight={700} sx={item.resolved ? { textDecoration: 'line-through', color: 'gray' } : {}}>{item.name}</Typography>
                    <Typography variant="body2" sx={item.resolved ? { textDecoration: 'line-through', color: 'gray' } : {}}>{item.description}</Typography>
                    <Typography variant="caption" color="text.secondary">Location: {item.location}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>{new Date(item.createdAt).toLocaleString()}</Typography>
                  </Grid>
                  <Grid item>
                    <Button size="small" color="info" onClick={() => handleEditOpen('found_items', item)}>Edit</Button>
                    {!item.resolved && <Button size="small" color="success" onClick={() => handleResolve('found_items', item.id)}>Resolve</Button>}
                    <Button size="small" color="error" onClick={() => handleDelete('found_items', item.id)}>Delete</Button>
                  </Grid>
                </Grid>
                {item.resolved && <Typography variant="caption" color="success.main" sx={{ position: 'absolute', top: 8, right: 16 }}>Resolved</Typography>}
              </Box>
            ))}
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, mb: 2 }}>
            <Typography variant="h6" gutterBottom>Lost Item Entry</Typography>
            <form onSubmit={handleLostSubmit}>
              <TextField fullWidth label="Item Name" value={lostForm.name} onChange={e => setLostForm(f => ({ ...f, name: e.target.value }))} sx={{ mb: 2 }} />
              <TextField fullWidth label="Description" multiline minRows={2} value={lostForm.description} onChange={e => setLostForm(f => ({ ...f, description: e.target.value }))} sx={{ mb: 2 }} />
              <TextField fullWidth label="Location Lost" value={lostForm.location} onChange={e => setLostForm(f => ({ ...f, location: e.target.value }))} sx={{ mb: 2 }} />
              {/* Student Who Lost Dropdown */}
              <TextField
                select
                fullWidth
                label="Student Who Lost"
                value={lostForm.lostBy || ""}
                onChange={e => setLostForm(f => ({ ...f, lostBy: e.target.value }))}
                sx={{ mb: 2 }}
              >
                {students.map(student => (
                  <MenuItem key={student.id} value={student.id}>
                    {student.id} - {student.firstName} {student.lastName}
                  </MenuItem>
                ))}
              </TextField>
              <Button variant="outlined" component="label" sx={{ mb: 2 }}>
                Upload Image
                <input type="file" accept="image/*" hidden onChange={handleLostImage} />
              </Button>
              {lostImageFile && <Typography variant="caption">{lostImageFile.name}</Typography>}
              <Button variant="contained" type="submit" disabled={loading} sx={{ bgcolor: '#800000', '&:hover': { bgcolor: '#6b0000' } }}>Submit Lost Item</Button>
            </form>
          </Paper>
          <Paper sx={{ p: 3, mb: 2 }}>
            <TextField fullWidth placeholder="Search lost items..." value={lostSearch} onChange={e => setLostSearch(e.target.value)} sx={{ mb: 2 }} />
            <Typography variant="h6" gutterBottom>Lost Items</Typography>
            {filteredLost.length === 0 ? <Typography>No lost items yet.</Typography> : filteredLost.map(item => (
              <Box key={item.id} sx={{ mb: 2, p: 2, bgcolor: item.resolved ? '#ffe0b2' : '#fffde7', borderRadius: 2, position: 'relative' }}>
                <Grid container spacing={1} alignItems="center">
                  <Grid item>
                    {item.image && <Avatar src={item.image} variant="rounded" sx={{ width: 56, height: 56, mr: 2 }} />}
                  </Grid>
                  <Grid item xs>
                    <Typography fontWeight={700} sx={item.resolved ? { textDecoration: 'line-through', color: 'gray' } : {}}>{item.name}</Typography>
                    <Typography variant="body2" sx={item.resolved ? { textDecoration: 'line-through', color: 'gray' } : {}}>{item.description}</Typography>
                    <Typography variant="caption" color="text.secondary">Location: {item.location}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>{new Date(item.createdAt).toLocaleString()}</Typography>
                  </Grid>
                  <Grid item>
                    <Button size="small" color="info" onClick={() => handleEditOpen('lost_items', item)}>Edit</Button>
                    {!item.resolved && <Button size="small" color="success" onClick={() => handleResolve('lost_items', item.id)}>Resolve</Button>}
                    <Button size="small" color="error" onClick={() => handleDelete('lost_items', item.id)}>Delete</Button>
                  </Grid>
                </Grid>
                {item.resolved && <Typography variant="caption" color="success.main" sx={{ position: 'absolute', top: 8, right: 16 }}>Resolved</Typography>}
              </Box>
            ))}
          </Paper>
        </Grid>
      </Grid>
      {/* Edit Modal */}
      <Dialog open={editModal.open} onClose={() => setEditModal({ open: false, type: '', item: null })} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Item</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Item Name" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} sx={{ mb: 2 }} />
          <TextField fullWidth label="Description" multiline minRows={2} value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} sx={{ mb: 2 }} />
          <TextField fullWidth label="Location" value={editForm.location} onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))} sx={{ mb: 2 }} />
          <Button variant="outlined" component="label" sx={{ mb: 2 }}>
            Update Image
            <input type="file" accept="image/*" hidden onChange={handleEditImage} />
          </Button>
          {editForm.image && <Avatar src={editForm.image} variant="rounded" sx={{ width: 56, height: 56, mb: 2 }} />}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditModal({ open: false, type: '', item: null })}>Cancel</Button>
          <Button onClick={handleEditSave} variant="contained" disabled={loading} sx={{ bgcolor: '#800000', '&:hover': { bgcolor: '#6b0000' } }}>Save</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

function CourseDashboard({ 
  courseName, 
  onBack, 
  setOpenAddStudent, 
  setOpenViolationRecord, 
  setViolationRecords, 
  currentStudent, 
  setCurrentStudent,
  setOpenViewDetails,
  setOpenEditStudent,
  setStudentToView,
  setStudentToEdit,
  setOpenViolationImagePreview,
  setPreviewViolationImage,
  violationRecords
}) {
  const theme = useTheme();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedYear, setSelectedYear] = useState("All Years");
  const [openViolation, setOpenViolation] = useState(false);
  const [violation, setViolation] = useState({ 
    violation: "", 
    classification: "", 
    date: "",
    time: "",
    location: "",
    description: "",
    witnesses: "",
    severity: "",
    actionTaken: "",
    reportedBy: ""
  });
  const [violationImageFile, setViolationImageFile] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        console.log(`Fetching ${courseName} students from Firebase...`);
        
        // Fetch from 'students' collection (manually added students)
        const studentsQuerySnapshot = await getDocs(collection(db, "students"));
        const studentsData = studentsQuerySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Fetch from 'users' collection (registered students)
        const usersQuerySnapshot = await getDocs(query(collection(db, "users"), where("role", "==", "Student")));
        const registeredStudentsData = usersQuerySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            firstName: data.firstName || data.fullName?.split(' ')[0] || '',
            lastName: data.lastName || data.fullName?.split(' ').slice(1).join(' ') || '',
            email: data.email || '',
            course: data.course || '',
            year: data.year || '',
            section: data.section || '',
            studentId: data.studentId || '',
            createdAt: data.createdAt || '',
            updatedAt: data.updatedAt || '',
            profilePic: data.profilePic || '',
            isRegisteredUser: true
          };
        });
        
        // Combine both collections and filter by course
        const allStudents = [...studentsData, ...registeredStudentsData];
        const courseStudents = allStudents.filter(student => student.course === courseName);
        
        // Sort students by name
        const sortedStudents = courseStudents.sort((a, b) => {
          const nameA = `${a.firstName || ""} ${a.lastName || ""}`.trim().toLowerCase();
          const nameB = `${b.firstName || ""} ${b.lastName || ""}`.trim().toLowerCase();
          return nameA.localeCompare(nameB);
        });
        
        console.log(`${courseName} students fetched successfully:`, sortedStudents.length);
        setStudents(sortedStudents);
      } catch (error) {
        console.error("Error fetching students:", error);
        setStudents([]);
        setSnackbar({ 
          open: true, 
          message: "Error loading students: " + error.message, 
          severity: "error" 
        });
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, [courseName]);

  // Filter students based on search and year level
  const filteredStudents = students.filter(student => {
    // Year level filter
    const yearMatch = selectedYear === "All Years" || student.year === selectedYear;
    
    // Search filter
    const searchMatch = !search.trim() || (() => {
      const term = search.trim().toLowerCase();
      const fullName = `${student.firstName || ""} ${student.lastName || ""}`.trim().toLowerCase();
      const email = (student.email || "").toLowerCase();
      const studentId = (student.id || "").toLowerCase();
      
      return fullName.includes(term) || 
             email.includes(term) || 
             studentId.includes(term);
    })();
    
    return yearMatch && searchMatch;
  });

  // Handle view student details
  const handleViewStudent = (student) => {
    console.log("Viewing student:", student);
    setStudentToView(student);
    setOpenViewDetails(true);
  };

  // Handle edit student
  const handleEditStudent = (student) => {
    console.log("Editing student:", student);
    setStudentToEdit(student);
    setOpenEditStudent(true);
  };

  // Handle delete student
  const handleDeleteStudent = async (student) => {
    if (window.confirm(`Are you sure you want to delete ${student.firstName} ${student.lastName}?`)) {
      try {
        console.log("Deleting student:", student.id);
        
        if (!student.isRegisteredUser) {
          await deleteDoc(doc(db, "students", student.id));
          await logActivity({ message: `Deleted student: ${student.firstName} ${student.lastName}`, type: 'delete_student' });
          setSnackbar({ open: true, message: "Student deleted successfully!", severity: "success" });
          
          // Refresh the student list
          setStudents(prev => prev.filter(s => s.id !== student.id));
        } else {
          setSnackbar({ 
            open: true, 
            message: "Cannot delete registered users. They must be removed from the users collection.", 
            severity: "warning" 
          });
        }
      } catch (error) {
        console.error("Error deleting student:", error);
        setSnackbar({ open: true, message: "Error deleting student: " + error.message, severity: "error" });
      }
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton
          onClick={onBack}
          sx={{ 
            bgcolor: '#fff', 
            color: '#000', 
            border: '1px solid #000',
            '&:hover': { bgcolor: '#800000', color: '#fff', borderColor: '#800000' } 
          }}
        >
          <ArrowBack />
        </IconButton>
        <Box>
          <Typography variant="h4" sx={{ 
            color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000', 
            fontWeight: 'bold' 
          }}>
            {courseName} Students
          </Typography>
          <Typography variant="body1" sx={{ 
            color: theme.palette.mode === 'dark' ? '#ffffff' : 'text.secondary' 
          }}>
            {students.length} student{students.length !== 1 ? 's' : ''} enrolled in {courseName}
          </Typography>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ 
            p: 2, 
            textAlign: 'center', 
            bgcolor: theme.palette.mode === 'dark' ? '#2d2d2d' : '#f8f9fa', 
            border: theme.palette.mode === 'dark' ? '1px solid #404040' : '1px solid #e9ecef' 
          }}>
            <Typography variant="h4" sx={{ 
              color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000', 
              fontWeight: 'bold' 
            }}>
              {students.length}
            </Typography>
            <Typography variant="body2" sx={{ 
              color: theme.palette.mode === 'dark' ? '#ffffff' : 'text.secondary' 
            }}>
              Total {courseName} Students
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ 
            p: 2, 
            textAlign: 'center', 
            bgcolor: theme.palette.mode === 'dark' ? '#2d2d2d' : '#f8f9fa', 
            border: theme.palette.mode === 'dark' ? '1px solid #404040' : '1px solid #e9ecef' 
          }}>
            <Typography variant="h4" sx={{ 
              color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000', 
              fontWeight: 'bold' 
            }}>
              {selectedYear === "All Years" ? new Set(students.map(s => s.year)).size : 1}
            </Typography>
            <Typography variant="body2" sx={{ 
              color: theme.palette.mode === 'dark' ? '#ffffff' : 'text.secondary' 
            }}>
              {selectedYear === "All Years" ? 'Year Levels' : 'Selected Year'}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ 
            p: 2, 
            textAlign: 'center', 
            bgcolor: theme.palette.mode === 'dark' ? '#2d2d2d' : '#f8f9fa', 
            border: theme.palette.mode === 'dark' ? '1px solid #404040' : '1px solid #e9ecef' 
          }}>
            <Typography variant="h4" sx={{ 
              color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000', 
              fontWeight: 'bold' 
            }}>
              {new Set(filteredStudents.map(s => s.section)).size}
            </Typography>
            <Typography variant="body2" sx={{ 
              color: theme.palette.mode === 'dark' ? '#ffffff' : 'text.secondary' 
            }}>
              Sections
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ 
            p: 2, 
            textAlign: 'center', 
            bgcolor: theme.palette.mode === 'dark' ? '#2d2d2d' : '#f8f9fa', 
            border: theme.palette.mode === 'dark' ? '1px solid #404040' : '1px solid #e9ecef' 
          }}>
            <Typography variant="h4" sx={{ 
              color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000', 
              fontWeight: 'bold' 
            }}>
              {filteredStudents.length}
            </Typography>
            <Typography variant="body2" sx={{ 
              color: theme.palette.mode === 'dark' ? '#ffffff' : 'text.secondary' 
            }}>
              {search.trim() || selectedYear !== "All Years" ? 'Filtered Results' : 'All Students'}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Year Level Filter */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ 
          mb: 2, 
          color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000', 
          fontWeight: 'bold' 
        }}>
          Filter by Year Level
        </Typography>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          <Chip
            label="All Years"
            onClick={() => setSelectedYear("All Years")}
            color={selectedYear === "All Years" ? "primary" : "default"}
            sx={{
              bgcolor: selectedYear === "All Years" ? '#800000' : 'default',
              color: selectedYear === "All Years" ? 'white' : 'default',
              '&:hover': {
                bgcolor: selectedYear === "All Years" ? '#6b0000' : '#f5f5f5'
              }
            }}
          />
          {["1st Year", "2nd Year", "3rd Year", "4th Year"].map(year => {
            const yearStudents = students.filter(s => s.year === year);
            return (
              <Chip
                key={year}
                label={`${year} (${yearStudents.length})`}
                onClick={() => setSelectedYear(year)}
                color={selectedYear === year ? "primary" : "default"}
                disabled={yearStudents.length === 0}
                sx={{
                  bgcolor: selectedYear === year ? '#800000' : 'default',
                  color: selectedYear === year ? 'white' : 'default',
                  '&:hover': {
                    bgcolor: selectedYear === year ? '#6b0000' : '#f5f5f5'
                  },
                  opacity: yearStudents.length === 0 ? 0.5 : 1
                }}
              />
            );
          })}
        </Stack>
        {selectedYear !== "All Years" && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Showing {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''} from {selectedYear}
          </Typography>
        )}
      </Box>

      {/* Search and Actions */}
      <Stack direction="row" spacing={2} sx={{ mb: 2, alignItems: 'center', justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={2}>
          <Button 
            variant="outlined" 
            onClick={() => setOpenAddStudent(true)}
            sx={{ bgcolor: '#fff', color: '#000', borderColor: '#000', '&:hover': { bgcolor: '#800000', color: '#fff', borderColor: '#800000' } }}
          >
            Add Student
          </Button>
          {(search.trim() || selectedYear !== "All Years") && (
            <Button 
              variant="outlined" 
              onClick={() => {
                setSearch("");
                setSelectedYear("All Years");
              }}
              sx={{ bgcolor: '#fff', color: '#666', borderColor: '#666', '&:hover': { bgcolor: '#f5f5f5', color: '#333', borderColor: '#333' } }}
            >
              Clear Filters
            </Button>
          )}
        </Stack>
        <TextField 
          value={search}
          onChange={e => setSearch(e.target.value)}
          size="small"
          placeholder={`Search ${courseName} students by name, email, or ID...`}
          sx={{ width: 350 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ fontSize: 18, color: 'text.secondary' }} />
              </InputAdornment>
            )
          }}
        />
      </Stack>

      {/* Students Table */}
      {loading ? (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography>Loading {courseName} students...</Typography>
        </Box>
      ) : students.length === 0 ? (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography>No {courseName} students found.</Typography>
        </Box>
      ) : filteredStudents.length === 0 ? (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography>
            No {courseName} students found matching your criteria.
            {selectedYear !== "All Years" && ` No students in ${selectedYear}.`}
            {search.trim() && ` No students match "${search}".`}
          </Typography>
          <Button 
            variant="outlined" 
            onClick={() => {
              setSearch("");
              setSelectedYear("All Years");
            }}
            sx={{ mt: 2 }}
          >
            Clear Filters
          </Button>
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ 
                bgcolor: theme.palette.mode === 'dark' ? '#800000' : '#fafafa' 
              }}>
                <TableCell sx={{ 
                  fontWeight: 'bold',
                  color: theme.palette.mode === 'dark' ? '#ffffff' : 'inherit'
                }}>Image</TableCell>
                <TableCell sx={{ 
                  fontWeight: 'bold',
                  color: theme.palette.mode === 'dark' ? '#ffffff' : 'inherit'
                }}>Name</TableCell>
                <TableCell sx={{ 
                  fontWeight: 'bold',
                  color: theme.palette.mode === 'dark' ? '#ffffff' : 'inherit'
                }}>
                  Year
                  {selectedYear !== "All Years" && (
                    <Chip 
                      label={selectedYear} 
                      size="small" 
                      sx={{ 
                        ml: 1, 
                        bgcolor: '#800000', 
                        color: 'white',
                        fontSize: '0.7rem',
                        height: 20
                      }} 
                    />
                  )}
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 'bold',
                  color: theme.palette.mode === 'dark' ? '#ffffff' : 'inherit'
                }}>Section</TableCell>
                <TableCell sx={{ 
                  fontWeight: 'bold',
                  color: theme.palette.mode === 'dark' ? '#ffffff' : 'inherit'
                }}>Email</TableCell>
                <TableCell sx={{ 
                  fontWeight: 'bold',
                  color: theme.palette.mode === 'dark' ? '#ffffff' : 'inherit'
                }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredStudents.map(student => (
                <TableRow
                  key={student.id}
                  hover
                  sx={{ '&:hover': { bgcolor: '#f9f9f9' } }}
                >
                  <TableCell>
                    {student.image ? (
                      <Avatar src={student.image} sx={{ width: 40, height: 40 }} />
                    ) : (
                      <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}>
                        {student.firstName?.charAt(0)}{student.lastName?.charAt(0)}
                      </Avatar>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                      {student.firstName} {student.lastName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ID: {student.id}
                    </Typography>
                  </TableCell>
                  <TableCell>{student.year || 'N/A'}</TableCell>
                  <TableCell>{student.section || 'N/A'}</TableCell>
                  <TableCell>
                    <Tooltip title={student.email || ''} placement="top">
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          maxWidth: 140, 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          whiteSpace: 'nowrap' 
                        }}
                      >
                        {(student.email || '').length > 0 ? `${(student.email || '').slice(0, 15)}…` : 'N/A'}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Tooltip title="View Details">
                        <IconButton 
                          size="small"
                          sx={{ color: 'grey.600', '&:hover': { color: '#800000' } }}
                          onClick={(e) => { e.stopPropagation(); handleViewStudent(student); }}
                        >
                          <Visibility sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit Student">
                        <IconButton 
                          size="small"
                          sx={{ color: 'grey.600', '&:hover': { color: '#800000' } }}
                          onClick={(e) => { e.stopPropagation(); handleEditStudent(student); }}
                        >
                          <Edit sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Student">
                        <IconButton 
                          size="small"
                          sx={{ color: 'grey.600', '&:hover': { color: '#d32f2f' } }}
                          onClick={(e) => { e.stopPropagation(); handleDeleteStudent(student); }}
                        >
                          <Delete sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

function StudentList({ 
  setOpenAddStudent, 
  setOpenViolationRecord, 
  setViolationRecords, 
  currentStudent, 
  setCurrentStudent,
  setOpenViewDetails,
  setOpenEditStudent,
  setStudentToView,
  setStudentToEdit,
  setOpenViolationImagePreview,
  setPreviewViolationImage,
  violationRecords
}) {
  const theme = useTheme();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentView, setCurrentView] = useState('all'); // 'all' or course name
  const [openViolation, setOpenViolation] = useState(false);
  const [violation, setViolation] = useState({ 
    violation: "", 
    classification: "", 
    date: "",
    time: "",
    location: "",
    description: "",
    witnesses: "",
    severity: "",
    actionTaken: "",
    reportedBy: ""
  });
  const [violationImageFile, setViolationImageFile] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        console.log("Fetching students from Firebase...");
        
        // Fetch from 'students' collection (manually added students)
        const studentsQuerySnapshot = await getDocs(collection(db, "students"));
        const studentsData = studentsQuerySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Fetch from 'users' collection (registered students)
        const usersQuerySnapshot = await getDocs(query(collection(db, "users"), where("role", "==", "Student")));
        const registeredStudentsData = usersQuerySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            firstName: data.firstName || data.fullName?.split(' ')[0] || '',
            lastName: data.lastName || data.fullName?.split(' ').slice(1).join(' ') || '',
            email: data.email || '',
            course: data.course || '',
            year: data.year || '',
            section: data.section || '',
            studentId: data.studentId || '',
            createdAt: data.createdAt || '',
            updatedAt: data.updatedAt || '',
            profilePic: data.profilePic || '',
            isRegisteredUser: true // Flag to identify registered users
          };
        });
        
        // Combine both collections
        const allStudents = [...studentsData, ...registeredStudentsData];
        
        // Sort students by creation date (newest first)
        const sortedStudents = allStudents.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
          const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
          return dateB - dateA; // Descending order (newest first)
        });
        
        console.log("Students fetched successfully:", sortedStudents.length);
        console.log("Manual students:", studentsData.length);
        console.log("Registered students:", registeredStudentsData.length);
        setStudents(sortedStudents);
      } catch (error) {
        console.error("Error fetching students:", error);
        
        // Try to load from localStorage as fallback
        try {
          const offlineStudents = JSON.parse(localStorage.getItem('offlineStudents') || '[]');
          if (offlineStudents.length > 0) {
            console.log("Loading students from offline storage:", offlineStudents.length);
            setStudents(offlineStudents);
            setSnackbar({ 
              open: true, 
              message: `Loaded ${offlineStudents.length} students from offline storage. Some features may be limited.`, 
              severity: "warning" 
            });
          } else {
            setStudents([]);
            setSnackbar({ 
              open: true, 
              message: "Error loading students: " + error.message, 
              severity: "error" 
            });
          }
        } catch (offlineError) {
          console.error("Error loading offline students:", offlineError);
          setStudents([]);
          setSnackbar({ 
            open: true, 
            message: "Error loading students: " + error.message, 
            severity: "error" 
          });
        }
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  // Group students by course and apply search filter
  const groupedStudents = (() => {
    let filteredStudents = students;
    
    // Apply search filter if search term exists
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      filteredStudents = students.filter(s => {
        const fullName = `${s.firstName || ""} ${s.lastName || ""}`.trim().toLowerCase();
        const course = (s.course || "").toLowerCase();
        const email = (s.email || "").toLowerCase();
        const studentId = (s.id || "").toLowerCase();
        
        return fullName.includes(term) || 
               course.includes(term) || 
               email.includes(term) || 
               studentId.includes(term);
      });
    }
    
    // Group by course - only include students with actual courses
    const grouped = filteredStudents.reduce((acc, student) => {
      const course = student.course;
      // Only include students who have a course assigned
      if (course && course.trim() !== '') {
        if (!acc[course]) {
          acc[course] = [];
        }
        acc[course].push(student);
      }
      return acc;
    }, {});
    
    // Sort students within each course by name
    Object.keys(grouped).forEach(course => {
      grouped[course].sort((a, b) => {
        const nameA = `${a.firstName || ""} ${a.lastName || ""}`.trim().toLowerCase();
        const nameB = `${b.firstName || ""} ${b.lastName || ""}`.trim().toLowerCase();
        return nameA.localeCompare(nameB);
      });
    });
    
    return grouped;
  })();

  const handleExport = () => {
    const csvRows = [
      ["ID", "First Name", "Last Name", "Course", "Year", "Section", "Email"],
      ...students.map(s => [
        s.id, s.firstName, s.lastName, s.course, s.year, s.section, s.email
      ])
    ];
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.href = csvContent;
    link.download = "students.csv";
    link.click();
  };

  // Refresh student list
  const handleRefresh = async () => {
    setLoading(true);
    try {
      console.log("Refreshing students from Firebase...");
      
      // Fetch from 'students' collection (manually added students)
      const studentsQuerySnapshot = await getDocs(collection(db, "students"));
      const studentsData = studentsQuerySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Fetch from 'users' collection (registered students)
      const usersQuerySnapshot = await getDocs(query(collection(db, "users"), where("role", "==", "Student")));
      const registeredStudentsData = usersQuerySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          firstName: data.firstName || data.fullName?.split(' ')[0] || '',
          lastName: data.lastName || data.fullName?.split(' ').slice(1).join(' ') || '',
          email: data.email || '',
          course: data.course || '',
          year: data.year || '',
          section: data.section || '',
          studentId: data.studentId || '',
          createdAt: data.createdAt || '',
          updatedAt: data.updatedAt || '',
          profilePic: data.profilePic || '',
          isRegisteredUser: true
        };
      });
      
      // Combine both collections
      const allStudents = [...studentsData, ...registeredStudentsData];
      
      // Sort students by creation date (newest first)
      const sortedStudents = allStudents.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return dateB - dateA;
      });
      
      setStudents(sortedStudents);
      setSnackbar({ open: true, message: "Student list refreshed successfully!", severity: "success" });
    } catch (error) {
      console.error("Error refreshing students:", error);
      setSnackbar({ open: true, message: "Error refreshing students: " + error.message, severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  // Handle view student details
  const handleViewStudent = (student) => {
    console.log("Viewing student:", student);
    setStudentToView(student);
    setOpenViewDetails(true);
  };

  // Handle edit student
  const handleEditStudent = (student) => {
    console.log("Editing student:", student);
    setStudentToEdit(student);
    setOpenEditStudent(true);
  };

  // Handle delete student
  const handleDeleteStudent = async (student) => {
    if (window.confirm(`Are you sure you want to delete ${student.firstName} ${student.lastName}?`)) {
      try {
        console.log("Deleting student:", student.id);
        
        // Only delete from students collection if it's not a registered user
        if (!student.isRegisteredUser) {
          await deleteDoc(doc(db, "students", student.id));
          await logActivity({ message: `Deleted student: ${student.firstName} ${student.lastName}`, type: 'delete_student' });
          setSnackbar({ open: true, message: "Student deleted successfully!", severity: "success" });
        } else {
          setSnackbar({ 
            open: true, 
            message: "Cannot delete registered users. They must be removed from the users collection.", 
            severity: "warning" 
          });
          return;
        }
        
        // Refresh the student list with error handling
        try {
          // Fetch from 'students' collection (manually added students)
          const studentsQuerySnapshot = await getDocs(collection(db, "students"));
          const studentsData = studentsQuerySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
          // Fetch from 'users' collection (registered students)
          const usersQuerySnapshot = await getDocs(query(collection(db, "users"), where("role", "==", "Student")));
          const registeredStudentsData = usersQuerySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              firstName: data.firstName || data.fullName?.split(' ')[0] || '',
              lastName: data.lastName || data.fullName?.split(' ').slice(1).join(' ') || '',
              email: data.email || '',
              course: data.course || '',
              year: data.year || '',
              section: data.section || '',
              studentId: data.studentId || '',
              createdAt: data.createdAt || '',
              updatedAt: data.updatedAt || '',
              profilePic: data.profilePic || '',
              isRegisteredUser: true
            };
          });
          
          // Combine both collections
          const allStudents = [...studentsData, ...registeredStudentsData];
          
          // Sort students by creation date (newest first)
          const sortedStudents = allStudents.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
            const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
            return dateB - dateA;
          });
          
          setStudents(sortedStudents);
        } catch (refreshError) {
          console.error("Error refreshing student list:", refreshError);
          setSnackbar({ 
            open: true, 
            message: "Student deleted but error refreshing list: " + refreshError.message, 
            severity: "warning" 
          });
        }
      } catch (error) {
        console.error("Error deleting student:", error);
        setSnackbar({ open: true, message: "Error deleting student: " + error.message, severity: "error" });
      }
    }
  };

  // Handle add violation for a specific student
  const handleAddViolation = (student) => {
    setCurrentStudent(student);
    setViolation({ 
      violation: "", 
      classification: "", 
      date: "",
      time: "",
      location: "",
      description: "",
      witnesses: "",
      severity: "",
      actionTaken: "",
      reportedBy: ""
    });
    setViolationImageFile(null);
    setOpenViolation(true);
  };

  // --- StudentList: handleViolationImage ---
  const handleViolationImage = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        setSnackbar({ open: true, message: "Please select a valid image file", severity: "error" });
        return;
      }
      // Validate file size (max 200KB)
      if (file.size > 200 * 1024) {
        setSnackbar({ open: true, message: "Image file size must be less than 200KB", severity: "error" });
        return;
      }
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        setViolationImageFile(reader.result);
        setSnackbar({ open: true, message: "Image loaded as base64!", severity: "success" });
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove violation image
  const handleRemoveViolationImage = () => {
    setViolationImageFile(null);
    console.log("Violation image removed");
  };

  // Handle violation image preview
  const handleViolationImagePreview = (imageUrl) => {
    setPreviewViolationImage(imageUrl);
    setOpenViolationImagePreview(true);
  };

  // Handle view violations for a specific student
  const handleViewViolations = async (student) => {
    try {
      setCurrentStudent(student);
      console.log("Fetching violations for student:", student.id, student.firstName, student.lastName);
      
      // Use a query to filter violations at the database level for better performance
      const violationsQuery = query(
        collection(db, "violations"), 
        where("studentId", "==", student.id)
      );
      
      const querySnapshot = await getDocs(violationsQuery);
      const studentViolations = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      console.log("Violations found for this student:", studentViolations.length);
      console.log("Student ID being filtered:", student.id);
      
      setViolationRecords(studentViolations);
    setOpenViolationRecord(true);
      
      if (studentViolations.length === 0) {
        setSnackbar({ 
          open: true, 
          message: `No violations found for ${student.firstName} ${student.lastName}`, 
          severity: "info" 
        });
      }
    } catch (error) {
      console.error("Error fetching violations:", error);
      setSnackbar({ 
        open: true, 
        message: "Error loading violations: " + error.message, 
        severity: "error" 
      });
      setViolationRecords([]);
    }
  };

  // --- StudentList: handleSaveViolation ---
  const handleSaveViolation = async () => {
    if (!currentStudent || !violation.violation || !violation.classification || !violation.date) {
      setSnackbar({ open: true, message: "Please fill in all required fields.", severity: "error" });
      return;
    }

    // Validate that the student ID is registered in the system
    const validationResult = await validateStudentId(currentStudent.id);
    if (!validationResult.isValid) {
      setSnackbar({ 
        open: true, 
        message: `Error: ${validationResult.error}. Please ensure the student is properly registered before adding violations.`, 
        severity: "error" 
      });
      return;
    }

    setLoading(true);
    try {
      const violationData = {
        ...violation,
        studentId: currentStudent.id,
        studentEmail: currentStudent.email, // Add student email for notifications
        studentName: `${currentStudent.firstName} ${currentStudent.lastName}`,
        image: violationImageFile || null,
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        status: "Pending"
      };
      const violationRef = await addDoc(collection(db, "violations"), violationData);
      
      // Create detailed notification for the student
      if (currentStudent.email) {
        try {
          // Create comprehensive notification message with all violation details
          const notificationMessage = `
🚨 NEW VIOLATION REPORTED

Dear ${currentStudent.firstName} ${currentStudent.lastName},

A new violation has been reported for you with the following details:

📋 VIOLATION DETAILS:
• Type: ${violation.violation}
• Classification: ${violation.classification}
• Severity: ${violation.severity || 'Not specified'}
• Date: ${violation.date}
• Time: ${violation.time || 'Not specified'}
• Location: ${violation.location || 'Not specified'}

📝 DESCRIPTION:
${violation.description || 'No description provided'}

👥 ADDITIONAL INFORMATION:
• Witnesses: ${violation.witnesses || 'None specified'}
• Reported By: ${violation.reportedBy || 'Not specified'}
• Action Taken: ${violation.actionTaken || 'Pending review'}

⚠️ IMPORTANT:
Please review this violation in your student dashboard. You may need to take action or attend a meeting regarding this matter.

For questions or concerns, please contact the administration office.

Best regards,
School Administration
          `.trim();

          await addDoc(collection(db, "notifications"), {
            recipientEmail: currentStudent.email,
            recipientName: `${currentStudent.firstName} ${currentStudent.lastName}`,
            title: `🚨 New Violation: ${violation.violation}`,
            message: notificationMessage,
            type: "violation",
            severity: violation.severity || "Medium",
            read: false,
            createdAt: new Date().toISOString(),
            violationId: violationRef.id,
            violationDetails: {
              type: violation.violation,
              classification: violation.classification,
              severity: violation.severity,
              date: violation.date,
              time: violation.time,
              location: violation.location,
              description: violation.description,
              witnesses: violation.witnesses,
              reportedBy: violation.reportedBy,
              actionTaken: violation.actionTaken
            },
            priority: violation.severity === "Critical" ? "high" : 
                     violation.severity === "High" ? "high" : 
                     violation.severity === "Medium" ? "medium" : "low"
          });

          console.log("Detailed violation notification created for student:", currentStudent.email);
        } catch (notificationError) {
          console.error("Error creating detailed notification:", notificationError);
          // Fallback to simple notification
          try {
            await addDoc(collection(db, "notifications"), {
              recipientEmail: currentStudent.email,
              title: "New Violation Reported",
              message: `A new violation "${violation.violation}" has been reported for you on ${violation.date}. Please review the details in your dashboard.`,
              type: "violation",
              read: false,
              createdAt: new Date().toISOString(),
              violationId: violationRef.id
            });
          } catch (fallbackError) {
            console.error("Error creating fallback notification:", fallbackError);
          }
        }
      }
      
      setSnackbar({ open: true, message: "Violation saved successfully! Student has been notified.", severity: "success" });
      setOpenViolation(false);
      setViolation({ 
        violation: "", classification: "", date: "", time: "", location: "", description: "", witnesses: "", severity: "", actionTaken: "", reportedBy: "" 
      });
      setViolationImageFile(null);
    } catch (error) {
      console.error("Error saving violation:", error);
      setSnackbar({ open: true, message: "Error saving violation: " + error.message, severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  // If viewing a specific course, show the course dashboard
  if (currentView !== 'all') {
    return (
      <CourseDashboard
        courseName={currentView}
        onBack={() => setCurrentView('all')}
        setOpenAddStudent={setOpenAddStudent}
        setOpenViolationRecord={setOpenViolationRecord}
        setViolationRecords={setViolationRecords}
        currentStudent={currentStudent}
        setCurrentStudent={setCurrentStudent}
        setOpenViewDetails={setOpenViewDetails}
        setOpenEditStudent={setOpenEditStudent}
        setStudentToView={setStudentToView}
        setStudentToEdit={setStudentToEdit}
        setOpenViolationImagePreview={setOpenViolationImagePreview}
        setPreviewViolationImage={setPreviewViolationImage}
        violationRecords={violationRecords}
      />
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ 
        color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000' 
      }}>
        Student List
      </Typography>
      
      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ 
            p: 2, 
            textAlign: 'center', 
            bgcolor: theme.palette.mode === 'dark' ? '#2d2d2d' : '#f8f9fa', 
            border: theme.palette.mode === 'dark' ? '1px solid #404040' : '1px solid #e9ecef' 
          }}>
            <Typography variant="h4" sx={{ 
              color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000', 
              fontWeight: 'bold' 
            }}>
              {students.filter(s => s.course && s.course.trim() !== '').length}
            </Typography>
            <Typography variant="body2" sx={{ 
              color: theme.palette.mode === 'dark' ? '#ffffff' : 'text.secondary' 
            }}>
              Students with Assigned Courses
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ 
            p: 2, 
            textAlign: 'center', 
            bgcolor: theme.palette.mode === 'dark' ? '#2d2d2d' : '#f8f9fa', 
            border: theme.palette.mode === 'dark' ? '1px solid #404040' : '1px solid #e9ecef' 
          }}>
            <Typography variant="h4" sx={{ 
              color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000', 
              fontWeight: 'bold' 
            }}>
              {Object.keys(groupedStudents).length}
            </Typography>
            <Typography variant="body2" sx={{ 
              color: theme.palette.mode === 'dark' ? '#ffffff' : 'text.secondary' 
            }}>
              Course Programs
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ 
            p: 2, 
            textAlign: 'center', 
            bgcolor: theme.palette.mode === 'dark' ? '#2d2d2d' : '#f8f9fa', 
            border: theme.palette.mode === 'dark' ? '1px solid #404040' : '1px solid #e9ecef' 
          }}>
            <Typography variant="h4" sx={{ 
              color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000', 
              fontWeight: 'bold' 
            }}>
              {Object.values(groupedStudents).reduce((max, students) => Math.max(max, students.length), 0)}
            </Typography>
            <Typography variant="body2" sx={{ 
              color: theme.palette.mode === 'dark' ? '#ffffff' : 'text.secondary' 
            }}>
              Largest Course
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ 
            p: 2, 
            textAlign: 'center', 
            bgcolor: theme.palette.mode === 'dark' ? '#2d2d2d' : '#f8f9fa', 
            border: theme.palette.mode === 'dark' ? '1px solid #404040' : '1px solid #e9ecef' 
          }}>
            <Typography variant="h4" sx={{ 
              color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000', 
              fontWeight: 'bold' 
            }}>
              {search.trim() ? Object.values(groupedStudents).flat().length : students.filter(s => s.course && s.course.trim() !== '').length}
            </Typography>
            <Typography variant="body2" sx={{ 
              color: theme.palette.mode === 'dark' ? '#ffffff' : 'text.secondary' 
            }}>
              {search.trim() ? 'Search Results' : 'Students with Courses'}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Stack direction="row" spacing={2} sx={{ mb: 2, alignItems: 'center', justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={2}>
          <Button 
            variant="outlined" 
            onClick={() => setOpenAddStudent(true)}
            sx={{ bgcolor: '#fff', color: '#000', borderColor: '#000', '&:hover': { bgcolor: '#800000', color: '#fff', borderColor: '#800000' } }}
          >
          Add Student
          </Button>
          <Button 
            variant="outlined" 
            onClick={handleExport} 
            disabled={students.length === 0}
            sx={{ bgcolor: '#fff', color: '#000', borderColor: '#000', '&:hover': { bgcolor: '#800000', color: '#fff', borderColor: '#800000' } }}
          >
          Export
          </Button>
          <Button 
            variant="outlined" 
            onClick={handleRefresh}
            sx={{ bgcolor: '#fff', color: '#000', borderColor: '#000', '&:hover': { bgcolor: '#800000', color: '#fff', borderColor: '#800000' } }}
          >
          Refresh
          </Button>
        </Stack>
        <TextField 
          value={search}
          onChange={e => setSearch(e.target.value)}
          size="small"
          placeholder="Search by name, course, email, or ID..."
          sx={{ width: 300 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ fontSize: 18, color: 'text.secondary' }} />
              </InputAdornment>
            )
          }}
        />
      </Stack>
      
      {/* Instructions */}
      <Box sx={{ 
        mb: 3, 
        p: 2, 
        bgcolor: theme.palette.mode === 'dark' ? '#2d2d2d' : '#f8f9fa', 
        borderRadius: 2, 
        border: theme.palette.mode === 'dark' ? '1px solid #404040' : '1px solid #e9ecef' 
      }}>
        <Typography variant="body1" sx={{ 
          color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000', 
          fontWeight: 'medium', 
          mb: 1 
        }}>
          📁 Course Organization
        </Typography>
        <Typography variant="body2" sx={{ 
          color: theme.palette.mode === 'dark' ? '#ffffff' : 'text.secondary' 
        }}>
          Students with assigned courses are organized by course programs. Click on any course folder below to view all students enrolled in that specific program. 
          Each folder shows the total number of students enrolled in that course. Students without assigned courses are not displayed in this view.
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography>Loading students...</Typography>
        </Box>
      ) : students.filter(s => s.course && s.course.trim() !== '').length === 0 ? (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography>No students with assigned courses found.</Typography>
        </Box>
      ) : (
        <Box>
          {Object.keys(groupedStudents).length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography>No students match your search criteria.</Typography>
            </Box>
          ) : (
            Object.entries(groupedStudents).map(([course, courseStudents]) => (
              <Card 
                key={course} 
                sx={{ 
                  mb: 2, 
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': { 
                    transform: 'translateY(-2px)',
                    boxShadow: 3
                  }
                }}
                onClick={() => setCurrentView(course)}
              >
                <CardActionArea>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Folder sx={{ 
                          color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000', 
                          fontSize: 32 
                        }} />
                        <Box>
                          <Typography variant="h5" sx={{ 
                            fontWeight: 'bold', 
                            color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000', 
                            mb: 0.5 
                          }}>
                            {course}
                          </Typography>
                          <Typography variant="body2" sx={{ 
                            color: theme.palette.mode === 'dark' ? '#ffffff' : 'text.secondary' 
                          }}>
                            Click to view all {course} students
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                      </Box>
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            ))
          )}
        </Box>
      )}
      <Dialog open={openViolation} onClose={() => setOpenViolation(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add Violation for {currentStudent && `${currentStudent.firstName} ${currentStudent.lastName}`}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
          <TextField
            margin="dense"
                label="Violation Type"
            fullWidth
            value={violation.violation}
            onChange={e => setViolation(v => ({ ...v, violation: e.target.value }))}
                required
          />
            </Grid>
            <Grid item xs={12} sm={6}>
          <TextField
            margin="dense"
            label="Classification"
            fullWidth
                select
            value={violation.classification}
            onChange={e => setViolation(v => ({ ...v, classification: e.target.value }))}
                required
              >
                <MenuItem value="Minor">Minor</MenuItem>
                <MenuItem value="Major">Major</MenuItem>
                <MenuItem value="Serious">Serious</MenuItem>
                <MenuItem value="Grave">Grave</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
          <TextField
            margin="dense"
            label="Date"
            type="date"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={violation.date}
            onChange={e => setViolation(v => ({ ...v, date: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                margin="dense"
                label="Time"
                type="time"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={violation.time}
                onChange={e => setViolation(v => ({ ...v, time: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                margin="dense"
                label="Location"
                fullWidth
                value={violation.location}
                onChange={e => setViolation(v => ({ ...v, location: e.target.value }))}
                placeholder="e.g., Classroom 101, Library, Cafeteria"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                margin="dense"
                label="Severity Level"
                fullWidth
                select
                value={violation.severity}
                onChange={e => setViolation(v => ({ ...v, severity: e.target.value }))}
              >
                <MenuItem value="Low">Low</MenuItem>
                <MenuItem value="Medium">Medium</MenuItem>
                <MenuItem value="High">High</MenuItem>
                <MenuItem value="Critical">Critical</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                margin="dense"
                label="Detailed Description"
                fullWidth
                multiline
                minRows={3}
                value={violation.description}
                onChange={e => setViolation(v => ({ ...v, description: e.target.value }))}
                placeholder="Provide a detailed description of the violation..."
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                margin="dense"
                label="Witnesses (if any)"
                fullWidth
                value={violation.witnesses}
                onChange={e => setViolation(v => ({ ...v, witnesses: e.target.value }))}
                placeholder="Names of witnesses, if applicable"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                margin="dense"
                label="Reported By"
                fullWidth
                value={violation.reportedBy}
                onChange={e => setViolation(v => ({ ...v, reportedBy: e.target.value }))}
                placeholder="Name of person who reported"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                margin="dense"
                label="Action Taken"
                fullWidth
                multiline
                minRows={2}
                value={violation.actionTaken}
                onChange={e => setViolation(v => ({ ...v, actionTaken: e.target.value }))}
                placeholder="Describe the action taken or disciplinary measures applied..."
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Button variant="contained" component="label" sx={{ mt: 2 }}>
                Attach Evidence Image
                <input type="file" accept="image/*" hidden onChange={handleViolationImage} />
              </Button>
              {violationImageFile && (
                <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar 
                    src={violationImageFile} 
                    sx={{ width: 80, height: 80 }} 
                    variant="rounded"
                  />
                  <Button 
                    variant="outlined" 
                    color="error" 
                    size="small"
                    onClick={handleRemoveViolationImage}
                  >
                    Remove
                  </Button>
                </Box>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenViolation(false)}>Cancel</Button>
          <Button 
            onClick={handleSaveViolation} 
            variant="contained"
            disabled={!violation.violation || !violation.classification || !violation.date}
          >
            Save Violation
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

function StudentMenu() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Student Menu
      </Typography>
      <Grid container spacing={2}>

        <MenuCard icon={<PersonAdd fontSize="large" />} title="Add Student" to="add-student" />
        <MenuCard icon={<ListAlt fontSize="large" />} title="Student List" to="student-list" />
        <MenuCard icon={<Report fontSize="large" />} title="Add Violation" to="add-violation" />
        <MenuCard icon={<ListAlt fontSize="large" />} title="Violation Record" to="violation-record" />
        <MenuCard icon={<ImportExport fontSize="large" />} title="Student Import" to="student-import" />
      </Grid>
    </Box>
  );
}

function EditStudentForm({ student, onClose, onSuccess }) {
  const theme = useTheme();
  const [profile, setProfile] = useState({
    id: student.id || "",
    lastName: student.lastName || "",
    firstName: student.firstName || "",
    middleInitial: student.middleInitial || "",
    sex: student.sex || "",
    age: student.age || "",
    birthdate: student.birthdate || "",
    contact: student.contact || "",
    course: student.course || "",
    year: student.year || "",
    section: student.section || "",
    email: student.email || "",
    image: student.image || null
  });
  const [imageFile, setImageFile] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentIdError, setStudentIdError] = useState('');
  const [isValidatingStudentId, setIsValidatingStudentId] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  // Handle student ID validation
  const handleStudentIdChange = async (e) => {
    const studentId = e.target.value;
    setProfile(prev => ({ ...prev, id: studentId }));
    
    // Clear error if field is empty
    if (!studentId.trim()) {
      setStudentIdError('');
      return;
    }
    
    setIsValidatingStudentId(true);
    setStudentIdError('');
    
    try {
      const validation = await validateStudentId(studentId.trim());
      if (!validation.isValid) {
        setStudentIdError(validation.error || 'Student ID is not registered in the system');
      } else {
        setStudentIdError('');
      }
    } catch (error) {
      console.error('Error validating student ID:', error);
      setStudentIdError('Error validating student ID. Please try again.');
    } finally {
      setIsValidatingStudentId(false);
    }
  };

  const handleImage = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setSnackbar({ open: true, message: "Please select a valid image file (JPEG, PNG, GIF)", severity: "error" });
        return;
      }
      
      // Validate file size (max 500KB for better quality)
      if (file.size > 500 * 1024) {
        setSnackbar({ open: true, message: "Image file size must be less than 500KB", severity: "error" });
        return;
      }
      
      // Show loading message
      setSnackbar({ open: true, message: "Processing image...", severity: "info" });
      
      setImageFile(file);
      
      // Convert to base64 with error handling
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile((prev) => ({ ...prev, image: reader.result }));
        setSnackbar({ open: true, message: "Profile image updated successfully!", severity: "success" });
      };
      reader.onerror = () => {
        setSnackbar({ open: true, message: "Error reading image file. Please try again.", severity: "error" });
        setImageFile(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    // Basic validation
    if (!profile.id || !profile.firstName || !profile.lastName || !profile.sex) {
      setSnackbar({ open: true, message: "Please fill in all required fields (ID, First Name, Last Name, Sex)", severity: "error" });
      return;
    }

    // Validate student ID exists in system
    if (studentIdError) {
      setSnackbar({ open: true, message: studentIdError, severity: "error" });
      return;
    }

    // Double-check student ID validation before submission
    const validation = await validateStudentId(profile.id.trim());
    if (!validation.isValid) {
      setSnackbar({ open: true, message: validation.error || 'Student ID is not registered in the system', severity: "error" });
      return;
    }

    setIsSubmitting(true);
    let imageUrl = profile.image || "";
    
    try {
      // Update data in Firebase
      const dataToUpdate = {
        ...profile,
        image: imageUrl,
        updatedAt: new Date().toISOString()
      };
      
      // Remove the temporary image URL from the data
      delete dataToUpdate.imageFile;
      
      console.log("Updating student in Firestore:", dataToUpdate);
      
      // Update the document
      await updateDoc(doc(db, "students", student.id), dataToUpdate);
      await logActivity({ message: `Updated student: ${profile.firstName} ${profile.lastName}`, type: 'edit_student' });
      
      console.log("Student updated successfully!");
      setSnackbar({ open: true, message: "Student updated successfully!", severity: "success" });
      
      if (onSuccess) onSuccess();
      
    } catch (error) {
      console.error("Error updating student:", error);
      setSnackbar({ 
        open: true, 
        message: "Error updating student: " + error.message, 
        severity: "error" 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box>
      <form onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField 
              fullWidth 
              label="Student ID" 
              name="id" 
              value={profile.id} 
              onChange={handleStudentIdChange} 
              required 
              error={!!studentIdError}
              helperText={studentIdError}
              InputProps={{
                endAdornment: isValidatingStudentId ? (
                  <InputAdornment position="end">
                    <CircularProgress size={20} />
                  </InputAdornment>
                ) : null
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Email Address" name="email" value={profile.email} onChange={handleChange} type="email" />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth label="Last Name" name="lastName" value={profile.lastName} onChange={handleChange} required />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth label="First Name" name="firstName" value={profile.firstName} onChange={handleChange} required />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth label="Middle Initial" name="middleInitial" value={profile.middleInitial} onChange={handleChange} />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField fullWidth label="Sex" name="sex" value={profile.sex} onChange={handleChange} select required>
              <MenuItem value="Male">Male</MenuItem>
              <MenuItem value="Female">Female</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField fullWidth label="Age" name="age" value={profile.age} onChange={handleChange} type="number" />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField fullWidth label="Birthdate" name="birthdate" value={profile.birthdate} onChange={handleChange} type="date" InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField fullWidth label="Contact Number" name="contact" value={profile.contact} onChange={handleChange} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth label="Course" name="course" value={profile.course} onChange={handleChange} select>
              {courses.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth label="Year" name="year" value={profile.year} onChange={handleChange} select>
              {years.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth label="Section" name="section" value={profile.section} onChange={handleChange} />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ mt: 2, mb: 2 }}>Profile Image</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Button 
              variant="contained" 
              component="label" 
              startIcon={<CloudUpload />}
              sx={{ 
                mt: 2,
                backgroundColor: 'white',
                color: 'black',
                border: '1px solid #ccc',
                '&:hover': {
                  backgroundColor: '#1976d2',
                  color: 'white',
                  border: '1px solid #1976d2'
                }
              }}
            >
              Update Profile Image
              <input type="file" accept="image/*" hidden onChange={handleImage} />
            </Button>
            {profile.image && (
              <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar src={profile.image} sx={{ width: 80, height: 80 }} />
              </Box>
            )}
          </Grid>
          <Grid item xs={12}>
            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
              <Button 
                type="submit" 
                variant="contained" 
                color="primary" 
                disabled={isSubmitting}
              >
                {isSubmitting ? "Updating..." : "Update Student"}
              </Button>
              <Button 
                variant="outlined" 
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </form>
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default function Students() {
  const theme = useTheme();
  const [openAddStudent, setOpenAddStudent] = useState(false);
  const [openViolationRecord, setOpenViolationRecord] = useState(false);
  const [violationRecords, setViolationRecords] = useState([]);
  const [currentStudent, setCurrentStudent] = useState(null);
  const [openViewDetails, setOpenViewDetails] = useState(false);
  const [openEditStudent, setOpenEditStudent] = useState(false);
  const [studentToView, setStudentToView] = useState(null);
  const [studentToEdit, setStudentToEdit] = useState(null);
  const [openViolationImagePreview, setOpenViolationImagePreview] = useState(false);
  const [previewViolationImage, setPreviewViolationImage] = useState(null);

  return (
    <>
      <Routes>
        <Route path="/" element={
          <StudentList
            setOpenAddStudent={setOpenAddStudent}
            setOpenViolationRecord={setOpenViolationRecord}
            setViolationRecords={setViolationRecords}
            currentStudent={currentStudent}
            setCurrentStudent={setCurrentStudent}
            setOpenViewDetails={setOpenViewDetails}
            setOpenEditStudent={setOpenEditStudent}
            setStudentToView={setStudentToView}
            setStudentToEdit={setStudentToEdit}
            setOpenViolationImagePreview={setOpenViolationImagePreview}
            setPreviewViolationImage={setPreviewViolationImage}
            violationRecords={violationRecords}
          />
        } />

        <Route path="student-list" element={
          <StudentList
            setOpenAddStudent={setOpenAddStudent}
            setOpenViolationRecord={setOpenViolationRecord}
            setViolationRecords={setViolationRecords}
            currentStudent={currentStudent}
            setCurrentStudent={setCurrentStudent}
            setOpenViewDetails={setOpenViewDetails}
            setOpenEditStudent={setOpenEditStudent}
            setStudentToView={setStudentToView}
            setStudentToEdit={setStudentToEdit}
            setOpenViolationImagePreview={setOpenViolationImagePreview}
            setPreviewViolationImage={setPreviewViolationImage}
            violationRecords={violationRecords}
          />
        } />
        {/* Add subroutes for each menu item */}
      </Routes>
      {/* Add Student Modal */}
      <Dialog open={openAddStudent} onClose={() => setOpenAddStudent(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add Student</DialogTitle>
        <DialogContent>
          <AddStudent onClose={() => setOpenAddStudent(false)} isModal={true} />
        </DialogContent>
      </Dialog>
      {/* Violation Record Modal */}
      <Dialog open={openViolationRecord} onClose={() => setOpenViolationRecord(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          Violation Record for {currentStudent && `${currentStudent.firstName} ${currentStudent.lastName}`} 
          {violationRecords.length > 0 && ` (${violationRecords.length} violation${violationRecords.length > 1 ? 's' : ''})`}
        </DialogTitle>
        <DialogContent>
          {violationRecords.length === 0 ? (
            <DialogContentText>No violations found for this student.</DialogContentText>
          ) : (
            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table size="small">
              <TableHead>
                <TableRow>
                    <TableCell>Evidence</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Time</TableCell>
                  <TableCell>Violation</TableCell>
                  <TableCell>Classification</TableCell>
                    <TableCell>Severity</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>Reported By</TableCell>
                    <TableCell>Action Taken</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {violationRecords.map((v, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell>
                        {v.image && (
                          <Avatar 
                            src={v.image} 
                            sx={{ width: 40, height: 40, cursor: 'pointer' }} 
                            variant="rounded"
                            onClick={() => handleViolationImagePreview(v.image)}
                          />
                        )}
                      </TableCell>
                      <TableCell>{v.date || 'N/A'}</TableCell>
                      <TableCell>{v.time || 'N/A'}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {v.violation}
                        </Typography>
                        {v.description && (
                          <Typography variant="caption" color="textSecondary" display="block">
                            {v.description}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: v.classification === 'Grave' ? 'error.main' : 
                                   v.classification === 'Serious' ? 'warning.main' : 
                                   v.classification === 'Major' ? 'info.main' : 'success.main',
                            fontWeight: 'medium'
                          }}
                        >
                          {v.classification}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: v.severity === 'Critical' ? 'error.main' : 
                                   v.severity === 'High' ? 'warning.main' : 
                                   v.severity === 'Medium' ? 'info.main' : 'success.main',
                            fontWeight: 'medium'
                          }}
                        >
                          {v.severity || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>{v.location || 'N/A'}</TableCell>
                      <TableCell>{v.reportedBy || 'N/A'}</TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {v.actionTaken || 'N/A'}
                        </Typography>
                        {v.witnesses && (
                          <Typography variant="caption" color="textSecondary" display="block">
                            Witnesses: {v.witnesses}
                          </Typography>
                        )}
                      </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenViolationRecord(false)}>Close</Button>
        </DialogActions>
      </Dialog>
      {/* View Student Details Modal */}
      <Dialog open={openViewDetails} onClose={() => setOpenViewDetails(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Student Details - {studentToView && `${studentToView.firstName} ${studentToView.lastName}`}
        </DialogTitle>
        <DialogContent>
          {studentToView && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={3}>
                {/* Profile Image */}
                <Grid item xs={12} sx={{ textAlign: 'center' }}>
                  {studentToView.image ? (
                    <Avatar src={studentToView.image} sx={{ width: 120, height: 120, mx: 'auto' }} />
                  ) : (
                    <Avatar sx={{ width: 120, height: 120, mx: 'auto', bgcolor: 'primary.main', fontSize: '2rem' }}>
                      {studentToView.firstName?.charAt(0)}{studentToView.lastName?.charAt(0)}
                    </Avatar>
                  )}
                </Grid>

                {/* Basic Information */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ borderBottom: '2px solid #e0e0e0', pb: 1 }}>
                    Basic Information
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">ID Number</Typography>
                  <Typography variant="body1">{studentToView.id || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Scholarship</Typography>
                  <Typography variant="body1">{studentToView.scholarship || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" color="textSecondary">First Name</Typography>
                  <Typography variant="body1">{studentToView.firstName}</Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" color="textSecondary">Last Name</Typography>
                  <Typography variant="body1">{studentToView.lastName}</Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" color="textSecondary">Middle Initial</Typography>
                  <Typography variant="body1">{studentToView.middleInitial || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Typography variant="subtitle2" color="textSecondary">Sex</Typography>
                  <Typography variant="body1">{studentToView.sex || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Typography variant="subtitle2" color="textSecondary">Age</Typography>
                  <Typography variant="body1">{studentToView.age || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Typography variant="subtitle2" color="textSecondary">Birthdate</Typography>
                  <Typography variant="body1">{studentToView.birthdate || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Typography variant="subtitle2" color="textSecondary">Contact</Typography>
                  <Typography variant="body1">{studentToView.contact || 'N/A'}</Typography>
                </Grid>

                {/* Academic Information */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ borderBottom: '2px solid #e0e0e0', pb: 1, mt: 2 }}>
                    Academic Information
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" color="textSecondary">Course</Typography>
                  <Typography variant="body1">{studentToView.course || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" color="textSecondary">Year</Typography>
                  <Typography variant="body1">{studentToView.year || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" color="textSecondary">Section</Typography>
                  <Typography variant="body1">{studentToView.section || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" color="textSecondary">Position</Typography>
                  <Typography variant="body1">{studentToView.position || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" color="textSecondary">Major</Typography>
                  <Typography variant="body1">{studentToView.major || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" color="textSecondary">Email</Typography>
                  <Typography variant="body1">{studentToView.email || 'N/A'}</Typography>
                </Grid>

                {/* Family Information removed per requirements */}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => window.print()} color="info">Print</Button>
          <Button onClick={() => setOpenViewDetails(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Student Modal */}
      <Dialog open={openEditStudent} onClose={() => setOpenEditStudent(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Edit Student - {studentToEdit && `${studentToEdit.firstName} ${studentToEdit.lastName}`}
        </DialogTitle>
        <DialogContent>
          {studentToEdit && (
            <EditStudentForm 
              student={studentToEdit} 
              onClose={() => setOpenEditStudent(false)}
              onSuccess={() => {
                setOpenEditStudent(false);
                // Refresh the student list
                window.location.reload(); // Simple refresh for now
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Violation Image Preview Modal */}
      <Dialog 
        open={openViolationImagePreview} 
        onClose={() => setOpenViolationImagePreview(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Violation Evidence Image</DialogTitle>
        <DialogContent>
          {previewViolationImage && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 2 }}>
              <img 
                src={previewViolationImage} 
                alt="Violation Evidence" 
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '70vh', 
                  objectFit: 'contain' 
                }} 
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenViolationImagePreview(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
} 