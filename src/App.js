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
import { saveAuthState, getAuthState, clearAuthState, isAuthStateValid } from './utils/authPersistence';
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
import StudentsLostFound from "./pages/StudentsLostFound";
import LostItemRecords from "./pages/LostItemRecords";
import FoundItemRecords from "./pages/FoundItemRecords";
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
import StudentActivities from "./pages/StudentActivities";
import EditProfile from "./pages/EditProfile";

// Header component for admin dashboard
function AdminHeader({ currentUser, userProfile }) {
  const theme = useTheme();
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
    <>
      <AppBar position="static" sx={{ bgcolor: theme => theme.palette.mode === 'dark' ? '#424242' : '#fff', color: theme => theme.palette.mode === 'dark' ? '#ffffff' : '#333', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', height: '32px' }}>
        <Toolbar sx={{ display: 'flex', alignItems: 'center', width: '100%', minHeight: '32px !important' }}>
          <Box sx={{ flex: 1 }}></Box>
        </Toolbar>
      </AppBar>
      {/* Profile and Notification Icons - Outside Header Box */}
      <Box sx={{ 
        position: 'fixed', 
        top: '4px', 
        right: '16px', 
        display: 'flex', 
        alignItems: 'center', 
        gap: 2, 
        zIndex: 1300 
      }}>
        <Tooltip title={isOnNotificationsPage ? "Back to Dashboard" : "View Notifications"}>
          <IconButton
            size="large"
            aria-label="notifications"
            color="inherit"
            onClick={handleNotificationClick}
            sx={{ 
              bgcolor: 'transparent',
              '&:hover': { bgcolor: 'transparent' },
              color: theme.palette.mode === 'dark' ? '#ffffff' : '#333333'
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
    </>
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
      <AppBar position="static" sx={{ bgcolor: theme => theme.palette.mode === 'dark' ? '#424242' : 'background.paper', color: theme => theme.palette.mode === 'dark' ? '#ffffff' : 'text.primary', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', height: '32px' }}>
        <Toolbar sx={{ display: 'flex', alignItems: 'center', width: '100%', minHeight: '32px !important' }}>
          <Box sx={{ flex: 1 }}></Box>
        </Toolbar>
      </AppBar>
      {/* Profile and Notification Icons - Outside Header Box */}
      <Box sx={{ 
        position: 'fixed', 
        top: '4px', 
        right: '16px', 
        display: 'flex', 
        alignItems: 'center', 
        gap: 2, 
        zIndex: 1300 
      }}>
        <Tooltip title={isOnNotificationsPage ? "Back to Dashboard" : "View Notifications"}>
          <IconButton
            size="large"
            aria-label="notifications"
            color="inherit"
            onClick={handleNotificationClick}
            sx={{ 
              bgcolor: studentNotifications.filter(n => !n.read).length > 0 ? '#ffebee' : 'transparent',
              '&:hover': { bgcolor: studentNotifications.filter(n => !n.read).length > 0 ? '#ffcdd2' : '#f5f5f5' },
              color: theme.palette.mode === 'dark' ? '#ffffff' : '#333'
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
  const [forceLogin, setForceLogin] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    // Check for stored auth state on page load
    const checkStoredAuth = () => {
      try {
        const storedAuth = getAuthState();
        if (isAuthStateValid(storedAuth)) {
          console.log('Restoring auth state from localStorage:', storedAuth.userRole);
          setUser(storedAuth.user);
          setCurrentUser(storedAuth.user);
          setUserProfile(storedAuth.userProfile);
          setUserRole(storedAuth.userRole);
          setLoading(false);
          setAuthInitialized(true);
          setIsRefreshing(false);
        }
      } catch (error) {
        console.error('Error checking stored auth:', error);
      }
    };

    checkStoredAuth();

    // Check if user is already authenticated on page load
    const checkExistingAuth = async () => {
      try {
        const currentUser = auth.currentUser;
        if (currentUser && !user) {
          // User is already authenticated, set loading to false immediately
          setLoading(false);
        }
      } catch (error) {
        console.error('Error checking existing auth:', error);
      }
    };

    checkExistingAuth();

    // Add a shorter timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      setLoading(false);
      if (!userRole && user) {
        setUserRole('Student'); // Default fallback
      }
    }, 3000); // Reduced timeout to 3 seconds

    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isMounted) return;
      
      console.log('Auth state changed:', { user: !!user, currentUserRole: userRole });
      
      if (!authInitialized) {
        setAuthInitialized(true);
      }
      
      if (user) {
        setUser(user);
        setCurrentUser(user);
        setLoading(true);
        setAuthError(null);
        setForceLogin(false);
        setIsRefreshing(true);
        
        try {
          // Fetch user profile and role with shorter timeout
          const userDoc = await Promise.race([
            getDoc(doc(db, 'users', user.uid)),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
          ]);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log('Setting user role from database:', userData.role);
            setUserProfile(userData);
            setUserRole(userData.role || 'Student');
            setLoading(false);
            setIsRefreshing(false);
            clearTimeout(loadingTimeout);
            // Save auth state to localStorage
            saveAuthState(user, userData, userData.role || 'Student');
          } else {
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
              setUserProfile(defaultUserData);
              setUserRole('Student');
              setLoading(false);
              setIsRefreshing(false);
              clearTimeout(loadingTimeout);
              // Save auth state to localStorage
              saveAuthState(user, defaultUserData, 'Student');
            } catch (createError) {
              console.error('Failed to create user document:', createError);
              setAuthError('Failed to create user profile. Please try again.');
              setLoading(false);
              setIsRefreshing(false);
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
          setIsRefreshing(false);
          clearTimeout(loadingTimeout);
        }
      } else {
        // User logged out
        setUser(null);
        setCurrentUser(null);
        setUserProfile(null);
        setUserRole(null);
        setAuthError(null);
        setForceLogin(true);
        setIsRefreshing(false);
        clearTimeout(loadingTimeout);
        setLoading(false);
        // Clear stored auth state
        clearAuthState();
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(loadingTimeout);
      unsubscribe();
    };
  }, [authInitialized]);


  // Show minimal loading while checking authentication
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
        <CircularProgress size={40} sx={{ mb: 1 }} />
        <Typography variant="body2" color="text.secondary">
          {isRefreshing ? 'Refreshing...' : 'Loading...'}
        </Typography>
      </Box>
    );
  }

  // If user is not authenticated OR forceLogin is true, show login/register forms
  if (!user || forceLogin) {
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


  // If user is authenticated but role is not determined yet, show minimal loading
  if (!userRole && user) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
        <CircularProgress size={40} sx={{ mb: 1 }} />
        <Typography variant="body2" color="text.secondary">
          {isRefreshing ? 'Restoring your dashboard...' : 'Setting up dashboard...'}
        </Typography>
        {authError && (
          <Alert severity="warning" sx={{ mb: 2, maxWidth: 400 }}>
            {authError}
          </Alert>
        )}
      </Box>
    );
  }

  // This will be handled by the CustomThemeProvider

  return (
    <CustomThemeProvider>
      <ThemeWrapper>
        <style>
          {`
            /* Hide scrollbars globally */
            * {
              scrollbar-width: none; /* Firefox */
              -ms-overflow-style: none; /* Internet Explorer 10+ */
            }
            
            *::-webkit-scrollbar {
              display: none; /* WebKit */
            }
            
            /* Ensure content is still scrollable */
            body {
              overflow: auto;
            }
          `}
        </style>
        <Router>
          <Routes>
            <Route path="/login" element={<Navigate to={userRole === 'Admin' ? '/overview' : userRole === 'Teacher' ? '/teacher-dashboard' : '/user-dashboard'} replace />} />
            <Route path="/register" element={<Navigate to={userRole === 'Admin' ? '/overview' : userRole === 'Teacher' ? '/teacher-dashboard' : '/user-dashboard'} replace />} />
            
            {/* Admin/Teacher Routes - Only accessible to Admin/Teacher roles */}
            <Route path="/*" element={
              (() => {
                console.log('Routing decision:', { userRole, user: !!user });
                return (userRole === 'Admin' || userRole === 'Teacher');
              })() ? (
                userRole === 'Admin' ? (
                  <Box sx={{ display: "flex", flexDirection: "column", height: "100vh", bgcolor: "background.default" }}>
                    <AdminHeader currentUser={currentUser} userProfile={userProfile} />
                    <Box sx={{ display: "flex", flex: 1 }}>
                      <Sidebar />
                      <Box sx={{ 
                        flex: 1, 
                        overflowY: "auto",
                        height: "calc(100vh - 32px)",
                        '&::-webkit-scrollbar': {
                          display: 'none'
                        },
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none'
                      }}>
                        <Routes>
                          <Route path="/" element={<Navigate to="/overview" />} />
                          <Route path="/overview" element={<Overview />} />
                          <Route path="/students/*" element={<Students />} />
                                                    <Route path="/activity" element={<Activity />} />
                              <Route path="/activity/history" element={<ActivityHistory />} />
                          <Route path="/history" element={<History />} />
                          <Route path="/activity/requests" element={<ActivityRequestsAdmin />} />
                          <Route path="/profile" element={<Profile />} />
                          <Route path="/edit-profile" element={<EditProfile />} />
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
                          <Route path="/students-lost-found" element={<StudentsLostFound />} />
                          <Route path="/lost-item-records" element={<LostItemRecords />} />
                          <Route path="/found-item-records" element={<FoundItemRecords />} />
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
                      <Box sx={{ 
                        flex: 1, 
                        overflowY: "auto",
                        height: "calc(100vh - 32px)",
                        '&::-webkit-scrollbar': {
                          display: 'none'
                        },
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none'
                      }}>
                        <Routes>
                          <Route path="/" element={<Navigate to="/teacher-dashboard" />} />
                          <Route path="/teacher-dashboard" element={<TeacherDashboard currentUser={currentUser} userProfile={userProfile} />} />
                          <Route path="/teacher-students" element={<TeacherStudentsView currentUser={currentUser} />} />
                          <Route path="/teacher-announcements" element={<Announcements />} />
                          <Route path="/teacher-assessments" element={<div>Teacher Assessments</div>} />
                          <Route path="/teacher-schedule" element={<TeacherSchedule />} />
                                                    <Route path="/teacher-notifications" element={<TeacherNotifications />} />
                          <Route path="/activity" element={<ActivitiesView />} />
                          <Route path="/teacher-lost-found" element={<TeacherLostFound currentUser={currentUser} userProfile={userProfile} />} />
                          <Route path="/teacher-violation-records" element={<TeacherViolationRecords />} />
                          <Route path="/teacher-activity-scheduler" element={<TeacherActivityScheduler />} />
                          <Route path="/teacher-profile" element={<Profile />} />
                          <Route path="/edit-profile" element={<EditProfile />} />
                          <Route path="/*" element={<Navigate to="/teacher-dashboard" />} />
                        </Routes>
                      </Box>
                    </Box>
                  </Box>
                )
              ) : (() => {
                console.log('Student routing decision:', { userRole, user: !!user });
                // Only route to student dashboard if userRole is explicitly 'Student'
                // Don't fallback to student if userRole is null/undefined
                return userRole === 'Student';
              })() ? (
                <Box sx={{ display: "flex", flexDirection: "column", height: "100vh", bgcolor: "background.default" }}>
                  <UserHeader currentUser={currentUser} userProfile={userProfile} />
                  <Box sx={{ display: "flex", flex: 1 }}>
                    <UserSidebar currentUser={currentUser} userProfile={userProfile} />
                    <Box sx={{ 
                      flex: 1, 
                      overflowY: "auto",
                      height: "calc(100vh - 32px)",
                      minHeight: "calc(100vh - 32px)"
                    }}>
                      <Routes>
                        <Route path="/" element={<UserDashboard currentUser={currentUser} userProfile={userProfile} />} />
                        <Route path="/user-dashboard" element={<UserDashboard currentUser={currentUser} userProfile={userProfile} />} />
                        <Route path="/violations" element={<UserViolations currentUser={currentUser} />} />
                        <Route path="/announcements" element={<UserAnnouncements />} />
                        <Route path="/activity" element={<StudentActivities />} />
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
                // Fallback when user role is not yet determined
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
                  <CircularProgress size={40} sx={{ mb: 2 }} />
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    {isRefreshing ? 'Restoring your dashboard...' : 'Setting up your account...'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Please wait while we determine your role
                  </Typography>
                  {authError && (
                    <Alert severity="warning" sx={{ mb: 2, maxWidth: 400 }}>
                      {authError}
                    </Alert>
                  )}
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