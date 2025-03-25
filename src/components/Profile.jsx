// src/components/Profile.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaSun, FaMoon, FaBars, FaTimes } from 'react-icons/fa';
import { supabase } from '../supabase';

const Profile = () => {
  const [userData, setUserData] = useState(null);
  const [formData, setFormData] = useState({ fullName: '', email: '', city: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('users')
          .select('full_name, email, city')
          .eq('id', user.id)
          .single();

        if (error) {
          setError('Failed to fetch user data: ' + error.message);
          return;
        }

        setUserData(data);
        setFormData({
          fullName: data.full_name || '',
          email: data.email || '',
          city: data.city || '',
        });
      }
    };

    fetchUserData();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const { data: { user } } = await supabase.auth.getUser();
    const updates = {
      full_name: formData.fullName,
      email: formData.email,
      city: formData.city,
    };

    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id);

    if (error) {
      setError('Failed to update profile: ' + error.message);
      return;
    }

    setSuccess('Profile updated successfully!');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-gray-50 to-gray-100'} flex flex-col`}>
      {/* Header */}
      <header className={`flex justify-between items-center p-4 md:p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-gradient-to-r from-teal-500 to-blue-500'} shadow-lg`}>
        <div className="flex items-center space-x-4">
          <button onClick={toggleSidebar} className="md:hidden text-white focus:outline-none">
            {isSidebarOpen ? <FaTimes className="h-6 w-6" /> : <FaBars className="h-6 w-6" />}
          </button>
          <motion.div
            className={`${isDarkMode ? 'bg-gray-700' : 'bg-white'} p-2 rounded-full shadow-md`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-6 w-6 ${isDarkMode ? 'text-teal-300' : 'text-teal-500'}`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z"
                clipRule="evenodd"
              />
            </svg>
          </motion.div>
          <h1 className="text-xl md:text-2xl font-bold text-white">EnviRon</h1>
        </div>
        <div className="hidden md:flex items-center space-x-4">
          <Link to="/dashboard" className="text-white hover:text-gray-200 transition-colors">
            Dashboard
          </Link>
          <Link to="/classify" className="text-white hover:text-gray-200 transition-colors">
            Classify Waste
          </Link>
          <Link to="/community" className="text-white hover:text-gray-200 transition-colors">
            Community
          </Link>
          <motion.button
            onClick={toggleDarkMode}
            className={`p-2 rounded-full ${isDarkMode ? 'bg-gray-700 text-yellow-300' : 'bg-white text-gray-800'}`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            aria-label={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? <FaSun /> : <FaMoon />}
          </motion.button>
          <motion.button
            onClick={handleSignOut}
            className="px-4 py-2 text-white font-medium rounded-full bg-red-500 hover:bg-red-600 transition-colors shadow-lg"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Sign Out"
          >
            Sign Out
          </motion.button>
        </div>
      </header>

      {/* Mobile Sidebar */}
      {isSidebarOpen && (
        <motion.div
          className={`md:hidden fixed inset-y-0 left-0 w-64 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg z-50 p-6`}
          initial={{ x: -256 }}
          animate={{ x: 0 }}
          exit={{ x: -256 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Menu</h2>
            <button onClick={toggleSidebar} className={`${isDarkMode ? 'text-white' : 'text-gray-800'} focus:outline-none`}>
              <FaTimes className="h-6 w-6" />
            </button>
          </div>
          <nav className="space-y-4">
            <Link
              to="/dashboard"
              onClick={toggleSidebar}
              className={`block text-lg ${isDarkMode ? 'text-gray-200 hover:text-teal-300' : 'text-gray-800 hover:text-teal-500'} transition-colors`}
            >
              Dashboard
            </Link>
            <Link
              to="/classify"
              onClick={toggleSidebar}
              className={`block text-lg ${isDarkMode ? 'text-gray-200 hover:text-teal-300' : 'text-gray-800 hover:text-teal-500'} transition-colors`}
            >
              Classify Waste
            </Link>
            <Link
              to="/community"
              onClick={toggleSidebar}
              className={`block text-lg ${isDarkMode ? 'text-gray-200 hover:text-teal-300' : 'text-gray-800 hover:text-teal-500'} transition-colors`}
            >
              Community
            </Link>
            <button
              onClick={toggleDarkMode}
              className={`flex items-center space-x-2 text-lg ${isDarkMode ? 'text-gray-200 hover:text-teal-300' : 'text-gray-800 hover:text-teal-500'} transition-colors`}
            >
              {isDarkMode ? <FaSun /> : <FaMoon />}
              <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
            <button
              onClick={() => {
                handleSignOut();
                toggleSidebar();
              }}
              className="flex items-center space-x-2 text-lg text-red-500 hover:text-red-600 transition-colors"
            >
              <span>Sign Out</span>
            </button>
          </nav>
        </motion.div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <motion.div
          className={`w-full max-w-md ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} rounded-2xl shadow-lg p-8 border relative overflow-hidden`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="absolute inset-0 shadow-[inset_0_0_10px_rgba(45,212,191,0.3)] rounded-2xl pointer-events-none" />
          <h2 className={`text-2xl font-bold text-center mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            Your Profile
          </h2>
          {error && (
            <motion.p
              className="text-red-500 text-center mb-4 p-2 bg-red-100 rounded-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {error}
            </motion.p>
          )}
          {success && (
            <motion.p
              className="text-green-500 text-center mb-4 p-2 bg-green-100 rounded-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {success}
            </motion.p>
          )}
          {userData ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className={`block text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Full Name</label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className={`w-full p-3 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-gray-100 border-gray-300 text-gray-800'} focus:outline-none focus:ring-2 focus:ring-teal-400 transition-all`}
                />
              </div>
              <div className="space-y-2">
                <label className={`block text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full p-3 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-gray-100 border-gray-300 text-gray-800'} focus:outline-none focus:ring-2 focus:ring-teal-400 transition-all`}
                  disabled
                />
              </div>
              <div className="space-y-2">
                <label className={`block text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>City (for Weather)</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="e.g., London"
                  className={`w-full p-3 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400' : 'bg-gray-100 border-gray-300 text-gray-800 placeholder-gray-500'} focus:outline-none focus:ring-2 focus:ring-teal-400 transition-all`}
                />
              </div>
              <motion.button
                type="submit"
                className={`w-full py-3 rounded-lg font-semibold text-white ${isDarkMode ? 'bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700' : 'bg-gradient-to-r from-teal-400 to-blue-400 hover:from-teal-500 hover:to-blue-500'} transition-all shadow-lg`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Update Profile
              </motion.button>
            </form>
          ) : (
            <p className={`text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading...</p>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default Profile;