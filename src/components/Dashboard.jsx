import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTrophy, FaMedal, FaStar, FaLeaf, FaSun, FaMoon, FaRecycle, FaTrash } from 'react-icons/fa';
import Confetti from 'react-confetti';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { auth, db } from '../firebase';
import { doc, getDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

const Dashboard = () => {
  const [userData, setUserData] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [classificationHistory, setClassificationHistory] = useState([]);
  const [leaderboardError, setLeaderboardError] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      if (auth.currentUser) {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserData(data);

          // Simulate level-up confetti (for demo purposes, trigger on first load if level > 1)
          if (data.level > 1) {
            setShowConfetti(true);
          }
        }

        const historyQuery = query(
          collection(db, `users/${auth.currentUser.uid}/classifications`),
          orderBy('timestamp', 'desc'),
          limit(5)
        );
        const historyDocs = await getDocs(historyQuery);
        setClassificationHistory(historyDocs.docs.map(doc => doc.data()));
      }
    };

    const fetchLeaderboard = async () => {
      try {
        const leaderboardQuery = query(
          collection(db, 'users'),
          orderBy('points', 'desc'),
          limit(5)
        );
        const leaderboardDocs = await getDocs(leaderboardQuery);
        setLeaderboard(leaderboardDocs.docs.map(doc => doc.data()));
        setLeaderboardError(null);
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
        setLeaderboardError('Unable to load leaderboard. Please try again later.');
      }
    };

    fetchUserData();
    fetchLeaderboard();
  }, []);

  const pointsToNextLevel = userData ? (userData.level * 100) - userData.points : 0;
  const progressPercentage = userData ? (userData.points / (userData.level * 100)) * 100 : 0;

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-gray-50 to-gray-100'}`}>
      {showConfetti && <Confetti recycle={false} numberOfPieces={200} />}
      {/* Header */}
      <header className={`flex justify-between items-center p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-gradient-to-r from-teal-500 to-blue-500'} shadow-lg`}>
        <div className="flex items-center space-x-4">
          <motion.div
            className={`${isDarkMode ? 'bg-gray-700' : 'bg-white'} p-2 rounded-full shadow-md`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <FaLeaf className={`h-6 w-6 ${isDarkMode ? 'text-teal-300' : 'text-teal-500'}`} />
          </motion.div>
          <h1 className="text-2xl font-bold text-white">EnviRon</h1>
        </div>
        <div className="flex items-center space-x-4">
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
            onClick={() => auth.signOut()}
            className="px-4 py-2 text-white font-medium rounded-full bg-red-500 hover:bg-red-600 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Sign Out"
          >
            Sign Out
          </motion.button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {userData ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* User Stats Card */}
            <motion.div
              className={`col-span-1 md:col-span-2 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} rounded-2xl shadow-lg p-6 border`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              whileHover={{ scale: 1.02 }}
            >
              <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-4 flex items-center space-x-2`}>
                <span>Welcome, {userData.fullName}!</span>
                <FaStar className="text-yellow-400" />
              </h2>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Email:</span>
                  <span className={isDarkMode ? 'text-gray-200' : 'text-gray-800'}>{auth.currentUser.email}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <FaMedal className="text-gold-500" />
                  <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Points:</span>
                  <span className={`font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{userData.points || 0}</span>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-20 h-20">
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
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      Level {userData.level || 1} • {pointsToNextLevel} points to next level
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <FaMedal className="text-gold-500" />
                  <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Badges:</span>
                  <span className={isDarkMode ? 'text-gray-200' : 'text-gray-800'}>
                    {userData.badges?.length > 0 ? userData.badges.join(', ') : 'None'}
                  </span>
                </div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link
                    to="/classify"
                    className={`block w-full py-3 px-4 text-center text-white font-medium rounded-full ${isDarkMode ? 'bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700' : 'bg-gradient-to-r from-teal-400 to-blue-400 hover:from-teal-500 hover:to-blue-500'} transition-all`}
                    aria-label="Classify Waste"
                  >
                    Classify Waste
                  </Link>
                </motion.div>
              </div>
            </motion.div>

            {/* Leaderboard Card */}
            <motion.div
              className={`col-span-1 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} rounded-2xl shadow-lg p-6 border`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              whileHover={{ scale: 1.02 }}
            >
              <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-4 flex items-center space-x-2`}>
                <FaTrophy className="text-yellow-400" />
                <span>Leaderboard</span>
              </h2>
              {leaderboardError ? (
                <p className="text-red-500">{leaderboardError}</p>
              ) : leaderboard.length > 0 ? (
                <ul className="space-y-3">
                  {leaderboard.map((user, index) => (
                    <motion.li
                      key={index}
                      className={`flex items-center space-x-3 p-2 rounded-lg ${index === 0 ? (isDarkMode ? 'bg-yellow-900 border-yellow-700' : 'bg-yellow-50 border-yellow-200') : ''} ${isDarkMode ? 'border-gray-700' : 'border-transparent'} border`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                      <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{index + 1}.</span>
                      {index === 0 && <FaTrophy className="text-yellow-400" />}
                      <span className={`flex-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{user.fullName || 'Unknown'}</span>
                      <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{user.points || 0} pts</span>
                    </motion.li>
                  ))}
                </ul>
              ) : (
                <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>No users to display in the leaderboard.</p>
              )}
            </motion.div>

            {/* Classification History Card */}
            <motion.div
              className={`col-span-1 md:col-span-3 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} rounded-2xl shadow-lg p-6 border`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              whileHover={{ scale: 1.02 }}
            >
              <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-4 flex items-center space-x-2`}>
                <FaLeaf className="text-green-500" />
                <span>Recent Classifications</span>
              </h2>
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
                      {entry.classification === 'Recyclable' ? (
                        <FaRecycle className="text-green-500" />
                      ) : (
                        <FaTrash className="text-red-500" />
                      )}
                      <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                        {new Date(entry.timestamp).toLocaleDateString()}
                      </span>
                      <span className={`flex-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{entry.item}</span>
                      <span
                        className={`text-sm font-medium px-2 py-1 rounded-full ${
                          entry.classification === 'Recyclable'
                            ? isDarkMode
                              ? 'bg-green-900 text-green-300'
                              : 'bg-green-100 text-green-700'
                            : isDarkMode
                            ? 'bg-red-900 text-red-300'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {entry.classification}
                      </span>
                    </motion.li>
                  ))}
                </ul>
              ) : (
                <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>No classifications yet. Start by classifying waste!</p>
              )}
            </motion.div>
          </div>
        ) : (
          <p className={`text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading...</p>
        )}
      </main>
    </div>
  );
};

export default Dashboard;