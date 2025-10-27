import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { setDoc, doc, addDoc, collection } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

// Sample users data with base64 profile pictures for conversion
const sampleUsers = [
  {
    email: 'admin@school.com',
    password: 'admin123',
    fullName: 'Admin User',
    role: 'Admin',
    phone: '09123456789',
    address: 'Cebu City, Philippines',
    profilePic: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjMTk3NmQyIi8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjgwIiByPSIzMCIgZmlsbD0id2hpdGUiLz4KPHJlY3QgeD0iNjAiIHk9IjEyMCIgd2lkdGg9IjgwIiBoZWlnaHQ9IjQwIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K',
    profilePicType: 'image/svg+xml',
    profilePicName: 'admin-avatar.svg'
  },
  {
    email: 'teacher@school.com',
    password: 'teacher123',
    fullName: 'Teacher User',
    role: 'Teacher',
    phone: '09123456788',
    address: 'Cebu City, Philippines',
    profilePic: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjNGNhZjUwIi8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjgwIiByPSIzMCIgZmlsbD0id2hpdGUiLz4KPHJlY3QgeD0iNjAiIHk9IjEyMCIgd2lkdGg9IjgwIiBoZWlnaHQ9IjQwIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K',
    profilePicType: 'image/svg+xml',
    profilePicName: 'teacher-avatar.svg'
  },
  {
    email: 'student@school.com',
    password: 'student123',
    fullName: 'Student User',
    role: 'Student',
    phone: '09123456787',
    address: 'Cebu City, Philippines',
    studentId: '2024-001',
    firstName: 'Student',
    lastName: 'User',
    course: 'BSIT',
    year: '2nd Year',
    section: 'A',
    profilePic: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjZmY5ODAwIi8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjgwIiByPSIzMCIgZmlsbD0id2hpdGUiLz4KPHJlY3QgeD0iNjAiIHk9IjEyMCIgd2lkdGg9IjgwIiBoZWlnaHQ9IjQwIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K',
    profilePicType: 'image/svg+xml',
    profilePicName: 'student-avatar.svg'
  }
];

// Function to upload base64 image to Firebase Storage
const uploadBase64ToStorage = async (base64String, userId, fileName) => {
  try {
    // Convert base64 to blob
    const response = await fetch(base64String);
    const blob = await response.blob();
    
    // Upload to Storage
    const storageRef = ref(storage, `profile-pictures/${userId}/${fileName}`);
    const snapshot = await uploadBytes(storageRef, blob);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading base64 to Storage:', error);
    return '';
  }
};

export const createSampleUsers = async () => {
  console.log('🚀 Starting sample users creation...');
  
  for (const userData of sampleUsers) {
    try {
      console.log(`📝 Creating ${userData.role}: ${userData.email}`);
      
      // Create user account in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        userData.email, 
        userData.password
      );
      
      const user = userCredential.user;
      console.log(`✅ Firebase Auth user created: ${user.uid}`);
      
      // Update profile with display name and base64 photo
      await updateProfile(user, {
        displayName: userData.fullName
      });
      
      console.log(`✅ User profile updated for ${userData.fullName}`);
      
      // Upload profile picture to Firebase Storage if provided
      let imageURL = '';
      if (userData.profilePic) {
        try {
          imageURL = await uploadBase64ToStorage(userData.profilePic, user.uid, userData.profilePicName);
          console.log('✅ Profile picture uploaded to Storage:', imageURL);
        } catch (uploadError) {
          console.error('❌ Profile picture upload error:', uploadError);
          // Continue without profile picture
        }
      }
      
      // Prepare comprehensive user data for Firestore
      const firestoreUserData = {
        email: user.email,
        fullName: userData.fullName,
        role: userData.role,
        phone: userData.phone || '',
        address: userData.address || '',
        profilePic: imageURL || '', // Save Storage URL instead of base64
        profilePicType: userData.profilePicType || '',
        profilePicName: userData.profilePicName || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        uid: user.uid,
        isActive: true,
        lastLogin: null,
        registrationMethod: 'system',
        createdBy: 'system'
      };
      
      // Add student-specific data if role is Student
      if (userData.role === 'Student') {
        firestoreUserData.studentId = userData.studentId;
        firestoreUserData.firstName = userData.firstName;
        firestoreUserData.lastName = userData.lastName;
        firestoreUserData.course = userData.course;
        firestoreUserData.year = userData.year;
        firestoreUserData.section = userData.section;
        firestoreUserData.studentInfo = {
          studentId: userData.studentId,
          firstName: userData.firstName,
          lastName: userData.lastName,
          course: userData.course,
          year: userData.year,
          section: userData.section,
          enrollmentDate: new Date().toISOString()
        };
      }
      
      // Add role-specific data
      if (userData.role === 'Admin') {
        firestoreUserData.adminInfo = {
          permissions: ['all'],
          adminLevel: 'super',
          assignedBy: 'system',
          assignedDate: new Date().toISOString()
        };
      } else if (userData.role === 'Teacher') {
        firestoreUserData.teacherInfo = {
          subjects: [],
          department: 'General',
          hireDate: new Date().toISOString(),
          status: 'active'
        };
      }
      
      // Save user data to Firestore
      await setDoc(doc(db, 'users', user.uid), firestoreUserData);
      console.log(`✅ User data saved to Firestore: ${userData.email}`);
      
      // Create user preferences
      await setDoc(doc(db, 'user_preferences', user.uid), {
        uid: user.uid,
        email: user.email,
        theme: 'light',
        language: 'en',
        notifications: {
          email: true,
          push: true,
          sms: false
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      console.log(`✅ User preferences created: ${userData.email}`);
      
      // Log activity
      await addDoc(collection(db, 'activity_log'), {
        message: `Sample user created: ${userData.fullName} (${userData.role})`,
        type: 'user_creation',
        user: user.uid,
        userEmail: user.email,
        userRole: userData.role,
        timestamp: new Date().toISOString(),
        details: {
          createdBy: 'system',
          isSampleUser: true,
          hasProfilePic: !!userData.profilePic,
          profilePicSize: userData.profilePic ? `${(userData.profilePic.length / 1024).toFixed(2)} KB` : 'N/A',
          studentInfo: userData.role === 'Student' ? {
            studentId: userData.studentId,
            course: userData.course,
            year: userData.year,
            section: userData.section
          } : null
        }
      });
      console.log(`✅ Activity logged: ${userData.email}`);
      
      console.log(`🎉 Successfully created ${userData.role}: ${userData.email}`);
      
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        console.log(`⚠️ User already exists: ${userData.email}`);
      } else {
        console.error(`❌ Error creating ${userData.role}:`, error);
        console.error(`   Email: ${userData.email}`);
        console.error(`   Error Code: ${error.code}`);
        console.error(`   Error Message: ${error.message}`);
      }
    }
  }
  
  console.log('🏁 Sample users creation completed!');
  console.log('📋 Summary: Check the console above for detailed results.');
};

// Function to create a single user
export const createSingleUser = async (userData) => {
  try {
    console.log(`🚀 Creating user: ${userData.email} (${userData.role})`);
    
    // Create user account in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      userData.email, 
      userData.password
    );
    
    const user = userCredential.user;
    console.log(`✅ Firebase Auth user created: ${user.uid}`);
    
    // Update profile with display name
    await updateProfile(user, {
      displayName: userData.fullName
    });
    
    console.log(`✅ User profile updated: ${userData.fullName}`);
    
    // Upload profile picture to Firebase Storage if provided
    let imageURL = '';
    if (userData.profilePic) {
      try {
        imageURL = await uploadBase64ToStorage(userData.profilePic, user.uid, userData.profilePicName);
        console.log('✅ Profile picture uploaded to Storage:', imageURL);
      } catch (uploadError) {
        console.error('❌ Profile picture upload error:', uploadError);
        // Continue without profile picture
      }
    }
    
    // Prepare comprehensive user data for Firestore
    const firestoreUserData = {
      email: user.email,
      fullName: userData.fullName,
      role: userData.role,
      phone: userData.phone || '',
      address: userData.address || '',
      profilePic: imageURL || '', // Save Storage URL instead of base64
      profilePicType: userData.profilePicType || '',
      profilePicName: userData.profilePicName || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      uid: user.uid,
      isActive: true,
      lastLogin: null,
      registrationMethod: userData.registrationMethod || 'admin',
      createdBy: userData.createdBy || 'admin'
    };
    
    // Add student-specific data if role is Student
    if (userData.role === 'Student') {
      firestoreUserData.studentId = userData.studentId;
      firestoreUserData.firstName = userData.firstName;
      firestoreUserData.lastName = userData.lastName;
      firestoreUserData.course = userData.course;
      firestoreUserData.year = userData.year;
      firestoreUserData.section = userData.section;
      firestoreUserData.sex = userData.sex;
      firestoreUserData.contact = userData.contact;
      firestoreUserData.birthdate = userData.birthdate;
      firestoreUserData.age = userData.age;
      firestoreUserData.image = userData.image;
      
      // Add transfer information if available
      if (userData.transferredFromStudents) {
        firestoreUserData.transferredFromStudents = true;
        firestoreUserData.transferDate = userData.transferDate;
        firestoreUserData.originalStudentData = userData.originalStudentData;
      }
      
      firestoreUserData.studentInfo = {
        studentId: userData.studentId,
        firstName: userData.firstName,
        lastName: userData.lastName,
        course: userData.course,
        year: userData.year,
        section: userData.section,
        sex: userData.sex,
        contact: userData.contact,
        birthdate: userData.birthdate,
        age: userData.age,
        image: userData.image,
        enrollmentDate: new Date().toISOString(),
        transferredFromStudents: userData.transferredFromStudents || false
      };
    }
    
    // Add role-specific data
    if (userData.role === 'Admin') {
      firestoreUserData.adminInfo = {
        permissions: ['all'],
        adminLevel: 'super',
        assignedBy: 'admin',
        assignedDate: new Date().toISOString()
      };
    } else if (userData.role === 'Teacher') {
      firestoreUserData.teacherInfo = {
        subjects: [],
        department: 'General',
        hireDate: new Date().toISOString(),
        status: 'active'
      };
    }
    
    // Save user data to Firestore
    await setDoc(doc(db, 'users', user.uid), firestoreUserData);
    console.log(`✅ User data saved to Firestore: ${userData.email}`);
    
    // Create user preferences
    await setDoc(doc(db, 'user_preferences', user.uid), {
      uid: user.uid,
      email: user.email,
      theme: 'light',
      language: 'en',
      notifications: {
        email: true,
        push: true,
        sms: false
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    console.log(`✅ User preferences created: ${userData.email}`);
    
    // Log activity
    await addDoc(collection(db, 'activity_log'), {
      message: `User created by admin: ${userData.fullName} (${userData.role})`,
      type: 'user_creation',
      user: user.uid,
      userEmail: user.email,
      userRole: userData.role,
      timestamp: new Date().toISOString(),
      details: {
        createdBy: 'admin',
        isSampleUser: false,
        hasProfilePic: !!userData.profilePic,
        profilePicSize: userData.profilePic ? `${(userData.profilePic.length / 1024).toFixed(2)} KB` : 'N/A',
        studentInfo: userData.role === 'Student' ? {
          studentId: userData.studentId,
          course: userData.course,
          year: userData.year,
          section: userData.section
        } : null
      }
    });
    console.log(`✅ Activity logged: ${userData.email}`);
    
    console.log(`🎉 Successfully created ${userData.role}: ${userData.email}`);
    return { success: true, user };
    
  } catch (error) {
    console.error(`❌ Error creating user:`, error);
    console.error(`   Email: ${userData.email}`);
    console.error(`   Role: ${userData.role}`);
    console.error(`   Error Code: ${error.code}`);
    console.error(`   Error Message: ${error.message}`);
    return { success: false, error };
  }
}; 