import React, { useState, useEffect } from "react";
import { 
  Typography, Box, Grid, TextField, MenuItem, Button, Paper, Avatar, Snackbar, Alert,
  Card, CardContent, Divider, IconButton, Tabs, Tab, Stack, Chip
} from "@mui/material";
import { 
  Person, Security, PhotoCamera, Save, Edit, Visibility, VisibilityOff,
  Email, Phone, Home, Work
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { updatePassword, updateProfile, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { db, auth } from "../firebase";
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';


export default function Profile() {
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
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setSnackbar({ open: true, message: "Profile updated successfully!", severity: "success" });
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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Typography>Loading profile...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={700} color="primary.main">
        Account Settings
      </Typography>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab icon={<Person />} label="Profile Information" />
          <Tab icon={<Security />} label="Security" />
        </Tabs>
      </Paper>

      {activeTab === 0 && (
        <Grid container spacing={3}>
          {/* Profile Picture Section */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Avatar 
                  src={profile.image} 
                  sx={{ 
                    width: 120, 
                    height: 120, 
                    fontSize: '3rem',
                    bgcolor: 'primary.main',
                    mb: 2,
                    mx: 'auto'
                  }}
                >
                  {profile.firstName?.charAt(0)}{profile.lastName?.charAt(0)}
                </Avatar>
                <Typography variant="h6" gutterBottom>
                  {profile.firstName} {profile.lastName}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {profile.email}
                </Typography>
                {profile.studentId && (
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                    ID: {profile.studentId}
                  </Typography>
                )}
                <Chip 
                  label={profile.role || "Student"} 
                  color="primary" 
                  variant="outlined" 
                  sx={{ mt: 1 }}
                />
                <Box sx={{ mt: 3 }}>
                  <Button 
                    variant="contained" 
                    startIcon={<Edit />}
                    onClick={() => navigate('/edit-profile')}
                    sx={{ 
                      fontWeight: 600,
                      textTransform: 'none',
                      px: 3
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
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Person /> Personal Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        First Name
                      </Typography>
                      <Typography variant="body1" sx={{ 
                        fontWeight: 500,
                        p: 1.5,
                        bgcolor: 'grey.50',
                        borderRadius: 1,
                        border: '1px solid #e0e0e0'
                      }}>
                        {profile.firstName || 'Not provided'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Last Name
                      </Typography>
                      <Typography variant="body1" sx={{ 
                        fontWeight: 500,
                        p: 1.5,
                        bgcolor: 'grey.50',
                        borderRadius: 1,
                        border: '1px solid #e0e0e0'
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
                        Student ID
                      </Typography>
                      <Typography variant="body1" sx={{ 
                        fontWeight: 500,
                        p: 1.5,
                        bgcolor: 'grey.50',
                        borderRadius: 1,
                        border: '1px solid #e0e0e0'
                      }}>
                        {profile.studentId || 'Not provided'}
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
                  <Grid item xs={12} sm={4}>
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
                  <Grid item xs={12} sm={4}>
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
                  <Grid item xs={12} sm={4}>
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
                        {profile.birthdate || 'Not provided'}
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
        <Box sx={{ maxWidth: 400 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <Security /> Change Password
          </Typography>
          <Stack spacing={2}>
            <TextField
              label="Current Password"
              name="currentPassword"
              type={showPassword ? "text" : "password"}
              value={passwordForm.currentPassword}
              onChange={handlePasswordChange}
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
          <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
            Password must be at least 6 characters long.
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Button 
              variant="contained" 
              size="small"
              onClick={handleChangePassword}
              disabled={saving || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword || passwordSuccess}
              startIcon={<Security />}
              color={passwordSuccess ? "success" : "primary"}
              sx={{
                transition: 'all 0.3s ease',
                transform: passwordSuccess ? 'scale(1.05)' : 'scale(1)',
                boxShadow: passwordSuccess ? '0 4px 12px rgba(76, 175, 80, 0.4)' : '0 2px 8px rgba(25, 118, 210, 0.3)'
              }}
            >
              {saving ? 'Changing Password...' : passwordSuccess ? 'Password Changed!' : 'Change Password'}
            </Button>
          </Box>
        </Box>
      )}

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
} 