import React, { useState } from 'react';
import { Box, Paper, Typography, TextField, Button, Snackbar, Alert, InputAdornment, IconButton, Avatar, MenuItem, LinearProgress, Checkbox, FormControlLabel, CircularProgress, Grid } from '@mui/material';
import { Visibility, VisibilityOff, PersonAddAlt1, CloudUpload } from '@mui/icons-material';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../firebase';
import { setDoc, doc, addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import Link from '@mui/material/Link';

const roles = ['Student', 'Admin', 'Teacher'];
const courses = ["BSIT", "BSBA", "BSED", "BEED", "BSN"];
const years = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

function getPasswordStrength(password) {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

// Function to convert file to base64
const convertToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

// Function to upload image to Firebase Storage
const uploadImageToStorage = async (file, userId) => {
  const storageRef = ref(storage, `profile-pictures/${userId}/${Date.now()}_${file.name}`);
  const snapshot = await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(snapshot.ref);
  return downloadURL;
};

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('Student');
  const [profilePic, setProfilePic] = useState(null);
  const [profilePicBase64, setProfilePicBase64] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [terms, setTerms] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [uploading, setUploading] = useState(false);
  
  // Student-specific fields
  const [studentId, setStudentId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [course, setCourse] = useState('');
  const [year, setYear] = useState('');
  const [gender, setGender] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [age, setAge] = useState('');
  
  const navigate = useNavigate();

  const handleProfilePic = async (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setSnackbar({ open: true, message: 'Please select an image file', severity: 'error' });
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setSnackbar({ open: true, message: 'Image size should be less than 10MB', severity: 'error' });
        return;
      }
      
      setProfilePic(file);
      setUploading(true);
      
      try {
        // Convert to base64 for preview only
        const base64String = await convertToBase64(file);
        setProfilePicBase64(base64String);
        setSnackbar({ open: true, message: 'Profile picture uploaded successfully!', severity: 'success' });
      } catch (error) {
        console.error('Error processing image:', error);
        setSnackbar({ open: true, message: 'Failed to process image. Please try again.', severity: 'error' });
        setProfilePic(null);
      } finally {
        setUploading(false);
      }
    }
  };

  const handleFirstNameChange = (e) => {
    const value = e.target.value;
    setFirstName(value);
    setFullName(`${value} ${lastName}`.trim());
  };

  const handleLastNameChange = (e) => {
    const value = e.target.value;
    setLastName(value);
    setFullName(`${firstName} ${value}`.trim());
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!role) {
      setSnackbar({ open: true, message: 'Please select a role.', severity: 'error' });
      return;
    }
    if (!fullName) {
      setSnackbar({ open: true, message: 'Full name is required.', severity: 'error' });
      return;
    }
    if (password !== confirmPassword) {
      setSnackbar({ open: true, message: 'Passwords do not match.', severity: 'error' });
      return;
    }
    if (!terms) {
      setSnackbar({ open: true, message: 'You must agree to the terms.', severity: 'error' });
      return;
    }
    
    // Validate student-specific fields
    if (role === 'Student') {
      if (!studentId) {
        setSnackbar({ open: true, message: 'Student ID is required.', severity: 'error' });
        return;
      }
      if (!firstName || !lastName) {
        setSnackbar({ open: true, message: 'First name and last name are required for students.', severity: 'error' });
        return;
      }
      if (!course || !year) {
        setSnackbar({ open: true, message: 'Course and year are required for students.', severity: 'error' });
        return;
      }
      if (!gender) {
        setSnackbar({ open: true, message: 'Gender is required for students.', severity: 'error' });
        return;
      }
      if (!birthdate) {
        setSnackbar({ open: true, message: 'Birthdate is required for students.', severity: 'error' });
        return;
      }
    }
    
    console.log('Starting registration process...');
    setLoading(true);
    
    // Add timeout protection
    const timeoutId = setTimeout(() => {
      console.error('Registration timed out - forcing reset');
      setSnackbar({ open: true, message: 'Registration timed out. Please try again.', severity: 'error' });
      setLoading(false);
    }, 30000); // 30 second timeout
    
    try {
      console.log('Starting registration process...');
      
      // Create user account in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      console.log('✅ Firebase Auth user created:', user.uid);
      
      // Update profile with display name and photo (use base64 if available)
      await updateProfile(user, {
        displayName: fullName
      });
      
      console.log('✅ User profile updated');
      
      // Upload image to Firebase Storage if provided
      let imageURL = '';
      if (profilePic) {
        try {
          imageURL = await uploadImageToStorage(profilePic, user.uid);
          console.log('✅ Image uploaded to Storage:', imageURL);
        } catch (uploadError) {
          console.error('❌ Image upload error:', uploadError);
          // Continue with registration even if image upload fails
        }
      }
      
      // Prepare comprehensive user data for Firestore
      const userData = {
        email: user.email,
        fullName: fullName,
        role: role,
        phone: phone || '',
        address: address || '',
        profilePic: imageURL || '', // Save Storage URL instead of base64
        profilePicType: profilePic ? profilePic.type : '', // Save image type
        profilePicName: profilePic ? profilePic.name : '', // Save original filename
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        uid: user.uid,
        isActive: true,
        lastLogin: null,
        registrationMethod: 'email'
      };
      
      // Add student-specific data if role is Student
      if (role === 'Student') {
        userData.studentId = studentId;
        userData.firstName = firstName;
        userData.lastName = lastName;
        userData.course = course;
        userData.year = year;
        userData.gender = gender;
        userData.birthdate = birthdate;
        userData.age = age;
        userData.studentInfo = {
          studentId: studentId,
          firstName: firstName,
          lastName: lastName,
          course: course,
          year: year,
          gender: gender,
          birthdate: birthdate,
          age: age,
          enrollmentDate: new Date().toISOString()
        };
      }
      
      // Add role-specific data
      if (role === 'Admin') {
        userData.adminInfo = {
          permissions: ['all'],
          adminLevel: 'super',
          assignedBy: 'system'
        };
      } else if (role === 'Teacher') {
        userData.teacherInfo = {
          subjects: [],
          department: '',
          hireDate: new Date().toISOString()
        };
      }
      
      console.log('📝 Saving user data to Firestore...');
      
      // Save user data to Firestore with better error handling
      try {
        await setDoc(doc(db, 'users', user.uid), userData);
        console.log('✅ User data saved to Firestore successfully');
      } catch (firestoreError) {
        console.error('❌ Firestore save error:', firestoreError);
        // If Firestore fails, we should clean up the Auth user
        await user.delete();
        throw new Error('Failed to save user data. Please try again.');
      }
      
      // Log activity with more details
      try {
        await addDoc(collection(db, 'activity_log'), {
          message: `New user registered: ${fullName} (${role})`,
          type: 'registration',
          user: user.uid,
          userEmail: user.email,
          userRole: role,
          timestamp: new Date().toISOString(),
          details: {
            registrationMethod: 'email',
            hasProfilePic: !!imageURL,
            profilePicSize: profilePic ? `${(profilePic.size / 1024).toFixed(2)} KB` : 'N/A',
            studentInfo: role === 'Student' ? {
              studentId,
              course,
              year,
              section
            } : null
          }
        });
        console.log('✅ Activity logged successfully');
      } catch (logError) {
        console.warn('⚠️ Failed to log activity:', logError);
        // Don't fail registration if logging fails
      }
      
      // Create user preferences document
      try {
        await setDoc(doc(db, 'user_preferences', user.uid), {
          uid: user.uid,
          email: user.email,
          theme: 'light',
          language: 'en',
          notifications: {
            email: true,
            push: true,
            sms: false
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        console.log('✅ User preferences created');
      } catch (prefError) {
        console.warn('⚠️ Failed to create user preferences:', prefError);
        // Don't fail registration if preferences creation fails
      }
      
      clearTimeout(timeoutId);
      
      // Show success message with user details
      setSnackbar({ 
        open: true, 
        message: `Registration successful! Welcome ${fullName}. Redirecting to login page...`, 
        severity: 'success' 
      });
      
      console.log(`🎉 Registration completed successfully for ${role}: ${user.email}`);
      
      // Sign out the user after successful registration
      try {
        await auth.signOut();
        console.log('✅ User signed out after registration');
      } catch (signOutError) {
        console.warn('⚠️ Error signing out after registration:', signOutError);
      }
      
      // Redirect to login page with email pre-filled
      setTimeout(() => {
        navigate('/login', { 
          state: { 
            email: email,
            message: `Registration successful! Please login with your new account.`
          },
          replace: true 
        });
      }, 2000);
      
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('❌ Registration error:', error);
      
      let msg = 'Registration failed. Please try again.';
      
      if (error.code === 'auth/email-already-in-use') {
        msg = 'An account with this email already exists. Please use a different email or try logging in.';
      } else if (error.code === 'auth/weak-password') {
        msg = 'Password is too weak. Please choose a stronger password (at least 6 characters).';
      } else if (error.code === 'auth/invalid-email') {
        msg = 'Please enter a valid email address.';
      } else if (error.code === 'auth/network-request-failed') {
        msg = 'Network error. Please check your internet connection and try again.';
      } else if (error.message.includes('Firestore')) {
        msg = 'Failed to save user data. Please try again.';
      }
      
      setSnackbar({ open: true, message: msg, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    setPasswordStrength(getPasswordStrength(newPassword));
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength === 0) return '#e0e0e0';
    if (passwordStrength === 1) return '#ff5722';
    if (passwordStrength === 2) return '#ff9800';
    if (passwordStrength === 3) return '#ffc107';
    return '#4caf50';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength === 0) return 'Very Weak';
    if (passwordStrength === 1) return 'Weak';
    if (passwordStrength === 2) return 'Fair';
    if (passwordStrength === 3) return 'Good';
    return 'Strong';
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      width: '100vw', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundImage: `url(${process.env.PUBLIC_URL + '/2121.jpg'})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      padding: 2
    }}>
      <Box sx={{
        p: 4,
        minWidth: 400,
        maxWidth: 960,
        width: '100%',
        borderRadius: 3,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        color: '#fff',
        textShadow: '0 2px 6px rgba(0,0,0,0.4)',
        backgroundColor: 'transparent',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.35)',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <Avatar sx={{ bgcolor: 'primary.main', width: 64, height: 64, mb: 2 }}>
          <PersonAddAlt1 sx={{ fontSize: 36 }} />
        </Avatar>
        <Typography variant="h4" fontWeight={700} gutterBottom sx={{ mb: 2, color: '#fff' }}>
          Create Account
        </Typography>
        <Typography variant="subtitle1" sx={{ mb: 3, color: '#f1f1f1' }}>Register to get started</Typography>
        <form onSubmit={handleRegister} style={{ width: '100%' }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} fullWidth required size="large" InputProps={{ style: { fontSize: 18, height: 56 } }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Role" select value={role} onChange={e => setRole(e.target.value)} fullWidth required size="large" InputProps={{ style: { fontSize: 18, height: 56 } }}>
                {roles.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Phone Number" value={phone} onChange={e => setPhone(e.target.value)} fullWidth size="large" InputProps={{ style: { fontSize: 18, height: 56 } }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Address" value={address} onChange={e => setAddress(e.target.value)} fullWidth size="large" InputProps={{ style: { fontSize: 18, height: 56 } }} />
            </Grid>
            
            {/* Student-specific fields - only show when role is Student */}
            {role === 'Student' && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField label="Student ID" value={studentId} onChange={e => setStudentId(e.target.value)} fullWidth required size="large" InputProps={{ style: { fontSize: 18, height: 56 } }} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField label="First Name" value={firstName} onChange={handleFirstNameChange} fullWidth required size="large" InputProps={{ style: { fontSize: 18, height: 56 } }} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField label="Last Name" value={lastName} onChange={handleLastNameChange} fullWidth required size="large" InputProps={{ style: { fontSize: 18, height: 56 } }} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField label="Course" select value={course} onChange={e => setCourse(e.target.value)} fullWidth required size="large" InputProps={{ style: { fontSize: 18, height: 56 } }}>
                    {courses.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField label="Year Level" select value={year} onChange={e => setYear(e.target.value)} fullWidth required size="large" InputProps={{ style: { fontSize: 18, height: 56 } }}>
                    {years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField label="Gender" select value={gender} onChange={e => setGender(e.target.value)} fullWidth required size="large" InputProps={{ style: { fontSize: 18, height: 56 } }}>
                    <MenuItem value="Male">Male</MenuItem>
                    <MenuItem value="Female">Female</MenuItem>
                    <MenuItem value="Other">Other</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField label="Birthdate" type="date" value={birthdate} onChange={e => {
                    const v = e.target.value; setBirthdate(v);
                    if (v) {
                      const dob = new Date(v);
                      const diffMs = Date.now() - dob.getTime();
                      const ageDt = new Date(diffMs);
                      const computedAge = Math.abs(ageDt.getUTCFullYear() - 1970);
                      setAge(String(computedAge));
                    } else { setAge(''); }
                  }} fullWidth required size="large" InputLabelProps={{ shrink: true }} InputProps={{ style: { fontSize: 18, height: 56 } }} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField label="Age" value={age} fullWidth size="large" InputProps={{ readOnly: true, style: { fontSize: 18, height: 56 } }} />
                </Grid>
              </>
            )}
            
            {/* Non-student full name field */}
            {role !== 'Student' && (
              <Grid item xs={12}>
                <TextField label="Full Name" value={fullName} onChange={e => setFullName(e.target.value)} fullWidth required size="large" InputProps={{ style: { fontSize: 18, height: 56 } }} />
              </Grid>
            )}
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={handlePasswordChange}
                fullWidth
                required
                size="large"
                InputProps={{
                  style: { fontSize: 18, height: 56 },
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(s => !s)} edge="end">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
              {password && (
                <Box sx={{ mt: 1 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={(passwordStrength / 4) * 100} 
                    sx={{ 
                      height: 4, 
                      borderRadius: 2,
                      bgcolor: '#e0e0e0',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: getPasswordStrengthColor()
                      }
                    }} 
                  />
                  <Typography variant="caption" color="text.secondary">
                    Password strength: {getPasswordStrengthText()}
                  </Typography>
                </Box>
              )}
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Confirm Password"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                fullWidth
                required
                size="large"
                InputProps={{ style: { fontSize: 18, height: 56 } }}
                error={password !== confirmPassword && confirmPassword !== ''}
                helperText={password !== confirmPassword && confirmPassword !== '' ? 'Passwords do not match' : ''}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="profile-pic-upload"
                  type="file"
                  onChange={handleProfilePic}
                />
                <label htmlFor="profile-pic-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<CloudUpload />}
                    disabled={uploading}
                  >
                    {uploading ? 'Processing...' : 'Upload Profile Picture'}
                  </Button>
                </label>
                {profilePicBase64 && (
                  <Avatar src={profilePicBase64} sx={{ width: 40, height: 40 }} />
                )}
                {profilePic && (
                  <Typography variant="caption" color="text.secondary">
                    {profilePic.name} ({(profilePic.size / 1024).toFixed(2)} KB)
                  </Typography>
                )}
              </Box>
              <Typography variant="body2" color="text.secondary">
                Supported formats: JPG, PNG, GIF. Max size: 10MB
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Images will be uploaded to secure cloud storage. Max size: 10MB
              </Typography>
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={terms}
                    onChange={e => setTerms(e.target.checked)}
                    color="primary"
                  />
                }
                label="I agree to the terms and conditions"
              />
            </Grid>
            
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                color="inherit"
                fullWidth
                disabled={loading || !terms}
                sx={{ py: 1.5, fontSize: 18, borderRadius: 2, boxShadow: 2, bgcolor: '#800000', '&:hover': { bgcolor: '#6b0000' } }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Register'}
              </Button>
            </Grid>
          </Grid>
        </form>
        
        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Typography variant="body2" sx={{ color: '#eaeaea' }}>
            Already have an account?{' '}
            <Link component={RouterLink} to="/login" underline="hover" color="#fff" fontWeight={600}>
              Login
            </Link>
          </Typography>
        </Box>
      </Box>
      
      {/* Snackbar for notifications */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
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