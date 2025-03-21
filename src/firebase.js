import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyC-D-G6IWI78QGYCD8ncQvxMrzQiVwWOPU",
  authDomain: "ecoquest-2025.firebaseapp.com",
  projectId: "ecoquest-2025",
  storageBucket: "ecoquest-2025.firebasestorage.app",
  messagingSenderId: "479152621362",
  appId: "1:479152621362:web:fafbdfce2713fd4389f92b",
  measurementId: "G-6NNFCWQBG9"
};

let app;
try {
  console.log('Initializing Firebase with config:', firebaseConfig);
  app = initializeApp(firebaseConfig);
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase:', error);
  throw error; // Stop execution if Firebase fails to initialize
}

let auth;
try {
  auth = getAuth(app);
  console.log('Firebase Auth initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase Auth:', error);
  throw error;
}

let db;
try {
  db = getFirestore(app);
  console.log('Firestore initialized successfully');
} catch (error) {
  console.error('Error initializing Firestore:', error);
  throw error;
}

let storage;
try {
  storage = getStorage(app);
  console.log('Firebase Storage initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase Storage:', error);
  throw error;
}

export { auth, db, storage };