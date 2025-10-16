import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Validates if a student ID exists in the system (for existing student lookup)
 * @param {string} studentId - The student ID to validate
 * @returns {Promise<{isValid: boolean, isRegisteredInUsers: boolean, isRegisteredInStudents: boolean, error?: string}>}
 */
export const validateStudentId = async (studentId) => {
  try {
    if (!studentId || !studentId.trim()) {
      return {
        isValid: false,
        isRegisteredInUsers: false,
        isRegisteredInStudents: false,
        error: 'Student ID is required'
      };
    }

    console.log("🔍 Validating student ID:", studentId.trim());
    
    // Check if student exists in the users collection (registered students)
    const usersQuery = query(collection(db, "users"), where("studentId", "==", studentId.trim()));
    const usersSnapshot = await getDocs(usersQuery);
    
    console.log("📊 Users collection validation:", {
      studentId: studentId.trim(),
      found: !usersSnapshot.empty,
      count: usersSnapshot.size,
      docs: usersSnapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }))
    });
    
    // Check if student exists in the students collection (manually added students)
    const studentsQuery = query(collection(db, "students"), where("studentId", "==", studentId.trim()));
    const studentsSnapshot = await getDocs(studentsQuery);
    
    console.log("📊 Students collection validation:", {
      studentId: studentId.trim(),
      found: !studentsSnapshot.empty,
      count: studentsSnapshot.size,
      docs: studentsSnapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }))
    });
    
    const isRegisteredInUsers = !usersSnapshot.empty;
    const isRegisteredInStudents = !studentsSnapshot.empty;
    const isValid = isRegisteredInUsers || isRegisteredInStudents;
    
    console.log("📊 Student ID validation result:", { 
      studentId: studentId.trim(), 
      isValid, 
      isRegisteredInUsers, 
      isRegisteredInStudents,
      usersCount: usersSnapshot.size,
      studentsCount: studentsSnapshot.size
    });
    
    return {
      isValid,
      isRegisteredInUsers,
      isRegisteredInStudents,
      error: isValid ? null : `Student ID ${studentId} is not registered in the system`
    };
  } catch (error) {
    console.error("❌ Error validating student ID:", error);
    return {
      isValid: false,
      isRegisteredInUsers: false,
      isRegisteredInStudents: false,
      error: "Error validating student ID. Please try again."
    };
  }
};

/**
 * Checks if a student ID is available for new registration (not already taken)
 * @param {string} studentId - The student ID to check
 * @returns {Promise<{isAvailable: boolean, error?: string}>}
 */
export const checkStudentIdAvailability = async (studentId) => {
  try {
    if (!studentId || !studentId.trim()) {
      return {
        isAvailable: false,
        error: 'Student ID is required'
      };
    }

    console.log("🔍 Checking student ID availability:", studentId);
    
    // Check if student exists in the users collection (registered students)
    const usersQuery = query(collection(db, "users"), where("studentId", "==", studentId.trim()));
    const usersSnapshot = await getDocs(usersQuery);
    
    // Check if student exists in the students collection (manually added students)
    const studentsQuery = query(collection(db, "students"), where("studentId", "==", studentId.trim()));
    const studentsSnapshot = await getDocs(studentsQuery);
    
    const isRegisteredInUsers = !usersSnapshot.empty;
    const isRegisteredInStudents = !studentsSnapshot.empty;
    const isAvailable = !isRegisteredInUsers && !isRegisteredInStudents;
    
    console.log("📊 Student ID availability check result:", { 
      studentId, 
      isAvailable, 
      isRegisteredInUsers, 
      isRegisteredInStudents,
      usersCount: usersSnapshot.size,
      studentsCount: studentsSnapshot.size
    });
    
    if (isRegisteredInUsers) {
      console.log("❌ Student ID found in users collection");
    }
    if (isRegisteredInStudents) {
      console.log("❌ Student ID found in students collection");
    }
    if (isAvailable) {
      console.log("✅ Student ID is available for registration");
    }
    
    return {
      isAvailable,
      error: isAvailable ? null : `Student ID ${studentId} is already registered in the system`
    };
  } catch (error) {
    console.error("❌ Error checking student ID availability:", error);
    return {
      isAvailable: false,
      error: "Error checking student ID availability. Please try again."
    };
  }
};

/**
 * Checks if an email is available for new registration (not already taken)
 * @param {string} email - The email to check
 * @returns {Promise<{isAvailable: boolean, error?: string}>}
 */
export const checkEmailAvailability = async (email) => {
  try {
    if (!email || !email.trim()) {
      return {
        isAvailable: false,
        error: 'Email is required'
      };
    }

    console.log("🔍 Checking email availability:", email);
    
    // Check if email exists in the users collection (Firestore)
    console.log("📊 Checking Firestore users collection...");
    const usersQuery = query(collection(db, "users"), where("email", "==", email.trim().toLowerCase()));
    const usersSnapshot = await getDocs(usersQuery);
    
    const isRegisteredInFirestore = !usersSnapshot.empty;
    const isAvailable = !isRegisteredInFirestore;
    
    console.log("📊 Email availability check result:", { 
      email, 
      isAvailable, 
      isRegisteredInFirestore,
      usersCount: usersSnapshot.size
    });
    
    if (isRegisteredInFirestore) {
      console.log("❌ Email found in Firestore users collection");
    } else {
      console.log("✅ Email is available for registration");
    }
    
    return {
      isAvailable,
      error: isAvailable ? null : `Email ${email} is already registered in the system`
    };
  } catch (error) {
    console.error("❌ Error checking email availability:", error);
    return {
      isAvailable: false,
      error: "Error checking email availability. Please try again."
    };
  }
};

/**
 * Debug function to test email availability (can be called from browser console)
 * @param {string} email - The email to test
 * @returns {Promise<void>}
 */
export const debugEmailAvailability = async (email) => {
  console.log("🧪 Testing email availability for:", email);
  const result = await checkEmailAvailability(email);
  console.log("🧪 Result:", result);
  return result;
};

/**
 * Gets student information by student ID
 * @param {string} studentId - The student ID to look up
 * @returns {Promise<{student: object|null, error?: string}>}
 */
export const getStudentById = async (studentId) => {
  try {
    if (!studentId || !studentId.trim()) {
      return { student: null, error: 'Student ID is required' };
    }

    console.log('🔍 Looking up student with ID:', studentId.trim());

    // First check in users collection (registered students)
    const usersQuery = query(collection(db, "users"), where("studentId", "==", studentId.trim()));
    const usersSnapshot = await getDocs(usersQuery);
    
    console.log('📊 Users collection query result:', {
      studentId: studentId.trim(),
      found: !usersSnapshot.empty,
      count: usersSnapshot.size
    });
    
    if (!usersSnapshot.empty) {
      const userDoc = usersSnapshot.docs[0];
      const userData = userDoc.data();
      console.log('✅ Found student in users collection:', userData);
      return {
        student: {
          id: userDoc.id,
          studentId: userData.studentId,
          firstName: userData.firstName,
          lastName: userData.lastName,
          fullName: userData.fullName,
          email: userData.email,
          course: userData.course,
          year: userData.year,
          isRegisteredUser: true
        }
      };
    }

    // Then check in students collection (manually added students)
    const studentsQuery = query(collection(db, "students"), where("studentId", "==", studentId.trim()));
    const studentsSnapshot = await getDocs(studentsQuery);
    
    console.log('📊 Students collection query result:', {
      studentId: studentId.trim(),
      found: !studentsSnapshot.empty,
      count: studentsSnapshot.size
    });
    
    if (!studentsSnapshot.empty) {
      const studentDoc = studentsSnapshot.docs[0];
      const studentData = studentDoc.data();
      console.log('✅ Found student in students collection:', studentData);
      return {
        student: {
          id: studentDoc.id,
          studentId: studentData.studentId,
          firstName: studentData.firstName,
          lastName: studentData.lastName,
          fullName: studentData.name || `${studentData.firstName} ${studentData.lastName}`,
          email: studentData.email,
          course: studentData.course,
          year: studentData.yearLevel || studentData.year,
          isRegisteredUser: false
        }
      };
    }

    console.log('❌ Student not found in any collection');
    return { 
      student: null, 
      error: `Student with ID ${studentId} not found in the system` 
    };
  } catch (error) {
    console.error("❌ Error getting student by ID:", error);
    return { 
      student: null, 
      error: "Error retrieving student information. Please try again." 
    };
  }
};

/**
 * Gets student's classroom information by Student ID
 * @param {string} studentId - The student ID to look up
 * @returns {Promise<{classroom: object|null, error?: string}>}
 */
export const getStudentClassroomById = async (studentId) => {
  try {
    if (!studentId || !studentId.trim()) {
      return { classroom: null, error: 'Student ID is required' };
    }

    console.log('🔍 Looking up classroom for student ID:', studentId.trim());

    // First check in users collection (registered students)
    const usersQuery = query(collection(db, "users"), where("studentId", "==", studentId.trim()));
    const usersSnapshot = await getDocs(usersQuery);
    
    if (!usersSnapshot.empty) {
      const userDoc = usersSnapshot.docs[0];
      const userData = userDoc.data();
      
      if (userData.course && userData.year && userData.section) {
        console.log('✅ Found classroom info in users collection:', {
          course: userData.course,
          year: userData.year,
          section: userData.section
        });
        return {
          classroom: {
            course: userData.course,
            yearLevel: userData.year, // Map year to yearLevel for consistency
            section: userData.section,
            studentId: userData.studentId,
            source: 'users_collection'
          }
        };
      }
    }

    // Then check in students collection (manually added students)
    const studentsQuery = query(collection(db, "students"), where("studentId", "==", studentId.trim()));
    const studentsSnapshot = await getDocs(studentsQuery);
    
    if (!studentsSnapshot.empty) {
      const studentDoc = studentsSnapshot.docs[0];
      const studentData = studentDoc.data();
      
      if (studentData.course && studentData.yearLevel && studentData.section) {
        console.log('✅ Found classroom info in students collection:', {
          course: studentData.course,
          yearLevel: studentData.yearLevel,
          section: studentData.section
        });
        return {
          classroom: {
            course: studentData.course,
            yearLevel: studentData.yearLevel,
            section: studentData.section,
            studentId: studentData.studentId,
            source: 'students_collection'
          }
        };
      }
    }

    console.log('❌ No classroom information found for student ID:', studentId.trim());
    return { 
      classroom: null, 
      error: 'No classroom information found for this Student ID' 
    };

  } catch (error) {
    console.error('❌ Error looking up student classroom:', error);
    return {
      classroom: null,
      error: 'Error looking up student classroom information'
    };
  }
};
