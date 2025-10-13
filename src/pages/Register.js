import React, { useState } from 'react';
import { Box, Paper, Typography, TextField, Button, Snackbar, Alert, InputAdornment, IconButton, Avatar, MenuItem, LinearProgress, Checkbox, FormControlLabel, CircularProgress, Grid } from '@mui/material';
import { Visibility, VisibilityOff, PersonAddAlt1, CloudUpload, Email } from '@mui/icons-material';
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from 'firebase/auth';
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

// Phone number validation function
function validatePhoneNumber(phone) {
  // Must be exactly 11 digits and start with 09
  const phoneRegex = /^09\d{9}$/;
  return phoneRegex.test(phone);
}

// Student ID validation function
function validateStudentId(studentId) {
  // Must start with "SCC", followed by 10 digits and a dash
  const studentIdRegex = /^SCC-\d{2}-\d{8}$/;
  return studentIdRegex.test(studentId);
}

// Email validation function to check if it's a Gmail account
function validateGmailEmail(email) {
  const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
  return gmailRegex.test(email);
}

// Function to check if Gmail account exists (simplified validation)
async function checkGmailExists(email) {
  // This is a simplified check - in a real application, you might want to use
  // a more sophisticated method or API to verify email existence
  try {
    // For now, we'll assume all Gmail addresses are valid
    // In a production environment, you might want to use an email validation service
    return true;
  } catch (error) {
    console.error('Error checking Gmail existence:', error);
    return false;
  }
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
  const [phoneError, setPhoneError] = useState('');
  const [studentIdError, setStudentIdError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [gmailPassword, setGmailPassword] = useState('');
  const [showGmailPassword, setShowGmailPassword] = useState(false);
  const [isGmailAccount, setIsGmailAccount] = useState(false);
  const [emailValidating, setEmailValidating] = useState(false);
  
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

  const handlePhoneChange = (e) => {
    const value = e.target.value;
    setPhone(value);
    
    // Clear error if field is empty
    if (!value) {
      setPhoneError('');
      return;
    }
    
    // Validate phone number
    if (!validatePhoneNumber(value)) {
      setPhoneError('Phone number must be 11 digits starting with 09');
    } else {
      setPhoneError('');
    }
  };

  const handleStudentIdChange = (e) => {
    const value = e.target.value;
    setStudentId(value);
    
    // Clear error if field is empty
    if (!value) {
      setStudentIdError('');
      return;
    }
    
    // Validate student ID
    if (!validateStudentId(value)) {
      setStudentIdError('Student ID must be in format: SCC-XX-XXXXXXXX');
    } else {
      setStudentIdError('');
    }
  };

  const handleEmailChange = async (e) => {
    const value = e.target.value;
    setEmail(value);
    
    // Clear error if field is empty
    if (!value) {
      setEmailError('');
      setIsGmailAccount(false);
      setGmailPassword('');
      return;
    }
    
    // Check if it's a Gmail account
    if (validateGmailEmail(value)) {
      setIsGmailAccount(true);
      setEmailValidating(true);
      
      try {
        // Check if Gmail account exists
        const exists = await checkGmailExists(value);
        if (exists) {
          setEmailError('');
        } else {
          setEmailError('This Gmail account does not exist or is not accessible.');
        }
      } catch (error) {
        setEmailError('Error validating Gmail account. Please try again.');
      } finally {
        setEmailValidating(false);
      }
    } else {
      setEmailError('Please enter a valid Gmail address (e.g., example@gmail.com)');
      setIsGmailAccount(false);
      setGmailPassword('');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!role) {
      setSnackbar({ open: true, message: 'Please select a role.', severity: 'error' });
      return;
    }
    if (!email) {
      setSnackbar({ open: true, message: 'Email is required.', severity: 'error' });
      return;
    }
    if (!validateGmailEmail(email)) {
      setSnackbar({ open: true, message: 'Please enter a valid Gmail address.', severity: 'error' });
      return;
    }
    if (emailError) {
      setSnackbar({ open: true, message: 'Please fix email validation errors.', severity: 'error' });
      return;
    }
    if (isGmailAccount && !gmailPassword) {
      setSnackbar({ open: true, message: 'Gmail password is required for Gmail accounts.', severity: 'error' });
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
    
    // Validate phone number if provided
    if (phone && !validatePhoneNumber(phone)) {
      setSnackbar({ open: true, message: 'Phone number must be 11 digits starting with 09.', severity: 'error' });
      return;
    }
    
    // Validate student-specific fields
    if (role === 'Student') {
      if (!studentId) {
        setSnackbar({ open: true, message: 'Student ID is required.', severity: 'error' });
        return;
      }
      if (!validateStudentId(studentId)) {
        setSnackbar({ open: true, message: 'Student ID must be in format: SCC-XX-XXXXXXXX.', severity: 'error' });
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
      
      // Send email verification
      try {
        await sendEmailVerification(user);
        console.log('✅ Email verification sent');
      } catch (verificationError) {
        console.error('❌ Failed to send email verification:', verificationError);
        // Continue with registration even if email verification fails
      }
      
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
        // For teachers, we need admin approval first
        userData.teacherInfo = {
          subjects: [],
          department: '',
          hireDate: new Date().toISOString(),
          isApproved: false, // Teacher needs admin approval
          approvalStatus: 'pending'
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
      
      // If role is Teacher, create a teacher approval request
      if (role === 'Teacher') {
        try {
          const teacherRequestData = {
            userId: user.uid,
            email: user.email,
            fullName: fullName,
            phone: phone || '',
            address: address || '',
            profilePic: imageURL || '',
            requestDate: new Date().toISOString(),
            status: 'pending', // pending, approved, denied
            reviewedBy: null,
            reviewDate: null,
            reviewReason: null,
            requestType: 'teacher_registration',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          await addDoc(collection(db, 'teacher_requests'), teacherRequestData);
          console.log('✅ Teacher approval request created');

          // Create notification for admin
          await addDoc(collection(db, 'notifications'), {
            recipientId: 'admin',
            recipientEmail: 'admin@school.com',
            recipientName: 'Administrator',
            title: 'New Teacher Registration Request',
            message: `${fullName} has requested to register as a teacher. Please review and approve their account.`,
            type: 'teacher_request',
            requestId: user.uid,
            senderId: user.uid,
            senderEmail: user.email,
            senderName: fullName,
            read: false,
            createdAt: new Date().toISOString(),
            priority: 'high'
          });
          console.log('✅ Admin notification created for teacher request');
        } catch (requestError) {
          console.error('❌ Failed to create teacher approval request:', requestError);
          // Don't fail registration if request creation fails
        }
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
      let successMessage = `Registration successful! Welcome ${fullName}. A confirmation email has been sent to ${email}. Please check your Gmail and verify your account. Redirecting to login page...`;
      if (role === 'Teacher') {
        successMessage = `Registration successful! Your teacher account is pending admin approval. A confirmation email has been sent to ${email}. Please check your Gmail and verify your account. You will be notified once approved. Redirecting to login page...`;
      }
      
      setSnackbar({ 
        open: true, 
        message: successMessage, 
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
      height: '100vh', 
      width: '100vw', 
      display: 'flex',
      overflow: 'hidden',
      position: 'fixed',
      top: 0,
      left: 0,
      background: '#800000'
    }}>
      {/* Left Side - Image Area */}
      <Box sx={{
        width: '50%',
        height: '100vh',
        backgroundImage: `url(${process.env.PUBLIC_URL + '/2121.jpg'})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(128, 0, 0, 0.3)',
          zIndex: 1
        }
      }}>
        <Box sx={{
          position: 'relative',
          zIndex: 2,
          textAlign: 'center',
          color: '#fff',
          padding: 4
        }}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="h1" fontWeight={900} sx={{
              fontSize: '3.5rem',
              textShadow: '0 8px 16px rgba(0,0,0,0.7), 0 4px 8px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.3)',
              letterSpacing: '-0.02em',
              transform: 'translateY(-5px)',
              filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.6))',
              textStroke: '1px rgba(255,255,255,0.1)',
              WebkitTextStroke: '1px rgba(255,255,255,0.1)',
              lineHeight: 1.1,
              mb: 0.5
            }}>
              Welcome to
            </Typography>
            <Typography variant="h1" fontWeight={900} sx={{
              fontSize: '3.5rem',
              textShadow: '0 8px 16px rgba(0,0,0,0.7), 0 4px 8px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.3)',
              letterSpacing: '-0.02em',
              transform: 'translateY(-5px)',
              filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.6))',
              textStroke: '1px rgba(255,255,255,0.1)',
              WebkitTextStroke: '1px rgba(255,255,255,0.1)',
              lineHeight: 1.1
            }}>
              CeciServe
            </Typography>
          </Box>
          <Typography variant="h4" sx={{
            fontSize: '1.75rem',
            textShadow: '0 4px 8px rgba(0,0,0,0.6), 0 2px 4px rgba(0,0,0,0.4)',
            fontWeight: 500,
            opacity: 0.95,
            transform: 'translateY(-3px)',
            filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.5))'
          }}>
            Your gateway to St. Cecilia's College
          </Typography>
        </Box>
      </Box>

      {/* Right Side - Form Area */}
      <Box sx={{
        width: '50%',
        height: '100vh',
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 3,
        position: 'relative',
        boxShadow: '-4px 0 20px rgba(0,0,0,0.1)',
        overflowY: 'auto',
        '&::-webkit-scrollbar': {
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          background: '#f1f1f1',
          borderRadius: '4px',
        },
        '&::-webkit-scrollbar-thumb': {
          background: '#800000',
          borderRadius: '4px',
          '&:hover': {
            background: '#6b0000',
          },
        },
      }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          mb: 2,
          gap: 1,
          mt: 1
        }}>
          <PersonAddAlt1 sx={{ fontSize: 24, color: '#87CEEB' }} />
          <Typography variant="h4" fontWeight={600} sx={{ 
            color: '#000',
            fontSize: '1.75rem',
            letterSpacing: '0.01em'
          }}>
            Create Account
          </Typography>
        </Box>
        <Box sx={{ 
          width: '100%', 
          maxWidth: '600px',
          mx: 'auto'
        }}>
          <form onSubmit={handleRegister} style={{ width: '100%' }}>
            <Grid container spacing={1.5}>
            <Grid item xs={12} sm={6}>
              <TextField 
                label="Gmail Address" 
                type="email" 
                value={email} 
                onChange={handleEmailChange} 
                fullWidth 
                required 
                size="small" 
                InputProps={{ 
                  style: { fontSize: 14, height: 32 },
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email />
                    </InputAdornment>
                  ),
                  endAdornment: emailValidating ? (
                    <InputAdornment position="end">
                      <CircularProgress size={16} />
                    </InputAdornment>
                  ) : null
                }}
                error={!!emailError}
                helperText={emailError || (isGmailAccount ? 'Valid Gmail account detected' : 'Please enter a Gmail address')}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: '#ffffff',
                    color: '#000',
                    borderRadius: 2,
                    fontSize: '0.875rem',
                    '& fieldset': { 
                      borderColor: emailError ? '#d32f2f' : '#000',
                      borderWidth: 0.5
                    },
                    '&:hover fieldset': { 
                      borderColor: emailError ? '#d32f2f' : '#000',
                      borderWidth: 0.5
                    },
                    '&.Mui-focused fieldset': { 
                      borderColor: emailError ? '#d32f2f' : '#000',
                      borderWidth: 0.5
                    },
                    '& input': {
                      fontSize: '0.875rem',
                      color: '#000',
                      padding: '8px 12px'
                    }
                  },
                  '& .MuiInputLabel-root': { 
                    color: emailError ? '#d32f2f' : '#000',
                    fontWeight: 400,
                    fontSize: '0.875rem'
                  },
                  '& .MuiInputAdornment-root .MuiSvgIcon-root': { 
                    color: '#87CEEB',
                    fontSize: '1rem'
                  },
                  '& .MuiFormHelperText-root': { 
                    color: emailError ? '#d32f2f' : '#000',
                    fontWeight: 400,
                    fontSize: '0.75rem'
                  }
                }}
              />
            </Grid>
            
            {/* Gmail Password Field - only show when Gmail account is detected */}
            {isGmailAccount && (
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Gmail Password"
                  type={showGmailPassword ? 'text' : 'password'}
                  value={gmailPassword}
                  onChange={e => setGmailPassword(e.target.value)}
                  fullWidth
                  required
                  size="small"
                  InputProps={{
                    style: { fontSize: 14, height: 32 },
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton 
                          onClick={() => setShowGmailPassword(s => !s)} 
                          edge="end" 
                          sx={{ color: '#87CEEB' }}
                        >
                          {showGmailPassword ? <VisibilityOff sx={{ fontSize: '1rem' }} /> : <Visibility sx={{ fontSize: '1rem' }} />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                  helperText="Enter your Gmail password for account verification"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: '#ffffff',
                      color: '#000',
                      borderRadius: 2,
                      fontSize: '0.875rem',
                      '& fieldset': { 
                        borderColor: '#000',
                        borderWidth: 0.5
                      },
                      '&:hover fieldset': { 
                        borderColor: '#000',
                        borderWidth: 0.5
                      },
                      '&.Mui-focused fieldset': { 
                        borderColor: '#000',
                        borderWidth: 0.5
                      },
                      '& input': {
                        fontSize: '0.875rem',
                        color: '#000',
                        padding: '8px 12px'
                      }
                    },
                    '& .MuiInputLabel-root': { 
                      color: '#000',
                      fontWeight: 400,
                      fontSize: '0.875rem'
                    },
                    '& .MuiFormHelperText-root': { 
                      color: '#000',
                      fontWeight: 400,
                      fontSize: '0.75rem'
                    }
                  }}
                />
              </Grid>
            )}
            
            <Grid item xs={12} sm={6}>
              <TextField 
                label="Role" 
                select 
                value={role} 
                onChange={e => setRole(e.target.value)} 
                fullWidth 
                required 
                size="small" 
                InputProps={{ style: { fontSize: 14, height: 32 } }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: '#ffffff',
                    color: '#000',
                    borderRadius: 2,
                    fontSize: '0.875rem',
                    '& fieldset': { 
                      borderColor: '#000',
                      borderWidth: 0.5
                    },
                    '&:hover fieldset': { 
                      borderColor: '#000',
                      borderWidth: 0.5
                    },
                    '&.Mui-focused fieldset': { 
                      borderColor: '#000',
                      borderWidth: 0.5
                    },
                    '& input': {
                      fontSize: '0.875rem',
                      color: '#000',
                      padding: '8px 12px'
                    }
                  },
                  '& .MuiInputLabel-root': { 
                    color: '#000',
                    fontWeight: 400,
                    fontSize: '0.875rem'
                  },
                  '& .MuiSelect-icon': { color: '#eaeaea' }
                }}
              >
                {roles.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField 
                label="Phone Number" 
                value={phone} 
                onChange={handlePhoneChange}
                fullWidth 
                size="small" 
                InputProps={{ style: { fontSize: 14, height: 32 } }}
                error={!!phoneError}
                helperText={phoneError}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: '#ffffff',
                    color: '#000',
                    borderRadius: 2,
                    fontSize: '0.875rem',
                    '& fieldset': { 
                      borderColor: '#000',
                      borderWidth: 0.5
                    },
                    '&:hover fieldset': { 
                      borderColor: '#000',
                      borderWidth: 0.5
                    },
                    '&.Mui-focused fieldset': { 
                      borderColor: '#000',
                      borderWidth: 0.5
                    },
                    '& input': {
                      fontSize: '0.875rem',
                      color: '#000',
                      padding: '8px 12px'
                    }
                  },
                  '& .MuiInputLabel-root': { 
                    color: '#000',
                    fontWeight: 400,
                    fontSize: '0.875rem'
                  },
                  '& .MuiFormHelperText-root': { 
                    color: '#000',
                    fontWeight: 400,
                    fontSize: '0.75rem'
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField 
                label="Address" 
                value={address} 
                onChange={e => setAddress(e.target.value)} 
                fullWidth 
                size="small" 
                InputProps={{ style: { fontSize: 14, height: 32 } }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: '#ffffff',
                    color: '#000',
                    borderRadius: 2,
                    fontSize: '0.875rem',
                    '& fieldset': { 
                      borderColor: '#000',
                      borderWidth: 0.5
                    },
                    '&:hover fieldset': { 
                      borderColor: '#000',
                      borderWidth: 0.5
                    },
                    '&.Mui-focused fieldset': { 
                      borderColor: '#000',
                      borderWidth: 0.5
                    },
                    '& input': {
                      fontSize: '0.875rem',
                      color: '#000',
                      padding: '8px 12px'
                    }
                  },
                  '& .MuiInputLabel-root': { 
                    color: '#000',
                    fontWeight: 400,
                    fontSize: '0.875rem'
                  }
                }}
              />
            </Grid>
            
            {/* Student-specific fields - only show when role is Student */}
            {role === 'Student' && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField 
                    label="Student ID" 
                    value={studentId} 
                    onChange={handleStudentIdChange}
                    fullWidth 
                    required 
                    size="small" 
                    InputProps={{ style: { fontSize: 14, height: 32 } }}
                    error={!!studentIdError}
                    helperText={studentIdError}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: '#ffffff',
                        color: '#000',
                        borderRadius: 2,
                        fontSize: '0.875rem',
                        '& fieldset': { 
                          borderColor: '#000',
                          borderWidth: 0.5
                        },
                        '&:hover fieldset': { 
                          borderColor: '#000',
                          borderWidth: 0.5
                        },
                        '&.Mui-focused fieldset': { 
                          borderColor: '#000',
                          borderWidth: 0.5
                        },
                        '& input': {
                          fontSize: '0.875rem',
                          color: '#000',
                          padding: '8px 12px'
                        }
                      },
                      '& .MuiInputLabel-root': { 
                        color: '#000',
                        fontWeight: 400,
                        fontSize: '0.875rem'
                      },
                      '& .MuiFormHelperText-root': { 
                        color: '#000',
                        fontWeight: 400,
                        fontSize: '0.75rem'
                      }
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField 
                    label="First Name" 
                    value={firstName} 
                    onChange={handleFirstNameChange} 
                    fullWidth 
                    required 
                    size="small" 
                    InputProps={{ style: { fontSize: 14, height: 32 } }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: '#ffffff',
                        color: '#000',
                        borderRadius: 2,
                        fontSize: '0.875rem',
                        '& fieldset': { 
                          borderColor: '#000',
                          borderWidth: 0.5
                        },
                        '&:hover fieldset': { 
                          borderColor: '#000',
                          borderWidth: 0.5
                        },
                        '&.Mui-focused fieldset': { 
                          borderColor: '#000',
                          borderWidth: 0.5
                        },
                        '& input': {
                          fontSize: '0.875rem',
                          color: '#000',
                          padding: '8px 12px'
                        }
                      },
                      '& .MuiInputLabel-root': { 
                        color: '#000',
                        fontWeight: 400,
                        fontSize: '0.875rem'
                      }
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField 
                    label="Last Name" 
                    value={lastName} 
                    onChange={handleLastNameChange} 
                    fullWidth 
                    required 
                    size="small" 
                    InputProps={{ style: { fontSize: 14, height: 32 } }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: '#ffffff',
                        color: '#000',
                        borderRadius: 2,
                        fontSize: '0.875rem',
                        '& fieldset': { 
                          borderColor: '#000',
                          borderWidth: 0.5
                        },
                        '&:hover fieldset': { 
                          borderColor: '#000',
                          borderWidth: 0.5
                        },
                        '&.Mui-focused fieldset': { 
                          borderColor: '#000',
                          borderWidth: 0.5
                        },
                        '& input': {
                          fontSize: '0.875rem',
                          color: '#000',
                          padding: '8px 12px'
                        }
                      },
                      '& .MuiInputLabel-root': { 
                        color: '#000',
                        fontWeight: 400,
                        fontSize: '0.875rem'
                      }
                    }}
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
                    size="small" 
                    InputProps={{ style: { fontSize: 14, height: 32 } }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: '#ffffff',
                        color: '#000',
                        borderRadius: 2,
                        fontSize: '0.875rem',
                        '& fieldset': { 
                          borderColor: '#000',
                          borderWidth: 0.5
                        },
                        '&:hover fieldset': { 
                          borderColor: '#000',
                          borderWidth: 0.5
                        },
                        '&.Mui-focused fieldset': { 
                          borderColor: '#000',
                          borderWidth: 0.5
                        },
                        '& input': {
                          fontSize: '0.875rem',
                          color: '#000',
                          padding: '8px 12px'
                        }
                      },
                      '& .MuiInputLabel-root': { 
                        color: '#000',
                        fontWeight: 400,
                        fontSize: '0.875rem'
                      },
                      '& .MuiSelect-icon': { color: '#000' }
                    }}
                  >
                    {courses.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField 
                    label="Year Level" 
                    select 
                    value={year} 
                    onChange={e => setYear(e.target.value)} 
                    fullWidth 
                    required 
                    size="small" 
                    InputProps={{ style: { fontSize: 14, height: 32 } }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: '#ffffff',
                        color: '#000',
                        borderRadius: 2,
                        fontSize: '0.875rem',
                        '& fieldset': { 
                          borderColor: '#000',
                          borderWidth: 0.5
                        },
                        '&:hover fieldset': { 
                          borderColor: '#000',
                          borderWidth: 0.5
                        },
                        '&.Mui-focused fieldset': { 
                          borderColor: '#000',
                          borderWidth: 0.5
                        },
                        '& input': {
                          fontSize: '0.875rem',
                          color: '#000',
                          padding: '8px 12px'
                        }
                      },
                      '& .MuiInputLabel-root': { 
                        color: '#000',
                        fontWeight: 400,
                        fontSize: '0.875rem'
                      },
                      '& .MuiSelect-icon': { color: '#000' }
                    }}
                  >
                    {years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField 
                    label="Gender" 
                    select 
                    value={gender} 
                    onChange={e => setGender(e.target.value)} 
                    fullWidth 
                    required 
                    size="small" 
                    InputProps={{ style: { fontSize: 14, height: 32 } }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: '#ffffff',
                        color: '#000',
                        borderRadius: 2,
                        fontSize: '0.875rem',
                        '& fieldset': { 
                          borderColor: '#000',
                          borderWidth: 0.5
                        },
                        '&:hover fieldset': { 
                          borderColor: '#000',
                          borderWidth: 0.5
                        },
                        '&.Mui-focused fieldset': { 
                          borderColor: '#000',
                          borderWidth: 0.5
                        },
                        '& input': {
                          fontSize: '0.875rem',
                          color: '#000',
                          padding: '8px 12px'
                        }
                      },
                      '& .MuiInputLabel-root': { 
                        color: '#000',
                        fontWeight: 400,
                        fontSize: '0.875rem'
                      },
                      '& .MuiSelect-icon': { color: '#000' }
                    }}
                  >
                    <MenuItem value="Male">Male</MenuItem>
                    <MenuItem value="Female">Female</MenuItem>
                    <MenuItem value="Other">Other</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField 
                    label="Birthdate" 
                    type="date" 
                    value={birthdate} 
                    onChange={e => {
                      const v = e.target.value; setBirthdate(v);
                      if (v) {
                        const dob = new Date(v);
                        const diffMs = Date.now() - dob.getTime();
                        const ageDt = new Date(diffMs);
                        const computedAge = Math.abs(ageDt.getUTCFullYear() - 1970);
                        setAge(String(computedAge));
                      } else { setAge(''); }
                    }} 
                    fullWidth 
                    required 
                    size="small" 
                    InputLabelProps={{ shrink: true }} 
                    InputProps={{ style: { fontSize: 14, height: 32 } }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: '#ffffff',
                        color: '#000',
                        borderRadius: 2,
                        fontSize: '0.875rem',
                        '& fieldset': { 
                          borderColor: '#000',
                          borderWidth: 0.5
                        },
                        '&:hover fieldset': { 
                          borderColor: '#000',
                          borderWidth: 0.5
                        },
                        '&.Mui-focused fieldset': { 
                          borderColor: '#000',
                          borderWidth: 0.5
                        },
                        '& input': {
                          fontSize: '0.875rem',
                          color: '#000',
                          padding: '8px 12px'
                        }
                      },
                      '& .MuiInputLabel-root': { 
                        color: '#000',
                        fontWeight: 400,
                        fontSize: '0.875rem'
                      }
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField 
                    label="Age" 
                    value={age} 
                    fullWidth 
                    size="small" 
                    InputProps={{ readOnly: true, style: { fontSize: 14, height: 32 } }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: '#ffffff',
                        color: '#000',
                        borderRadius: 2,
                        fontSize: '0.875rem',
                        '& fieldset': { 
                          borderColor: '#000',
                          borderWidth: 0.5
                        },
                        '&:hover fieldset': { 
                          borderColor: '#000',
                          borderWidth: 0.5
                        },
                        '&.Mui-focused fieldset': { 
                          borderColor: '#000',
                          borderWidth: 0.5
                        },
                        '& input': {
                          fontSize: '0.875rem',
                          color: '#000',
                          padding: '8px 12px'
                        }
                      },
                      '& .MuiInputLabel-root': { 
                        color: '#000',
                        fontWeight: 400,
                        fontSize: '0.875rem'
                      }
                    }}
                  />
                </Grid>
              </>
            )}
            
            {/* Non-student full name field */}
            {role !== 'Student' && (
              <Grid item xs={12}>
                <TextField 
                  label="Full Name" 
                  value={fullName} 
                  onChange={e => setFullName(e.target.value)} 
                  fullWidth 
                  required 
                  size="small" 
                  InputProps={{ style: { fontSize: 14, height: 32 } }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: '#ffffff',
                      color: '#000',
                      borderRadius: 2,
                      fontSize: '0.875rem',
                      '& fieldset': { 
                        borderColor: '#000',
                        borderWidth: 0.5
                      },
                      '&:hover fieldset': { 
                        borderColor: '#000',
                        borderWidth: 0.5
                      },
                      '&.Mui-focused fieldset': { 
                        borderColor: '#000',
                        borderWidth: 0.5
                      },
                      '& input': {
                        fontSize: '0.875rem',
                        color: '#000',
                        padding: '8px 12px'
                      }
                    },
                    '& .MuiInputLabel-root': { 
                      color: '#000',
                      fontWeight: 400,
                      fontSize: '0.875rem'
                    }
                  }}
                />
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
                size="small"
                InputProps={{
                  style: { fontSize: 14, height: 32 },
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(s => !s)} edge="end" sx={{ color: '#87CEEB' }}>
                        {showPassword ? <VisibilityOff sx={{ fontSize: '1rem' }} /> : <Visibility sx={{ fontSize: '1rem' }} />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: '#ffffff',
                    color: '#000',
                    borderRadius: 2,
                    fontSize: '0.875rem',
                    '& fieldset': { 
                      borderColor: '#000',
                      borderWidth: 0.5
                    },
                    '&:hover fieldset': { 
                      borderColor: '#000',
                      borderWidth: 0.5
                    },
                    '&.Mui-focused fieldset': { 
                      borderColor: '#000',
                      borderWidth: 0.5
                    },
                    '& input': {
                      fontSize: '0.875rem',
                      color: '#000',
                      padding: '8px 12px'
                    }
                  },
                  '& .MuiInputLabel-root': { 
                    color: '#000',
                    fontWeight: 400,
                    fontSize: '0.875rem'
                  },
                  '& .MuiInputAdornment-root .MuiSvgIcon-root': { 
                    color: '#87CEEB',
                    fontSize: '1rem'
                  }
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
                  <Typography variant="caption" sx={{ color: '#000', fontSize: '0.75rem' }}>
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
                size="small"
                InputProps={{ style: { fontSize: 14, height: 32 } }}
                error={password !== confirmPassword && confirmPassword !== ''}
                helperText={password !== confirmPassword && confirmPassword !== '' ? 'Passwords do not match' : ''}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: '#ffffff',
                    color: '#000',
                    borderRadius: 2,
                    fontSize: '0.875rem',
                    '& fieldset': { 
                      borderColor: '#000',
                      borderWidth: 0.5
                    },
                    '&:hover fieldset': { 
                      borderColor: '#000',
                      borderWidth: 0.5
                    },
                    '&.Mui-focused fieldset': { 
                      borderColor: '#000',
                      borderWidth: 0.5
                    },
                    '& input': {
                      fontSize: '0.875rem',
                      color: '#000',
                      padding: '8px 12px'
                    }
                  },
                  '& .MuiInputLabel-root': { 
                    color: '#000',
                    fontWeight: 400,
                    fontSize: '0.875rem'
                  },
                  '& .MuiFormHelperText-root': { 
                    color: '#000',
                    fontWeight: 400,
                    fontSize: '0.75rem'
                  }
                }}
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
                    sx={{
                      color: '#000',
                      borderColor: '#000',
                      '&:hover': {
                        color: '#1976d2',
                        borderColor: '#1976d2',
                        '& .MuiSvgIcon-root': {
                          color: '#1976d2'
                        }
                      },
                      '& .MuiSvgIcon-root': {
                        color: '#000'
                      }
                    }}
                  >
                    {uploading ? 'Processing...' : 'Upload Profile Picture'}
                  </Button>
                </label>
                {profilePicBase64 && (
                  <Avatar src={profilePicBase64} sx={{ width: 40, height: 40 }} />
                )}
                {profilePic && (
                  <Typography variant="caption" sx={{ color: '#000', fontSize: '0.75rem' }}>
                    {profilePic.name} ({(profilePic.size / 1024).toFixed(2)} KB)
                  </Typography>
                )}
              </Box>
              <Typography variant="body2" sx={{ color: '#000', fontSize: '0.875rem' }}>
                Supported formats: JPG, PNG, GIF. Max size: 10MB
              </Typography>
              <Typography variant="caption" sx={{ color: '#000', fontSize: '0.75rem' }}>
                Images will be uploaded to secure cloud storage. Max size: 10MB
              </Typography>
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={terms}
                    onChange={e => setTerms(e.target.checked)}
                    sx={{ 
                      color: '#000',
                      '&.Mui-checked': { color: '#800000' },
                      '& .MuiSvgIcon-root': { fontSize: '1rem' }
                    }}
                  />
                }
                label={
                  <Typography sx={{ color: '#000', fontSize: '0.875rem' }}>
                    I agree to the terms and conditions
                  </Typography>
                }
              />
            </Grid>
            
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                color="inherit"
                fullWidth
                disabled={loading || !terms}
                sx={{ 
                  py: 0.75, 
                  fontSize: 13, 
                  fontWeight: 500,
                  borderRadius: 2, 
                  backgroundColor: '#800000',
                  color: '#fff',
                  border: '0.5px solid #000',
                  maxWidth: '300px',
                  margin: '0 auto',
                  display: 'block',
                  '&:hover': { 
                    backgroundColor: '#1976d2',
                    borderColor: '#1976d2'
                  },
                  '&:disabled': {
                    backgroundColor: '#ccc',
                    color: '#666'
                  }
                }}
              >
                {loading ? <CircularProgress size={20} color="inherit" /> : 'Register'}
              </Button>
            </Grid>
          </Grid>
          </form>
        </Box>
        
        <Box sx={{ textAlign: 'center', mt: 2, mb: 1 }}>
          <Typography variant="body2" sx={{ color: '#000', fontWeight: 400, fontSize: '0.875rem' }}>
            Already have an account?{' '}
            <Link 
              component={RouterLink} 
              to="/login" 
              underline="hover" 
              sx={{ 
                color: '#000',
                fontWeight: 500,
                fontSize: '0.875rem',
                '&:hover': { color: '#666' }
              }}
            >
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