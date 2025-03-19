import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Add this back (adjust path if different)
import App from './App';
import { auth } from './firebase';
console.log('Firebase Auth:', auth);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);