import React, { useState } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Button, 
  TextField, 
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import { db } from '../firebase';
import { addDoc, collection, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';

export default function FirestoreTest() {
  const [testData, setTestData] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [users, setUsers] = useState([]);

  const addResult = (message, type = 'info') => {
    setResults(prev => [...prev, { message, type, timestamp: new Date().toISOString() }]);
  };

  const testFirestoreWrite = async () => {
    setLoading(true);
    addResult('🔍 Testing Firestore write operation...', 'info');
    
    try {
      // Test 1: Add document to a test collection
      const testDoc = await addDoc(collection(db, 'test_collection'), {
        message: testData || 'Test data',
        timestamp: new Date().toISOString(),
        test: true
      });
      
      addResult(`✅ Document written successfully with ID: ${testDoc.id}`, 'success');
      
      // Test 2: Read the document back
      const docSnap = await getDoc(doc(db, 'test_collection', testDoc.id));
      if (docSnap.exists()) {
        addResult('✅ Document read back successfully', 'success');
        addResult(`📄 Document data: ${JSON.stringify(docSnap.data())}`, 'info');
      } else {
        addResult('❌ Document not found after writing', 'error');
      }
      
    } catch (error) {
      addResult(`❌ Firestore write failed: ${error.code} - ${error.message}`, 'error');
      console.error('Firestore write error:', error);
    } finally {
      setLoading(false);
    }
  };

  const testUserDocumentWrite = async () => {
    setLoading(true);
    addResult('🔍 Testing user document write...', 'info');
    
    try {
      const testUserId = `test_user_${Date.now()}`;
      const userData = {
        email: 'test@example.com',
        fullName: 'Test User',
        role: 'Student',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        uid: testUserId,
        isActive: true,
        registrationMethod: 'test'
      };
      
      // Write to users collection
      await setDoc(doc(db, 'users', testUserId), userData);
      addResult(`✅ User document written successfully with ID: ${testUserId}`, 'success');
      
      // Read back the user document
      const userSnap = await getDoc(doc(db, 'users', testUserId));
      if (userSnap.exists()) {
        addResult('✅ User document read back successfully', 'success');
        addResult(`👤 User data: ${JSON.stringify(userSnap.data())}`, 'info');
      } else {
        addResult('❌ User document not found after writing', 'error');
      }
      
    } catch (error) {
      addResult(`❌ User document write failed: ${error.code} - ${error.message}`, 'error');
      console.error('User document write error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    setLoading(true);
    addResult('🔍 Fetching all users from Firestore...', 'info');
    
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const usersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setUsers(usersData);
      addResult(`✅ Found ${usersData.length} users in database`, 'success');
      
      if (usersData.length > 0) {
        addResult('📋 Users found:', 'info');
        usersData.forEach(user => {
          addResult(`   - ${user.fullName} (${user.email}) - ${user.role}`, 'info');
        });
      }
      
    } catch (error) {
      addResult(`❌ Failed to fetch users: ${error.code} - ${error.message}`, 'error');
      console.error('Fetch users error:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setResults([]);
    setUsers([]);
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1000, mx: 'auto' }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom color="primary">
          🔥 Firestore Database Test
        </Typography>
        
        <Typography variant="body1" sx={{ mb: 3 }}>
          This tool tests Firestore connectivity and data storage to diagnose registration issues.
        </Typography>

        <Box sx={{ mb: 3 }}>
          <TextField
            label="Test Data"
            value={testData}
            onChange={(e) => setTestData(e.target.value)}
            placeholder="Enter test data to write"
            fullWidth
            sx={{ mb: 2 }}
          />
          
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              onClick={testFirestoreWrite}
              disabled={loading}
              size="large"
            >
              {loading ? <CircularProgress size={20} /> : '📝 Test Write'}
            </Button>
            
            <Button
              variant="contained"
              color="secondary"
              onClick={testUserDocumentWrite}
              disabled={loading}
              size="large"
            >
              {loading ? <CircularProgress size={20} /> : '👤 Test User Write'}
            </Button>
            
            <Button
              variant="outlined"
              onClick={fetchAllUsers}
              disabled={loading}
              size="large"
            >
              {loading ? <CircularProgress size={20} /> : '📋 Fetch All Users'}
            </Button>
            
            <Button
              variant="outlined"
              color="error"
              onClick={clearResults}
              size="large"
            >
              🗑️ Clear Results
            </Button>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Results */}
        <Typography variant="h6" gutterBottom>
          Test Results:
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
            Click a test button to start testing Firestore operations.
          </Typography>
        )}

        {/* Users List */}
        {users.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom>
              Users in Database ({users.length}):
            </Typography>
            
            <List sx={{ maxHeight: 300, overflow: 'auto', bgcolor: '#f5f5f5', borderRadius: 1 }}>
              {users.map((user, index) => (
                <ListItem key={user.id} sx={{ mb: 1, borderRadius: 1, bgcolor: 'white' }}>
                  <ListItemText
                    primary={`${user.fullName} (${user.role})`}
                    secondary={
                      <>
                        <strong>Email:</strong> {user.email}<br/>
                        <strong>ID:</strong> {user.id}<br/>
                        <strong>Created:</strong> {new Date(user.createdAt).toLocaleString()}<br/>
                        <strong>Method:</strong> {user.registrationMethod || 'unknown'}
                      </>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </>
        )}

        {/* Common Issues */}
        <Divider sx={{ my: 2 }} />
        <Typography variant="h6" gutterBottom>
          Common Issues & Solutions:
        </Typography>
        
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            If tests fail, check:
          </Typography>
          <Typography variant="body2" component="div">
            • Firebase project configuration<br/>
            • Firestore security rules<br/>
            • Network connectivity<br/>
            • Browser console for errors
          </Typography>
        </Alert>
      </Paper>
    </Box>
  );
} 