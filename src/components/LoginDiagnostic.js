import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Button, 
  List, 
  ListItem, 
  ListItemText, 
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, signInAnonymously } from 'firebase/auth';
import { getDoc, doc } from 'firebase/firestore';

export default function LoginDiagnostic() {
  const [diagnostics, setDiagnostics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState({});

  const addDiagnostic = (message, type = 'info') => {
    setDiagnostics(prev => [...prev, { message, type, timestamp: new Date().toISOString() }]);
  };

  const runDiagnostics = async () => {
    setLoading(true);
    setDiagnostics([]);
    setTestResults({});

    try {
      // Test 1: Check if Firebase is initialized
      addDiagnostic('🔍 Starting Firebase diagnostics...', 'info');
      
      if (!auth) {
        addDiagnostic('❌ Firebase Auth is not initialized', 'error');
        return;
      }
      addDiagnostic('✅ Firebase Auth is initialized', 'success');

      if (!db) {
        addDiagnostic('❌ Firestore is not initialized', 'error');
        return;
      }
      addDiagnostic('✅ Firestore is initialized', 'success');

      // Test 2: Check Firebase config
      addDiagnostic('🔍 Checking Firebase configuration...', 'info');
      const config = auth.app.options;
      addDiagnostic(`✅ Firebase project: ${config.projectId}`, 'success');
      addDiagnostic(`✅ Auth domain: ${config.authDomain}`, 'success');

      // Test 3: Test anonymous authentication
      addDiagnostic('🔍 Testing anonymous authentication...', 'info');
      try {
        const anonResult = await signInAnonymously(auth);
        addDiagnostic('✅ Anonymous authentication works', 'success');
        setTestResults(prev => ({ ...prev, anonymousAuth: true }));
        
        // Sign out immediately
        await auth.signOut();
        addDiagnostic('✅ Sign out works', 'success');
      } catch (error) {
        addDiagnostic(`❌ Anonymous auth failed: ${error.code}`, 'error');
        setTestResults(prev => ({ ...prev, anonymousAuth: false }));
      }

      // Test 4: Test Firestore connectivity
      addDiagnostic('🔍 Testing Firestore connectivity...', 'info');
      try {
        const testDoc = await getDoc(doc(db, 'test', 'connection'));
        addDiagnostic('✅ Firestore read operation works', 'success');
        setTestResults(prev => ({ ...prev, firestore: true }));
      } catch (error) {
        addDiagnostic(`❌ Firestore read failed: ${error.code}`, 'error');
        setTestResults(prev => ({ ...prev, firestore: false }));
      }

      // Test 5: Test with sample credentials
      addDiagnostic('🔍 Testing with sample credentials...', 'info');
      const testCredentials = [
        { email: 'admin@school.com', password: 'admin123', role: 'Admin' },
        { email: 'teacher@school.com', password: 'teacher123', role: 'Teacher' },
        { email: 'student@school.com', password: 'student123', role: 'Student' }
      ];

      for (const cred of testCredentials) {
        try {
          addDiagnostic(`🔍 Testing ${cred.role} login...`, 'info');
          const result = await signInWithEmailAndPassword(auth, cred.email, cred.password);
          addDiagnostic(`✅ ${cred.role} login successful`, 'success');
          setTestResults(prev => ({ ...prev, [cred.role.toLowerCase()]: true }));
          
          // Check if user document exists
          try {
            const userDoc = await getDoc(doc(db, 'users', result.user.uid));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              addDiagnostic(`✅ ${cred.role} user document exists with role: ${userData.role}`, 'success');
            } else {
              addDiagnostic(`⚠️ ${cred.role} user document does not exist`, 'warning');
            }
          } catch (docError) {
            addDiagnostic(`❌ Error checking ${cred.role} user document: ${docError.code}`, 'error');
          }
          
          // Sign out
          await auth.signOut();
        } catch (error) {
          addDiagnostic(`❌ ${cred.role} login failed: ${error.code}`, 'error');
          setTestResults(prev => ({ ...prev, [cred.role.toLowerCase()]: false }));
        }
      }

      // Test 6: Network connectivity
      addDiagnostic('🔍 Testing network connectivity...', 'info');
      try {
        const response = await fetch('https://www.google.com', { method: 'HEAD' });
        if (response.ok) {
          addDiagnostic('✅ Network connectivity is working', 'success');
          setTestResults(prev => ({ ...prev, network: true }));
        } else {
          addDiagnostic('⚠️ Network connectivity issues detected', 'warning');
          setTestResults(prev => ({ ...prev, network: false }));
        }
      } catch (error) {
        addDiagnostic('❌ Network connectivity failed', 'error');
        setTestResults(prev => ({ ...prev, network: false }));
      }

      addDiagnostic('🏁 Diagnostics completed!', 'info');

    } catch (error) {
      addDiagnostic(`❌ Diagnostic error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const getSummary = () => {
    const totalTests = Object.keys(testResults).length;
    const passedTests = Object.values(testResults).filter(Boolean).length;
    return { total: totalTests, passed: passedTests, failed: totalTests - passedTests };
  };

  const summary = getSummary();

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom color="primary">
          🔧 Login Diagnostic Tool
        </Typography>
        
        <Typography variant="body1" sx={{ mb: 3 }}>
          This tool will help identify why you cannot login by testing various components of the authentication system.
        </Typography>

        <Button
          variant="contained"
          onClick={runDiagnostics}
          disabled={loading}
          sx={{ mb: 3 }}
          size="large"
        >
          {loading ? <CircularProgress size={24} /> : '🚀 Run Diagnostics'}
        </Button>

        {summary.total > 0 && (
          <Alert severity={summary.failed === 0 ? 'success' : 'warning'} sx={{ mb: 3 }}>
            <Typography variant="h6">
              Test Summary: {summary.passed}/{summary.total} tests passed
            </Typography>
            {summary.failed > 0 && (
              <Typography variant="body2">
                {summary.failed} test(s) failed. Check the details below.
              </Typography>
            )}
          </Alert>
        )}

        <Divider sx={{ my: 2 }} />

        <Typography variant="h6" gutterBottom>
          Diagnostic Results:
        </Typography>

        <List>
          {diagnostics.map((diag, index) => (
            <ListItem key={index} sx={{ 
              bgcolor: diag.type === 'error' ? '#ffebee' : 
                       diag.type === 'success' ? '#e8f5e8' : 
                       diag.type === 'warning' ? '#fff3e0' : '#f5f5f5',
              mb: 1,
              borderRadius: 1
            }}>
              <ListItemText
                primary={diag.message}
                secondary={new Date(diag.timestamp).toLocaleTimeString()}
                primaryTypographyProps={{
                  color: diag.type === 'error' ? 'error.main' : 
                         diag.type === 'success' ? 'success.main' : 
                         diag.type === 'warning' ? 'warning.main' : 'text.primary'
                }}
              />
            </ListItem>
          ))}
        </List>

        {diagnostics.length === 0 && !loading && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            Click "Run Diagnostics" to start testing the login system.
          </Typography>
        )}

        {loading && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress size={40} />
            <Typography variant="body2" sx={{ mt: 2 }}>
              Running diagnostics...
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
} 