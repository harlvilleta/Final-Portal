import React, { useState, useEffect } from "react";
import { 
  Typography, Box, Grid, TextField, MenuItem, Button, Paper, Avatar, Snackbar, Alert,
  Card, CardContent, Divider, IconButton, Tabs, Tab, Stack, Chip, Dialog, DialogTitle, DialogContent, DialogActions, useTheme,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, List, ListItem, ListItemText, ListItemSecondaryAction
} from "@mui/material";
import { 
  Person, Security, PhotoCamera, Save, Edit, Visibility, VisibilityOff,
  Email, Phone, Home, Work, ArrowBack
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, doc, getDoc, updateDoc, setDoc, query, where, getDocs, orderBy, deleteDoc } from "firebase/firestore";
import { updatePassword, updateProfile, updateEmail, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { db, auth } from "../firebase";
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';


export default function Profile() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [profile, setProfile] = useState({
    id: "",
    studentId: "",
    lastName: "",
    firstName: "",
    middleInitial: "",
    sex: "",
    age: "",
    birthdate: "",
    course: "",
    year: "",
    section: "",
    sccNumber: "",
    contact: "",
    email: "",
    fatherName: "",
    fatherOccupation: "",
    motherName: "",
    motherOccupation: "",
    guardian: "",
    guardianContact: "",
    homeAddress: "",
    image: null,
    role: "Student"
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [editProfile, setEditProfile] = useState({
    firstName: "",
    lastName: "",
    middleInitial: "",
    sex: "",
    age: "",
    birthdate: "",
    course: "",
    year: "",
    section: "",
    sccNumber: "",
    contact: "",
    homeAddress: "",
    email: "",
    image: null
  });

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [connectionStatus, setConnectionStatus] = useState('connected'); // 'connected', 'connecting', 'disconnected'
  const [retryCount, setRetryCount] = useState(0);
  
  // Helper function for database operations with timeout and retry
  const dbOperation = async (operation, operationName = 'Database operation', maxRetries = 3) => {
    const timeoutDuration = 15000; // 15 seconds timeout
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        setConnectionStatus('connecting');
        
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Database connection timeout. Please check your internet connection.')), timeoutDuration);
        });
        
        const result = await Promise.race([operation(), timeoutPromise]);
        setConnectionStatus('connected');
        setRetryCount(0);
        return result;
        
      } catch (error) {
        console.error(`${operationName} attempt ${attempt} failed:`, error);
        
        if (attempt === maxRetries) {
          setConnectionStatus('disconnected');
          setRetryCount(attempt);
          
          // Show user-friendly error message
          setSnackbar({
            open: true,
            message: 'Database connection failed. Please check your internet connection and try again.',
            severity: 'error'
          });
          
          throw error;
        } else {
          // Wait before retrying (exponential backoff)
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.log(`Retrying ${operationName} in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
  };

  // Function to handle retry connection
  const handleRetryConnection = async () => {
    if (!currentUser) return;
    
    setConnectionStatus('connecting');
    setRetryCount(0);
    
    try {
      await loadUserProfile(currentUser.uid);
      setSnackbar({
        open: true,
        message: 'Connection restored successfully!',
        severity: 'success'
      });
    } catch (error) {
      console.error('Retry failed:', error);
      setSnackbar({
        open: true,
        message: 'Connection retry failed. Please check your internet connection.',
        severity: 'error'
      });
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      if (user) {
        loadUserProfile(user.uid);
      }
    });

    return unsubscribe;
  }, []);

  // Periodic connection check
  useEffect(() => {
    if (connectionStatus === 'disconnected') {
      const interval = setInterval(async () => {
        try {
          // Try a simple database operation to check connection
          await dbOperation(
            () => getDoc(doc(db, 'users', currentUser?.uid || 'test')),
            'Connection check',
            1 // Only 1 retry for connection check
          );
          // If successful, reload profile
          if (currentUser) {
            await loadUserProfile(currentUser.uid);
          }
        } catch (error) {
          // Connection still not available, do nothing
        }
      }, 10000); // Check every 10 seconds

      return () => clearInterval(interval);
    }
  }, [connectionStatus, currentUser]);


  const loadUserProfile = async (uid) => {
    try {
      const userDoc = await dbOperation(
        () => getDoc(doc(db, 'users', uid)),
        'Load user profile'
      );
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setProfile(prev => ({
          ...prev,
          id: uid,
          studentId: userData.studentId || "",
          email: userData.email || currentUser?.email || "",
          firstName: userData.firstName || userData.fullName?.split(' ')[0] || "",
          lastName: userData.lastName || userData.fullName?.split(' ').slice(1).join(' ') || "",
          middleInitial: userData.middleInitial || "",
          sex: userData.sex || "",
          age: userData.age || "",
          birthdate: userData.birthdate || "",
          course: userData.course || "",
          year: userData.year || "",
          section: userData.section || "",
          sccNumber: userData.sccNumber || "",
          contact: userData.contact || userData.phoneNumber || "",
          fatherName: userData.fatherName || "",
          fatherOccupation: userData.fatherOccupation || "",
          motherName: userData.motherName || "",
          motherOccupation: userData.motherOccupation || "",
          guardian: userData.guardian || "",
          guardianContact: userData.guardianContact || "",
          homeAddress: userData.homeAddress || userData.address || "",
          image: userData.profilePic || null,
          role: userData.role || "Student"
        }));
      } else {
        // If user document doesn't exist, create a basic profile and save it
        const basicProfile = {
          id: uid,
          email: currentUser?.email || "",
          firstName: currentUser?.displayName?.split(' ')[0] || "",
          lastName: currentUser?.displayName?.split(' ').slice(1).join(' ') || "",
          role: "Student",
          createdAt: new Date().toISOString()
        };
        
        setProfile(prev => ({ ...prev, ...basicProfile }));
        
        // Automatically create the user document in the background
        try {
          await dbOperation(
            () => setDoc(doc(db, 'users', uid), basicProfile),
            'Create user profile'
          );
          console.log('✅ User profile created automatically');
        } catch (createError) {
          console.log('Profile will be created on next successful connection');
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      
      // Set a fallback profile to prevent blocking the UI
      const fallbackProfile = {
        id: uid,
        email: currentUser?.email || "",
        firstName: currentUser?.displayName?.split(' ')[0] || "",
        lastName: currentUser?.displayName?.split(' ').slice(1).join(' ') || "",
        role: "Student"
      };
      
      setProfile(prev => ({ ...prev, ...fallbackProfile }));
      
      // Try to create the profile in the background when connection is restored
      setTimeout(async () => {
        try {
          await dbOperation(
            () => setDoc(doc(db, 'users', uid), { ...fallbackProfile, createdAt: new Date().toISOString() }),
            'Create fallback profile'
          );
          console.log('✅ Fallback profile saved when connection restored');
        } catch (bgError) {
          console.log('Will retry profile creation on next user action');
        }
      }, 5000);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  // Function to upload image to Firebase Storage
  const uploadImageToStorage = async (file, userId) => {
    const storageRef = ref(storage, `profile-pictures/${userId}/${Date.now()}_${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  };

  const handleImage = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        setSnackbar({ open: true, message: "Please select a valid image file", severity: "error" });
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setSnackbar({ open: true, message: "Image file size must be less than 10MB", severity: "error" });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile((prev) => ({ ...prev, image: reader.result }));
        setSnackbar({ open: true, message: "Profile picture updated!", severity: "success" });
      };
      reader.readAsDataURL(file);
    }
  };


  const handleSaveProfile = async () => {
    if (!currentUser) return;
    
    setSaving(true);
    try {
      const fullName = `${profile.firstName} ${profile.lastName}`.trim();
      
      // Update Firebase Auth profile
      await updateProfile(currentUser, {
        displayName: fullName
      });

      // Upload image to Firebase Storage if it's a new file (not a URL)
      let imageURL = profile.image;
      if (profile.image && profile.image.startsWith('data:')) {
        // Convert base64 to file and upload
        const response = await fetch(profile.image);
        const blob = await response.blob();
        const file = new File([blob], 'profile-picture.jpg', { type: 'image/jpeg' });
        
        try {
          imageURL = await uploadImageToStorage(file, currentUser.uid);
          console.log('✅ Image uploaded to Storage:', imageURL);
        } catch (uploadError) {
          console.error('❌ Image upload error:', uploadError);
          // Keep the base64 as fallback
        }
      }

      // Update Firestore user document
      await dbOperation(
        () => setDoc(doc(db, 'users', currentUser.uid), {
          email: profile.email,
          fullName: fullName,
          firstName: profile.firstName,
          lastName: profile.lastName,
          middleInitial: profile.middleInitial,
          sex: profile.sex,
          age: profile.age,
          birthdate: profile.birthdate,
          course: profile.course,
          year: profile.year,
          section: profile.section,
          sccNumber: profile.sccNumber,
          contact: profile.contact,
          fatherName: profile.fatherName,
          fatherOccupation: profile.fatherOccupation,
          motherName: profile.motherName,
          motherOccupation: profile.motherOccupation,
          guardian: profile.guardian,
          guardianContact: profile.guardianContact,
          homeAddress: profile.homeAddress,
          profilePic: imageURL,
          role: profile.role || 'Student',
          studentId: profile.studentId, // Ensure studentId is included
          updatedAt: new Date().toISOString()
        }, { merge: true }),
        'Save user profile'
      );

      // 🔄 SYNC WITH ADMIN STUDENT LIST
      // If this is a student, also update their record in the admin's students collection
      if (profile.role === 'Student' && profile.studentId) {
        try {
          console.log('🔄 Syncing student profile with admin records...');
          
          // Find the student record in the admin's students collection
          const studentsSnapshot = await dbOperation(
            () => {
              const studentsQuery = query(
                collection(db, 'students'),
                where('id', '==', profile.studentId)
              );
              return getDocs(studentsQuery);
            },
            'Find student record'
          );
          
          if (!studentsSnapshot.empty) {
            // Update the existing student record in admin's collection
            const studentDoc = studentsSnapshot.docs[0];
            await dbOperation(
              () => updateDoc(doc(db, 'students', studentDoc.id), {
                firstName: profile.firstName,
                lastName: profile.lastName,
                middleInitial: profile.middleInitial,
                sex: profile.sex,
                age: profile.age,
                birthdate: profile.birthdate,
                course: profile.course,
                year: profile.year,
                sccNumber: profile.sccNumber,
                contact: profile.contact,
                fatherName: profile.fatherName,
                fatherOccupation: profile.fatherOccupation,
                motherName: profile.motherName,
                motherOccupation: profile.motherOccupation,
                guardian: profile.guardian,
                guardianContact: profile.guardianContact,
                homeAddress: profile.homeAddress,
                profilePic: imageURL,
                email: profile.email,
                isRegistered: true,
                registeredUserId: currentUser.uid,
                lastUpdated: new Date().toISOString(),
                updatedBy: 'student'
              }),
              'Update student record'
            );
            
            console.log('✅ Student record synced with admin list successfully');
          } else {
            console.log('⚠️ Student record not found in admin collection, creating new record...');
            
            // Create a new student record in admin's collection if not found
            await dbOperation(
              () => addDoc(collection(db, 'students'), {
                id: profile.studentId,
                firstName: profile.firstName,
                lastName: profile.lastName,
                middleInitial: profile.middleInitial,
                sex: profile.sex,
                age: profile.age,
                birthdate: profile.birthdate,
                course: profile.course,
                year: profile.year,
                sccNumber: profile.sccNumber,
                contact: profile.contact,
                fatherName: profile.fatherName,
                fatherOccupation: profile.fatherOccupation,
                motherName: profile.motherName,
                motherOccupation: profile.motherOccupation,
                guardian: profile.guardian,
                guardianContact: profile.guardianContact,
                homeAddress: profile.homeAddress,
                profilePic: imageURL,
                email: profile.email,
                isRegistered: true,
                registeredUserId: currentUser.uid,
                registeredAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
                updatedBy: 'student'
              }),
              'Create student record'
            );
            
            console.log('✅ New student record created in admin collection');
          }
        } catch (syncError) {
          console.error('❌ Error syncing with admin student list:', syncError);
          // Don't fail the entire operation if sync fails
        }
      }

      setSnackbar({ open: true, message: "Profile updated successfully! Changes synced with admin records.", severity: "success" });
      setSaveSuccess(true); // Set success state
      setTimeout(() => setSaveSuccess(false), 3000); // Reset success state after 3 seconds
    } catch (error) {
      console.error('Error updating profile:', error);
      setSnackbar({ open: true, message: "Error updating profile: " + error.message, severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    // Validate current password is provided
    if (!passwordForm.currentPassword) {
      setSnackbar({ open: true, message: "Please enter your current password", severity: "error" });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setSnackbar({ open: true, message: "New passwords don't match", severity: "error" });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setSnackbar({ open: true, message: "Password must be at least 6 characters", severity: "error" });
      return;
    }

    setSaving(true);
    try {
      // Re-authenticate user with current password
      const credential = EmailAuthProvider.credential(currentUser.email, passwordForm.currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      
      // If re-authentication successful, update password
      await updatePassword(currentUser, passwordForm.newPassword);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setSnackbar({ open: true, message: "Password changed successfully!", severity: "success" });
      setPasswordSuccess(true);
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (error) {
      console.error('Error changing password:', error);
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setSnackbar({ open: true, message: "Current password is incorrect", severity: "error" });
      } else {
        setSnackbar({ open: true, message: "Error changing password: " + error.message, severity: "error" });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEditModal = () => {
    setEditProfile({
      firstName: profile.firstName,
      lastName: profile.lastName,
      middleInitial: profile.middleInitial,
      sex: profile.sex,
      age: profile.age,
      birthdate: profile.birthdate,
      course: profile.course,
      year: profile.year,
      section: profile.section,
      sccNumber: profile.sccNumber,
      contact: profile.contact,
      homeAddress: profile.homeAddress,
      email: profile.email,
      image: profile.image
    });
    setOpenEditModal(true);
  };

  const handleEditProfileChange = (e) => {
    const { name, value } = e.target;
    setEditProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setSaving(true);
      const imageUrl = await uploadImageToStorage(file, currentUser.uid);
      setEditProfile(prev => ({ ...prev, image: imageUrl }));
      setSnackbar({ open: true, message: "Profile picture updated!", severity: "success" });
    } catch (error) {
      console.error('Error uploading image:', error);
      setSnackbar({ open: true, message: "Error uploading image: " + error.message, severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEditProfile = async () => {
    setSaving(true);
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      
      // Update Firestore document
      const updateData = {
        firstName: editProfile.firstName,
        lastName: editProfile.lastName,
        middleInitial: editProfile.middleInitial,
        sex: editProfile.sex,
        age: editProfile.age,
        birthdate: editProfile.birthdate,
        course: editProfile.course,
        year: editProfile.year,
        section: editProfile.section,
        sccNumber: editProfile.sccNumber,
        contact: editProfile.contact,
        homeAddress: editProfile.homeAddress,
        fullName: `${editProfile.firstName} ${editProfile.lastName}`.trim()
      };

      // Add email and image if they changed
      if (editProfile.email !== profile.email) {
        updateData.email = editProfile.email;
      }
      if (editProfile.image !== profile.image) {
        updateData.profilePic = editProfile.image;
      }

      await updateDoc(userRef, updateData);

      // Update email in Firebase Auth if it changed
      if (editProfile.email !== profile.email && profile.role === 'Admin') {
        await updateEmail(currentUser, editProfile.email);
      }

      // Update profile picture in Firebase Auth if it changed
      if (editProfile.image !== profile.image) {
        await updateProfile(currentUser, {
          photoURL: editProfile.image
        });
      }

      // Update local profile state
      setProfile(prev => ({
        ...prev,
        firstName: editProfile.firstName,
        lastName: editProfile.lastName,
        middleInitial: editProfile.middleInitial,
        sex: editProfile.sex,
        age: editProfile.age,
        birthdate: editProfile.birthdate,
        studentId: editProfile.studentId,
        course: editProfile.course,
        year: editProfile.year,
        section: editProfile.section,
        sccNumber: editProfile.sccNumber,
        contact: editProfile.contact,
        homeAddress: editProfile.homeAddress,
        email: editProfile.email,
        image: editProfile.image
      }));

      setSnackbar({ open: true, message: "Profile updated successfully!", severity: "success" });
      setOpenEditModal(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      setSnackbar({ open: true, message: "Error updating profile: " + error.message, severity: "error" });
    } finally {
      setSaving(false);
    }
  };


  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: theme.palette.mode === 'dark' 
        ? 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #2a2a2a 100%)'
        : 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 50%, #dee2e6 100%)',
      pt: { xs: 2, sm: 3 }, 
      pl: { xs: 2, sm: 3, md: 4 }, 
      pr: { xs: 2, sm: 3, md: 4 }, 
      pb: 3
    }}>
      {/* Header Section */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        mb: 4,
        position: 'relative',
        '&::after': {
          content: '""',
          position: 'absolute',
          bottom: -16,
          left: 0,
          right: 0,
          height: '2px',
          background: 'linear-gradient(90deg, #800000 0%, #ff6b6b 50%, #800000 100%)',
          borderRadius: '1px'
        }
      }}>
        <IconButton 
          onClick={() => navigate('/options')}
          sx={{ 
            mr: 3,
            p: 1.5,
            color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000',
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(128, 0, 0, 0.1)',
            border: `2px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(128, 0, 0, 0.2)'}`,
            borderRadius: 2,
            transition: 'all 0.3s ease',
            '&:hover': {
              bgcolor: '#800000',
              color: 'white',
              borderColor: '#800000',
              transform: 'translateY(-2px)',
              boxShadow: '0 8px 25px rgba(128, 0, 0, 0.3)'
            }
          }}
        >
          <ArrowBack />
        </IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" fontWeight={800} sx={{ 
            color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000',
            mb: 0.5,
            background: theme.palette.mode === 'dark' 
              ? 'linear-gradient(45deg, #ffffff 30%, #e0e0e0 90%)'
              : 'linear-gradient(45deg, #800000 30%, #ff6b6b 90%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
        }}>
          Account Settings
        </Typography>
          <Typography variant="body1" sx={{ 
            color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666',
            fontWeight: 500
          }}>
            Manage your profile and security settings
          </Typography>
        </Box>
        
        {/* Connection Status Indicator */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: connectionStatus === 'connected' ? '#4caf50' : 
                    connectionStatus === 'connecting' ? '#ff9800' : '#f44336',
            animation: connectionStatus === 'connecting' ? 'pulse 1.5s infinite' : 'none',
            '@keyframes pulse': {
              '0%': { opacity: 1 },
              '50%': { opacity: 0.5 },
              '100%': { opacity: 1 }
            }
          }} />
          <Typography variant="caption" sx={{
            color: connectionStatus === 'connected' ? '#4caf50' : 
                   connectionStatus === 'connecting' ? '#ff9800' : '#f44336',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            {connectionStatus === 'connected' ? 'Connected' : 
             connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
          </Typography>
          {connectionStatus === 'disconnected' && (
            <Button
              size="small"
              variant="outlined"
              onClick={handleRetryConnection}
              sx={{
                ml: 1,
                fontSize: '0.75rem',
                py: 0.5,
                px: 1,
                minWidth: 'auto',
                borderColor: '#f44336',
                color: '#f44336',
                '&:hover': {
                  bgcolor: '#f44336',
                  color: 'white'
                }
              }}
            >
              Retry
            </Button>
          )}
        </Box>
      </Box>

      {/* Enhanced Tabs Section */}
      <Paper sx={{ 
        mb: 4,
        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.95)',
        border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(0, 0, 0, 0.12)',
        borderRadius: 3,
        boxShadow: theme.palette.mode === 'dark' 
          ? '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)'
          : '0 8px 32px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.05)',
        backdropFilter: 'blur(20px)',
        overflow: 'hidden',
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(128, 0, 0, 0.3) 50%, transparent 100%)'
        }
      }}>
        <Tabs 
          value={activeTab} 
          onChange={(e, newValue) => setActiveTab(newValue)}
          sx={{
            px: 2,
            pt: 1,
            '& .MuiTab-root': {
              color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666',
              fontWeight: 600,
              textTransform: 'none',
              fontSize: '1rem',
              py: 2,
              px: 3,
              mx: 0.5,
              borderRadius: 2,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(135deg, rgba(128, 0, 0, 0.1) 0%, rgba(255, 107, 107, 0.1) 100%)',
                opacity: 0,
                transition: 'opacity 0.3s ease'
              },
              '&.Mui-selected': {
                color: '#ffffff',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #800000 0%, #ff6b6b 100%)',
                boxShadow: '0 4px 20px rgba(128, 0, 0, 0.3)',
                transform: 'translateY(-2px)',
                '&::before': {
                  opacity: 0
                }
              },
              '&:hover': {
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(128, 0, 0, 0.08)',
                color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000',
                transform: 'translateY(-1px)',
                '&::before': {
                  opacity: 1
                }
              }
            },
            '& .MuiTabs-indicator': {
              display: 'none'
            }
          }}
        >
          <Tab 
            icon={<Person sx={{ fontSize: '1.2rem', mb: 0.5 }} />} 
            label="Profile Information"
            sx={{ flexDirection: 'column', gap: 0.5 }}
          />
          <Tab 
            icon={<Security sx={{ fontSize: '1.2rem', mb: 0.5 }} />} 
            label="Security Settings"
            sx={{ flexDirection: 'column', gap: 0.5 }}
          />
        </Tabs>
      </Paper>

      {activeTab === 0 && (
        <Grid container spacing={3}>
          {/* Enhanced Profile Picture Section */}
          <Grid item xs={12} md={4}>
            <Card sx={{
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.95)',
              border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(0, 0, 0, 0.12)',
              borderRadius: 4,
              boxShadow: theme.palette.mode === 'dark' 
                ? '0 12px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)'
                : '0 12px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)',
              backdropFilter: 'blur(20px)',
              overflow: 'hidden',
              position: 'relative',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: theme.palette.mode === 'dark' 
                  ? '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)'
                  : '0 20px 60px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.08)'
              },
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '3px',
                background: 'linear-gradient(90deg, #800000 0%, #ff6b6b 50%, #800000 100%)'
              }
            }}>
              <CardContent sx={{ textAlign: 'center', p: 4 }}>
                <Box sx={{ position: 'relative', display: 'inline-block', mb: 3 }}>
                <Avatar 
                  src={profile.image} 
                  sx={{ 
                      width: 140, 
                      height: 140, 
                      fontSize: '3.5rem',
                    bgcolor: 'primary.main',
                    mx: 'auto',
                      background: 'linear-gradient(135deg, #800000 0%, #ff6b6b 100%)',
                      border: `4px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(128, 0, 0, 0.2)'}`,
                      boxShadow: '0 8px 32px rgba(128, 0, 0, 0.3)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'scale(1.05)',
                        boxShadow: '0 12px 40px rgba(128, 0, 0, 0.4)'
                      }
                  }}
                >
                  {profile.firstName?.charAt(0)}{profile.lastName?.charAt(0)}
                </Avatar>
                  <Box sx={{
                    position: 'absolute',
                    top: -8,
                    right: -8,
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    bgcolor: '#4caf50',
                    border: `3px solid ${theme.palette.mode === 'dark' ? '#1a1a1a' : '#ffffff'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Box sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: '#ffffff'
                    }} />
                  </Box>
                </Box>
                
                <Typography variant="h5" fontWeight={700} gutterBottom sx={{ 
                  color: theme.palette.mode === 'dark' ? '#ffffff' : '#333333',
                  mb: 1,
                  background: theme.palette.mode === 'dark' 
                    ? 'linear-gradient(45deg, #ffffff 30%, #e0e0e0 90%)'
                    : 'linear-gradient(45deg, #800000 30%, #ff6b6b 90%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
                  {profile.firstName} {profile.lastName}
                </Typography>
                
                <Typography variant="body1" sx={{ 
                  color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666',
                  mb: 2,
                  fontWeight: 500
                }}>
                  {profile.email}
                </Typography>
                
                <Chip 
                  label={profile.role || "Student"} 
                  sx={{ 
                    mb: 3,
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(128, 0, 0, 0.2)' : 'rgba(128, 0, 0, 0.1)',
                    color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000',
                    border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(128, 0, 0, 0.3)' : 'rgba(128, 0, 0, 0.3)'}`,
                    fontWeight: 600,
                    px: 2,
                    py: 0.5
                  }}
                />
                
                  <Button 
                  variant="contained" 
                  startIcon={<Edit sx={{ fontSize: '1.1rem' }} />}
                    onClick={handleOpenEditModal}
                    sx={{ 
                    background: 'linear-gradient(135deg, #800000 0%, #ff6b6b 100%)',
                    color: 'white',
                    fontWeight: 700,
                      textTransform: 'none',
                    px: 4,
                    py: 1.5,
                    borderRadius: 3,
                    boxShadow: '0 4px 20px rgba(128, 0, 0, 0.3)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                      background: 'linear-gradient(135deg, #6b0000 0%, #e55a5a 100%)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 30px rgba(128, 0, 0, 0.4)'
                      }
                    }}
                  >
                    Edit Profile
                  </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Enhanced Profile Information Display */}
          <Grid item xs={12} md={8}>
            <Card sx={{
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.95)',
              border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(0, 0, 0, 0.12)',
              borderRadius: 4,
              boxShadow: theme.palette.mode === 'dark' 
                ? '0 12px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)'
                : '0 12px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)',
              backdropFilter: 'blur(20px)',
              overflow: 'hidden',
              position: 'relative',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: theme.palette.mode === 'dark' 
                  ? '0 16px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)'
                  : '0 16px 50px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.08)'
              },
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '3px',
                background: 'linear-gradient(90deg, #800000 0%, #ff6b6b 50%, #800000 100%)'
              }
            }}>
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 2,
                  mb: 4,
                  pb: 2,
                  borderBottom: `2px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(128, 0, 0, 0.1)'}`
                }}>
                  <Box sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(128, 0, 0, 0.2)' : 'rgba(128, 0, 0, 0.1)',
                    color: '#800000'
                  }}>
                    <Person sx={{ fontSize: '1.5rem' }} />
                  </Box>
                  <Typography variant="h5" fontWeight={700} sx={{ 
                    color: theme.palette.mode === 'dark' ? '#ffffff' : '#333333',
                    background: theme.palette.mode === 'dark' 
                      ? 'linear-gradient(45deg, #ffffff 30%, #e0e0e0 90%)'
                      : 'linear-gradient(45deg, #800000 30%, #ff6b6b 90%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}>
                    Personal Information
                </Typography>
                </Box>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{
                      mb: 1.5,
                      p: 1,
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(128, 0, 0, 0.02)',
                      borderRadius: 1.5,
                      border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(128, 0, 0, 0.08)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(128, 0, 0, 0.05)',
                        transform: 'translateY(-1px)',
                        boxShadow: theme.palette.mode === 'dark'
                          ? '0 2px 8px rgba(0, 0, 0, 0.15)'
                          : '0 2px 8px rgba(128, 0, 0, 0.06)'
                      }
                    }}>
                      <Typography variant="body2" sx={{
                        color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666',
                        fontWeight: 600,
                        mb: 0.5,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        fontSize: '0.7rem'
                      }}>
                        First Name
                      </Typography>
                      <Typography variant="body2" sx={{
                        fontWeight: 600,
                        color: theme.palette.mode === 'dark' ? '#ffffff' : '#333333',
                        fontSize: '1rem'
                      }}>
                        {profile.firstName || ''}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ 
                      mb: 1.5,
                      p: 1,
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(128, 0, 0, 0.02)',
                      borderRadius: 1.5,
                      border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(128, 0, 0, 0.08)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(128, 0, 0, 0.05)',
                        transform: 'translateY(-1px)',
                        boxShadow: theme.palette.mode === 'dark'
                          ? '0 2px 8px rgba(0, 0, 0, 0.15)'
                          : '0 2px 8px rgba(128, 0, 0, 0.06)'
                      }
                    }}>
                      <Typography variant="body2" sx={{
                        color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666',
                        fontWeight: 600,
                        mb: 0.5,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        fontSize: '0.7rem'
                      }}>
                        Last Name
                      </Typography>
                      <Typography variant="body2" sx={{
                        fontWeight: 600,
                        color: theme.palette.mode === 'dark' ? '#ffffff' : '#333333',
                        fontSize: '1rem'
                      }}>
                        {profile.lastName || ''}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ 
                      mb: 1.5,
                      p: 1,
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(128, 0, 0, 0.02)',
                      borderRadius: 1.5,
                      border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(128, 0, 0, 0.08)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(128, 0, 0, 0.05)',
                        transform: 'translateY(-1px)',
                        boxShadow: theme.palette.mode === 'dark'
                          ? '0 2px 8px rgba(0, 0, 0, 0.15)'
                          : '0 2px 8px rgba(128, 0, 0, 0.06)'
                      }
                    }}>
                      <Typography variant="body2" sx={{
                        color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666',
                        fontWeight: 600,
                        mb: 0.5,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        fontSize: '0.7rem'
                      }}>
                        Middle Initial
                      </Typography>
                      <Typography variant="body2" sx={{
                        fontWeight: 600,
                        color: theme.palette.mode === 'dark' ? '#ffffff' : '#333333',
                        fontSize: '1rem'
                      }}>
                        {profile.middleInitial || ''}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ 
                      mb: 1.5,
                      p: 1,
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(128, 0, 0, 0.02)',
                      borderRadius: 1.5,
                      border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(128, 0, 0, 0.08)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(128, 0, 0, 0.05)',
                        transform: 'translateY(-1px)',
                        boxShadow: theme.palette.mode === 'dark'
                          ? '0 2px 8px rgba(0, 0, 0, 0.15)'
                          : '0 2px 8px rgba(128, 0, 0, 0.06)'
                      }
                    }}>
                      <Typography variant="body2" sx={{
                        color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666',
                        fontWeight: 600,
                        mb: 0.5,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        fontSize: '0.7rem'
                      }}>
                        Email Address
                      </Typography>
                      <Typography variant="body2" sx={{
                        fontWeight: 600,
                        color: theme.palette.mode === 'dark' ? '#ffffff' : '#333333',
                        fontSize: '1rem'
                      }}>
                        {profile.email || ''}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ 
                      mb: 1.5,
                      p: 1,
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(128, 0, 0, 0.02)',
                      borderRadius: 1.5,
                      border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(128, 0, 0, 0.08)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(128, 0, 0, 0.05)',
                        transform: 'translateY(-1px)',
                        boxShadow: theme.palette.mode === 'dark' 
                          ? '0 2px 8px rgba(0, 0, 0, 0.15)'
                          : '0 2px 8px rgba(128, 0, 0, 0.06)'
                      }
                    }}>
                      <Typography variant="body2" sx={{ 
                        color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666',
                        fontWeight: 600,
                        mb: 0.5,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        fontSize: '0.7rem'
                      }}>
                        Contact Number
                      </Typography>
                      <Typography variant="body1" sx={{ 
                        fontWeight: 600,
                        color: theme.palette.mode === 'dark' ? '#ffffff' : '#333333',
                        fontSize: '1rem'
                      }}>
                        {profile.contact || ''}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ 
                      mb: 1.5,
                      p: 1,
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(128, 0, 0, 0.02)',
                      borderRadius: 1.5,
                      border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(128, 0, 0, 0.08)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(128, 0, 0, 0.05)',
                        transform: 'translateY(-1px)',
                        boxShadow: theme.palette.mode === 'dark' 
                          ? '0 2px 8px rgba(0, 0, 0, 0.15)'
                          : '0 2px 8px rgba(128, 0, 0, 0.06)'
                      }
                    }}>
                      <Typography variant="body2" sx={{ 
                        color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666',
                        fontWeight: 600,
                        mb: 0.5,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        fontSize: '0.7rem'
                      }}>
                        Course
                      </Typography>
                      <Typography variant="body1" sx={{ 
                        fontWeight: 600,
                        color: theme.palette.mode === 'dark' ? '#ffffff' : '#333333',
                        fontSize: '1rem'
                      }}>
                        {profile.course || ''}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ 
                      mb: 1.5,
                      p: 1,
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(128, 0, 0, 0.02)',
                      borderRadius: 1.5,
                      border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(128, 0, 0, 0.08)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(128, 0, 0, 0.05)',
                        transform: 'translateY(-1px)',
                        boxShadow: theme.palette.mode === 'dark' 
                          ? '0 2px 8px rgba(0, 0, 0, 0.15)'
                          : '0 2px 8px rgba(128, 0, 0, 0.06)'
                      }
                    }}>
                      <Typography variant="body2" sx={{ 
                        color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666',
                        fontWeight: 600,
                        mb: 0.5,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        fontSize: '0.7rem'
                      }}>
                        Year Level
                      </Typography>
                      <Typography variant="body1" sx={{ 
                        fontWeight: 600,
                        color: theme.palette.mode === 'dark' ? '#ffffff' : '#333333',
                        fontSize: '1rem'
                      }}>
                        {profile.year || ''}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ 
                      mb: 1.5,
                      p: 1,
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(128, 0, 0, 0.02)',
                      borderRadius: 1.5,
                      border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(128, 0, 0, 0.08)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(128, 0, 0, 0.05)',
                        transform: 'translateY(-1px)',
                        boxShadow: theme.palette.mode === 'dark' 
                          ? '0 2px 8px rgba(0, 0, 0, 0.15)'
                          : '0 2px 8px rgba(128, 0, 0, 0.06)'
                      }
                    }}>
                      <Typography variant="body2" sx={{ 
                        color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666',
                        fontWeight: 600,
                        mb: 0.5,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        fontSize: '0.7rem'
                      }}>
                        Section
                      </Typography>
                      <Typography variant="body1" sx={{ 
                        fontWeight: 600,
                        color: theme.palette.mode === 'dark' ? '#ffffff' : '#333333',
                        fontSize: '1rem'
                      }}>
                        {profile.section || ''}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ 
                      mb: 1.5,
                      p: 1,
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(128, 0, 0, 0.02)',
                      borderRadius: 1.5,
                      border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(128, 0, 0, 0.08)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(128, 0, 0, 0.05)',
                        transform: 'translateY(-1px)',
                        boxShadow: theme.palette.mode === 'dark' 
                          ? '0 2px 8px rgba(0, 0, 0, 0.15)'
                          : '0 2px 8px rgba(128, 0, 0, 0.06)'
                      }
                    }}>
                      <Typography variant="body2" sx={{ 
                        color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666',
                        fontWeight: 600,
                        mb: 0.5,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        fontSize: '0.7rem'
                      }}>
                        Sex
                      </Typography>
                      <Typography variant="body1" sx={{ 
                        fontWeight: 600,
                        color: theme.palette.mode === 'dark' ? '#ffffff' : '#333333',
                        fontSize: '1rem'
                      }}>
                        {profile.sex || ''}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ 
                      mb: 1.5,
                      p: 1,
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(128, 0, 0, 0.02)',
                      borderRadius: 1.5,
                      border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(128, 0, 0, 0.08)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(128, 0, 0, 0.05)',
                        transform: 'translateY(-1px)',
                        boxShadow: theme.palette.mode === 'dark' 
                          ? '0 2px 8px rgba(0, 0, 0, 0.15)'
                          : '0 2px 8px rgba(128, 0, 0, 0.06)'
                      }
                    }}>
                      <Typography variant="body2" sx={{ 
                        color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666',
                        fontWeight: 600,
                        mb: 0.5,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        fontSize: '0.7rem'
                      }}>
                        Age
                      </Typography>
                      <Typography variant="body1" sx={{ 
                        fontWeight: 600,
                        color: theme.palette.mode === 'dark' ? '#ffffff' : '#333333',
                        fontSize: '1rem'
                      }}>
                        {profile.age || ''}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ 
                      mb: 1.5,
                      p: 1,
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(128, 0, 0, 0.02)',
                      borderRadius: 1.5,
                      border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(128, 0, 0, 0.08)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(128, 0, 0, 0.05)',
                        transform: 'translateY(-1px)',
                        boxShadow: theme.palette.mode === 'dark' 
                          ? '0 2px 8px rgba(0, 0, 0, 0.15)'
                          : '0 2px 8px rgba(128, 0, 0, 0.06)'
                      }
                    }}>
                      <Typography variant="body2" sx={{ 
                        color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666',
                        fontWeight: 600,
                        mb: 0.5,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        fontSize: '0.7rem'
                      }}>
                        Birthday
                      </Typography>
                      <Typography variant="body1" sx={{ 
                        fontWeight: 600,
                        color: theme.palette.mode === 'dark' ? '#ffffff' : '#333333',
                        fontSize: '1rem'
                      }}>
                        {profile.birthdate ? new Date(profile.birthdate).toLocaleDateString() : ''}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ 
                      mb: 1.5,
                      p: 1,
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(128, 0, 0, 0.02)',
                      borderRadius: 1.5,
                      border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(128, 0, 0, 0.08)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(128, 0, 0, 0.05)',
                        transform: 'translateY(-1px)',
                        boxShadow: theme.palette.mode === 'dark' 
                          ? '0 2px 8px rgba(0, 0, 0, 0.15)'
                          : '0 2px 8px rgba(128, 0, 0, 0.06)'
                      }
                    }}>
                      <Typography variant="body2" sx={{ 
                        color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666',
                        fontWeight: 600,
                        mb: 0.5,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        fontSize: '0.7rem'
                      }}>
                        Student ID
                      </Typography>
                      <Typography variant="body1" sx={{ 
                        fontWeight: 600,
                        color: theme.palette.mode === 'dark' ? '#ffffff' : '#333333',
                        fontSize: '1rem'
                      }}>
                        {profile.studentId || ''}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ 
                      mb: 1.5,
                      p: 1,
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(128, 0, 0, 0.02)',
                      borderRadius: 1.5,
                      border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(128, 0, 0, 0.08)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(128, 0, 0, 0.05)',
                        transform: 'translateY(-1px)',
                        boxShadow: theme.palette.mode === 'dark'
                          ? '0 2px 8px rgba(0, 0, 0, 0.15)'
                          : '0 2px 8px rgba(128, 0, 0, 0.06)'
                      }
                    }}>
                      <Typography variant="body2" sx={{
                        color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666',
                        fontWeight: 600,
                        mb: 0.5,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        fontSize: '0.7rem'
                      }}>
                        Home Address
                      </Typography>
                      <Typography variant="body2" sx={{
                        fontWeight: 600,
                        color: theme.palette.mode === 'dark' ? '#ffffff' : '#333333',
                        fontSize: '1rem',
                        lineHeight: 1.5,
                        minHeight: '40px',
                        display: 'flex',
                        alignItems: 'flex-start'
                      }}>
                        {profile.homeAddress || ''}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 1 && (
        <Box sx={{ 
          maxWidth: 500, 
          mx: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <Card sx={{
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.95)',
            border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(0, 0, 0, 0.12)',
            borderRadius: 4,
            boxShadow: theme.palette.mode === 'dark' 
              ? '0 12px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)'
              : '0 12px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)',
            backdropFilter: 'blur(20px)',
            overflow: 'hidden',
            position: 'relative',
            width: '100%',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '3px',
              background: 'linear-gradient(90deg, #800000 0%, #ff6b6b 50%, #800000 100%)'
            }
          }}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                gap: 2,
                mb: 4,
                pb: 2,
                borderBottom: `2px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(128, 0, 0, 0.1)'}`
              }}>
                <Security sx={{ 
                  fontSize: '1.5rem',
                  color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000'
                }} />
                <Typography variant="h5" gutterBottom fontWeight={700} sx={{ 
                  color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000',
                  mb: 2,
                  mt: 1
                }}>
                  Change Password
                </Typography>
              </Box>
              <Stack spacing={3} sx={{ width: '100%' }}>
            <TextField
              label="Current Password"
              name="currentPassword"
              type={showPassword ? "text" : "password"}
              value={passwordForm.currentPassword}
              onChange={handlePasswordChange}
              fullWidth
                  size="large"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(128, 0, 0, 0.02)',
                      '&:hover': {
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(128, 0, 0, 0.05)'
                      },
                      '&.Mui-focused': {
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(128, 0, 0, 0.05)',
                        boxShadow: '0 0 0 2px rgba(128, 0, 0, 0.2)'
                      }
                    }
                  }}
              InputProps={{
                endAdornment: (
                  <IconButton
                    size="small"
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                        sx={{ 
                          color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666',
                          '&:hover': {
                            color: '#1976d2'
                          }
                        }}
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                ),
              }}
            />
            <TextField
              label="New Password"
              name="newPassword"
              type={showNewPassword ? "text" : "password"}
              value={passwordForm.newPassword}
              onChange={handlePasswordChange}
              fullWidth
                  size="large"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(128, 0, 0, 0.02)',
                      '&:hover': {
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(128, 0, 0, 0.05)'
                      },
                      '&.Mui-focused': {
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(128, 0, 0, 0.05)',
                        boxShadow: '0 0 0 2px rgba(128, 0, 0, 0.2)'
                      }
                    }
                  }}
              InputProps={{
                endAdornment: (
                  <IconButton
                    size="small"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    edge="end"
                        sx={{ 
                          color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666',
                          '&:hover': {
                            color: '#1976d2'
                          }
                        }}
                  >
                    {showNewPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                ),
              }}
            />
            <TextField
              label="Confirm New Password"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={passwordForm.confirmPassword}
              onChange={handlePasswordChange}
              fullWidth
                  size="large"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(128, 0, 0, 0.02)',
                      '&:hover': {
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(128, 0, 0, 0.05)'
                      },
                      '&.Mui-focused': {
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(128, 0, 0, 0.05)',
                        boxShadow: '0 0 0 2px rgba(128, 0, 0, 0.2)'
                      }
                    }
                  }}
              InputProps={{
                endAdornment: (
                  <IconButton
                    size="small"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    edge="end"
                        sx={{ 
                          color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666',
                          '&:hover': {
                            color: '#1976d2'
                          }
                        }}
                  >
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                ),
              }}
            />
          </Stack>
              
              <Typography variant="body2" sx={{ 
                mt: 3, 
                textAlign: 'center',
                color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666',
                fontWeight: 500
              }}>
            Password must be at least 6 characters long.
          </Typography>
              
              <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
            <Button 
                  variant="contained"
                  size="medium"
              onClick={handleChangePassword}
              disabled={saving || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword || passwordSuccess}
              sx={{
                  bgcolor: passwordSuccess ? '#4caf50' : '#800000',
                  color: 'white',
                    fontWeight: 600,
                    textTransform: 'none',
                    px: 3,
                    py: 1,
                    borderRadius: 1,
                    '&:hover': {
                      bgcolor: passwordSuccess ? '#388e3c' : '#6b0000'
                    },
                    '&:disabled': {
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                      color: theme.palette.mode === 'dark' ? '#666666' : '#999999'
                }
              }}
            >
              {saving ? 'Changing Password...' : passwordSuccess ? 'Password Changed!' : 'Change Password'}
            </Button>
          </Box>
            </CardContent>
          </Card>
        </Box>
      )}



      {/* Edit Profile Modal */}
      <Dialog open={openEditModal} onClose={() => setOpenEditModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: '#800000', pb: 1, fontSize: '1.1rem' }}>
          Edit Profile
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Grid container spacing={2}>
            {/* Profile Picture Section */}
            <Grid item xs={12}>
              <Box sx={{ textAlign: 'center', mb: 2 }}>
                <Avatar 
                  src={editProfile.image} 
                  sx={{ 
                    width: 60, 
                    height: 60, 
                    fontSize: '1.5rem',
                    bgcolor: 'primary.main',
                    mb: 1,
                    mx: 'auto',
                    background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)'
                  }}
                >
                  {editProfile.firstName?.charAt(0)}{editProfile.lastName?.charAt(0)}
                </Avatar>
                <Box>
                  <input
                    accept="image/*"
                    style={{ display: 'none' }}
                    id="profile-picture-upload"
                    type="file"
                    onChange={handleImageUpload}
                  />
                  <label htmlFor="profile-picture-upload">
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={<PhotoCamera />}
                      size="small"
                      sx={{
                        color: 'black',
                        borderColor: 'black',
                        fontSize: '0.75rem',
                        py: 0.5,
                        px: 1,
                        '&:hover': {
                          bgcolor: 'rgba(0,0,0,0.1)',
                          borderColor: 'black'
                        }
                      }}
                    >
                      Change Picture
                    </Button>
                  </label>
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="First Name"
                name="firstName"
                value={editProfile.firstName}
                onChange={handleEditProfileChange}
                fullWidth
                size="small"
                required
                sx={{
                  '& .MuiInputBase-input': {
                    fontSize: '0.875rem'
                  },
                  '& .MuiInputLabel-root': {
                    fontSize: '0.875rem'
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Last Name"
                name="lastName"
                value={editProfile.lastName}
                onChange={handleEditProfileChange}
                fullWidth
                size="small"
                required
                sx={{
                  '& .MuiInputBase-input': {
                    fontSize: '0.875rem'
                  },
                  '& .MuiInputLabel-root': {
                    fontSize: '0.875rem'
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Middle Initial"
                name="middleInitial"
                value={editProfile.middleInitial}
                onChange={handleEditProfileChange}
                fullWidth
                size="small"
                sx={{
                  '& .MuiInputBase-input': {
                    fontSize: '0.875rem'
                  },
                  '& .MuiInputLabel-root': {
                    fontSize: '0.875rem'
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Student ID"
                name="studentId"
                value={editProfile.studentId}
                onChange={handleEditProfileChange}
                fullWidth
                size="small"
                required
                disabled={profile.role !== 'Admin' && profile.studentId} // Allow editing if not set, but disable if already set
                helperText={profile.role !== 'Admin' && profile.studentId ? 'Student ID cannot be changed once set' : ''}
                sx={{
                  '& .MuiInputBase-input': {
                    fontSize: '0.875rem'
                  },
                  '& .MuiInputLabel-root': {
                    fontSize: '0.875rem'
                  },
                  '& .MuiFormHelperText-root': {
                    fontSize: '0.75rem'
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Contact Number"
                name="contact"
                value={editProfile.contact}
                onChange={handleEditProfileChange}
                fullWidth
                size="small"
                sx={{
                  '& .MuiInputBase-input': {
                    fontSize: '0.875rem'
                  },
                  '& .MuiInputLabel-root': {
                    fontSize: '0.875rem'
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Course"
                name="course"
                value={editProfile.course}
                onChange={handleEditProfileChange}
                fullWidth
                size="small"
                select
                sx={{
                  '& .MuiInputBase-input': {
                    fontSize: '0.875rem'
                  },
                  '& .MuiInputLabel-root': {
                    fontSize: '0.875rem'
                  }
                }}
              >
                <MenuItem value="BSIT">BSIT</MenuItem>
                <MenuItem value="BSBA">BSBA</MenuItem>
                <MenuItem value="BSCRIM">BSCRIM</MenuItem>
                <MenuItem value="BSHTM">BSHTM</MenuItem>
                <MenuItem value="BEED">BEED</MenuItem>
                <MenuItem value="BSED">BSED</MenuItem>
                <MenuItem value="BSHM">BSHM</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Year Level"
                name="year"
                value={editProfile.year}
                onChange={handleEditProfileChange}
                fullWidth
                size="small"
                select
                sx={{
                  '& .MuiInputBase-input': {
                    fontSize: '0.875rem'
                  },
                  '& .MuiInputLabel-root': {
                    fontSize: '0.875rem'
                  }
                }}
              >
                <MenuItem value="1st Year">1st Year</MenuItem>
                <MenuItem value="2nd Year">2nd Year</MenuItem>
                <MenuItem value="3rd Year">3rd Year</MenuItem>
                <MenuItem value="4th Year">4th Year</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Section"
                name="section"
                value={editProfile.section}
                onChange={handleEditProfileChange}
                fullWidth
                size="small"
                select
                sx={{
                  '& .MuiInputBase-input': {
                    fontSize: '0.875rem'
                  },
                  '& .MuiInputLabel-root': {
                    fontSize: '0.875rem'
                  }
                }}
              >
                <MenuItem value="A">A</MenuItem>
                <MenuItem value="B">B</MenuItem>
                <MenuItem value="C">C</MenuItem>
                <MenuItem value="D">D</MenuItem>
                <MenuItem value="E">E</MenuItem>
                <MenuItem value="F">F</MenuItem>
                <MenuItem value="G">G</MenuItem>
                <MenuItem value="H">H</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Birthdate"
                name="birthdate"
                value={editProfile.birthdate}
                onChange={handleEditProfileChange}
                fullWidth
                size="small"
                type="date"
                InputLabelProps={{ shrink: true }}
                sx={{
                  '& .MuiInputBase-input': {
                    fontSize: '0.875rem'
                  },
                  '& .MuiInputLabel-root': {
                    fontSize: '0.875rem'
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Sex"
                name="sex"
                value={editProfile.sex}
                onChange={handleEditProfileChange}
                fullWidth
                size="small"
                select
                sx={{
                  '& .MuiInputBase-input': {
                    fontSize: '0.875rem'
                  },
                  '& .MuiInputLabel-root': {
                    fontSize: '0.875rem'
                  }
                }}
              >
                <MenuItem value="Male">Male</MenuItem>
                <MenuItem value="Female">Female</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Age"
                name="age"
                value={editProfile.age}
                onChange={handleEditProfileChange}
                fullWidth
                size="small"
                type="number"
                inputProps={{ min: 1, max: 150 }}
                sx={{
                  '& .MuiInputBase-input': {
                    fontSize: '0.875rem'
                  },
                  '& .MuiInputLabel-root': {
                    fontSize: '0.875rem'
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="SCC Number"
                name="sccNumber"
                value={editProfile.sccNumber}
                onChange={handleEditProfileChange}
                fullWidth
                size="small"
                sx={{
                  '& .MuiInputBase-input': {
                    fontSize: '0.875rem'
                  },
                  '& .MuiInputLabel-root': {
                    fontSize: '0.875rem'
                  }
                }}
              />
            </Grid>
            {profile.role === 'Admin' && (
              <Grid item xs={12}>
                <TextField
                  label="Email Address"
                  name="email"
                  type="email"
                  value={editProfile.email}
                  onChange={handleEditProfileChange}
                  fullWidth
                  size="small"
                  required
                  sx={{
                    '& .MuiInputBase-input': {
                      fontSize: '0.875rem'
                    },
                    '& .MuiInputLabel-root': {
                      fontSize: '0.875rem'
                    }
                  }}
                />
              </Grid>
            )}
            <Grid item xs={12}>
              <TextField
                label="Home Address"
                name="homeAddress"
                value={editProfile.homeAddress}
                onChange={handleEditProfileChange}
                fullWidth
                size="small"
                multiline
                rows={2}
                sx={{
                  '& .MuiInputBase-input': {
                    fontSize: '0.875rem'
                  },
                  '& .MuiInputLabel-root': {
                    fontSize: '0.875rem'
                  }
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button 
            onClick={() => setOpenEditModal(false)} 
            variant="outlined"
            size="small"
            sx={{
              color: 'black',
              borderColor: 'black',
              fontSize: '0.875rem',
              '&:hover': {
                bgcolor: 'rgba(0,0,0,0.1)',
                borderColor: 'black'
              }
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSaveEditProfile} 
            variant="contained"
            disabled={saving}
            startIcon={<Save />}
            size="small"
            sx={{
              bgcolor: '#800000',
              fontSize: '0.875rem',
              '&:hover': {
                bgcolor: '#a00000'
              }
            }}
          >
            {saving ? 'Saving...' : 'Save'}
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