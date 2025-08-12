import React, { useState } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Button, 
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import { auth, db } from '../firebase';
import { addDoc, collection, getDocs, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';

export default function FirebaseRulesChecker() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const addResult = (message, type = 'info') => {
    setResults(prev => [...prev, { message, type, timestamp: new Date().toISOString() }]);
  };

  const checkAuthentication = () => {
    const user = auth.currentUser;
    if (user) {
      addResult(`✅ User authenticated: ${user.email} (${user.uid})`, 'success');
      setCurrentUser(user);
    } else {
      addResult('❌ No user authenticated', 'error');
      setCurrentUser(null);
    }
  };

  const testReadPermission = async () => {
    setLoading(true);
    addResult('🔍 Testing read permissions...', 'info');
    
    try {
      // Test reading from users collection
      const usersSnapshot = await getDocs(collection(db, 'users'));
      addResult(`✅ Read permission granted - Found ${usersSnapshot.docs.length} users`, 'success');
    } catch (error) {
      addResult(`❌ Read permission denied: ${error.code}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const testWritePermission = async () => {
    setLoading(true);
    addResult('🔍 Testing write permissions...', 'info');
    
    try {
      const testDocId = `test_${Date.now()}`;
      const testData = {
        test: true,
        timestamp: new Date().toISOString(),
        createdBy: currentUser?.uid || 'anonymous'
      };
      
      // Test writing to test collection
      await setDoc(doc(db, 'test_rules', testDocId), testData);
      addResult('✅ Write permission granted', 'success');
      
      // Clean up test document
      await deleteDoc(doc(db, 'test_rules', testDocId));
      addResult('✅ Test document cleaned up', 'success');
      
    } catch (error) {
      addResult(`❌ Write permission denied: ${error.code} - ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const testUserWritePermission = async () => {
    if (!currentUser) {
      addResult('❌ Must be authenticated to test user write permissions', 'error');
      return;
    }
    
    setLoading(true);
    addResult('🔍 Testing user document write permissions...', 'info');
    
    try {
      const testUserData = {
        email: 'test@example.com',
        fullName: 'Test User',
        role: 'Student',
        createdAt: new Date().toISOString(),
        uid: currentUser.uid,
        isActive: true,
        registrationMethod: 'test'
      };
      
      // Test writing to users collection with authenticated user's UID
      await setDoc(doc(db, 'users', currentUser.uid), testUserData);
      addResult('✅ User document write permission granted', 'success');
      
      // Clean up test document
      await deleteDoc(doc(db, 'users', currentUser.uid));
      addResult('✅ Test user document cleaned up', 'success');
      
    } catch (error) {
      addResult(`❌ User write permission denied: ${error.code} - ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const runFullDiagnostic = async () => {
    setResults([]);
    addResult('🚀 Starting Firebase Rules Diagnostic...', 'info');
    
    // Check authentication
    checkAuthentication();
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Test read permissions
    await testReadPermission();
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Test write permissions
    await testWritePermission();
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Test user write permissions if authenticated
    if (currentUser) {
      await testUserWritePermission();
    }
    
    addResult('🏁 Firebase Rules Diagnostic completed!', 'info');
  };

  const clearResults = () => {
    setResults([]);
  };

  const getRecommendedRules = () => {
    return `
// Firestore Security Rules - Recommended for your app
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to read and write their own documents
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow create: if request.auth != null;
    }
    
    // Allow authenticated users to read all users (for admin purposes)
    match /users/{document=**} {
      allow read: if request.auth != null;
    }
    
    // Allow authenticated users to write to activity_log
    match /activity_log/{document} {
      allow read, write: if request.auth != null;
    }
    
    // Allow authenticated users to write to user_preferences
    match /user_preferences/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow authenticated users to write to test collections
    match /test_*/{document} {
      allow read, write: if request.auth != null;
    }
    
    // Deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
    `.trim();
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1000, mx: 'auto' }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom color="primary">
          🔒 Firebase Security Rules Checker
        </Typography>
        
        <Typography variant="body1" sx={{ mb: 3 }}>
          This tool helps diagnose Firebase security rules issues that might prevent data storage.
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
            <Button
              variant="contained"
              onClick={runFullDiagnostic}
              disabled={loading}
              size="large"
            >
              {loading ? <CircularProgress size={20} /> : '🚀 Run Full Diagnostic'}
            </Button>
            
            <Button
              variant="outlined"
              onClick={checkAuthentication}
              disabled={loading}
              size="large"
            >
              🔐 Check Auth
            </Button>
            
            <Button
              variant="outlined"
              onClick={testReadPermission}
              disabled={loading}
              size="large"
            >
              📖 Test Read
            </Button>
            
            <Button
              variant="outlined"
              onClick={testWritePermission}
              disabled={loading}
              size="large"
            >
              ✏️ Test Write
            </Button>
            
            <Button
              variant="outlined"
              color="error"
              onClick={clearResults}
              size="large"
            >
              🗑️ Clear
            </Button>
          </Box>
          
          {currentUser && (
            <Alert severity="success" sx={{ mb: 2 }}>
              <strong>Authenticated as:</strong> {currentUser.email} ({currentUser.uid})
            </Alert>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Results */}
        <Typography variant="h6" gutterBottom>
          Diagnostic Results:
        </Typography>

        <List sx={{ maxHeight: 400, overflow: 'auto', bgcolor: '#f5f5f5', borderRadius: 1 }}>
          {results.map((result, index) => (
            <ListItem key={index} sx={{ 
              bgcolor: result.type === 'error' ? '#ffebee' : 
                       result.type === 'success' ? '#e8f5e8' : 
                       result.type === 'warning' ? '#fff3e0' : '#f5f5f5',
              mb: 1,
              borderRadius: 1
            }}>
              <ListItemText
                primary={result.message}
                secondary={new Date(result.timestamp).toLocaleTimeString()}
                primaryTypographyProps={{
                  color: result.type === 'error' ? 'error.main' : 
                         result.type === 'success' ? 'success.main' : 
                         result.type === 'warning' ? 'warning.main' : 'text.primary'
                }}
              />
            </ListItem>
          ))}
        </List>

        {results.length === 0 && !loading && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            Click "Run Full Diagnostic" to start testing Firebase security rules.
          </Typography>
        )}

        {/* Recommended Rules */}
        <Divider sx={{ my: 2 }} />
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="h6">
              🔧 Recommended Firestore Security Rules
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" component="pre" sx={{ 
              bgcolor: '#f5f5f5', 
              p: 2, 
              borderRadius: 1, 
              overflow: 'auto',
              fontSize: '0.875rem',
              fontFamily: 'monospace'
            }}>
              {getRecommendedRules()}
            </Typography>
            <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
              Copy these rules to your Firebase Console → Firestore → Rules tab
            </Typography>
          </AccordionDetails>
        </Accordion>

        {/* Common Issues */}
        <Divider sx={{ my: 2 }} />
        <Typography variant="h6" gutterBottom>
          Common Issues & Solutions:
        </Typography>
        
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            If you see permission errors:
          </Typography>
          <Typography variant="body2" component="div">
            • Check your Firestore security rules in Firebase Console<br/>
            • Ensure rules allow authenticated users to write to users collection<br/>
            • Make sure you're signed in before testing<br/>
            • Check browser console for detailed error messages
          </Typography>
        </Alert>
      </Paper>
    </Box>
  );
} 