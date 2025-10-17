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
  DialogActions
} from '@mui/material';
import { Visibility, VisibilityOff, LockOutlined, Email, Security } from '@mui/icons-material';
import { signInWithEmailAndPassword, sendPasswordResetEmail, setPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth';
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
  
  const navigate = useNavigate();
  const location = useLocation();

  // Initialize form states on component mount - ALWAYS ENABLE FORM
  useEffect(() => {
    // Force enable form immediately when component mounts
    setLoading(false);
    setLockout(false);
    setLockoutTime(0);
    setFormErrors({ email: '', password: '' });
    console.log('✅ Login component mounted - form FORCE ENABLED');
  }, []);

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
            
            // Check if teacher is approved
            if (userRole === 'Teacher') {
              const teacherInfo = userData.teacherInfo || {};
              if (!teacherInfo.isApproved || teacherInfo.approvalStatus !== 'approved') {
                // Sign out the user if not approved
                await auth.signOut();
                return;
              }
            }
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
      } else {
        // User is not authenticated - FORCE ENABLE FORM
        setLoading(false);
        setLockout(false);
        setLockoutTime(0);
        console.log('✅ User not authenticated - form FORCE ENABLED');
      }
    });
    return unsubscribe;
  }, [navigate]);

  // Additional safety: Force enable form every 2 seconds if it gets stuck
  useEffect(() => {
    const interval = setInterval(() => {
      if (loading || lockout) {
        console.log('⚠️ Form appears stuck, checking states...', { loading, lockout });
        // Only reset if we're not actually in a legitimate loading state
        if (!loading) {
          setLockout(false);
          setLockoutTime(0);
          console.log('🔧 Auto-reset lockout state');
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [loading, lockout]);

  // Keyboard shortcut to force enable form (Ctrl+Shift+E)
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'E') {
        event.preventDefault();
        forceEnableForm();
        console.log('🔧 Form force enabled via keyboard shortcut (Ctrl+Shift+E)');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  // Initialize component state on mount
  useEffect(() => {
    // Ensure all loading states are properly initialized
    setLoading(false);
    setLockout(false);
    setLockoutTime(0);
  }, []);

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
        
        // Check if teacher is approved
        if (userRole === 'Teacher') {
          const teacherInfo = userData.teacherInfo || {};
          if (!teacherInfo.isApproved || teacherInfo.approvalStatus !== 'approved') {
            // Sign out the user and show error message
            await auth.signOut();
            setSnackbar({ 
              open: true, 
              message: 'Your teacher account is still pending admin approval. Please wait for approval before logging in.', 
              severity: 'error' 
            });
            return;
          }
        }
        
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

  // PERMANENT FIX: Always enable form unless actively loading
  const isFormDisabled = loading; // Removed lockout from disabled logic
  
  // Force enable function for debugging
  const forceEnableForm = () => {
    setLoading(false);
    setLockout(false);
    setLockoutTime(0);
    setFormErrors({ email: '', password: '' });
    console.log('🔧 Form force enabled manually');
  };

  // Complete form reset function
  const resetFormCompletely = () => {
    setEmail('');
    setPassword('');
    setLoading(false);
    setLockout(false);
    setLockoutTime(0);
    setFormErrors({ email: '', password: '' });
    setShowPassword(false);
    setRememberMe(true);
    setFailedAttempts(0);
    console.log('🔄 Form completely reset');
  };
  
  // Debug logging with more detail
  console.log('🔍 Login form state:', { 
    loading, 
    lockout, 
    isFormDisabled,
    email: email.length > 0 ? 'has value' : 'empty',
    password: password.length > 0 ? 'has value' : 'empty',
    timestamp: new Date().toISOString()
  });

  return (
    <Box sx={{ 
      height: '100vh',
      width: '100vw',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f5f5f5',
      overflow: 'hidden',
      position: 'fixed',
      top: 0,
      left: 0
    }}>
      {/* Main Container */}
      <Box sx={{
        width: '100%',
        maxWidth: { xs: '100%', sm: '700px', md: '800px', lg: '900px' },
        height: { xs: '100vh', sm: '80vh', md: '500px' },
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        borderRadius: { xs: 0, md: 3 },
        overflow: 'hidden',
        boxShadow: { xs: 'none', md: '0 10px 40px rgba(0,0,0,0.1)' },
        backgroundColor: '#ffffff',
        border: { xs: 'none', md: '1px solid #e0e0e0' }
      }}>
        {/* Left Side - Image Area (50%) */}
        <Box sx={{
          width: { xs: '100%', md: '50%' },
          height: { xs: '50vh', md: '100%' },
          backgroundImage: `url(${process.env.PUBLIC_URL + '/2121.jpg'})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          flex: '0 0 50%',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(128, 0, 0, 0.5)',
            zIndex: 1
          }
        }}>
          <Box sx={{
            position: 'relative',
            zIndex: 2,
            textAlign: 'center',
            color: '#fff',
            padding: { xs: 2, md: 4 },
            width: '100%',
            maxWidth: '500px'
          }}>
            <Typography variant="h3" fontWeight={700} sx={{
              mb: 2,
              textShadow: '0 4px 8px rgba(0,0,0,0.5)',
              letterSpacing: '-0.02em',
              fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' },
              lineHeight: 1.2
            }}>
              Welcome Back to CeciServe
            </Typography>
            <Typography variant="h6" sx={{
              textShadow: '0 2px 4px rgba(0,0,0,0.5)',
              fontWeight: 400,
              opacity: 0.9,
              fontSize: { xs: '1rem', sm: '1.1rem', md: '1.2rem' },
              lineHeight: 1.4
            }}>
              Your gateway to St. Cecilia's College
            </Typography>
          </Box>
        </Box>

        {/* Right Side - Form Area (50%) */}
        <Box sx={{
          width: { xs: '100%', md: '50%' },
          height: { xs: '50vh', md: '100%' },
          backgroundColor: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: { xs: 2, sm: 3, md: 4 },
          position: 'relative',
          overflow: 'hidden',
          flex: '0 0 50%'
        }}>
        <Avatar sx={{ 
          bgcolor: '#800000', 
          width: 60, 
          height: 60, 
          mb: 1.5, 
          boxShadow: '0 8px 32px rgba(128,0,0,0.3)'
        }}>
          <LockOutlined sx={{ fontSize: 30, color: '#fff' }} />
        </Avatar>
        <Typography variant="h5" fontWeight={600} gutterBottom sx={{ 
          mb: 1, 
          color: '#333',
          textAlign: 'center',
          letterSpacing: '-0.02em',
          fontSize: { xs: '1.3rem', sm: '1.5rem', md: '1.7rem' }
        }}>
          Welcome Back
        </Typography>
        <Typography variant="body2" sx={{ 
          mb: 2, 
          color: '#666',
          textAlign: 'center',
          fontWeight: 400,
          letterSpacing: '0.01em'
        }}>
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
        


        <form onSubmit={handleLogin} style={{ width: '100%', maxWidth: '300px', minWidth: '260px' }}>
          <TextField 
            label="Email" 
            type="email" 
            value={email} 
            onChange={handleEmailChange}
            fullWidth 
            required 
            sx={{ 
              mb: 1.5,
              '& .MuiOutlinedInput-root': {
                bgcolor: '#fafafa',
                color: '#333',
                borderRadius: 12,
                height: 44,
                fontSize: 15,
                '& fieldset': { 
                  borderColor: '#e0e0e0',
                  borderWidth: 1
                },
                '&:hover fieldset': { 
                  borderColor: '#800000',
                  borderWidth: 1
                },
                '&.Mui-focused fieldset': { 
                  borderColor: '#800000',
                  borderWidth: 2
                },
                '&.Mui-focused': { 
                  boxShadow: '0 0 0 3px rgba(128,0,0,0.1)'
                }
              },
              '& .MuiInputLabel-root': { 
                color: '#666',
                fontWeight: 500,
                fontSize: '0.95rem'
              },
              '& .MuiInputAdornment-root .MuiSvgIcon-root': { 
                color: '#800000' 
              }
            }} 
            size="medium" 
            InputProps={{ 
              startAdornment: (
                <InputAdornment position="start">
                  <Email />
                </InputAdornment>
              )
            }}
            error={!!formErrors.email}
            helperText={formErrors.email}
            disabled={isFormDisabled}
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
              mb: 1.5,
              '& .MuiOutlinedInput-root': {
                bgcolor: '#fafafa',
                color: '#333',
                borderRadius: 12,
                height: 44,
                fontSize: 15,
                '& fieldset': { 
                  borderColor: '#e0e0e0',
                  borderWidth: 1
                },
                '&:hover fieldset': { 
                  borderColor: '#800000',
                  borderWidth: 1
                },
                '&.Mui-focused fieldset': { 
                  borderColor: '#800000',
                  borderWidth: 2
                },
                '&.Mui-focused': { 
                  boxShadow: '0 0 0 3px rgba(128,0,0,0.1)'
                }
              },
              '& .MuiInputLabel-root': { 
                color: '#666',
                fontWeight: 500,
                fontSize: '0.95rem'
              },
              '& .MuiInputAdornment-root .MuiSvgIcon-root': { 
                color: '#800000' 
              }
            }}
            size="medium"
            InputProps={{
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
                    disabled={isFormDisabled}
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
            error={!!formErrors.password}
            helperText={formErrors.password}
            disabled={isFormDisabled}
            autoComplete="current-password"
          />
          
          <FormControlLabel
            control={
              <Checkbox 
                checked={rememberMe} 
                onChange={e => setRememberMe(e.target.checked)} 
                color="primary"
                disabled={isFormDisabled}
              />
            }
            label="Remember Me"
            sx={{ mb: 1 }}
          />
          
          <Button 
            type="submit"
            variant="contained" 
            fullWidth 
            disabled={isFormDisabled} 
            sx={{ 
              mb: 1, 
              height: 44,
              minHeight: 44,
              maxHeight: 44,
              fontSize: 14, 
              fontWeight: 600,
              borderRadius: 8, 
              boxShadow: '0 2px 8px rgba(128,0,0,0.2)',
              backgroundColor: '#800000',
              color: '#fff',
              padding: '10px 16px',
              textTransform: 'none',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              '&:hover': { 
                backgroundColor: '#6b0000',
                boxShadow: '0 4px 12px rgba(128,0,0,0.3)',
                transform: 'translateY(-1px)'
              },
              '&:disabled': {
                backgroundColor: '#ccc',
                color: '#666'
              },
              transition: 'all 0.2s ease'
            }}
          >
            {loading ? <CircularProgress size={20} color="inherit" /> : 'Sign In'}
          </Button>
        </form>
        
        
        <Box sx={{ textAlign: 'center', mb: 1 }}>
          <Typography variant="body2" sx={{ color: '#666', fontWeight: 400, fontSize: '0.9rem' }}>
            Don&apos;t have an account?{' '}
            <Link 
              component={RouterLink} 
              to="/register" 
              underline="hover" 
              sx={{ 
                color: '#800000',
                fontWeight: 600,
                '&:hover': { color: '#6b0000' }
              }}
            >
              Register.
            </Link>
          </Typography>
        </Box>
        
        <Box sx={{ textAlign: 'center', width: '100%' }}>
          <Link 
            component="button" 
            variant="body2" 
            onClick={() => setForgotOpen(true)} 
            underline="hover" 
            sx={{ 
              color: '#800000',
              fontWeight: 500,
              cursor: 'pointer',
              fontSize: '0.9rem',
              '&:hover': { color: '#6b0000' },
              disabled: isFormDisabled
            }}
          >
            Forgot password?
          </Link>
        </Box>
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