import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTrophy, FaMedal, FaStar, FaLeaf, FaSun, FaMoon, FaRecycle, FaTrash, FaTree } from 'react-icons/fa';
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
  const [currentUserEmail, setCurrentUserEmail] = useState(null); // To highlight current user in leaderboard
  const prevLevelRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Get the current user from Supabase Auth
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Set the current user's email for leaderboard comparison
          setCurrentUserEmail(user.email);

          // Fetch user data from the 'users' table
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

          // Trigger confetti on level-up
          if (prevLevelRef.current !== null && data.level > prevLevelRef.current) {
            setShowConfetti(true);
          }
          prevLevelRef.current = data.level;

          // Fetch classification history
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
        // Fetch all users for the full leaderboard
        const { data: allUsers, error: allUsersError } = await supabase
          .from('users')
          .select('full_name, points, email')
          .order('points', { ascending: false });

        if (allUsersError) {
          throw allUsersError;
        }

        setFullLeaderboard(allUsers);

        // Get current user's email to compute rank
        const { data: { user } } = await supabase.auth.getUser();
        const currentUserIndex = allUsers.findIndex(u => u.email === user.email);
        setUserRank(currentUserIndex + 1);

        // Fetch top 5 for the leaderboard
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

    // Initial fetch
    fetchUserData();
    fetchLeaderboard();

    // Set up real-time subscription for leaderboard updates
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

    // Set up real-time subscription for classification history updates
    const historySubscription = supabase
      .channel('public:classifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'classifications' },
        (payload) => {
          fetchUserData(); // Refetch user data and history when a new classification is added
        }
      )
      .subscribe();

    // Clean up subscriptions on unmount
    return () => {
      supabase.removeChannel(leaderboardSubscription);
      supabase.removeChannel(historySubscription);
    };
  }, []);

  const pointsToNextLevel = userData ? (userData.level * 100) - userData.points : 0;
  const progressPercentage = userData ? (userData.points / (userData.level * 100)) * 100 : 0;
  const treeGrowth = userData ? Math.min(userData.points / 1000, 1) * 100 : 0; // Tree grows fully at 1000 points

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
      navigate('/'); // Redirect to login page after sign-out
    } catch (err) {
      console.error('Error signing out:', err);
    }
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {userData ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* User Stats Card */}
            <motion.div
              className={`col-span-1 md:col-span-2 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} rounded-2xl shadow-lg p-6 border relative overflow-hidden`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              whileHover={{ scale: 1.02 }}
            >
              {/* Subtle Glow Effect */}
              <div className="absolute inset-0 shadow-[inset_0_0_10px_rgba(45,212,191,0.3)] rounded-2xl pointer-events-none" />
              <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-4 flex items-center space-x-2`}>
                <span>Welcome, {userData.full_name}!</span>
                <FaStar className="text-yellow-400" />
              </h2>
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
                {/* Green Impact Stat */}
                <div className="flex items-center space-x-2">
                  <FaLeaf className="text-green-500" />
                  <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Green Impact:</span>
                  <span className={`${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                    You’ve helped recycle {classificationHistory.length} items!
                  </span>
                </div>
                {/* Tree Growth Animation */}
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
                {/* Badge Showcase */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <FaMedal className="text-yellow-400" />
                    <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Badges:</span>
                  </div>
                  {userData.badges?.length > 0 ? (
                    <div className="flex space-x-3 overflow-x-auto pb-2">
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
                </div>
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
              </div>
            </motion.div>

            {/* Leaderboard Card */}
            <motion.div
              className={`col-span-1 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} rounded-2xl shadow-lg p-6 border relative overflow-hidden`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="absolute inset-0 shadow-[inset_0_0_10px_rgba(45,212,191,0.3)] rounded-2xl pointer-events-none" />
              <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-4 flex items-center space-x-2`}>
                <FaTrophy className="text-yellow-400 animate-bounce" />
                <span>Leaderboard</span>
              </h2>
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

            {/* Classification History Card */}
            <motion.div
              className={`col-span-1 md:col-span-3 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} rounded-2xl shadow-lg p-6 border relative overflow-hidden`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="absolute inset-0 shadow-[inset_0_0_10px_rgba(45,212,191,0.3)] rounded-2xl pointer-events-none" />
              <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-4 flex items-center space-x-2`}>
                <FaLeaf className="text-green-500 animate-pulse" />
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
          </div>
        ) : (
          <p className={`text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading...</p>
        )}
      </main>
    </div>
  );
};

export default Dashboard;