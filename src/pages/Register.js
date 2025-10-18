import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, TextField, Button, Snackbar, Alert, InputAdornment, IconButton, MenuItem, Grid, FormControl, InputLabel, Select, Avatar } from '@mui/material';
import { Visibility, VisibilityOff, PersonAddAlt1 } from '@mui/icons-material';
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { setDoc, doc, query, collection, getDocs, updateDoc, where, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import Link from '@mui/material/Link';
import { validateStudentIdForRegistration, testStudentIdValidation } from '../utils/studentValidation';

const roles = ['Student', 'Teacher', 'Admin'];

// Email validation function
function validateEmail(email) {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

export default function Register() {
  // Core registration fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('Student');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // Student-specific fields
  const [studentId, setStudentId] = useState('');
  const [studentIdError, setStudentIdError] = useState('');
  
  // Teacher-specific fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  
  const navigate = useNavigate();

  // Ensure clean auth state when component mounts
  useEffect(() => {
    const ensureCleanAuthState = async () => {
      try {
        if (auth.currentUser) {
          await signOut(auth);
        }
      } catch (error) {
        console.log('No user to sign out');
      }
    };
    ensureCleanAuthState();
  }, []);

  // Student ID validation
  const handleStudentIdChange = async (e) => {
    const value = e.target.value;
    setStudentId(value);
    
    if (value) {
      const result = await validateStudentIdForRegistration(value);
      if (!result.isValid) {
        setStudentIdError(result.error);
      } else {
        setStudentIdError('');
      }
    } else {
      setStudentIdError('');
    }
  };

  // Debug function to test validation (temporary)
  const testValidation = async () => {
    if (studentId) {
      console.log("🧪 Testing validation for:", studentId);
      const result = await testStudentIdValidation(studentId);
      console.log("🧪 Test result:", result);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    switch (name) {
      case 'email':
        setEmail(value);
        break;
      case 'password':
        setPassword(value);
        break;
      case 'confirmPassword':
        setConfirmPassword(value);
        break;
      case 'role':
        setRole(value);
        break;
      case 'fullName':
        setFullName(value);
        break;
      case 'phone':
        setPhone(value);
        break;
      case 'address':
        setAddress(value);
        break;
      case 'studentId':
        handleStudentIdChange(e);
        break;
      default:
        break;
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Basic validation
    if (!email || !password || !confirmPassword) {
      setSnackbar({ open: true, message: 'Please fill in all required fields', severity: 'error' });
      setLoading(false);
      return;
    }

    if (!validateEmail(email)) {
      setSnackbar({ open: true, message: 'Please enter a valid email address', severity: 'error' });
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setSnackbar({ open: true, message: 'Passwords do not match', severity: 'error' });
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setSnackbar({ open: true, message: 'Password must be at least 6 characters', severity: 'error' });
      setLoading(false);
      return;
    }

    // Role-specific validation
    if (role === 'Student') {
      if (!studentId) {
        setSnackbar({ open: true, message: 'Please enter your Student ID', severity: 'error' });
        setLoading(false);
        return;
      }
      if (studentIdError) {
        setSnackbar({ open: true, message: 'Please fix the Student ID error', severity: 'error' });
        setLoading(false);
        return;
      }
    }

    if (role === 'Teacher') {
      if (!fullName || !phone || !address) {
        setSnackbar({ open: true, message: 'Please fill in all teacher information', severity: 'error' });
        setLoading(false);
        return;
      }
    }

    try {
      // Create user account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Prepare user data based on role
      let userData = {
        email: email,
        role: role,
        createdAt: new Date().toISOString(),
        isActive: true
      };

      if (role === 'Student') {
        userData = {
          ...userData,
          studentId: studentId,
          displayName: studentId // Use student ID as display name
        };
      } else if (role === 'Teacher') {
        userData = {
          ...userData,
          fullName: fullName,
          phone: phone,
          address: address,
          displayName: fullName,
          teacherInfo: {
            isApproved: false,
            approvalStatus: 'pending',
            approvedBy: null,
            approvedDate: null
          }
        };
      } else if (role === 'Admin') {
        userData = {
          ...userData,
          displayName: email.split('@')[0] // Use email prefix as display name
        };
      }

      // Update Firebase Auth profile
      await updateProfile(user, {
        displayName: userData.displayName
      });

      // Save user data to Firestore
      await setDoc(doc(db, 'users', user.uid), userData);

      // If teacher registered, create a teacher request for admin approval
      if (role === 'Teacher') {
        await addDoc(collection(db, 'teacher_requests'), {
          userId: user.uid,
          email: email,
          fullName: fullName,
          phone: phone,
          address: address,
          status: 'pending',
          requestDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }

      // If student registered, update the student record to mark as registered
      if (role === 'Student' && studentId) {
        try {
          // Find the student record in the students collection
          // Note: In the students collection, the field is called "id", not "studentId"
          const studentsQuery = query(collection(db, "students"), where("id", "==", studentId.trim()));
          const studentsSnapshot = await getDocs(studentsQuery);
          
          if (!studentsSnapshot.empty) {
            // Update the first matching student record
            const studentDoc = studentsSnapshot.docs[0];
            await updateDoc(doc(db, "students", studentDoc.id), {
              isRegistered: true,
              registeredAt: new Date().toISOString(),
              registeredUserId: user.uid,
              email: email
            });
            console.log("✅ Student record updated as registered:", studentId);
          }
        } catch (updateError) {
          console.error("Error updating student record:", updateError);
          // Don't fail registration if student record update fails
        }
      }

      // Send email verification
      await sendEmailVerification(user);

      setSnackbar({ 
        open: true, 
        message: role === 'Teacher' 
          ? 'Registration successful! Your teacher account is pending admin approval. Please check your email to verify your account.' 
          : 'Registration successful! Please check your email to verify your account.', 
        severity: 'success' 
      });

      // Redirect to login after successful registration
      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (error) {
      console.error('Registration error:', error);
      let errorMessage = 'Registration failed. Please try again.';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered. Please use a different email.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please choose a stronger password.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address. Please check your email format.';
      }
      
      setSnackbar({ open: true, message: errorMessage, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

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
              Welcome to CeciServe
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
            width: 50, 
            height: 50, 
            mb: 0.8, 
            boxShadow: '0 8px 32px rgba(128,0,0,0.3)'
          }}>
            <PersonAddAlt1 sx={{ fontSize: 24, color: '#fff' }} />
          </Avatar>
          <Typography variant="h5" fontWeight={600} gutterBottom sx={{ 
            mb: 0.5, 
            color: '#333',
            textAlign: 'center',
            letterSpacing: '-0.02em',
            fontSize: { xs: '1.1rem', sm: '1.3rem', md: '1.4rem' }
          }}>
            Create Account
          </Typography>
          <Typography variant="body2" sx={{ 
            mb: 1, 
            color: '#666',
            textAlign: 'center',
            fontWeight: 400,
            letterSpacing: '0.01em',
            fontSize: '0.85rem'
          }}>
            Join our platform and get started
          </Typography>

        <Box component="form" onSubmit={handleRegister} sx={{ width: '100%', maxWidth: '260px', minWidth: '220px' }}>
            {/* Role Selection */}
            <FormControl fullWidth sx={{ mb: 0.8 }}>
              <InputLabel sx={{ color: '#666', fontWeight: 500, fontSize: '0.8rem' }}>Role</InputLabel>
              <Select
                name="role"
                value={role}
                label="Role"
                onChange={handleChange}
                required
                size="small"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: '#fafafa',
                    color: '#333',
                    borderRadius: 8,
                    height: 32,
                    fontSize: 12,
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
                  }
                }}
              >
                {roles.map((roleOption) => (
                  <MenuItem key={roleOption} value={roleOption} sx={{ fontSize: '0.8rem' }}>
                    {roleOption}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Email */}
            <TextField
              name="email"
              label="Email"
              type="email"
              value={email}
              onChange={handleChange}
              fullWidth
              required
              sx={{ 
                mb: 1.2,
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
                }
              }}
              placeholder="Enter your email"
            />

            {/* Student ID - Only for Students */}
            {role === 'Student' && (
              <TextField
                name="studentId"
                label="Student ID"
                value={studentId}
                onChange={handleChange}
                fullWidth
                required
                error={!!studentIdError}
                helperText={studentIdError || "Enter your Student ID"}
                placeholder="SCC-22-00000000"
                sx={{ 
                  mb: 0.8,
                  '& .MuiOutlinedInput-root': {
                    bgcolor: '#fafafa',
                    color: '#333',
                    borderRadius: 12,
                    height: 32,
                    fontSize: 12,
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
                  }
                }}
              />
            )}

            {/* Teacher Information - Only for Teachers */}
            {role === 'Teacher' && (
              <>
                <TextField
                  name="fullName"
                  label="Full Name"
                  value={fullName}
                  onChange={handleChange}
                  fullWidth
                  required
                  placeholder="Enter your full name"
                  sx={{ 
                    mb: 1.2,
                    '& .MuiOutlinedInput-root': {
                      bgcolor: '#fafafa',
                      color: '#333',
                      borderRadius: 12,
                      height: 32,
                      fontSize: 12,
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
                    fontSize: '0.8rem'
                  }
                  }}
                />
                <TextField
                  name="phone"
                  label="Phone Number"
                  value={phone}
                  onChange={handleChange}
                  fullWidth
                  required
                  placeholder="09XXXXXXXXX"
                  sx={{ 
                    mb: 1.2,
                    '& .MuiOutlinedInput-root': {
                      bgcolor: '#fafafa',
                      color: '#333',
                      borderRadius: 12,
                      height: 32,
                      fontSize: 12,
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
                    fontSize: '0.8rem'
                  }
                  }}
                />
                <TextField
                  name="address"
                  label="Address"
                  value={address}
                  onChange={handleChange}
                  fullWidth
                  required
                  placeholder="Enter your address"
                  sx={{ 
                    mb: 1.2,
                    '& .MuiOutlinedInput-root': {
                      bgcolor: '#fafafa',
                      color: '#333',
                      borderRadius: 12,
                      height: 32,
                      fontSize: 12,
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
                    fontSize: '0.8rem'
                  }
                  }}
                />
              </>
            )}

            {/* Password */}
            <TextField
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={handleChange}
              fullWidth
              required
              sx={{ 
                mb: 1.2,
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
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              placeholder="Enter your password"
            />

            {/* Confirm Password */}
            <TextField
              name="confirmPassword"
              label="Confirm Password"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={handleChange}
              fullWidth
              required
              placeholder="Confirm your password"
              sx={{ 
                mb: 1.2,
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
                }
              }}
            />

            {/* Submit Button */}
              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                sx={{
                  mb: 0.6,
                  height: 32,
                  minHeight: 32,
                  maxHeight: 32,
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 6,
                  boxShadow: '0 2px 8px rgba(128,0,0,0.2)',
                  backgroundColor: '#800000',
                  color: '#fff',
                  padding: '6px 12px',
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
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>

            {/* Login Link */}
            <Box sx={{ textAlign: 'center', mb: 1 }}>
              <Typography variant="body2" sx={{ color: '#666', fontWeight: 400, fontSize: '0.9rem' }}>
                Already have an account?{' '}
                <Link 
                  component={RouterLink} 
                  to="/login" 
                  underline="hover" 
                  sx={{ 
                    color: '#800000',
                    fontWeight: 600,
                    '&:hover': { color: '#6b0000' }
                  }}
                >
                  Sign In.
                </Link>
              </Typography>
            </Box>
        </Box>
      </Box>
      </Box>
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}