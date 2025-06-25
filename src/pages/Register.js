import React, { useState } from 'react';
import { Box, Paper, Typography, TextField, Button, Snackbar, Alert, InputAdornment, IconButton, Avatar, MenuItem, LinearProgress, Checkbox, FormControlLabel, CircularProgress, Grid } from '@mui/material';
import { Visibility, VisibilityOff, PersonAddAlt1, CloudUpload } from '@mui/icons-material';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../firebase';
import { addDoc, collection } from 'firebase/firestore';
import { db, storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import Link from '@mui/material/Link';

const roles = ['Student', 'Admin', 'Teacher'];

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
  const [bio, setBio] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [terms, setTerms] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  const handleProfilePic = async (e) => {
    if (e.target.files && e.target.files[0]) {
      setUploading(true);
      const file = e.target.files[0];
      try {
        const storageRef = ref(storage, `profile_pics/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        setProfilePicUrl(url);
        setProfilePic(file);
        setSnackbar({ open: true, message: 'Profile picture uploaded!', severity: 'success' });
      } catch (err) {
        setSnackbar({ open: true, message: 'Failed to upload image', severity: 'error' });
      }
      setUploading(false);
    }
  };

  const handlePasswordChange = (val) => {
    setPassword(val);
    setPasswordStrength(getPasswordStrength(val));
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
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await updateProfile(user, { displayName: fullName, photoURL: profilePicUrl });
      await addDoc(collection(db, 'users'), {
        uid: user.uid,
        fullName,
        email: user.email,
        role,
        profilePic: profilePicUrl,
        phone,
        address,
        bio,
        createdAt: new Date().toISOString(),
      });
      setSnackbar({ open: true, message: 'Registration successful! Redirecting to dashboard...', severity: 'success' });
      setTimeout(() => navigate('/overview'), 1200);
    } catch (error) {
      let msg = error.message;
      if (msg.includes('email-already-in-use')) msg = 'Email already in use.';
      setSnackbar({ open: true, message: msg, severity: 'error' });
    }
    setLoading(false);
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
              <TextField label="Full Name" value={fullName} onChange={e => setFullName(e.target.value)} fullWidth required size="large" InputProps={{ style: { fontSize: 18, height: 56 } }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} fullWidth required size="large" InputProps={{ style: { fontSize: 18, height: 56 } }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Phone Number" value={phone} onChange={e => setPhone(e.target.value)} fullWidth size="large" InputProps={{ style: { fontSize: 18, height: 56 } }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Role" select value={role} onChange={e => setRole(e.target.value)} fullWidth required size="large" InputProps={{ style: { fontSize: 18, height: 56 } }}>
                {roles.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField label="Address" value={address} onChange={e => setAddress(e.target.value)} fullWidth size="large" InputProps={{ style: { fontSize: 18, height: 56 } }} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Short Bio" value={bio} onChange={e => setBio(e.target.value)} fullWidth multiline minRows={2} size="large" InputProps={{ style: { fontSize: 16 } }} />
            </Grid>
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