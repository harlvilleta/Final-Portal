import React, { useState } from "react";
import { Typography, Box, Grid, Card, CardActionArea, CardContent, Avatar, Drawer, List, ListItem, ListItemIcon, ListItemText, Divider, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Snackbar, Alert, Tabs, Tab, Paper, Stack } from "@mui/material";
import EmailIcon from '@mui/icons-material/Email';
import SecurityIcon from '@mui/icons-material/Security';
import SettingsIcon from '@mui/icons-material/Settings';
import DeleteIcon from '@mui/icons-material/Delete';
import ListAlt from '@mui/icons-material/ListAlt';
import { useNavigate } from "react-router-dom";
import { getAuth, signOut, updatePassword, updateEmail } from 'firebase/auth';
import Profile from './Profile';
import RecycleBin from './RecycleBin';
import History from './History';
import emailjs from 'emailjs-com';

const options = [
  { label: 'Send Email', icon: <EmailIcon color="primary" fontSize="large" /> },
  { label: 'Security Settings', icon: <SecurityIcon color="error" fontSize="large" /> },
  { label: 'Account Settings', icon: <SettingsIcon color="success" fontSize="large" /> },
  { label: 'Recycle Bin', icon: <DeleteIcon color="warning" fontSize="large" /> },
];

const EMAILJS_SERVICE_ID = 'service_7pgle82';
const EMAILJS_TEMPLATE_ID = 'template_f5q7j6q';
const EMAILJS_USER_ID = 'L77JuF4PF3ZtGkwHm';

export default function Options() {
  const navigate = useNavigate();
  const auth = getAuth();
  const user = auth.currentUser;
  const [openEmail, setOpenEmail] = useState(false);
  const [openSecurity, setOpenSecurity] = useState(false);
  const [openAccount, setOpenAccount] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [emailForm, setEmailForm] = useState({ to: '', subject: '', message: '' });
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '' });
  const [emailChange, setEmailChange] = useState('');
  const [tab, setTab] = useState(0);
  const [emailLoading, setEmailLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [emailChangeLoading, setEmailChangeLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [emailChangeSuccess, setEmailChangeSuccess] = useState(false);

  const handleSendEmail = async (e) => {
    e.preventDefault();
    setEmailLoading(true);
    setSnackbar({ open: false, message: '', severity: 'success' });
    try {
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          to_email: emailForm.to,
          subject: emailForm.subject,
          message: emailForm.message,
        },
        EMAILJS_USER_ID
      );
      setSnackbar({ open: true, message: 'Email sent successfully!', severity: 'success' });
      setOpenEmail(false);
      setEmailForm({ to: '', subject: '', message: '' });
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to send email: ' + (err.text || err.message), severity: 'error' });
    }
    setEmailLoading(false);
  };
  
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordSuccess(false);
    try {
      await updatePassword(user, passwordForm.new);
      setSnackbar({ open: true, message: 'Password changed!', severity: 'success' });
      setPasswordForm({ current: '', new: '' });
      setPasswordSuccess(true);
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    } finally {
      setPasswordLoading(false);
    }
  };
  
  const handleChangeEmail = async (e) => {
    e.preventDefault();
    setEmailChangeLoading(true);
    setEmailChangeSuccess(false);
    try {
      await updateEmail(user, emailChange);
      setSnackbar({ open: true, message: 'Email updated!', severity: 'success' });
      setEmailChange('');
      setEmailChangeSuccess(true);
      setTimeout(() => setEmailChangeSuccess(false), 3000);
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    } finally {
      setEmailChangeLoading(false);
    }
  };
  
  const handleLogout = async () => {
    await signOut(auth);
    window.location.reload();
  };
  
  return (
    <Box sx={{ p: { xs: 1, md: 4 }, maxWidth: 900, mx: 'auto', overflowY: 'auto', bgcolor: '#f5f6fa', borderRadius: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h4" fontWeight={700} color="primary.main">Options</Typography>
        <Button variant="contained" startIcon={<EmailIcon />} onClick={() => setOpenEmail(true)} sx={{ borderRadius: 2, fontWeight: 600 }}>
          Send Email
        </Button>
      </Stack>
      <Paper sx={{ mb: 3, borderRadius: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} centered>
          <Tab label="Account Settings" />
          <Tab label="Recycle Bin" />
          <Tab label="History" />
        </Tabs>
      </Paper>
      {tab === 0 && (
        <Box>
          <Typography variant="h5" gutterBottom>Account Settings</Typography>
          {/* Change Password Section */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6">Change Password</Typography>
            <form onSubmit={handleChangePassword}>
              <TextField label="New Password" type="password" value={passwordForm.new} onChange={e => setPasswordForm(f => ({ ...f, new: e.target.value }))} fullWidth sx={{ mb: 2, maxWidth: 400 }} />
              <Button 
                type="submit" 
                variant="contained" 
                disabled={passwordLoading || passwordSuccess}
                color={passwordSuccess ? "success" : "primary"}
                sx={{
                  transition: 'all 0.3s ease',
                  transform: passwordSuccess ? 'scale(1.05)' : 'scale(1)',
                  boxShadow: passwordSuccess ? '0 4px 12px rgba(76, 175, 80, 0.4)' : '0 2px 8px rgba(25, 118, 210, 0.3)'
                }}
              >
                {passwordLoading ? 'Changing...' : passwordSuccess ? 'Password Changed!' : 'Change Password'}
              </Button>
            </form>
          </Box>
          {/* Change Email Section */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6">Change Email</Typography>
            <form onSubmit={handleChangeEmail}>
              <TextField label="New Email" type="email" value={emailChange} onChange={e => setEmailChange(e.target.value)} fullWidth sx={{ mb: 2, maxWidth: 400 }} />
              <Button 
                type="submit" 
                variant="contained" 
                disabled={emailChangeLoading || emailChangeSuccess}
                color={emailChangeSuccess ? "success" : "primary"}
                sx={{
                  transition: 'all 0.3s ease',
                  transform: emailChangeSuccess ? 'scale(1.05)' : 'scale(1)',
                  boxShadow: emailChangeSuccess ? '0 4px 12px rgba(76, 175, 80, 0.4)' : '0 2px 8px rgba(25, 118, 210, 0.3)'
                }}
              >
                {emailChangeLoading ? 'Updating...' : emailChangeSuccess ? 'Email Updated!' : 'Change Email'}
              </Button>
            </form>
          </Box>
          {/* Change Profile Section */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6">Change Profile</Typography>
            <Profile />
          </Box>
          {/* Change Name Section */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6">Change Name</Typography>
            <TextField label="New Name" value={user?.displayName || ''} fullWidth sx={{ mb: 2, maxWidth: 400 }} disabled />
            {/* Implement name change logic if needed */}
          </Box>
          {/* Security Settings */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6">Security Settings</Typography>
            <Button variant="outlined" color="error" onClick={handleLogout}>Log Out</Button>
          </Box>
        </Box>
      )}
      {tab === 1 && (
        <RecycleBin />
      )}
      {tab === 2 && (
        <Box>
          <Typography variant="h5" gutterBottom>History</Typography>
          <History />
        </Box>
      )}
      <Dialog open={openEmail} onClose={() => setOpenEmail(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Send Email</DialogTitle>
        <DialogContent>
          <form id="send-email-form" onSubmit={handleSendEmail}>
            <TextField label="To" value={emailForm.to} onChange={e => setEmailForm(f => ({ ...f, to: e.target.value }))} fullWidth sx={{ mb: 2, mt: 1 }} />
            <TextField label="Subject" value={emailForm.subject} onChange={e => setEmailForm(f => ({ ...f, subject: e.target.value }))} fullWidth sx={{ mb: 2 }} />
            <TextField label="Message" value={emailForm.message} onChange={e => setEmailForm(f => ({ ...f, message: e.target.value }))} fullWidth multiline minRows={3} sx={{ mb: 2 }} />
          </form>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEmail(false)}>Cancel</Button>
          <Button type="submit" form="send-email-form" variant="contained" disabled={emailLoading}>
            {emailLoading ? 'Sending...' : 'Send'}
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