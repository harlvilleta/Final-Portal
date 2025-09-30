import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  TextField, 
  Button, 
  Snackbar, 
  Alert, 
  InputAdornment, 
  IconButton, 
  Avatar, 
  Checkbox, 
  FormControlLabel, 
  CircularProgress, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  Divider
} from '@mui/material';
import { Visibility, VisibilityOff, LockOutlined, Google as GoogleIcon, Email, Security } from '@mui/icons-material';
import { signInWithEmailAndPassword, sendPasswordResetEmail, setPersistence, browserLocalPersistence, browserSessionPersistence, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, db } from '../firebase';
import { useNavigate, Link as RouterLink, useLocation } from 'react-router-dom';
import Link from '@mui/material/Link';
import { getDoc, doc, setDoc, updateDoc } from 'firebase/firestore';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [rememberMe, setRememberMe] = useState(true);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockout, setLockout] = useState(false);
  const [lockoutTime, setLockoutTime] = useState(0);
  const [formErrors, setFormErrors] = useState({ email: '', password: '' });
  const [googleLoading, setGoogleLoading] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();

  // Check if user is already authenticated and redirect automatically
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        // User is already authenticated, redirect them immediately
        try {
          // Fetch user role from Firestore
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          let userRole = 'Student'; // Default role
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            userRole = userData.role || 'Student';
          }
          
          // Redirect based on role immediately
          if (userRole === 'Admin') {
            navigate('/overview', { replace: true });
          } else if (userRole === 'Teacher') {
            navigate('/teacher-dashboard', { replace: true });
          } else {
            navigate('/user-dashboard', { replace: true });
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
          // Fallback to default redirect
          navigate('/user-dashboard', { replace: true });
        }
      }
    });
    return unsubscribe;
  }, [navigate]);

  // Account lockout timer with countdown
  useEffect(() => {
    let timer;
    if (lockout && lockoutTime > 0) {
      timer = setTimeout(() => {
        setLockoutTime(prev => {
          if (prev <= 1) {
            setLockout(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [lockout, lockoutTime]);

  // Auto-fill email from location state (if redirected from register)
  useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email);
    }
  }, [location.state]);

  // Show registration success message if redirected from register
  useEffect(() => {
    if (location.state?.message) {
      setSnackbar({ 
        open: true, 
        message: location.state.message, 
        severity: 'success' 
      });
      // Clear the state to prevent showing the message again on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Form validation
  const validateForm = () => {
    const errors = {};
    
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email.trim())) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    if (lockout) {
      setSnackbar({ 
        open: true, 
        message: `Account is temporarily locked. Please wait ${lockoutTime} seconds.`, 
        severity: 'error' 
      });
      return;
    }
    
    setLoading(true);
    try {
      // Set persistence based on remember me
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;
      
      console.log('✅ Login successful for:', user.email);
      
      // Fetch user role from Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      let userRole = 'Student'; // Default role
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        userRole = userData.role || 'Student';
        
        // Update last login time
        try {
          await updateDoc(doc(db, 'users', user.uid), {
            lastLogin: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        } catch (updateError) {
          console.warn('Failed to update last login time:', updateError);
        }
      } else {
        // Create default user document if it doesn't exist
        const defaultUserData = {
          email: user.email,
          fullName: user.displayName || user.email,
          role: 'Student',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          uid: user.uid,
          isActive: true,
          registrationMethod: 'email'
        };
        
        try {
          await setDoc(doc(db, 'users', user.uid), defaultUserData);
          console.log('✅ Created default user document');
        } catch (createError) {
          console.warn('Failed to create user document:', createError);
        }
      }
      
      setSnackbar({ 
        open: true, 
        message: `Welcome back! Redirecting to ${userRole} dashboard...`, 
        severity: 'success' 
      });
      
      // Call the onLoginSuccess callback if provided
      if (onLoginSuccess) {
        onLoginSuccess();
      }
      
      // Clear form and reset state
      setEmail('');
      setPassword('');
      setFailedAttempts(0);
      setFormErrors({ email: '', password: '' });
      
      // Redirect based on role immediately
      if (userRole === 'Admin') {
        navigate('/overview', { replace: true });
      } else if (userRole === 'Teacher') {
        navigate('/teacher-dashboard', { replace: true });
      } else {
        navigate('/user-dashboard', { replace: true });
      }
      
    } catch (error) {
      console.error('❌ Login error:', error);
      setFailedAttempts(prev => prev + 1);
      
      let msg = 'Login failed. Please check your credentials.';
      if (error.code === 'auth/user-not-found') {
        msg = 'No account found with this email address.';
      } else if (error.code === 'auth/wrong-password') {
        msg = 'Incorrect password.';
      } else if (error.code === 'auth/too-many-requests') {
        msg = 'Too many login attempts. Please try again later.';
        setLockout(true);
        setLockoutTime(30);
      } else if (error.code === 'auth/user-disabled') {
        msg = 'This account has been disabled.';
      } else if (error.code === 'auth/invalid-email') {
        msg = 'Invalid email address format.';
      } else if (error.code === 'auth/network-request-failed') {
        msg = 'Network error. Please check your internet connection.';
      }
      
      setSnackbar({ open: true, message: msg, severity: 'error' });
      
      // Implement progressive lockout
      if (failedAttempts >= 4) {
        setLockout(true);
        setLockoutTime(30);
        setSnackbar({ 
          open: true, 
          message: 'Too many failed attempts. Account locked for 30 seconds.', 
          severity: 'error' 
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (lockout) {
      setSnackbar({ 
        open: true, 
        message: `Account is temporarily locked. Please wait ${lockoutTime} seconds.`, 
        severity: 'error' 
      });
      return;
    }
    
    setGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      console.log('✅ Google login successful for:', user.email);
      
      // Check if user exists in Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      let userRole = 'Student'; // Default role
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        userRole = userData.role || 'Student';
        
        // Update last login time
        try {
          await updateDoc(doc(db, 'users', user.uid), {
            lastLogin: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        } catch (updateError) {
          console.warn('Failed to update last login time:', updateError);
        }
      } else {
        // Create new user document with default role
        const defaultUserData = {
          email: user.email,
          fullName: user.displayName || user.email,
          role: 'Student',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          uid: user.uid,
          isActive: true,
          registrationMethod: 'google',
          profilePic: user.photoURL || ''
        };
        
        try {
          await setDoc(doc(db, 'users', user.uid), defaultUserData);
          console.log('✅ Created new user document for Google login');
        } catch (createError) {
          console.warn('Failed to create user document:', createError);
        }
      }
      
      setSnackbar({ 
        open: true, 
        message: `Welcome! Redirecting to ${userRole} dashboard...`, 
        severity: 'success' 
      });
      
      // Call the onLoginSuccess callback if provided
      if (onLoginSuccess) {
        onLoginSuccess();
      }
      
      // Clear form and reset state
      setEmail('');
      setPassword('');
      setFailedAttempts(0);
      setFormErrors({ email: '', password: '' });
      
      // Redirect based on role immediately
      if (userRole === 'Admin') {
        navigate('/overview', { replace: true });
      } else if (userRole === 'Teacher') {
        navigate('/teacher-dashboard', { replace: true });
      } else {
        navigate('/user-dashboard', { replace: true });
      }
      
    } catch (error) {
      console.error('❌ Google login error:', error);
      let msg = 'Google login failed. Please try again.';
      if (error.code === 'auth/popup-closed-by-user') {
        msg = 'Login cancelled.';
      } else if (error.code === 'auth/popup-blocked') {
        msg = 'Popup blocked. Please allow popups for this site.';
      } else if (error.code === 'auth/network-request-failed') {
        msg = 'Network error. Please check your internet connection.';
      }
      setSnackbar({ open: true, message: msg, severity: 'error' });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) {
      setSnackbar({ open: true, message: 'Please enter your email address.', severity: 'error' });
      return;
    }
    
    if (!/\S+@\S+\.\S+/.test(forgotEmail.trim())) {
      setSnackbar({ open: true, message: 'Please enter a valid email address.', severity: 'error' });
      return;
    }
    
    setForgotLoading(true);
    try {
      await sendPasswordResetEmail(auth, forgotEmail.trim());
      setSnackbar({ 
        open: true, 
        message: 'Password reset email sent! Check your inbox and spam folder.', 
        severity: 'success' 
      });
      setForgotOpen(false);
      setForgotEmail('');
    } catch (error) {
      console.error('Password reset error:', error);
      let msg = 'Failed to send reset email. Please try again.';
      if (error.code === 'auth/user-not-found') {
        msg = 'No account found with this email address.';
      } else if (error.code === 'auth/invalid-email') {
        msg = 'Invalid email address format.';
      } else if (error.code === 'auth/too-many-requests') {
        msg = 'Too many reset attempts. Please try again later.';
      }
      setSnackbar({ open: true, message: msg, severity: 'error' });
    } finally {
      setForgotLoading(false);
    }
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (formErrors.email) {
      setFormErrors(prev => ({ ...prev, email: '' }));
    }
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (formErrors.password) {
      setFormErrors(prev => ({ ...prev, password: '' }));
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
        width: '100%',
        maxWidth: 520,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        color: '#fff',
        textShadow: '0 2px 6px rgba(0,0,0,0.4)',
        backgroundColor: 'transparent',
        backdropFilter: 'blur(10px)',
        borderRadius: 12,
        boxShadow: '0 8px 40px rgba(0,0,0,0.35)'
      }}>
        <Avatar sx={{ bgcolor: '#800000', width: 64, height: 64, mb: 2, boxShadow: 3 }}>
          <LockOutlined sx={{ fontSize: 36 }} />
        </Avatar>
        <Typography variant="h4" fontWeight={700} gutterBottom sx={{ mb: 2, color: '#fff' }}>
          Welcome Back
        </Typography>
        <Typography variant="subtitle1" sx={{ mb: 3, color: '#f1f1f1' }}>
          Sign in to your account
        </Typography>
        
        {/* Lockout Warning */}
        {lockout && (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            mb: 2, 
            p: 2, 
            bgcolor: 'error.light', 
            borderRadius: 2, 
            width: '100%',
            border: '1px solid',
            borderColor: 'error.main'
          }}>
            <Security sx={{ color: 'error.main', mr: 1 }} />
            <Typography variant="body2" color="error.dark" fontWeight={600}>
              Account locked for {formatTime(lockoutTime)}
            </Typography>
          </Box>
        )}
        


        <form onSubmit={handleLogin} style={{ width: '100%' }}>
          <TextField 
            label="Email" 
            type="email" 
            value={email} 
            onChange={handleEmailChange}
            fullWidth 
            required 
            sx={{ 
              mb: 3,
              '& .MuiOutlinedInput-root': {
                bgcolor: 'rgba(255,255,255,0.12)',
                backdropFilter: 'blur(6px)',
                color: '#fff',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.45)' },
                '&:hover fieldset': { borderColor: '#ffffff' },
                '&.Mui-focused fieldset': { borderColor: '#ffffff' }
              },
              '& .MuiInputLabel-root': { color: '#f0f0f0' },
              '& .MuiInputAdornment-root .MuiSvgIcon-root': { color: '#eaeaea' }
            }} 
            size="large" 
            InputProps={{ 
              style: { fontSize: 18, height: 56 },
              startAdornment: (
                <InputAdornment position="start">
                  <Email />
                </InputAdornment>
              )
            }}
            error={!!formErrors.email}
            helperText={formErrors.email}
            disabled={loading || lockout || googleLoading}
            autoComplete="email"
          />
          
          <TextField
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={handlePasswordChange}
            fullWidth
            required
            sx={{ 
              mb: 2,
              '& .MuiOutlinedInput-root': {
                bgcolor: 'rgba(255,255,255,0.12)',
                backdropFilter: 'blur(6px)',
                color: '#fff',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.45)' },
                '&:hover fieldset': { borderColor: '#ffffff' },
                '&.Mui-focused fieldset': { borderColor: '#ffffff' }
              },
              '& .MuiInputLabel-root': { color: '#f0f0f0' },
              '& .MuiInputAdornment-root .MuiSvgIcon-root': { color: '#eaeaea' }
            }}
            size="large"
            InputProps={{
              style: { fontSize: 18, height: 56 },
              startAdornment: (
                <InputAdornment position="start">
                  <LockOutlined />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton 
                    onClick={() => setShowPassword(s => !s)} 
                    edge="end"
                    disabled={loading || lockout || googleLoading}
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
            error={!!formErrors.password}
            helperText={formErrors.password}
            disabled={loading || lockout || googleLoading}
            autoComplete="current-password"
          />
          
          <FormControlLabel
            control={
              <Checkbox 
                checked={rememberMe} 
                onChange={e => setRememberMe(e.target.checked)} 
                color="primary"
                disabled={loading || lockout || googleLoading}
              />
            }
            label="Remember Me"
            sx={{ mb: 2 }}
          />
          
          <Button 
            type="submit"
            variant="contained" 
            color="inherit" 
            fullWidth 
            disabled={loading || lockout || googleLoading} 
            sx={{ mb: 2, py: 1.5, fontSize: 18, borderRadius: 2, boxShadow: 2, bgcolor: '#800000', '&:hover': { bgcolor: '#6b0000' } }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
          </Button>
        </form>
        
        <Divider sx={{ width: '100%', my: 2 }}>
          <Typography variant="body2" color="text.secondary">OR</Typography>
        </Divider>
        
        <Button 
          onClick={handleGoogleLogin} 
          variant="outlined" 
          color="inherit" 
          fullWidth 
          startIcon={googleLoading ? <CircularProgress size={20} /> : <GoogleIcon />} 
          sx={{ mb: 2, py: 1.5, fontSize: 18, borderRadius: 2, color: '#fff', borderColor: 'rgba(255,255,255,0.6)', '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.08)' } }} 
          disabled={loading || lockout || googleLoading}
          type="button"
        >
          {googleLoading ? 'Signing in...' : 'Sign in with Google'}
        </Button>
        
        <Box sx={{ textAlign: 'right', mb: 2, width: '100%' }}>
          <Link 
            component="button" 
            variant="body2" 
            onClick={() => setForgotOpen(true)} 
            underline="hover" 
            color="#fff"
            disabled={loading || lockout || googleLoading}
            sx={{ cursor: 'pointer' }}
          >
            Forgot password?
          </Link>
        </Box>
        
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Typography variant="body2" sx={{ color: '#eaeaea' }}>
            Don&apos;t have an account?{' '}
            <Link 
              component={RouterLink} 
              to="/register" 
              underline="hover" 
              color="#fff" 
              fontWeight={600}
            >
              Register
            </Link>
          </Typography>
        </Box>
      </Box>
      
      {/* Forgot Password Dialog */}
      <Dialog open={forgotOpen} onClose={() => setForgotOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reset Password</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enter your email address and we'll send you a link to reset your password.
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Email Address"
            type="email"
            fullWidth
            variant="outlined"
            value={forgotEmail}
            onChange={(e) => setForgotEmail(e.target.value)}
            sx={{ mt: 1 }}
            error={forgotEmail && !/\S+@\S+\.\S+/.test(forgotEmail)}
            helperText={forgotEmail && !/\S+@\S+\.\S+/.test(forgotEmail) ? 'Please enter a valid email' : ''}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setForgotOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleForgotPassword} 
            variant="contained" 
            disabled={forgotLoading || !forgotEmail.trim()}
          >
            {forgotLoading ? <CircularProgress size={20} /> : 'Send Reset Email'}
          </Button>
        </DialogActions>
      </Dialog>
      
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