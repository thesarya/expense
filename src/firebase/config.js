import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

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

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app; 