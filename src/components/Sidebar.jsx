import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaMedal, FaLock } from 'react-icons/fa';
import { supabase } from '../supabase';

const Sidebar = ({ isDarkMode, isSidebarOpen, toggleSidebar }) => {
  const [userData, setUserData] = useState({ level: 1, badges: [], points: 0 });
  const [challengesCompleted, setChallengesCompleted] = useState(0);
  const [postsShared, setPostsShared] = useState(0);
  const [referralsCount, setReferralsCount] = useState(0);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch user data
        const { data: userInfo } = await supabase
          .from('users')
          .select('level, badges, points')
          .eq('id', user.id)
          .single();

        // Fetch completed challenges
        const { data: completedChallenges } = await supabase
          .from('challenge_participants')
          .select('id')
          .eq('user_id', user.id)
          .eq('completed', true);

        // Fetch posts shared
        const { data: userPosts } = await supabase
          .from('posts')
          .select('id')
          .eq('user_id', user.id);

        // Fetch referrals
        const { data: referralsData } = await supabase
          .from('referrals')
          .select('id')
          .eq('referrer_id', user.id);

        setUserData(userInfo);
        setChallengesCompleted(completedChallenges.length);
        setPostsShared(userPosts.length);
        setReferralsCount(referralsData.length);
      } catch (err) {
        console.error('Error fetching user data:', err.message);
      }
    };

    fetchUserData();
  }, []);

  const roadmap = [
    {
      level: 1,
      title: 'Eco-Novice',
      requirements: 'Complete 1 challenge',
      pointsRequired: 0,
      isUnlocked: userData.level >= 1,
      features: 'Basic Challenges, Community Forum',
    },
    {
      level: 2,
      title: 'Eco-Apprentice',
      requirements: `Complete 3 challenges (${challengesCompleted}/3), Earn 50 points (${userData.points}/50)`,
      pointsRequired: 50,
      isUnlocked: userData.level >= 2,
      features: 'Unlock more climate tools (coming soon!)',
    },
    {
      level: 3,
      title: 'Eco-Guardian',
      requirements: `Complete 5 challenges (${challengesCompleted}/5), Earn 100 points (${userData.points}/100)`,
      pointsRequired: 100,
      isUnlocked: userData.level >= 3,
      features: 'Personalized Climate Risk Dashboard',
    },
    {
      level: 4,
      title: 'Eco-Champion',
      requirements: `Complete 7 challenges (${challengesCompleted}/7), Earn 150 points (${userData.points}/150), Share 3 posts (${postsShared}/3)`,
      pointsRequired: 150,
      isUnlocked: userData.level >= 4,
      features: 'Sustainable Lifestyle Recommender',
    },
    {
      level: 5,
      title: 'Eco-Hero',
      requirements: `Complete 10 challenges (${challengesCompleted}/10), Earn 200 points (${userData.points}/200), Invite 1 friend (${referralsCount}/1)`,
      pointsRequired: 200,
      isUnlocked: userData.level >= 5,
      features: 'Enhanced Community Hub',
    },
  ];

  return (
    <motion.div
      className={`md:w-64 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6 space-y-6 ${isSidebarOpen ? 'block' : 'hidden md:block'}`}
      initial={{ x: -256 }}
      animate={{ x: 0 }}
      exit={{ x: -256 }}
      transition={{ duration: 0.3 }}
    >
      {/* Current Level and Progress */}
      <div>
        <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
          Level {userData.level}: {roadmap[userData.level - 1]?.title}
        </h3>
        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Points: {userData.points}
        </p>
        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
          <div
            className="bg-green-500 h-2 rounded-full"
            style={{ width: `${(userData.points / (roadmap[userData.level]?.pointsRequired || 50)) * 100}%` }}
          />
        </div>
      </div>

      {/* Badges */}
      <div>
        <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Badges</h3>
        <div className="flex flex-wrap gap-2 mt-2">
          {userData.badges?.length > 0 ? (
            userData.badges.map((badge, index) => (
              <motion.div
                key={index}
                className="relative group"
                whileHover={{ scale: 1.1 }}
              >
                <FaMedal className="text-yellow-400 h-6 w-6" />
                <span className="absolute hidden group-hover:block bg-gray-700 text-white text-xs rounded p-1 -top-8 left-1/2 transform -translate-x-1/2">
                  {badge}
                </span>
              </motion.div>
            ))
          ) : (
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>No badges yet!</p>
          )}
        </div>
      </div>

      {/* Roadmap */}
      <div>
        <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Roadmap</h3>
        <div className="space-y-4 mt-2">
          {roadmap.map((level) => (
            <div
              key={level.level}
              className={`p-3 rounded-lg ${level.isUnlocked ? (isDarkMode ? 'bg-gray-700' : 'bg-gray-100') : 'opacity-50'}`}
            >
              <div className="flex items-center space-x-2">
                {level.isUnlocked ? (
                  <FaMedal className="text-green-500" />
                ) : (
                  <FaLock className="text-gray-500" />
                )}
                <div>
                  <h4 className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                    Level {level.level}: {level.title}
                  </h4>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {level.requirements}
                  </p>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {level.features}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default Sidebar;