import React, { useState, useEffect } from "react";
import { 
  Typography, Box, Grid, TextField, MenuItem, Button, Paper, Avatar, Snackbar, Alert,
  Card, CardContent, Divider, IconButton, Tabs, Tab, Stack, Chip, Dialog, DialogTitle, DialogContent, DialogActions, useTheme
} from "@mui/material";
import { 
  Person, Security, PhotoCamera, Save, Edit, Visibility, VisibilityOff,
  Email, Phone, Home, Work, ArrowBack
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, doc, getDoc, updateDoc, setDoc, query, where, getDocs } from "firebase/firestore";
import { updatePassword, updateProfile, updateEmail, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { db, auth } from "../firebase";
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';


export default function Profile() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
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
    sccNumber: "",
    contact: "",
    homeAddress: "",
    email: "",
    image: null
  });

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      if (user) {
        loadUserProfile(user.uid);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const loadUserProfile = async (uid) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
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
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
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
      await setDoc(doc(db, 'users', currentUser.uid), {
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
      }, { merge: true });

      // 🔄 SYNC WITH ADMIN STUDENT LIST
      // If this is a student, also update their record in the admin's students collection
      if (profile.role === 'Student' && profile.studentId) {
        try {
          console.log('🔄 Syncing student profile with admin records...');
          
          // Find the student record in the admin's students collection
          const studentsQuery = query(
            collection(db, 'students'),
            where('id', '==', profile.studentId)
          );
          
          const studentsSnapshot = await getDocs(studentsQuery);
          
          if (!studentsSnapshot.empty) {
            // Update the existing student record in admin's collection
            const studentDoc = studentsSnapshot.docs[0];
            await updateDoc(doc(db, 'students', studentDoc.id), {
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
            });
            
            console.log('✅ Student record synced with admin list successfully');
          } else {
            console.log('⚠️ Student record not found in admin collection, creating new record...');
            
            // Create a new student record in admin's collection if not found
            await addDoc(collection(db, 'students'), {
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
            });
            
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
        course: editProfile.course,
        year: editProfile.year,
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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Typography>Loading profile...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      pt: { xs: 2, sm: 3 }, 
      pl: { xs: 2, sm: 3, md: 4 }, 
      pr: { xs: 2, sm: 3, md: 4 }, 
      pb: 3,
      bgcolor: theme.palette.mode === 'dark' ? '#1a1a1a' : 'transparent'
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton 
          onClick={() => navigate('/options')}
          sx={{ 
            mr: 2,
            color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
            '&:hover': {
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(128, 0, 0, 0.1)',
              color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000'
            }
          }}
        >
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" fontWeight={700} sx={{ 
          color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000'
        }}>
          Account Settings
        </Typography>
      </Box>

      <Paper sx={{ 
        mb: 3,
        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.9)',
        border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
        borderRadius: 2,
        boxShadow: theme.palette.mode === 'dark' ? '0 2px 8px rgba(0, 0, 0, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.1)'
      }}>
        <Tabs 
          value={activeTab} 
          onChange={(e, newValue) => setActiveTab(newValue)}
          sx={{
            '& .MuiTab-root': {
              color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
              fontWeight: 400,
              textTransform: 'none',
              '&.Mui-selected': {
                color: '#ffffff',
                fontWeight: 700,
                backgroundColor: '#800000',
                borderRadius: '4px 4px 0 0'
              },
              '&:hover': {
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(128, 0, 0, 0.1)',
                color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000'
              }
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#800000',
              height: 3
            }
          }}
        >
          <Tab icon={<Person />} label="Profile Information" />
          <Tab icon={<Security />} label="Security" />
        </Tabs>
      </Paper>

      {activeTab === 0 && (
        <Grid container spacing={3}>
          {/* Profile Picture Section */}
          <Grid item xs={12} md={4}>
            <Card sx={{
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.9)',
              border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
              borderRadius: 2,
              boxShadow: theme.palette.mode === 'dark' ? '0 2px 8px rgba(0, 0, 0, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.1)'
            }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Avatar 
                  src={profile.image} 
                  sx={{ 
                    width: 120, 
                    height: 120, 
                    fontSize: '3rem',
                    bgcolor: 'primary.main',
                    mb: 2,
                    mx: 'auto',
                    background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)'
                  }}
                >
                  {profile.firstName?.charAt(0)}{profile.lastName?.charAt(0)}
                </Avatar>
                <Typography variant="h6" gutterBottom sx={{ 
                  color: theme.palette.mode === 'dark' ? '#ffffff' : '#333333'
                }}>
                  {profile.firstName} {profile.lastName}
                </Typography>
                <Typography variant="body2" sx={{ 
                  color: theme.palette.mode === 'dark' ? '#cccccc' : 'text.secondary'
                }}>
                  {profile.email}
                </Typography>
                <Chip 
                  label={profile.role || "Student"} 
                  color="primary" 
                  variant="outlined" 
                  sx={{ mt: 1 }}
                />
                <Box sx={{ mt: 3 }}>
                  <Button 
                    variant="outlined" 
                    startIcon={<Edit />}
                    onClick={handleOpenEditModal}
                    sx={{ 
                      color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                      borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : '#000000',
                      fontWeight: 600,
                      textTransform: 'none',
                      px: 3,
                      '&:hover': {
                        bgcolor: '#800000',
                        color: 'white',
                        borderColor: '#800000'
                      }
                    }}
                  >
                    Edit Profile
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Profile Information Display */}
          <Grid item xs={12} md={8}>
            <Card sx={{
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.9)',
              border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
              borderRadius: 2,
              boxShadow: theme.palette.mode === 'dark' ? '0 2px 8px rgba(0, 0, 0, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.1)'
            }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1,
                  color: theme.palette.mode === 'dark' ? '#ffffff' : '#333333'
                }}>
                  <Person /> Personal Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" sx={{ 
                        color: theme.palette.mode === 'dark' ? '#cccccc' : 'text.secondary'
                      }} gutterBottom>
                        First Name
                      </Typography>
                      <Typography variant="body1" sx={{ 
                        fontWeight: 500,
                        p: 1.5,
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'grey.50',
                        borderRadius: 1,
                        border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e0e0e0',
                        color: theme.palette.mode === 'dark' ? '#ffffff' : '#333333'
                      }}>
                        {profile.firstName || 'Not provided'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" sx={{ 
                        color: theme.palette.mode === 'dark' ? '#cccccc' : 'text.secondary'
                      }} gutterBottom>
                        Last Name
                      </Typography>
                      <Typography variant="body1" sx={{ 
                        fontWeight: 500,
                        p: 1.5,
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'grey.50',
                        borderRadius: 1,
                        border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e0e0e0',
                        color: theme.palette.mode === 'dark' ? '#ffffff' : '#333333'
                      }}>
                        {profile.lastName || 'Not provided'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Middle Initial
                      </Typography>
                      <Typography variant="body1" sx={{ 
                        fontWeight: 500,
                        p: 1.5,
                        bgcolor: 'grey.50',
                        borderRadius: 1,
                        border: '1px solid #e0e0e0'
                      }}>
                        {profile.middleInitial || 'Not provided'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Email Address
                      </Typography>
                      <Typography variant="body1" sx={{ 
                        fontWeight: 500,
                        p: 1.5,
                        bgcolor: 'grey.50',
                        borderRadius: 1,
                        border: '1px solid #e0e0e0'
                      }}>
                        {profile.email || 'Not provided'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Contact Number
                      </Typography>
                      <Typography variant="body1" sx={{ 
                        fontWeight: 500,
                        p: 1.5,
                        bgcolor: 'grey.50',
                        borderRadius: 1,
                        border: '1px solid #e0e0e0'
                      }}>
                        {profile.contact || 'Not provided'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Course
                      </Typography>
                      <Typography variant="body1" sx={{ 
                        fontWeight: 500,
                        p: 1.5,
                        bgcolor: 'grey.50',
                        borderRadius: 1,
                        border: '1px solid #e0e0e0'
                      }}>
                        {profile.course || 'Not provided'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Year Level
                      </Typography>
                      <Typography variant="body1" sx={{ 
                        fontWeight: 500,
                        p: 1.5,
                        bgcolor: 'grey.50',
                        borderRadius: 1,
                        border: '1px solid #e0e0e0'
                      }}>
                        {profile.year || 'Not provided'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Sex
                      </Typography>
                      <Typography variant="body1" sx={{ 
                        fontWeight: 500,
                        p: 1.5,
                        bgcolor: 'grey.50',
                        borderRadius: 1,
                        border: '1px solid #e0e0e0'
                      }}>
                        {profile.sex || 'Not provided'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Age
                      </Typography>
                      <Typography variant="body1" sx={{ 
                        fontWeight: 500,
                        p: 1.5,
                        bgcolor: 'grey.50',
                        borderRadius: 1,
                        border: '1px solid #e0e0e0'
                      }}>
                        {profile.age || 'Not provided'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Birthdate
                      </Typography>
                      <Typography variant="body1" sx={{ 
                        fontWeight: 500,
                        p: 1.5,
                        bgcolor: 'grey.50',
                        borderRadius: 1,
                        border: '1px solid #e0e0e0'
                      }}>
                        {profile.birthdate ? new Date(profile.birthdate).toLocaleDateString() : 'Not provided'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        SCC Number
                      </Typography>
                      <Typography variant="body1" sx={{ 
                        fontWeight: 500,
                        p: 1.5,
                        bgcolor: 'grey.50',
                        borderRadius: 1,
                        border: '1px solid #e0e0e0'
                      }}>
                        {profile.sccNumber || 'Not provided'}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 3 }} />

                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Home /> Address Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Home Address
                      </Typography>
                      <Typography variant="body1" sx={{ 
                        fontWeight: 500,
                        p: 1.5,
                        bgcolor: 'grey.50',
                        borderRadius: 1,
                        border: '1px solid #e0e0e0',
                        minHeight: '60px',
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        {profile.homeAddress || 'Not provided'}
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
          maxWidth: 400, 
          mx: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <Security /> Change Password
          </Typography>
          <Stack spacing={2} sx={{ width: '100%' }}>
            <TextField
              label="Current Password"
              name="currentPassword"
              type={showPassword ? "text" : "password"}
              value={passwordForm.currentPassword}
              onChange={handlePasswordChange}
              fullWidth
              InputProps={{
                endAdornment: (
                  <IconButton
                    size="small"
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
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
              InputProps={{
                endAdornment: (
                  <IconButton
                    size="small"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    edge="end"
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
              InputProps={{
                endAdornment: (
                  <IconButton
                    size="small"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    edge="end"
                  >
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                ),
              }}
            />
          </Stack>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 2, textAlign: 'center' }}>
            Password must be at least 6 characters long.
          </Typography>
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
            <Button 
              variant="outlined" 
              size="small"
              onClick={handleChangePassword}
              disabled={saving || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword || passwordSuccess}
              startIcon={<Security />}
              sx={{
                color: passwordSuccess ? '#4caf50' : 'black',
                borderColor: passwordSuccess ? '#4caf50' : 'black',
                fontWeight: 600,
                '&:hover': {
                  bgcolor: passwordSuccess ? '#4caf50' : '#800000',
                  color: 'white',
                  borderColor: passwordSuccess ? '#4caf50' : '#800000'
                }
              }}
            >
              {saving ? 'Changing Password...' : passwordSuccess ? 'Password Changed!' : 'Change Password'}
            </Button>
          </Box>
        </Box>
      )}

      {/* Edit Profile Modal */}
      <Dialog open={openEditModal} onClose={() => setOpenEditModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: '#800000', pb: 1 }}>
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
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Year Level"
                name="year"
                value={editProfile.year}
                onChange={handleEditProfileChange}
                fullWidth
                size="small"
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
              />
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