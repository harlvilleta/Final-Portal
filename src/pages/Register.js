import React, { useState } from 'react';
import { Box, Paper, Typography, TextField, Button, Snackbar, Alert, InputAdornment, IconButton, Avatar, MenuItem, LinearProgress, Checkbox, FormControlLabel, CircularProgress, Grid } from '@mui/material';
import { Visibility, VisibilityOff, PersonAddAlt1, CloudUpload } from '@mui/icons-material';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../firebase';
import { setDoc, doc, addDoc, collection } from 'firebase/firestore';
import { db, storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
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

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('Student');
  const [profilePic, setProfilePic] = useState(null);
  const [profilePicUrl, setProfilePicUrl] = useState('');
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
  const [section, setSection] = useState('');
  
  const navigate = useNavigate();

  const handleProfilePic = async (e) => {
    if (e.target.files && e.target.files[0]) {
      setUploading(true);
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        setSnackbar({ open: true, message: 'Please select a valid image file', severity: 'error' });
        setUploading(false);
        return;
      }
      if (file.size > 200 * 1024) {
        setSnackbar({ open: true, message: 'Image file size must be less than 200KB', severity: 'error' });
        setUploading(false);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicUrl(reader.result);
        setProfilePic(file);
        setSnackbar({ open: true, message: 'Profile picture loaded as base64!', severity: 'success' });
        setUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePasswordChange = (val) => {
    setPassword(val);
    setPasswordStrength(getPasswordStrength(val));
  };

  // Update full name when first/last name changes for students
  const handleFirstNameChange = (value) => {
    setFirstName(value);
    if (role === 'Student') {
      setFullName(`${value} ${lastName}`.trim());
    }
  };

  const handleLastNameChange = (value) => {
    setLastName(value);
    if (role === 'Student') {
      setFullName(`${firstName} ${value}`.trim());
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
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
      if (!course || !year || !section) {
        setSnackbar({ open: true, message: 'Course, year, and section are required for students.', severity: 'error' });
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
      console.log('Creating user account...');
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log('User account created successfully:', user.uid);
      
      // Update profile with display name only (no photoURL to avoid length issues)
      try {
        console.log('Updating user profile...');
        await updateProfile(user, { 
          displayName: fullName
          // Don't set photoURL to avoid "Photo URL too long" error
        });
        console.log('User profile updated successfully');
      } catch (profileError) {
        console.error('Error updating user profile:', profileError);
        setSnackbar({ open: true, message: 'Profile update failed, but account was created.', severity: 'warning' });
      }
      
      // Save user data to Firestore
      console.log('Saving user data to Firestore...');
      console.log('Role being saved:', role);
      
      const userData = {
        uid: user.uid,
        email: user.email,
        fullName: fullName,
        role: role,
        phone: phone,
        address: address,
        profilePic: profilePicUrl,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await setDoc(doc(db, 'users', user.uid), userData);
      console.log('User data saved to Firestore successfully');
      
      // If user is a student, also save to students collection
      if (role === 'Student') {
        console.log('Saving student data to students collection...');
        const studentData = {
          uid: user.uid,
          email: user.email,
          firstName: firstName,
          lastName: lastName,
          studentId: studentId,
          course: course,
          year: year,
          section: section,
          phone: phone,
          address: address,
          image: profilePicUrl,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        await addDoc(collection(db, 'students'), studentData);
        console.log('Student data saved to students collection successfully');
      }
      
      console.log('Registration completed successfully, redirecting...');
      
      // Show success message
      setSnackbar({ open: true, message: `Registration successful! Welcome ${fullName}!`, severity: 'success' });
      
      // Wait for the success message to show, then redirect
      setTimeout(() => {
        // Force redirect to root to trigger App.js routing
        window.location.href = '/';
      }, 2000);
      
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Registration error:', error);
      let msg = error.message;
      if (msg.includes('email-already-in-use')) {
        msg = 'Email already in use.';
      } else if (msg.includes('weak-password')) {
        msg = 'Password is too weak. Please choose a stronger password.';
      } else if (msg.includes('invalid-email')) {
        msg = 'Invalid email address.';
      } else if (msg.includes('operation-not-allowed')) {
        msg = 'Email/password accounts are not enabled. Please contact support.';
      } else if (msg.includes('network-request-failed')) {
        msg = 'Network error. Please check your internet connection.';
      }
      setSnackbar({ open: true, message: msg, severity: 'error' });
    } finally {
      clearTimeout(timeoutId);
      console.log('Registration process ended, setting loading to false');
      setLoading(false);
    }
  };

  // Manual reset function in case form gets stuck
  const handleReset = () => {
    setLoading(false);
    setSnackbar({ open: true, message: 'Form reset. You can try submitting again.', severity: 'info' });
  };

  return (
    <Box sx={{ minHeight: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #43cea2 0%, #185a9d 100%)' }}>
      <Paper elevation={6} sx={{
        p: 6,
        minWidth: 400,
        maxWidth: 540,
        width: '100%',
        borderRadius: 5,
        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        bgcolor: 'rgba(255,255,255,0.97)'
      }}>
        <Avatar sx={{ bgcolor: 'success.main', width: 64, height: 64, mb: 2 }}>
          <PersonAddAlt1 sx={{ fontSize: 36 }} />
        </Avatar>
        <Typography variant="h4" fontWeight={700} color="success.main" gutterBottom sx={{ mb: 2 }}>Create Account</Typography>
        <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 3 }}>Register to get started</Typography>
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
            <Grid item xs={12}>
              <TextField label="Address" value={address} onChange={e => setAddress(e.target.value)} fullWidth size="large" InputProps={{ style: { fontSize: 18, height: 56 } }} />
            </Grid>
            
            {/* Student-specific fields - only show when role is Student */}
            {role === 'Student' && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField 
                    label="Student ID" 
                    value={studentId} 
                    onChange={e => setStudentId(e.target.value)} 
                    fullWidth 
                    required 
                    size="large" 
                    InputProps={{ style: { fontSize: 18, height: 56 } }} 
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField 
                    label="Course" 
                    select 
                    value={course} 
                    onChange={e => setCourse(e.target.value)} 
                    fullWidth 
                    required 
                    size="large" 
                    InputProps={{ style: { fontSize: 18, height: 56 } }}
                  >
                    {courses.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField 
                    label="First Name" 
                    value={firstName} 
                    onChange={e => handleFirstNameChange(e.target.value)} 
                    fullWidth 
                    required 
                    size="large" 
                    InputProps={{ style: { fontSize: 18, height: 56 } }} 
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField 
                    label="Last Name" 
                    value={lastName} 
                    onChange={e => handleLastNameChange(e.target.value)} 
                    fullWidth 
                    required 
                    size="large" 
                    InputProps={{ style: { fontSize: 18, height: 56 } }} 
                  />
                </Grid>
                <Grid item xs={12} sm={2}>
                  <TextField 
                    label="Year" 
                    select 
                    value={year} 
                    onChange={e => setYear(e.target.value)} 
                    fullWidth 
                    required 
                    size="large" 
                    InputProps={{ style: { fontSize: 18, height: 56 } }}
                  >
                    {years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={2}>
                  <TextField 
                    label="Section" 
                    value={section} 
                    onChange={e => setSection(e.target.value)} 
                    fullWidth 
                    required 
                    size="large" 
                    InputProps={{ style: { fontSize: 18, height: 56 } }} 
                  />
                </Grid>
              </>
            )}
            
            {/* Non-student fields - show when role is not Student */}
            {role !== 'Student' && (
              <Grid item xs={12}>
                <TextField 
                  label="Full Name" 
                  value={fullName} 
                  onChange={e => setFullName(e.target.value)} 
                  fullWidth 
                  required 
                  size="large" 
                  InputProps={{ style: { fontSize: 18, height: 56 } }} 
                />
              </Grid>
            )}
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => handlePasswordChange(e.target.value)}
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
              <Box sx={{ mt: 1 }}>
                <LinearProgress variant="determinate" value={passwordStrength * 25} sx={{ height: 8, borderRadius: 2, bgcolor: '#eee', '& .MuiLinearProgress-bar': { bgcolor: passwordStrength >= 3 ? 'success.main' : 'warning.main' } }} />
                <Typography variant="caption" color={passwordStrength >= 3 ? 'success.main' : 'warning.main'}>
                  {passwordStrength === 0 ? 'Too short' : passwordStrength === 1 ? 'Weak' : passwordStrength === 2 ? 'Medium' : passwordStrength === 3 ? 'Strong' : 'Very Strong'}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Confirm Password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                fullWidth
                required
                size="large"
                InputProps={{ style: { fontSize: 18, height: 56 } }}
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="outlined"
                component="label"
                fullWidth
                startIcon={<CloudUpload />}
                sx={{ mb: 2, py: 1.5, fontSize: 16, borderRadius: 2 }}
                disabled={uploading}
              >
                {uploading ? <CircularProgress size={20} /> : 'Upload Profile Picture'}
                <input type="file" accept="image/*" hidden onChange={handleProfilePic} />
              </Button>
              {profilePicUrl && (
                <Box sx={{ mb: 2, textAlign: 'center' }}>
                  <Avatar src={profilePicUrl} sx={{ width: 64, height: 64, mx: 'auto' }} />
                  <Typography variant="caption" color="text.secondary">Profile picture uploaded</Typography>
                </Box>
              )}
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={<Checkbox checked={terms} onChange={e => setTerms(e.target.checked)} color="success" />}
                label={<span>I agree to the <Link href="#" underline="hover">Terms & Conditions</Link></span>}
                sx={{ mb: 2 }}
              />
            </Grid>
            <Grid item xs={12}>
              <Button type="submit" variant="contained" color="success" fullWidth disabled={loading} sx={{ mb: 2, py: 1.5, fontSize: 18, borderRadius: 2, boxShadow: 2 }}>
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Register'}
              </Button>
              {loading && (
                <Button 
                  variant="outlined" 
                  color="secondary" 
                  fullWidth 
                  onClick={handleReset}
                  sx={{ mb: 2, py: 1.5, fontSize: 16, borderRadius: 2 }}
                >
                  Reset Form (if stuck)
                </Button>
              )}
            </Grid>
          </Grid>
        </form>
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Already have an account?{' '}
            <Link component={RouterLink} to="/login" underline="hover" color="success.main" fontWeight={600}>
              Login
            </Link>
          </Typography>
        </Box>
      </Paper>
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
} 