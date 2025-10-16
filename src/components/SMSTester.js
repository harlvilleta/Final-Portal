import React, { useState } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  Paper, 
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import { sendSMS, formatPhilippineNumber } from '../utils/smsService';

export default function SMSTester() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('Test SMS from Student Affairs System');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleTestSMS = async () => {
    if (!phoneNumber) {
      setResult({ success: false, error: 'Please enter a phone number' });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      console.log('=== SMS TEST START ===');
      console.log('Original phone number:', phoneNumber);
      
      const formattedNumber = formatPhilippineNumber(phoneNumber);
      console.log('Formatted phone number:', formattedNumber);
      
      const smsResult = await sendSMS(formattedNumber, message);
      console.log('SMS result:', smsResult);
      
      setResult(smsResult);
    } catch (error) {
      console.error('SMS test error:', error);
      setResult({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 3, maxWidth: 600, mx: 'auto', mt: 3 }}>
      <Typography variant="h5" gutterBottom color="primary">
        SMS Testing Tool
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Use this tool to test SMS functionality with Philippine mobile numbers
      </Typography>

      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          label="Philippine Mobile Number"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="09123456789 or +639123456789"
          helperText="Enter a valid Philippine mobile number"
          sx={{ mb: 2 }}
        />
        
        <TextField
          fullWidth
          multiline
          rows={3}
          label="SMS Message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          helperText="Enter the message to send"
          sx={{ mb: 2 }}
        />

        <Button
          variant="contained"
          onClick={handleTestSMS}
          disabled={loading || !phoneNumber}
          fullWidth
          sx={{ mb: 2 }}
        >
          {loading ? (
            <>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              Testing SMS...
            </>
          ) : (
            'Test SMS'
          )}
        </Button>
      </Box>

      {result && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="h6" gutterBottom>
            Test Result:
          </Typography>
          
          {result.success ? (
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="subtitle2">SMS Sent Successfully!</Typography>
              <Typography variant="body2">
                Method: {result.method || 'Unknown'}
              </Typography>
              {result.messageId && (
                <Typography variant="body2">
                  Message ID: {result.messageId}
                </Typography>
              )}
            </Alert>
          ) : (
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="subtitle2">SMS Failed</Typography>
              <Typography variant="body2">
                Error: {result.error || 'Unknown error'}
              </Typography>
            </Alert>
          )}

          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Debug Information:
            </Typography>
            <Box 
              component="pre" 
              sx={{ 
                bgcolor: '#f5f5f5', 
                p: 2, 
                borderRadius: 1, 
                fontSize: '12px',
                overflow: 'auto',
                maxHeight: 200
              }}
            >
              {JSON.stringify(result, null, 2)}
            </Box>
          </Box>
        </>
      )}

      <Divider sx={{ my: 2 }} />
      
      <Typography variant="subtitle2" gutterBottom>
        Instructions:
      </Typography>
      <Typography variant="body2" component="div">
        1. Enter a valid Philippine mobile number (e.g., 09123456789)<br/>
        2. Enter your test message<br/>
        3. Click "Test SMS"<br/>
        4. Check your phone for the SMS<br/>
        5. Check browser console for detailed logs
      </Typography>

      <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
        Troubleshooting:
      </Typography>
      <Typography variant="body2" component="div">
        • Open browser console (F12) to see detailed SMS logs<br/>
        • Make sure the phone number is valid and can receive SMS<br/>
        • Check your internet connection<br/>
        • Try different phone numbers to test
      </Typography>
    </Paper>
  );
}




