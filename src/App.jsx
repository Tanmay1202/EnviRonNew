import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Signup from './components/Signup';
import Dashboard from './components/Dashboard';
import WasteClassifier from './components/WasteClassifier';
import Community from './components/Community';
import Profile from './components/Profile';
import TeaserPage from './components/TeaserPage'; // Import TeaserPage
import LifestyleSurvey from './components/LifestyleSurvey'; // Import LifestyleSurvey
import { supabase } from './supabase';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };

    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Login />} />
        <Route path="/signup" element={user ? <Navigate to="/dashboard" /> : <Signup />} />
        <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/" />} />
        <Route path="/classify" element={user ? <WasteClassifier /> : <Navigate to="/" />} />
        <Route path="/community" element={user ? <Community /> : <Navigate to="/" />} />
        <Route path="/profile" element={user ? <Profile /> : <Navigate to="/" />} />
        <Route path="/teaser" element={user ? <TeaserPage /> : <Navigate to="/" />} /> {/* Add TeaserPage route */}
        <Route path="/lifestyle-survey" element={user ? <LifestyleSurvey /> : <Navigate to="/" />} /> {/* Add LifestyleSurvey route */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;