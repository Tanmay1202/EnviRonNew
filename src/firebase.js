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

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);