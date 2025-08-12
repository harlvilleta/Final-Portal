import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  List, 
  ListItem, 
  ListItemText, 
  Divider, 
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Avatar
} from '@mui/material';
import { ExpandMore, Person, School, AdminPanelSettings } from '@mui/icons-material';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

export default function FirebaseDataViewer() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(usersQuery);
      const usersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersData);
      setLastUpdated(new Date().toLocaleString());
      console.log('📊 Fetched users from Firebase:', usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const getRoleIcon = (role) => {
    switch (role) {
      case 'Admin':
        return <AdminPanelSettings sx={{ color: '#d32f2f' }} />;
      case 'Teacher':
        return <School sx={{ color: '#1976d2' }} />;
      case 'Student':
        return <Person sx={{ color: '#2e7d32' }} />;
      default:
        return <Person />;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'Admin':
        return 'error';
      case 'Teacher':
        return 'primary';
      case 'Student':
        return 'success';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ p: 3, bgcolor: '#f5f5f5', minHeight: '100vh' }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" color="primary" gutterBottom>
            🔥 Firebase Data Viewer
          </Typography>
          <Button
            variant="contained"
            onClick={fetchUsers}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? 'Refreshing...' : '🔄 Refresh Data'}
          </Button>
        </Box>
        
        {lastUpdated && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Last updated: {lastUpdated}
          </Typography>
        )}
        
        <Typography variant="h6" gutterBottom>
          Users in Firebase ({users.length} total)
        </Typography>
      </Paper>

      {users.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            No users found in Firebase
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Try creating some users first using the registration form or sample users button.
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {users.map((user, index) => (
            <Accordion key={user.id} defaultExpanded={index < 3}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                  {getRoleIcon(user.role)}
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6">
                      {user.fullName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {user.email}
                    </Typography>
                  </Box>
                  <Chip 
                    label={user.role} 
                    color={getRoleColor(user.role)}
                    size="small"
                  />
                  <Typography variant="caption" color="text.secondary">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {/* Basic Info */}
                  <Box>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      Basic Information
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemText 
                          primary="User ID" 
                          secondary={user.uid}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Full Name" 
                          secondary={user.fullName}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Email" 
                          secondary={user.email}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Role" 
                          secondary={user.role}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Phone" 
                          secondary={user.phone || 'Not provided'}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Address" 
                          secondary={user.address || 'Not provided'}
                        />
                      </ListItem>
                      {user.profilePic && (
                        <ListItem>
                          <ListItemText 
                            primary="Profile Picture" 
                            secondary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                                <Avatar 
                                  src={user.profilePic} 
                                  sx={{ width: 60, height: 60 }}
                                  alt={user.fullName}
                                />
                                <Box>
                                  <Typography variant="caption" display="block">
                                    Type: {user.profilePicType || 'Unknown'}
                                  </Typography>
                                  <Typography variant="caption" display="block">
                                    Name: {user.profilePicName || 'Unknown'}
                                  </Typography>
                                  <Typography variant="caption" display="block">
                                    Size: {user.profilePic.length > 1000 ? 
                                      `${(user.profilePic.length / 1024).toFixed(2)} KB` : 
                                      `${user.profilePic.length} bytes`
                                    }
                                  </Typography>
                                  <Typography variant="caption" display="block">
                                    Format: Base64
                                  </Typography>
                                </Box>
                              </Box>
                            }
                          />
                        </ListItem>
                      )}
                    </List>
                  </Box>

                  <Divider />

                  {/* Student Info */}
                  {user.role === 'Student' && user.studentInfo && (
                    <Box>
                      <Typography variant="subtitle2" color="success.main" gutterBottom>
                        Student Information
                      </Typography>
                      <List dense>
                        <ListItem>
                          <ListItemText 
                            primary="Student ID" 
                            secondary={user.studentInfo.studentId}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText 
                            primary="First Name" 
                            secondary={user.studentInfo.firstName}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText 
                            primary="Last Name" 
                            secondary={user.studentInfo.lastName}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText 
                            primary="Course" 
                            secondary={user.studentInfo.course}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText 
                            primary="Year Level" 
                            secondary={user.studentInfo.year}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText 
                            primary="Section" 
                            secondary={user.studentInfo.section}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText 
                            primary="Enrollment Date" 
                            secondary={new Date(user.studentInfo.enrollmentDate).toLocaleDateString()}
                          />
                        </ListItem>
                      </List>
                    </Box>
                  )}

                  {/* Admin Info */}
                  {user.role === 'Admin' && user.adminInfo && (
                    <Box>
                      <Typography variant="subtitle2" color="error.main" gutterBottom>
                        Admin Information
                      </Typography>
                      <List dense>
                        <ListItem>
                          <ListItemText 
                            primary="Admin Level" 
                            secondary={user.adminInfo.adminLevel}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText 
                            primary="Permissions" 
                            secondary={user.adminInfo.permissions.join(', ')}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText 
                            primary="Assigned By" 
                            secondary={user.adminInfo.assignedBy}
                          />
                        </ListItem>
                      </List>
                    </Box>
                  )}

                  {/* Teacher Info */}
                  {user.role === 'Teacher' && user.teacherInfo && (
                    <Box>
                      <Typography variant="subtitle2" color="primary.main" gutterBottom>
                        Teacher Information
                      </Typography>
                      <List dense>
                        <ListItem>
                          <ListItemText 
                            primary="Department" 
                            secondary={user.teacherInfo.department}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText 
                            primary="Status" 
                            secondary={user.teacherInfo.status}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText 
                            primary="Hire Date" 
                            secondary={new Date(user.teacherInfo.hireDate).toLocaleDateString()}
                          />
                        </ListItem>
                      </List>
                    </Box>
                  )}

                  <Divider />

                  {/* System Info */}
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      System Information
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemText 
                          primary="Created At" 
                          secondary={new Date(user.createdAt).toLocaleString()}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Updated At" 
                          secondary={new Date(user.updatedAt).toLocaleString()}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Registration Method" 
                          secondary={user.registrationMethod}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Status" 
                          secondary={user.isActive ? 'Active' : 'Inactive'}
                        />
                      </ListItem>
                    </List>
                  </Box>
                </Box>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}
    </Box>
  );
} 