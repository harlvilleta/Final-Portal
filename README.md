# School Management System

A comprehensive school management portal built with React, Firebase, and Material-UI that provides different interfaces for administrators, teachers, and students.

## 🚀 Features

### Admin/Teacher Features
- **Dashboard Overview**: Statistics and analytics
- **Student Management**: Add, edit, delete, and view student records
- **Violation Management**: Record and track student violations
- **Announcements**: Create and manage school announcements
- **Activity Logging**: Track system activities
- **Profile Management**: User profile settings
- **Email System**: Send emails to students/parents

### Student Features
- **Personal Dashboard**: View personal statistics and recent activities
- **Violation History**: View personal violation records
- **Announcements**: View school announcements
- **Lost & Found**: Report and search for lost items
- **Notifications**: Receive and manage notifications

## 🛠️ Technical Stack

- **Frontend**: React 18, Material-UI 5
- **Backend**: Firebase (Firestore, Authentication, Storage)
- **Routing**: React Router DOM 6
- **Charts**: Recharts
- **Email**: EmailJS

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Firebase project with Firestore, Authentication, and Storage enabled

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd school-admin-portal
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Firebase Configuration**
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Authentication (Email/Password and Google)
   - Enable Firestore Database
   - Enable Storage
   - Copy your Firebase config to `src/firebase.js`

4. **Start the development server**
   ```bash
   npm start
   ```

## 🔐 Authentication

The system supports three user roles:
- **Admin**: Full access to all features
- **Teacher**: Similar access to Admin
- **Student**: Limited access to personal features

### Default Login Credentials
You can register new accounts through the registration page, or use existing Firebase Authentication accounts.

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Sidebar.js      # Admin sidebar navigation
│   ├── UserSidebar.js  # Student sidebar navigation
│   └── RightSidebar.js # Additional sidebar
├── pages/              # Main application pages
│   ├── Login.js        # Authentication page
│   ├── Register.js     # User registration
│   ├── Overview.js     # Admin dashboard
│   ├── Students.js     # Student management
│   ├── UserDashboard.js # Student dashboard
│   └── ...            # Other feature pages
├── firebase.js         # Firebase configuration
├── App.js             # Main application component
└── index.js           # Application entry point
```

## 🐛 Recent Fixes

### Fixed Issues:
1. **Login Form**: Enhanced validation, error handling, and user experience
2. **Profile.js**: Fixed incorrect Firebase imports and configuration
3. **UserSidebar.js**: Added missing React useEffect import
4. **Options.js**: Removed conflicting Sidebar component rendering
5. **UserDashboard.js**: Fixed routing conflicts and simplified component structure
6. **App.js**: Improved student routing and component imports
7. **Navigation**: Fixed path mismatches between sidebar and routes

### Key Improvements:
- ✅ Proper form validation and error handling
- ✅ Consistent Firebase imports across all components
- ✅ Fixed React import issues
- ✅ Improved routing structure
- ✅ Enhanced user experience with better loading states
- ✅ Security improvements with account lockout protection

## 🚀 Running the Application

1. **Development Mode**
   ```bash
   npm start
   ```
   Opens [http://localhost:3000](http://localhost:3000) in your browser.

2. **Production Build**
   ```bash
   npm run build
   ```

## 🔧 Configuration

### Firebase Setup
1. Create a new Firebase project
2. Enable Authentication with Email/Password and Google providers
3. Create a Firestore database
4. Enable Storage
5. Update the Firebase configuration in `src/firebase.js`

### EmailJS Setup (Optional)
For email functionality, configure EmailJS in `src/pages/Options.js`:
- Service ID
- Template ID
- User ID

## 📱 Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

If you encounter any issues:
1. Check the browser console for error messages
2. Verify Firebase configuration
3. Ensure all dependencies are installed
4. Check network connectivity

## 🔄 Updates

The application has been thoroughly reviewed and all major issues have been resolved. The codebase is now stable and ready for production use. 