import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { addDoc, collection } from "firebase/firestore";
import { getAuth } from "firebase/auth";

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



// Helper to log activity
export async function logActivity({ message, type, user }) {
  try {
    await addDoc(collection(db, "activity_log"), {
      message,
      type,
      user: user || null,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    // Optionally handle/log error
    // console.error('Failed to log activity:', e);
  }
} 