// src/components/Dashboard.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTrophy, FaMedal, FaStar, FaLeaf, FaSun, FaMoon, FaRecycle, FaTrash, FaTree, FaComment, FaBars, FaTimes } from 'react-icons/fa';
import Confetti from 'react-confetti';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import Modal from 'react-modal';
import { supabase } from '../supabase';

// Bind modal to app element for accessibility
Modal.setAppElement('#root');

const Dashboard = () => {
  const [userData, setUserData] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [fullLeaderboard, setFullLeaderboard] = useState([]);
  const [classificationHistory, setClassificationHistory] = useState([]);
  const [leaderboardError, setLeaderboardError] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLeaderboardModalOpen, setIsLeaderboardModalOpen] = useState(false);
  const [userRank, setUserRank] = useState(null);
  const [currentUserEmail, setCurrentUserEmail] = useState(null);
  const [chatMessage, setChatMessage] = useState('');
  const [chatResponse, setChatResponse] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const [weather, setWeather] = useState('');
  const [recAnswer, setRecAnswer] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // For mobile sidebar
  const prevLevelRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUserEmail(user.email);

          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();

          if (error) {
            console.error('Error fetching user data:', error);
            return;
          }

          setUserData(data);

          if (prevLevelRef.current !== null && data.level > prevLevelRef.current) {
            setShowConfetti(true);
          }
          prevLevelRef.current = data.level;

          const { data: historyData, error: historyError } = await supabase
            .from('classifications')
            .select('*')
            .eq('user_id', user.id)
            .order('timestamp', { ascending: false })
            .limit(5);

          if (historyError) {
            console.error('Error fetching classification history:', historyError);
            return;
          }

          setClassificationHistory(historyData);
        }
      } catch (err) {
        console.error('Error in fetchUserData:', err);
      }
    };

    const fetchLeaderboard = async () => {
      try {
        const { data: allUsers, error: allUsersError } = await supabase
          .from('users')
          .select('full_name, points, email')
          .order('points', { ascending: false });

        if (allUsersError) {
          throw allUsersError;
        }

        setFullLeaderboard(allUsers);

        const { data: { user } } = await supabase.auth.getUser();
        const currentUserIndex = allUsers.findIndex(u => u.email === user.email);
        setUserRank(currentUserIndex + 1);

        const { data: leaderboardData, error: leaderboardError } = await supabase
          .from('users')
          .select('full_name, points, email')
          .order('points', { ascending: false })
          .limit(5);

        if (leaderboardError) {
          throw leaderboardError;
        }

        setLeaderboard(leaderboardData);
        setLeaderboardError(null);
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
        setLeaderboardError('Unable to load leaderboard. Please try again later.');
      }
    };

    const fetchWeather = async () => {
      try {
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=London&appid=${import.meta.env.VITE_OPENWEATHER_API_KEY}&units=metric`
        );
        const data = await response.json();
        setWeather(`Today in London: ${data.main.temp}°C, ${data.weather[0].description}`);
      } catch (error) {
        console.error('Error fetching weather:', error);
        setWeather('Weather data unavailable');
      }
    };

    fetchUserData();
    fetchLeaderboard();
    fetchWeather();

    const leaderboardSubscription = supabase
      .channel('public:users')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        (payload) => {
          fetchLeaderboard();
        }
      )
      .subscribe();

    const historySubscription = supabase
      .channel('public:classifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'classifications' },
        (payload) => {
          fetchUserData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(leaderboardSubscription);
      supabase.removeChannel(historySubscription);
    };
  }, []);

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim()) {
      setChatError('Please enter a message.');
      return;
    }

    setChatLoading(true);
    setChatError('');
    setChatResponse('');

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `You are an eco-friendly chatbot for the EnviRon app. Provide a concise eco-tip or answer related to sustainability, recycling, or climate change based on the user's input. Keep the response under 100 words and focus on actionable advice. User input: "${chatMessage}"`,
                  },
                ],
              },
            ],
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to get response from Gemini API');
      }

      const chatReply = data.candidates[0].content.parts[0].text;
      setChatResponse(chatReply);
    } catch (err) {
      setChatError('Error fetching eco-tip: ' + err.message);
    } finally {
      setChatLoading(false);
      setChatMessage('');
    }
  };

  const handleRecSubmit = (e) => {
    e.preventDefault();
    setRecommendation(
      recAnswer.toLowerCase() === 'yes'
        ? 'Great! Try composting next.'
        : 'Start recycling to save 0.2 kg CO2e!'
    );
  };

  const pointsToNextLevel = userData ? (userData.level * 100) - userData.points : 0;
  const progressPercentage = userData ? (userData.points / (userData.level * 100)) * 100 : 0;
  const treeGrowth = userData ? Math.min(userData.points / 1000, 1) * 100 : 0;

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const openLeaderboardModal = () => {
    setIsLeaderboardModalOpen(true);
  };

  const closeLeaderboardModal = () => {
    setIsLeaderboardModalOpen(false);
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/');
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-gray-50 to-gray-100'} flex flex-col`}>
      {showConfetti && <Confetti recycle={false} numberOfPieces={200} />}
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
            <FaLeaf className={`h-6 w-6 ${isDarkMode ? 'text-teal-300' : 'text-teal-500'}`} />
          </motion.div>
          <h1 className="text-xl md:text-2xl font-bold text-white">EnviRon</h1>
        </div>
        <div className="hidden md:flex items-center space-x-4">
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
      <AnimatePresence>
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
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto p-4 md:p-6 space-y-8">
        {userData ? (
          <>
            {/* User Overview Section */}
            <section className="space-y-6">
              <h2 className={`text-2xl md:text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} flex items-center space-x-2`}>
                <FaStar className="text-yellow-400" />
                <span>Your Progress</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* User Stats Card */}
                <motion.div
                  className={`col-span-1 md:col-span-2 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} rounded-2xl shadow-lg p-6 border relative overflow-hidden`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="absolute inset-0 shadow-[inset_0_0_10px_rgba(45,212,191,0.3)] rounded-2xl pointer-events-none" />
                  <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-4`}>Welcome, {userData.full_name}!</h3>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Email:</span>
                      <span className={`${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                        {userData.email}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <FaMedal className="text-yellow-400 animate-pulse" />
                      <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Points:</span>
                      <span className={`font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                        {userData.points || 0}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="w-20 h-20 relative">
                        <CircularProgressbar
                          value={progressPercentage}
                          text={`${userData.level || 1}`}
                          styles={buildStyles({
                            pathColor: isDarkMode ? '#60A5FA' : '#2DD4BF',
                            textColor: isDarkMode ? '#fff' : '#2DD4BF',
                            trailColor: isDarkMode ? '#4B5563' : '#E5E7EB',
                            pathTransitionDuration: 1,
                          })}
                        />
                        <motion.div
                          className="absolute inset-0 flex items-center justify-center"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                        >
                          <FaStar className="text-yellow-400 opacity-50" />
                        </motion.div>
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          Level {userData.level || 1} • {pointsToNextLevel} points to next level
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <FaLeaf className="text-green-500" />
                      <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Green Impact:</span>
                      <span className={`${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                        You’ve helped recycle {classificationHistory.length} items!
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <motion.div
                        className="relative w-8 h-8"
                        initial={{ scale: 0 }}
                        animate={{ scale: treeGrowth / 100 }}
                        transition={{ duration: 1 }}
                      >
                        <FaTree className="text-green-500 w-full h-full" />
                      </motion.div>
                      <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        Your Eco Tree: {Math.round(treeGrowth)}% grown
                      </span>
                    </div>
                  </div>
                </motion.div>

                {/* Badges Card */}
                <motion.div
                  className={`col-span-1 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} rounded-2xl shadow-lg p-6 border relative overflow-hidden`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="absolute inset-0 shadow-[inset_0_0_10px_rgba(45,212,191,0.3)] rounded-2xl pointer-events-none" />
                  <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-4 flex items-center space-x-2`}>
                    <FaMedal className="text-yellow-400" />
                    <span>Badges</span>
                  </h3>
                  {userData.badges?.length > 0 ? (
                    <div className="flex flex-wrap gap-3">
                      {userData.badges.map((badge, index) => (
                        <motion.div
                          key={index}
                          className={`p-2 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} flex items-center space-x-2 shadow-md`}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ duration: 0.3, delay: index * 0.1 }}
                          whileHover={{ scale: 1.1, rotate: 5 }}
                        >
                          <FaMedal className="text-yellow-400" />
                          <span className={`${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{badge}</span>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>No badges yet. Keep classifying!</p>
                  )}
                </motion.div>
              </div>
            </section>

            {/* Community and Environment Section */}
            <section className="space-y-6">
              <h2 className={`text-2xl md:text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} flex items-center space-x-2`}>
                <FaTrophy className="text-yellow-400" />
                <span>Community & Environment</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Leaderboard Card */}
                <motion.div
                  className={`col-span-1 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} rounded-2xl shadow-lg p-6 border relative overflow-hidden`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="absolute inset-0 shadow-[inset_0_0_10px_rgba(45,212,191,0.3)] rounded-2xl pointer-events-none" />
                  <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-4 flex items-center space-x-2`}>
                    <FaTrophy className="text-yellow-400 animate-bounce" />
                    <span>Leaderboard</span>
                  </h3>
                  {leaderboardError ? (
                    <p className="text-red-500">{leaderboardError}</p>
                  ) : leaderboard.length > 0 ? (
                    <>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-2`}>Your Rank: {userRank || 'N/A'}</p>
                      <ul className="space-y-3">
                        {leaderboard.map((user, index) => (
                          <motion.li
                            key={index}
                            className={`flex items-center space-x-3 p-2 rounded-lg ${user.email === currentUserEmail ? (isDarkMode ? 'bg-yellow-900 border-yellow-700' : 'bg-yellow-100 border-yellow-200') : index === 0 ? (isDarkMode ? 'bg-yellow-900 border-yellow-700' : 'bg-yellow-50 border-yellow-200') : ''} ${isDarkMode ? 'border-gray-700' : 'border-transparent'} border`}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.1 }}
                          >
                            <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{index + 1}.</span>
                            {index === 0 && <FaTrophy className="text-yellow-400" />}
                            <span className={`flex-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{user.full_name || 'Unknown'}</span>
                            <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{user.points || 0} pts</span>
                          </motion.li>
                        ))}
                      </ul>
                      <motion.button
                        onClick={openLeaderboardModal}
                        className={`mt-4 px-4 py-2 text-white font-medium rounded-full ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} transition-colors shadow-lg`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        aria-label="View Full Leaderboard"
                      >
                        View Full Leaderboard
                      </motion.button>
                    </>
                  ) : (
                    <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>No users to display in the leaderboard.</p>
                  )}
                </motion.div>

                {/* Weather Widget Card */}
                <motion.div
                  className={`col-span-1 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} rounded-2xl shadow-lg p-6 border relative overflow-hidden`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="absolute inset-0 shadow-[inset_0_0_10px_rgba(45,212,191,0.3)] rounded-2xl pointer-events-none" />
                  <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-4 flex items-center space-x-2`}>
                    <FaSun className="text-yellow-400 animate-pulse" />
                    <span>Weather</span>
                  </h3>
                  <p className={`${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{weather}</p>
                </motion.div>

                {/* Quick Action Card */}
                <motion.div
                  className={`col-span-1 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} rounded-2xl shadow-lg p-6 border relative overflow-hidden`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="absolute inset-0 shadow-[inset_0_0_10px_rgba(45,212,191,0.3)] rounded-2xl pointer-events-none" />
                  <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-4 flex items-center space-x-2`}>
                    <FaLeaf className="text-green-500" />
                    <span>Quick Actions</span>
                  </h3>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    animate={{ y: [0, -10, 0], transition: { repeat: Infinity, duration: 1.5 } }}
                  >
                    <Link
                      to="/classify"
                      className={`block w-full py-3 px-4 text-center text-white font-medium rounded-full ${isDarkMode ? 'bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700' : 'bg-gradient-to-r from-teal-400 to-blue-400 hover:from-teal-500 hover:to-blue-500'} transition-all flex items-center justify-center space-x-2 shadow-lg`}
                      aria-label="Classify Waste"
                    >
                      <FaLeaf className="text-white" />
                      <span>Classify Waste</span>
                    </Link>
                  </motion.div>
                </motion.div>
              </div>
            </section>

            {/* Tools and Insights Section */}
            <section className="space-y-6">
              <h2 className={`text-2xl md:text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} flex items-center space-x-2`}>
                <FaComment className="text-blue-500" />
                <span>Tools & Insights</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Chatbot Card */}
                <motion.div
                  className={`col-span-1 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} rounded-2xl shadow-lg p-6 border relative overflow-hidden`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="absolute inset-0 shadow-[inset_0_0_10px_rgba(45,212,191,0.3)] rounded-2xl pointer-events-none" />
                  <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-4 flex items-center space-x-2`}>
                    <FaComment className="text-blue-500 animate-pulse" />
                    <span>Eco-Tips Chatbot</span>
                  </h3>
                  <form onSubmit={handleChatSubmit} className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <input
                        type="text"
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        placeholder="Ask for an eco-tip (e.g., 'How can I reduce waste?')"
                        className={`flex-1 p-3 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400' : 'bg-gray-100 border-gray-300 text-gray-800 placeholder-gray-500'} focus:outline-none focus:ring-2 focus:ring-teal-400 transition-all`}
                      />
                      <motion.button
                        type="submit"
                        disabled={chatLoading}
                        className={`px-4 py-2 text-white font-medium rounded-full ${chatLoading ? 'bg-gray-500 cursor-not-allowed' : isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} transition-colors shadow-lg flex items-center space-x-2`}
                        whileHover={{ scale: chatLoading ? 1 : 1.05 }}
                        whileTap={{ scale: chatLoading ? 1 : 0.95 }}
                      >
                        {chatLoading ? (
                          <svg
                            className="animate-spin h-5 w-5 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                            />
                          </svg>
                        ) : (
                          <span>Send</span>
                        )}
                      </motion.button>
                    </div>
                    {chatError && (
                      <motion.p
                        className="text-red-500 text-sm p-2 bg-red-100 rounded-lg"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        {chatError}
                      </motion.p>
                    )}
                    {chatResponse && (
                      <motion.div
                        className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800'} shadow-md`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <p>{chatResponse}</p>
                      </motion.div>
                    )}
                  </form>
                </motion.div>

                {/* Lifestyle Recommender Card */}
                <motion.div
                  className={`col-span-1 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} rounded-2xl shadow-lg p-6 border relative overflow-hidden`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="absolute inset-0 shadow-[inset_0_0_10px_rgba(45,212,191,0.3)] rounded-2xl pointer-events-none" />
                  <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-4 flex items-center space-x-2`}>
                    <FaLeaf className="text-green-500 animate-pulse" />
                    <span>Lifestyle Recommender</span>
                  </h3>
                  <form onSubmit={handleRecSubmit} className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <input
                        type="text"
                        value={recAnswer}
                        onChange={(e) => setRecAnswer(e.target.value)}
                        placeholder="Do you recycle? (Yes/No)"
                        className={`flex-1 p-3 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400' : 'bg-gray-100 border-gray-300 text-gray-800 placeholder-gray-500'} focus:outline-none focus:ring-2 focus:ring-teal-400 transition-all`}
                      />
                      <motion.button
                        type="submit"
                        className={`px-4 py-2 text-white font-medium rounded-full ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} transition-colors shadow-lg`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Submit
                      </motion.button>
                    </div>
                    {recommendation && (
                      <motion.p
                        className={`p-2 rounded-lg ${isDarkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-700'}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        {recommendation}
                      </motion.p>
                    )}
                  </form>
                </motion.div>
              </div>
            </section>

            {/* History and Unlockables Section */}
            <section className="space-y-6">
              <h2 className={`text-2xl md:text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} flex items-center space-x-2`}>
                <FaLeaf className="text-green-500" />
                <span>History & Goals</span>
              </h2>
              <div className="grid grid-cols-1 gap-6">
                {/* Classification History Card */}
                <motion.div
                  className={`col-span-1 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} rounded-2xl shadow-lg p-6 border relative overflow-hidden`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.7 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="absolute inset-0 shadow-[inset_0_0_10px_rgba(45,212,191,0.3)] rounded-2xl pointer-events-none" />
                  <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-4 flex items-center space-x-2`}>
                    <FaLeaf className="text-green-500 animate-pulse" />
                    <span>Recent Classifications</span>
                  </h3>
                  {classificationHistory.length > 0 ? (
                    <ul className="space-y-3">
                      {classificationHistory.map((entry, index) => (
                        <motion.li
                          key={index}
                          className={`flex items-center space-x-3 p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} transition-colors`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.1 }}
                        >
                          {entry.result === 'Recyclable' ? (
                            <FaRecycle className="text-green-500 animate-bounce" />
                          ) : (
                            <FaTrash className="text-red-500 animate-bounce" />
                          )}
                          <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {new Date(entry.timestamp).toLocaleDateString()}
                          </span>
                          <span className={`flex-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{entry.item || 'Unknown Item'}</span>
                          <span
                            className={`text-sm font-medium px-2 py-1 rounded-full ${
                              entry.result === 'Recyclable'
                                ? isDarkMode
                                  ? 'bg-green-900 text-green-300'
                                  : 'bg-green-100 text-green-700'
                                : isDarkMode
                                ? 'bg-red-900 text-red-300'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {entry.result}
                          </span>
                        </motion.li>
                      ))}
                    </ul>
                  ) : (
                    <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>No classifications yet. Start by classifying waste!</p>
                  )}
                </motion.div>

                {/* Unlockable Features Card */}
                <motion.div
                  className={`col-span-1 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} rounded-2xl shadow-lg p-6 border relative overflow-hidden`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.8 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="absolute inset-0 shadow-[inset_0_0_10px_rgba(45,212,191,0.3)] rounded-2xl pointer-events-none" />
                  <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-4 flex items-center space-x-2`}>
                    <FaStar className="text-yellow-400 animate-pulse" />
                    <span>Unlockable Features</span>
                  </h3>
                  <div className="space-y-3">
                    <div className={`p-4 rounded-lg ${userData.level >= 5 ? (isDarkMode ? 'bg-green-900' : 'bg-green-100') : (isDarkMode ? 'bg-gray-700 opacity-75' : 'bg-gray-100 opacity-75')} flex items-center space-x-3`}>
                      <FaStar className={`${userData.level >= 5 ? 'text-green-500' : 'text-gray-400'} animate-pulse`} />
                      <div className="flex-1">
                        <p className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                          Advanced Analytics
                        </p>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {userData.level >= 5
                            ? 'Unlocked! View detailed stats about your environmental impact.'
                            : 'Unlock at Level 5 to view detailed stats about your environmental impact.'}
                        </p>
                      </div>
                      {userData.level < 5 && (
                        <span className={`text-sm font-medium px-2 py-1 rounded-full ${isDarkMode ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-100 text-yellow-700'}`}>
                          Locked
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              </div>
            </section>
          </>
        ) : (
          <p className={`text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading...</p>
        )}
      </main>

      {/* Full Leaderboard Modal */}
      <Modal
        isOpen={isLeaderboardModalOpen}
        onRequestClose={closeLeaderboardModal}
        className={`mx-auto my-10 w-11/12 max-w-lg rounded-2xl ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} p-6 shadow-lg`}
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
      >
        <h2 className="text-2xl font-bold mb-4 flex items-center space-x-2">
          <FaTrophy className="text-yellow-400" />
          <span>Full Leaderboard</span>
        </h2>
        <ul className="space-y-3 max-h-96 overflow-y-auto">
          {fullLeaderboard.map((user, index) => (
            <motion.li
              key={index}
              className={`flex items-center space-x-3 p-2 rounded-lg ${user.email === currentUserEmail ? (isDarkMode ? 'bg-yellow-900 border-yellow-700' : 'bg-yellow-100 border-yellow-200') : index === 0 ? (isDarkMode ? 'bg-yellow-900 border-yellow-700' : 'bg-yellow-50 border-yellow-200') : ''} ${isDarkMode ? 'border-gray-700' : 'border-transparent'} border`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{index + 1}.</span>
              {index === 0 && <FaTrophy className="text-yellow-400" />}
              <span className={`flex-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{user.full_name || 'Unknown'}</span>
              <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{user.points || 0} pts</span>
            </motion.li>
          ))}
        </ul>
        <motion.button
          onClick={closeLeaderboardModal}
          className={`mt-4 px-4 py-2 text-white font-medium rounded-full ${isDarkMode ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600'} transition-colors shadow-lg`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Close Leaderboard Modal"
        >
          Close
        </motion.button>
      </Modal>
    </div>
  );
};

export default Dashboard;