// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAXEdVLEnPvY0qr8vvkl9F5zX0UjsuwWV8",
  authDomain: "expenses-de82b.firebaseapp.com",
  projectId: "expenses-de82b",
  storageBucket: "expenses-de82b.firebasestorage.app",
  messagingSenderId: "1018174345074",
  appId: "1:1018174345074:web:f1a76366fd4a667c86d7eb"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;