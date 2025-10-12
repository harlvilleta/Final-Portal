import React, { useState, useEffect } from "react";
import { 
  Typography, Box, Grid, TextField, MenuItem, Button, Paper, Avatar, Snackbar, Alert,
  Card, CardContent, Divider, IconButton, Tabs, Tab, Stack, Chip
} from "@mui/material";
import { 
  Person, Security, PhotoCamera, Save, Edit, Visibility, VisibilityOff,
  Email, Phone, Home, Work
} from "@mui/icons-material";
import { collection, addDoc, doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { updatePassword, updateProfile, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { db, auth } from "../firebase";
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';


export default function Profile() {
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
    image: null
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
          email: userData.email || currentUser?.email || "",
          firstName: userData.fullName?.split(' ')[0] || "",
          lastName: userData.fullName?.split(' ').slice(1).join(' ') || "",
          image: userData.profilePic || null
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
        profilePic: imageURL,
        role: 'Student',
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
                <Box sx={{ position: 'relative', display: 'inline-block' }}>
                  <Avatar 
                    src={profile.image} 
                    sx={{ 
                      width: 120, 
                      height: 120, 
                      fontSize: '3rem',
                      bgcolor: 'primary.main',
                      mb: 2
                    }}
                  >
                    {profile.firstName?.charAt(0)}{profile.lastName?.charAt(0)}
                  </Avatar>
                  <IconButton
                    sx={{
                      position: 'absolute',
                      bottom: 8,
                      right: 8,
                      bgcolor: 'primary.main',
                      color: 'white',
                      '&:hover': { bgcolor: 'primary.dark' }
                    }}
                    component="label"
                  >
                    <PhotoCamera />
                    <input type="file" accept="image/*" hidden onChange={handleImage} />
                  </IconButton>
                </Box>
                <Typography variant="h6" gutterBottom>
                  {profile.firstName} {profile.lastName}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {profile.email}
                </Typography>
                <Chip 
                  label="Admin" 
                  color="primary" 
                  variant="outlined" 
                  sx={{ mt: 1 }}
                />
              </CardContent>
            </Card>
          </Grid>

          {/* Profile Form */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Person /> Personal Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField 
                      fullWidth 
                      label="First Name" 
                      name="firstName" 
                      value={profile.firstName} 
                      onChange={handleChange}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField 
                      fullWidth 
                      label="Last Name" 
                      name="lastName" 
                      value={profile.lastName} 
                      onChange={handleChange}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField 
                      fullWidth 
                      label="Email Address" 
                      name="email" 
                      value={profile.email} 
                      onChange={handleChange}
                      type="email"
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField 
                      fullWidth 
                      label="Contact Number" 
                      name="contact" 
                      value={profile.contact} 
                      onChange={handleChange}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField 
                      fullWidth 
                      label="Sex" 
                      name="sex" 
                      value={profile.sex} 
                      onChange={handleChange}
                      select
                    >
                      <MenuItem value="Male">Male</MenuItem>
                      <MenuItem value="Female">Female</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField 
                      fullWidth 
                      label="Age" 
                      name="age" 
                      value={profile.age} 
                      onChange={handleChange}
                      type="number"
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField 
                      fullWidth 
                      label="Birthdate" 
                      name="birthdate" 
                      value={profile.birthdate} 
                      onChange={handleChange}
                      type="date"
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                </Grid>

                <Divider sx={{ my: 3 }} />


                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Home /> Address Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField 
                      fullWidth 
                      label="Home Address" 
                      name="homeAddress" 
                      value={profile.homeAddress} 
                      onChange={handleChange}
                      multiline
                      rows={3}
                    />
                  </Grid>
                </Grid>

                <Box sx={{ mt: 3, textAlign: 'right' }}>
                  <Button 
                    variant="contained" 
                    onClick={handleSaveProfile}
                    disabled={saving || saveSuccess}
                    startIcon={<Save />}
                    color={saveSuccess ? "success" : "primary"}
                    sx={{
                      transition: 'all 0.3s ease',
                      transform: saveSuccess ? 'scale(1.05)' : 'scale(1)',
                      boxShadow: saveSuccess ? '0 4px 12px rgba(76, 175, 80, 0.4)' : '0 2px 8px rgba(25, 118, 210, 0.3)'
                    }}
                  >
                    {saving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Changes'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Security /> Change Password
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Current Password"
                  name="currentPassword"
                  type={showPassword ? "text" : "password"}
                  value={passwordForm.currentPassword}
                  onChange={handlePasswordChange}
                  InputProps={{
                    endAdornment: (
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="New Password"
                  name="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={passwordForm.newPassword}
                  onChange={handlePasswordChange}
                  InputProps={{
                    endAdornment: (
                      <IconButton
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        edge="end"
                      >
                        {showNewPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Confirm New Password"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={passwordForm.confirmPassword}
                  onChange={handlePasswordChange}
                  InputProps={{
                    endAdornment: (
                      <IconButton
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        edge="end"
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    ),
                  }}
                />
              </Grid>
            </Grid>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
              Password must be at least 6 characters long.
            </Typography>
            <Box sx={{ mt: 3, textAlign: 'right' }}>
              <Button 
                variant="contained" 
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
          </CardContent>
        </Card>
      )}

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
} 