import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  CardMedia,
  IconButton,
  Chip,
  Divider
} from '@mui/material';
import {
  CloudUpload,
  Delete,
  Receipt,
  School,
  CheckCircle,
  Error
} from '@mui/icons-material';
import { auth, db } from '../firebase';
import { addDoc, collection, serverTimestamp, getDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

// Function to convert file to base64
const convertToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

const receiptTypes = [
  { value: 'membership', label: 'Membership Fee', icon: '🏛️' },
  { value: 'student_id', label: 'Student ID', icon: '🆔' },
  { value: 'library_card', label: 'Library Card', icon: '📚' },
  { value: 'parking_permit', label: 'Parking Permit', icon: '🚗' },
  { value: 'other', label: 'Other', icon: '📄' }
];

// Function to upload image to Firebase Storage
const uploadImageToStorage = async (file, userId) => {
  const storageRef = ref(storage, `receipt-images/${userId}/${Date.now()}_${file.name}`);
  const snapshot = await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(snapshot.ref);
  return downloadURL;
};

export default function ReceiptSubmission() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [receiptType, setReceiptType] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [receiptImage, setReceiptImage] = useState(null);
  const [receiptBase64, setReceiptBase64] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('Image size should be less than 10MB');
        return;
      }
      
      setReceiptImage(file);
      setUploading(true);
      setError('');
      
      try {
        // Convert to base64 for preview only
        const base64String = await convertToBase64(file);
        setReceiptBase64(base64String);
        setSuccess('Receipt image uploaded successfully!');
      } catch (error) {
        console.error('Error processing image:', error);
        setError('Failed to process image. Please try again.');
        setReceiptImage(null);
      } finally {
        setUploading(false);
      }
    }
  };

  const removeImage = () => {
    setReceiptImage(null);
    setReceiptBase64('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!receiptType) {
      setError('Please select a receipt type');
      return;
    }
    
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    
    if (!receiptBase64) {
      setError('Please upload a receipt image');
      return;
    }
    
    if (!description.trim()) {
      setError('Please provide a description');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      // Get user data from Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      let userData = {};
      if (userDoc.exists()) {
        userData = userDoc.data();
      }
      
      // Upload image to Firebase Storage if provided
      let imageURL = '';
      if (receiptImage) {
        try {
          imageURL = await uploadImageToStorage(receiptImage, user.uid);
          console.log('✅ Receipt image uploaded to Storage:', imageURL);
        } catch (uploadError) {
          console.error('❌ Image upload error:', uploadError);
          // Continue with submission even if image upload fails
        }
      }
      
      const submissionData = {
        userId: user.uid,
        userEmail: user.email,
        userName: userData.fullName || user.displayName || 'Unknown',
        userRole: userData.role || 'Student',
        receiptType: receiptType,
        amount: parseFloat(amount),
        description: description.trim(),
        receiptImage: imageURL || '', // Save Storage URL instead of base64
        receiptImageType: receiptImage.type,
        receiptImageName: receiptImage.name,
        receiptImageSize: receiptImage.size,
        status: 'pending', // pending, approved, rejected
        submittedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        adminNotes: '',
        reviewedBy: '',
        reviewedAt: null
      };
      
      // Add student-specific info if available
      if (userData.studentInfo) {
        submissionData.studentInfo = {
          studentId: userData.studentInfo.studentId,
          course: userData.studentInfo.course,
          year: userData.studentInfo.year,
          section: userData.studentInfo.section
        };
      }
      
      // Save to Firestore
      const docRef = await addDoc(collection(db, 'receipt_submissions'), submissionData);
      
      console.log('✅ Receipt submission saved:', docRef.id);
      
      // Log activity
      try {
        await addDoc(collection(db, 'activity_log'), {
          message: `Receipt submission: ${receiptType} - $${amount}`,
          type: 'receipt_submission',
          user: user.uid,
          userEmail: user.email,
          userRole: userData.role || 'Student',
          timestamp: new Date().toISOString(),
          details: {
            submissionId: docRef.id,
            receiptType,
            amount: parseFloat(amount),
            hasImage: !!imageURL, // Check if imageURL is not empty
            imageSize: receiptImage ? `${(receiptImage.size / 1024).toFixed(2)} KB` : 'N/A'
          }
        });
      } catch (logError) {
        console.warn('Failed to log activity:', logError);
      }
      
      setSuccess('Receipt submitted successfully! Admin will review and update the status.');
      setSubmitted(true);
      
      // Reset form
      setReceiptType('');
      setAmount('');
      setDescription('');
      setReceiptImage(null);
      setReceiptBase64('');
      
    } catch (error) {
      console.error('Error submitting receipt:', error);
      setError('Failed to submit receipt. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSubmitted(false);
    setReceiptType('');
    setAmount('');
    setDescription('');
    setReceiptImage(null);
    setReceiptBase64('');
    setError('');
    setSuccess('');
  };

  if (submitted) {
    return (
      <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
          <Typography variant="h4" gutterBottom color="success.main">
            Receipt Submitted Successfully!
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Your receipt has been submitted and is pending admin review. 
            You will be notified once the admin reviews your submission.
          </Typography>
          <Button
            variant="contained"
            onClick={resetForm}
            size="large"
          >
            Submit Another Receipt
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Paper sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Receipt sx={{ fontSize: 32, color: 'primary.main', mr: 2 }} />
          <Typography variant="h4" color="primary">
            Receipt Submission
          </Typography>
        </Box>
        
        <Typography variant="body1" sx={{ mb: 3 }}>
          Submit receipt images for membership fees, student ID, or other school-related payments. 
          Admins will review and approve your submissions.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {success}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Receipt Type</InputLabel>
                <Select
                  value={receiptType}
                  onChange={(e) => setReceiptType(e.target.value)}
                  label="Receipt Type"
                >
                  {receiptTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ marginRight: 8 }}>{type.icon}</span>
                        {type.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Amount ($)"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                fullWidth
                required
                inputProps={{ min: 0, step: 0.01 }}
                placeholder="0.00"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                fullWidth
                required
                multiline
                rows={3}
                placeholder="Describe what this receipt is for..."
              />
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ border: '2px dashed #ccc', borderRadius: 2, p: 3, textAlign: 'center' }}>
                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="receipt-upload"
                  type="file"
                  onChange={handleImageUpload}
                />
                <label htmlFor="receipt-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<CloudUpload />}
                    disabled={uploading}
                    size="large"
                  >
                    {uploading ? 'Processing...' : 'Upload Receipt Image'}
                  </Button>
                </label>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Supported formats: JPG, PNG, GIF. Max size: 10MB
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Images will be uploaded to secure cloud storage. Max size: 10MB
                </Typography>
              </Box>
            </Grid>

            {receiptBase64 && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6" sx={{ flex: 1 }}>
                        Receipt Preview
                      </Typography>
                      <IconButton onClick={removeImage} color="error">
                        <Delete />
                      </IconButton>
                    </Box>
                    <CardMedia
                      component="img"
                      image={receiptBase64}
                      alt="Receipt"
                      sx={{ 
                        height: 200, 
                        objectFit: 'contain',
                        borderRadius: 1,
                        border: '1px solid #ddd'
                      }}
                    />
                    <Box sx={{ mt: 2 }}>
                      <Chip 
                        label={`${receiptImage.name} (${(receiptImage.size / 1024).toFixed(2)} KB)`}
                        size="small"
                        color="primary"
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )}

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  onClick={resetForm}
                  disabled={loading}
                >
                  Reset
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading || !receiptType || !amount || !receiptBase64 || !description.trim()}
                  startIcon={loading ? <CircularProgress size={20} /> : <School />}
                  size="large"
                >
                  {loading ? 'Submitting...' : 'Submit Receipt'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
} 