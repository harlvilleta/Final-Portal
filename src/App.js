import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { Box, AppBar, Toolbar, Typography, Avatar, Chip, IconButton, Button, CircularProgress, Alert, Tooltip, Badge, useTheme } from "@mui/material";
import { AccountCircle, Logout, Notifications, Settings } from "@mui/icons-material";
import ProfileDropdown from "./components/ProfileDropdown";
import ThemeWrapper from "./components/ThemeWrapper";
import { ThemeProvider as CustomThemeProvider } from "./contexts/ThemeContext";
import Sidebar from "./components/Sidebar";
import UserSidebar from "./components/UserSidebar";
import TeacherSidebar from "./components/TeacherSidebar";
import Overview from "./pages/Overview";
import Students from "./pages/Students";
import Activity from "./pages/Activity";
import History from "./pages/History";
import Profile from "./pages/Profile";
import ViolationRecord from "./pages/ViolationRecord";
import ViolationCreateMeeting from "./pages/ViolationCreateMeeting";
import ViolationHistory from "./pages/ViolationHistory";
import ViolationStatus from "./pages/ViolationStatus";
import Options from "./pages/Options";
import Announcements from "./pages/Announcements";
import RecycleBin from "./pages/RecycleBin";
import Login from './pages/Login';
import Register from './pages/Register';
import UserDashboard from './pages/UserDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from './firebase';
import { getDoc, doc, setDoc, collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import AnnouncementReport from "./pages/AnnouncementReport";
import UserViolations from "./pages/UserViolations";
import UserAnnouncements from "./pages/UserAnnouncements";
import UserLostFound from "./pages/UserLostFound";
import UserNotifications from "./pages/UserNotifications";
import TeacherHeader from "./components/TeacherHeader";
import TestPage from "./pages/TestPage";
import ReceiptSubmission from "./components/ReceiptSubmission";
import ReceiptReview from "./components/ReceiptReview";
import ReceiptHistory from "./components/ReceiptHistory";
import TeacherReportViolation from "./pages/TeacherReportViolation";
import ViolationReview from "./pages/ViolationReview";
import TeacherReports from "./pages/TeacherReports";
import TeacherSchedule from "./pages/TeacherSchedule";
import AdminLostFound from "./pages/AdminLostFound";
import ActivityHistory from "./pages/ActivityHistory";
import ActivityRequestsAdmin from "./pages/ActivityRequestsAdmin";
import TeacherNotifications from "./pages/TeacherNotifications";
import TeacherLostFound from "./pages/TeacherLostFound";
import ActivitiesView from "./pages/ActivitiesView";
import AdminNotifications from "./pages/AdminNotifications";
import StudentsChartDashboard from "./pages/StudentsChartDashboard";
import ViolationsChartDashboard from "./pages/ViolationsChartDashboard";
import TeacherRequest from "./pages/TeacherRequest";
import TeacherViolationRecords from "./pages/TeacherViolationRecords";
import TeacherActivityScheduler from "./pages/TeacherActivityScheduler";
import AdminActivityScheduler from "./pages/AdminActivityScheduler";
import ClassroomManager from "./components/ClassroomManager";
import TeacherStudentsView from "./components/TeacherStudentsView";
import ClassroomDashboard from "./pages/ClassroomDashboard";
import StudentClassroom from "./pages/StudentClassroom";
import EditProfile from "./pages/EditProfile";

// Header component for admin dashboard
function AdminHeader({ currentUser, userProfile }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [previousPage, setPreviousPage] = useState('/overview');
  const [isOnNotificationsPage, setIsOnNotificationsPage] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Notification handling functions
  const handleNotificationClick = (event) => {
    // If we're currently on the notifications page, go back to previous page
    if (isOnNotificationsPage) {
      navigate(previousPage);
      setIsOnNotificationsPage(false);
    } else {
      // If we're not on notifications page, save current page and go to notifications
      setPreviousPage(location.pathname);
      navigate('/admin-notifications');
      setIsOnNotificationsPage(true);
    }
  };



  // Track location changes to update notification page state
  useEffect(() => {
    const currentPath = location.pathname;
    if (currentPath === '/admin-notifications') {
      setIsOnNotificationsPage(true);
    } else {
      setIsOnNotificationsPage(false);
    }
  }, [location.pathname]);

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setNotificationLoading(true);
        
        // Fetch all notifications (admin sees all notifications)
        const notificationsQuery = query(
          collection(db, "notifications"),
          orderBy("createdAt", "desc"),
          limit(20)
        );

        const unsubscribeNotifications = onSnapshot(notificationsQuery, (snapshot) => {
          const notificationData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            type: doc.data().type || 'general',
            timestamp: doc.data().createdAt
          }));
          
          setNotifications(notificationData);
          setUnreadCount(notificationData.filter(n => !n.read).length);
          setNotificationLoading(false);
        }, (error) => {
          console.error('Error listening to notifications:', error);
          setNotificationLoading(false);
        });

        return unsubscribeNotifications;
      } catch (error) {
        console.error('Error setting up notification listeners:', error);
        setNotificationLoading(false);
        return () => {};
      }
    };

    const unsubscribe = fetchNotifications();
    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  const getUserDisplayInfo = () => {
    if (userProfile) {
      return {
        name: userProfile.fullName || currentUser?.displayName || 'Admin User',
        email: userProfile.email || currentUser?.email,
        photo: userProfile.profilePic || currentUser?.photoURL,
        role: userProfile.role || 'Admin'
      };
    }
    return {
      name: currentUser?.displayName || 'Admin User',
      email: currentUser?.email,
      photo: currentUser?.photoURL,
      role: 'Admin'
    };
  };

  const userInfo = getUserDisplayInfo();

  return (
    <AppBar position="static" sx={{ bgcolor: '#fff', color: '#333', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <Box sx={{ flex: 0.5 }}></Box>
        <Typography variant="h4" component="div" sx={{ fontWeight: 700, color: '#800000', flex: 1, textAlign: 'center', ml: -2 }}>
          Student Affairs Management System
        </Typography>
        <Box sx={{ flex: 0.5, display: 'flex', justifyContent: 'flex-end' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Tooltip title={isOnNotificationsPage ? "Back to Dashboard" : "View Notifications"}>
              <IconButton
                size="large"
                aria-label="notifications"
                color="inherit"
                onClick={handleNotificationClick}
                sx={{ 
                  bgcolor: unreadCount > 0 ? '#ffebee' : 'transparent',
                  '&:hover': { bgcolor: unreadCount > 0 ? '#ffcdd2' : '#f5f5f5' }
                }}
              >
                <Badge badgeContent={unreadCount} color="error">
                  <Notifications />
                </Badge>
              </IconButton>
            </Tooltip>
            <ProfileDropdown 
              currentUser={currentUser} 
              userProfile={userProfile}
              profileRoute="/profile"
            />
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

// Header component for user dashboard
function UserHeader({ currentUser, userProfile }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [studentNotifications, setStudentNotifications] = useState([]);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [previousPage, setPreviousPage] = useState('/user-dashboard');
  const [isOnNotificationsPage, setIsOnNotificationsPage] = useState(false);

  // Fetch student-specific notifications (all relevant notifications for students)
  useEffect(() => {
    if (!currentUser?.email) return;

    const fetchStudentNotifications = async () => {
      setNotificationLoading(true);
      try {
        // Fetch all notifications for the student
        const notificationsQuery = query(
          collection(db, "notifications"),
          where("recipientEmail", "==", currentUser.email),
          orderBy("createdAt", "desc"),
          limit(20)
        );

        const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
          const allNotifications = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          // Filter out enrollment/joining related notifications for students
          const filteredNotifications = allNotifications.filter(notification => {
            // Exclude notifications related to student enrollment, joining, or registration
            const title = notification.title?.toLowerCase() || '';
            const message = notification.message?.toLowerCase() || '';
            const type = notification.type?.toLowerCase() || '';
            
            // Keywords to exclude (but allow classroom_addition notifications)
            const excludeKeywords = [
              'enrollment', 'enroll', 'joining', 'joined', 'registration', 'register',
              'student added', 'new student', 'student created', 'account created',
              'welcome new student', 'student registration', 'enrolled student'
            ];
            
            // Allow classroom_addition notifications
            if (type === 'classroom_addition') {
              return true;
            }
            
            // Check if notification contains any exclusion keywords
            const shouldExclude = excludeKeywords.some(keyword => 
              title.includes(keyword) || message.includes(keyword) || type.includes(keyword)
            );
            
            // Only show lost and found, announcements, and other non-enrollment notifications
            return !shouldExclude;
          });

          setStudentNotifications(filteredNotifications);
          setNotificationLoading(false);
        }, (error) => {
          console.error('Error fetching student notifications:', error);
          setNotificationLoading(false);
        });

        return unsubscribe;
      } catch (error) {
        console.error('Error setting up notification listeners:', error);
        setNotificationLoading(false);
        return () => {};
      }
    };

    const unsubscribe = fetchStudentNotifications();
    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [currentUser]);

  // Track location changes to update notification page state
  useEffect(() => {
    const currentPath = location.pathname;
    if (currentPath === '/notifications') {
      setIsOnNotificationsPage(true);
    } else {
      setIsOnNotificationsPage(false);
    }
  }, [location.pathname]);

  const handleNotificationClick = (event) => {
    // If we're currently on the notifications page, go back to previous page
    if (isOnNotificationsPage) {
      navigate(previousPage);
      setIsOnNotificationsPage(false);
    } else {
      // If we're not on notifications page, save current page and go to notifications
      setPreviousPage(location.pathname);
      navigate('/notifications');
      setIsOnNotificationsPage(true);
    }
  };


  const getUserDisplayInfo = () => {
    if (userProfile) {
      return {
        name: userProfile.fullName || currentUser?.displayName || 'Student',
        email: userProfile.email || currentUser?.email,
        photo: userProfile.profilePic || currentUser?.photoURL,
        role: userProfile.role || 'Student'
      };
    }
    return {
      name: currentUser?.displayName || 'Student',
      email: currentUser?.email,
      photo: currentUser?.photoURL,
      role: 'Student'
    };
  };

  const userInfo = getUserDisplayInfo();

  return (
    <>
      <AppBar position="static" sx={{ bgcolor: 'background.paper', color: 'text.primary', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ flex: 0.5 }}></Box>
          <Typography variant="h4" component="div" sx={{ 
            fontWeight: 700, 
            color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000', 
            flex: 1, 
            textAlign: 'center', 
            ml: -2 
          }}>
            Student Affairs Management System
          </Typography>
          <Box sx={{ flex: 0.5, display: 'flex', justifyContent: 'flex-end' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Tooltip title={isOnNotificationsPage ? "Back to Dashboard" : "View Notifications"}>
                <IconButton
                  size="large"
                  aria-label="notifications"
                  color="inherit"
                  onClick={handleNotificationClick}
                  sx={{ 
                    bgcolor: studentNotifications.filter(n => !n.read).length > 0 ? '#ffebee' : 'transparent',
                    '&:hover': { bgcolor: studentNotifications.filter(n => !n.read).length > 0 ? '#ffcdd2' : '#f5f5f5' }
                  }}
                >
                  <Badge badgeContent={studentNotifications.filter(n => !n.read).length} color="error">
                    <Notifications />
                  </Badge>
                </IconButton>
              </Tooltip>
              <ProfileDropdown 
                currentUser={currentUser} 
                userProfile={userProfile}
                profileRoute="/profile"
              />
            </Box>
          </Box>
        </Toolbar>
      </AppBar>

    </>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [forceLogin, setForceLogin] = useState(() => {
    // Check if user has logged in before (not first visit)
    const hasLoggedInBefore = localStorage.getItem('hasLoggedInBefore');
    return !hasLoggedInBefore; // Only force login on first visit
  });
  const [authInitialized, setAuthInitialized] = useState(false);

  useEffect(() => {
    console.log('App component mounted, starting auth check...');
    
    // Add a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      console.log('Loading timeout reached, forcing app to load');
      setLoading(false);
      if (!userRole && user) {
        console.log('No role set but user exists, defaulting to Student');
        setUserRole('Student'); // Default fallback
      }
    }, 10000); // Increased timeout to 10 seconds

    let isMounted = true; // Flag to prevent state updates after unmount

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isMounted) return; // Prevent state updates if component is unmounted
      console.log('Auth state changed:', user ? `User logged in: ${user.email}` : 'User logged out');
      
      // Mark auth as initialized after first check
      if (!authInitialized) {
        setAuthInitialized(true);
      }
      
      if (user && !forceLogin) { // Only process user if forceLogin is false
        console.log('Setting user state...');
        setUser(user);
        setCurrentUser(user);
        setLoading(true);
        setAuthError(null);
        
        try {
          console.log('Fetching user document from Firestore...');
          // Fetch user profile and role with timeout
          const userDoc = await Promise.race([
            getDoc(doc(db, 'users', user.uid)),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
          ]);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log('User data found:', userData);
            setUserProfile(userData);
            setUserRole(userData.role || 'Student');
            console.log('User profile and role loaded:', userData.role);
            
            // Clear loading immediately after role is determined
            setLoading(false);
            clearTimeout(loadingTimeout);
          } else {
            console.log('User document not found, creating default...');
            // Create default user document
            const defaultUserData = {
              email: user.email,
              fullName: user.displayName || user.email,
              role: 'Student',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              lastLogin: new Date().toISOString(),
              uid: user.uid,
              isActive: true,
              registrationMethod: 'email'
            };
            
            try {
              await setDoc(doc(db, 'users', user.uid), defaultUserData);
              console.log('✅ Created default user document');
              setUserProfile(defaultUserData);
              setUserRole('Student');
              setLoading(false);
              clearTimeout(loadingTimeout);
            } catch (createError) {
              console.error('Failed to create user document:', createError);
              setAuthError('Failed to create user profile. Please try again.');
              setLoading(false);
              clearTimeout(loadingTimeout);
            }
          }
        } catch (error) {
          console.error('Error fetching user document:', error);
          if (error.message === 'Timeout') {
            setAuthError('Database connection timeout. Please refresh the page.');
          } else {
            setAuthError('Failed to load user profile. Please try again.');
          }
          setLoading(false);
          clearTimeout(loadingTimeout);
        }
      } else if (user && forceLogin) {
        // User is authenticated but forceLogin is true, so we don't set the user state
        console.log('User authenticated but forceLogin is true, keeping login page');
        setLoading(false);
        clearTimeout(loadingTimeout);
      } else {
        console.log('User logged out, clearing state...');
        // User logged out
        setUser(null);
        setCurrentUser(null);
        setUserProfile(null);
        setUserRole(null);
        setAuthError(null);
        // Only force login if auth is initialized (prevents auto-logout on page refresh)
        if (authInitialized) {
          setForceLogin(true); // Force login page to show
        }
        clearTimeout(loadingTimeout);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false; // Mark component as unmounted
      clearTimeout(loadingTimeout);
      unsubscribe();
    };
  }, [forceLogin, authInitialized]); // Add forceLogin and authInitialized to dependency array

  console.log('Current state:', { user: !!user, userRole, loading, userEmail: user?.email, forceLogin });

  // Show loading while checking authentication
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
        <CircularProgress size={60} sx={{ mb: 2 }} />
        <Typography variant="h6" sx={{ mb: 1 }}>
          Loading...
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Please wait while we set up your dashboard
        </Typography>
        <Button 
          variant="outlined" 
          onClick={() => {
            console.log('Manual loading override');
            setLoading(false);
            if (!userRole && user) {
              console.log('Setting default role to Student');
              setUserRole('Student');
            }
          }}
          sx={{ mt: 2 }}
        >
          Continue to App
        </Button>
      </Box>
    );
  }

  // If user is not authenticated OR forceLogin is true, show login/register forms
  if (!user || forceLogin) {
    console.log('No user detected or forceLogin is true, showing login/register forms');
    return (
      <Router>
        <Routes>
          <Route path="/login" element={<Login onLoginSuccess={() => {
            setForceLogin(false);
            localStorage.setItem('hasLoggedInBefore', 'true');
          }} />} />
          <Route path="/register" element={<Register />} />
          <Route path="/test" element={<TestPage />} />
          <Route path="/*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    );
  }

  console.log('User authenticated, role:', userRole, 'Rendering dashboard...');
  console.log('User details:', { email: user.email, displayName: user.displayName, uid: user.uid });

  // If user is authenticated but role is not determined yet, show loading
  if (!userRole) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
        <CircularProgress size={60} sx={{ mb: 2 }} />
        <Typography variant="h6" sx={{ mb: 1 }}>
          Setting up your dashboard...
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Please wait a moment
        </Typography>
        {authError && (
          <Alert severity="warning" sx={{ mb: 2, maxWidth: 400 }}>
            {authError}
          </Alert>
        )}
        <Button 
          variant="contained" 
          onClick={() => {
            console.log('Force setting role to Student');
            setUserRole('Student');
          }}
          sx={{ mt: 2 }}
        >
          Continue as Student
        </Button>
      </Box>
    );
  }

  // This will be handled by the CustomThemeProvider

  return (
    <CustomThemeProvider>
      <ThemeWrapper>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Admin/Teacher Routes - Only accessible to Admin/Teacher roles */}
            <Route path="/*" element={
              (userRole === 'Admin' || userRole === 'Teacher') ? (
                userRole === 'Admin' ? (
                  <Box sx={{ display: "flex", flexDirection: "column", height: "100vh", bgcolor: "background.default" }}>
                    <AdminHeader currentUser={currentUser} userProfile={userProfile} />
                    <Box sx={{ display: "flex", flex: 1 }}>
                      <Sidebar />
                      <Box sx={{ flex: 1, p: 3, overflowY: "auto" }}>
                        <Routes>
                          <Route path="/" element={<Navigate to="/overview" />} />
                          <Route path="/overview" element={<Overview />} />
                          <Route path="/students/*" element={<Students />} />
                                                    <Route path="/activity" element={<Activity />} />
                              <Route path="/activity/history" element={<ActivityHistory />} />
                          <Route path="/history" element={<History />} />
                          <Route path="/activity/requests" element={<ActivityRequestsAdmin />} />
                          <Route path="/profile" element={<Profile />} />
                          <Route path="/violation-record" element={<ViolationRecord />} />
                          <Route path="/violation-record/create-meeting" element={<ViolationCreateMeeting />} />
                          <Route path="/violation-record/history" element={<ViolationHistory />} />
                          <Route path="/violation-record/status" element={<ViolationStatus />} />
                          <Route path="/violation-review" element={<ViolationReview />} />
                          <Route path="/violation-record/review/:id" element={<ViolationReview />} />
                          <Route path="/options" element={<Options />} />
                          <Route path="/announcements" element={<Announcements />} />
                          <Route path="/announcements/report" element={<AnnouncementReport />} />
                          <Route path="/receipt-review" element={<ReceiptReview />} />
                          <Route path="/lost-found" element={<AdminLostFound />} />
                          <Route path="/recycle-bin" element={<RecycleBin />} />
                          <Route path="/admin-notifications" element={<AdminNotifications />} />
                          <Route path="/admin-activity-scheduler" element={<AdminActivityScheduler />} />
                          <Route path="/students-chart" element={<StudentsChartDashboard />} />
                          <Route path="/violations-chart" element={<ViolationsChartDashboard />} />
                          <Route path="/teacher-request" element={<TeacherRequest />} />
                          <Route path="/user/*" element={<Navigate to="/overview" />} />
                        </Routes>
                      </Box>
                    </Box>
                  </Box>
                ) : (
                  // Teacher Dashboard
                  <Box sx={{ display: "flex", flexDirection: "column", height: "100vh", bgcolor: "background.default" }}>
                    <TeacherHeader currentUser={currentUser} userProfile={userProfile} />
                    <Box sx={{ display: "flex", flex: 1 }}>
                      <TeacherSidebar />
                      <Box sx={{ flex: 1, p: 3, overflowY: "auto" }}>
                        <Routes>
                          <Route path="/" element={<Navigate to="/teacher-dashboard" />} />
                          <Route path="/teacher-dashboard" element={<TeacherDashboard currentUser={currentUser} userProfile={userProfile} />} />
                          <Route path="/teacher-students" element={<TeacherStudentsView currentUser={currentUser} />} />
                          <Route path="/teacher-announcements" element={<Announcements />} />
                          <Route path="/teacher-assessments" element={<div>Teacher Assessments</div>} />
                          <Route path="/teacher-schedule" element={<TeacherSchedule />} />
                                                    <Route path="/teacher-notifications" element={<TeacherNotifications />} />
                          <Route path="/activity" element={<ActivitiesView />} />
                          <Route path="/teacher-lost-found" element={<TeacherLostFound />} />
                          <Route path="/teacher-violation-records" element={<TeacherViolationRecords />} />
                          <Route path="/teacher-activity-scheduler" element={<TeacherActivityScheduler />} />
                          <Route path="/teacher-profile" element={<Profile />} />
                          <Route path="/*" element={<Navigate to="/teacher-dashboard" />} />
                        </Routes>
                      </Box>
                    </Box>
                  </Box>
                )
              ) : userRole === 'Student' ? (
                <Box sx={{ display: "flex", flexDirection: "column", height: "100vh", bgcolor: "background.default" }}>
                  <UserHeader currentUser={currentUser} userProfile={userProfile} />
                  <Box sx={{ display: "flex", flex: 1 }}>
                    <UserSidebar />
                    <Box sx={{ flex: 1, p: 3, overflowY: "auto" }}>
                      <Routes>
                        <Route path="/" element={<UserDashboard />} />
                        <Route path="/user-dashboard" element={<UserDashboard />} />
                        <Route path="/violations" element={<UserViolations currentUser={currentUser} />} />
                        <Route path="/announcements" element={<UserAnnouncements />} />
                        <Route path="/activity" element={<ActivitiesView />} />
                        <Route path="/lost-found" element={<UserLostFound currentUser={currentUser} />} />
                        <Route path="/receipt-submission" element={<ReceiptSubmission />} />
                        <Route path="/receipt-history" element={<ReceiptHistory />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/edit-profile" element={<EditProfile />} />
                        <Route path="/notifications" element={<UserNotifications currentUser={currentUser} />} />
                        <Route path="/*" element={<Navigate to="/user-dashboard" />} />
                      </Routes>
                    </Box>
                  </Box>
                </Box>
              ) : (
                // This should not happen since we check for userRole above, but just in case
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
                  <div style={{ fontSize: '18px', marginBottom: '10px' }}>Setting up your account...</div>
                  <div style={{ fontSize: '14px', color: '#666' }}>Please wait a moment</div>
                  <Button 
                    variant="contained" 
                    onClick={() => {
                      console.log('Force setting role to Student');
                      setUserRole('Student');
                    }}
                    sx={{ mt: 2 }}
                  >
                    Continue as Student
                  </Button>
                </Box>
              )
            } />
          </Routes>
        </Router>
      </ThemeWrapper>
    </CustomThemeProvider>
  );
}

export default App; 