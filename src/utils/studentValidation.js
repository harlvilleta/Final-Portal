import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Validates if a student ID exists in the system
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

    console.log("Validating student ID:", studentId);
    
    // Check if student exists in the users collection (registered students)
    const usersQuery = query(collection(db, "users"), where("studentId", "==", studentId.trim()));
    const usersSnapshot = await getDocs(usersQuery);
    
    // Check if student exists in the students collection (manually added students)
    const studentsQuery = query(collection(db, "students"), where("id", "==", studentId.trim()));
    const studentsSnapshot = await getDocs(studentsQuery);
    
    const isRegisteredInUsers = !usersSnapshot.empty;
    const isRegisteredInStudents = !studentsSnapshot.empty;
    const isValid = isRegisteredInUsers || isRegisteredInStudents;
    
    console.log("Student ID validation result:", { 
      studentId, 
      isValid, 
      isRegisteredInUsers, 
      isRegisteredInStudents 
    });
    
    return {
      isValid,
      isRegisteredInUsers,
      isRegisteredInStudents,
      error: isValid ? null : `Student ID ${studentId} is not registered in the system`
    };
  } catch (error) {
    console.error("Error validating student ID:", error);
    return {
      isValid: false,
      isRegisteredInUsers: false,
      isRegisteredInStudents: false,
      error: "Error validating student ID. Please try again."
    };
  }
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

    // First check in users collection (registered students)
    const usersQuery = query(collection(db, "users"), where("studentId", "==", studentId.trim()));
    const usersSnapshot = await getDocs(usersQuery);
    
    if (!usersSnapshot.empty) {
      const userDoc = usersSnapshot.docs[0];
      const userData = userDoc.data();
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
    const studentsQuery = query(collection(db, "students"), where("id", "==", studentId.trim()));
    const studentsSnapshot = await getDocs(studentsQuery);
    
    if (!studentsSnapshot.empty) {
      const studentDoc = studentsSnapshot.docs[0];
      const studentData = studentDoc.data();
      return {
        student: {
          id: studentDoc.id,
          studentId: studentData.id,
          firstName: studentData.firstName,
          lastName: studentData.lastName,
          fullName: `${studentData.firstName} ${studentData.lastName}`,
          email: studentData.email,
          course: studentData.course,
          year: studentData.year,
          isRegisteredUser: false
        }
      };
    }

    return { 
      student: null, 
      error: `Student with ID ${studentId} not found in the system` 
    };
  } catch (error) {
    console.error("Error getting student by ID:", error);
    return { 
      student: null, 
      error: "Error retrieving student information. Please try again." 
    };
  }
};
