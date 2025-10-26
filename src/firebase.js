import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator, enableNetwork, disableNetwork } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { addDoc, collection } from "firebase/firestore";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { FIREBASE_OPTIMIZATION_CONFIG, performanceTracker, shouldRetry, getRetryDelay } from "./config/firebaseOptimization";

const firebaseConfig = {
  apiKey: "AIzaSyDgLOZTM2lAPIdGBVQtzvoAXvXHyWn9boA",
  authDomain: "school-admin-portal-75c95.firebaseapp.com",
  projectId: "school-admin-portal-75c95",
  storageBucket: "school-admin-portal-75c95.appspot.com",
  messagingSenderId: "611337244939",
  appId: "1:611337244939:web:f2ff5220a4b4e1d7c5520e"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

// Set authentication persistence to LOCAL to maintain login state across page refreshes
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('Failed to set auth persistence:', error);
});

// Connection retry mechanism with exponential backoff
export const retryConnection = async (operation, maxRetries = FIREBASE_OPTIMIZATION_CONFIG.connection.maxRetries, baseDelay = FIREBASE_OPTIMIZATION_CONFIG.connection.baseDelay) => {
  const operationId = `retry_${Date.now()}_${Math.random()}`;
  performanceTracker.startTimer(operationId);
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      performanceTracker.endTimer(operationId);
      return result;
    } catch (error) {
      console.warn(`Connection attempt ${attempt} failed:`, error.message);
      
      // Check if error is retryable
      if (!shouldRetry(error)) {
        performanceTracker.endTimer(operationId);
        throw error;
      }
      
      if (attempt === maxRetries) {
        performanceTracker.endTimer(operationId);
        throw new Error(`Connection failed after ${maxRetries} attempts: ${error.message}`);
      }
      
      // Use optimized retry delay
      const delay = getRetryDelay(attempt, baseDelay);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Connection health check
export const checkConnectionHealth = async () => {
  try {
    await enableNetwork(db);
    return true;
  } catch (error) {
    console.error('Connection health check failed:', error);
    return false;
  }
};

// Initialize connection with retry
export const initializeConnection = async () => {
  try {
    await retryConnection(async () => {
      await enableNetwork(db);
    });
    return true;
  } catch (error) {
    console.error('Failed to initialize connection:', error);
    return false;
  }
};

// Helper to log activity with retry mechanism
export async function logActivity({ message, type, user }) {
  try {
    await retryConnection(async () => {
      await addDoc(collection(db, "activity_log"), {
        message,
        type,
        user: user || null,
        timestamp: new Date().toISOString(),
      });
    });
  } catch (e) {
    // Optionally handle/log error
    console.warn('Failed to log activity after retries:', e);
  }
} 