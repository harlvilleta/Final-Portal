import React, { useState } from 'react';
import { Box, Paper, Typography, TextField, Button, Snackbar, Alert, InputAdornment, IconButton, Avatar, Checkbox, FormControlLabel, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { Visibility, VisibilityOff, LockOutlined, Google as GoogleIcon } from '@mui/icons-material';
import { signInWithEmailAndPassword, sendPasswordResetEmail, setPersistence, browserLocalPersistence, browserSessionPersistence, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate, Link as RouterLink, useLocation } from 'react-router-dom';
import Link from '@mui/material/Link';

export default function Login() {
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
  const [userInfo, setUserInfo] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Account lockout timer
  React.useEffect(() => {
    let timer;
    if (lockout) {
      timer = setTimeout(() => setLockout(false), 30000);
    }
    return () => clearTimeout(timer);
  }, [lockout]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (lockout) return;
    setLoading(true);
    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      const result = await signInWithEmailAndPassword(auth, email, password);
      setSnackbar({ open: true, message: 'Login successful!', severity: 'success' });
      setUserInfo({ name: result.user.displayName, avatar: result.user.photoURL, email: result.user.email });
      setFailedAttempts(0);
      // Redirect to last visited page or /overview
      const redirectTo = location.state?.from || '/overview';
      setTimeout(() => navigate(redirectTo), 1000);
    } catch (error) {
      setFailedAttempts(f => f + 1);
      if (failedAttempts + 1 >= 5) {
        setLockout(true);
        setSnackbar({ open: true, message: 'Too many failed attempts. Please wait 30 seconds.', severity: 'error' });
      } else {
        let msg = error.message;
        if (msg.includes('user-not-found')) msg = 'No account found for this email.';
        if (msg.includes('wrong-password')) msg = 'Incorrect password.';
        setSnackbar({ open: true, message: msg, severity: 'error' });
      }
    }
    setLoading(false);
  };

  const handleForgot = async () => {
    setForgotLoading(true);
    try {
      await sendPasswordResetEmail(auth, forgotEmail);
      setSnackbar({ open: true, message: 'Password reset email sent!', severity: 'success' });
      setForgotOpen(false);
    } catch (error) {
      let msg = error.message;
      if (msg.includes('user-not-found')) msg = 'No account found for this email.';
      setSnackbar({ open: true, message: msg, severity: 'error' });
    }
    setForgotLoading(false);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      setSnackbar({ open: true, message: 'Login successful!', severity: 'success' });
      setUserInfo({ name: result.user.displayName, avatar: result.user.photoURL, email: result.user.email });
      setFailedAttempts(0);
      const redirectTo = location.state?.from || '/overview';
      setTimeout(() => navigate(redirectTo), 1000);
    } catch (error) {
      setSnackbar({ open: true, message: error.message, severity: 'error' });
    }
    setLoading(false);
  };

  return (
    <Box sx={{ minHeight: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)' }}>
      <Paper elevation={6} sx={{
        p: 6,
        minWidth: 400,
        maxWidth: 480,
        width: '100%',
        borderRadius: 5,
        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        bgcolor: 'rgba(255,255,255,0.95)'
      }}>
        <Avatar sx={{ bgcolor: 'primary.main', width: 64, height: 64, mb: 2 }}>
          <LockOutlined sx={{ fontSize: 36 }} />
        </Avatar>
        <Typography variant="h4" fontWeight={700} color="primary" gutterBottom sx={{ mb: 2 }}>Welcome Back</Typography>
        <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 3 }}>Sign in to your account</Typography>
        {userInfo && (
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Avatar src={userInfo.avatar} sx={{ width: 40, height: 40, mr: 1 }} />
            <Typography variant="body1" fontWeight={600}>{userInfo.name || userInfo.email}</Typography>
          </Box>
        )}
        <form onSubmit={handleLogin} style={{ width: '100%' }}>
          <TextField label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} fullWidth required sx={{ mb: 3 }} size="large" InputProps={{ style: { fontSize: 18, height: 56 } }} />
          <TextField
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            fullWidth
            required
            sx={{ mb: 2 }}
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
          <FormControlLabel
            control={<Checkbox checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} color="primary" />}
            label="Remember Me"
            sx={{ mb: 2 }}
          />
          <Button type="submit" variant="contained" color="primary" fullWidth disabled={loading || lockout} sx={{ mb: 2, py: 1.5, fontSize: 18, borderRadius: 2, boxShadow: 2 }}>
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Login'}
          </Button>
          <Button onClick={handleGoogleLogin} variant="outlined" color="primary" fullWidth startIcon={<GoogleIcon />} sx={{ mb: 2, py: 1.5, fontSize: 18, borderRadius: 2 }} disabled={loading || lockout}>
            Sign in with Google
          </Button>
          <Box sx={{ textAlign: 'right', mb: 2 }}>
            <Link component="button" variant="body2" onClick={() => setForgotOpen(true)} underline="hover" color="primary.main">
              Forgot password?
            </Link>
          </Box>
        </form>
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Don&apos;t have an account?{' '}
            <Link component={RouterLink} to="/register" underline="hover" color="primary.main" fontWeight={600}>
              Register
            </Link>
          </Typography>
        </Box>
      </Paper>
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
      <Dialog open={forgotOpen} onClose={() => setForgotOpen(false)}>
        <DialogTitle>Reset Password</DialogTitle>
        <DialogContent>
          <TextField
            label="Email"
            type="email"
            value={forgotEmail}
            onChange={e => setForgotEmail(e.target.value)}
            fullWidth
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setForgotOpen(false)}>Cancel</Button>
          <Button onClick={handleForgot} disabled={forgotLoading} variant="contained">
            {forgotLoading ? <CircularProgress size={20} /> : 'Send Reset Email'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 