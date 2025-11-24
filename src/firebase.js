// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAnalytics, isSupported } from "firebase/analytics";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB9X6oU2ZF6fIFkTPQlh-jwksFD64SaMkA",
  authDomain: "bishi-collection-project.firebaseapp.com",
  databaseURL: "https://bishi-collection-project-default-rtdb.firebaseio.com",
  projectId: "bishi-collection-project",
  storageBucket: "bishi-collection-project.firebasestorage.app",
  messagingSenderId: "463154634583",
  appId: "1:463154634583:web:0b534337974a6d5e1ea812",
  measurementId: "G-S4M73KT3JB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database and get a reference to the service
export const db = getDatabase(app);

// Initialize Analytics only in browser environment and if supported
let analytics;

if (typeof window !== 'undefined') {
  isSupported().then(supported => {
    if (supported) {
      try {
        analytics = getAnalytics(app);
        console.log("Firebase Analytics initialized");
      } catch (error) {
        console.warn("Firebase Analytics initialization error:", error);
      }
    } else {
      console.warn("Firebase Analytics not supported in this environment");
    }
  }).catch(error => {
    console.warn("Firebase Analytics check failed:", error);
  });
}

export { analytics };

// Log successful Firebase connection
console.log("Firebase connected successfully to:", firebaseConfig.projectId);
