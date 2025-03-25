// src/components/Community.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTrophy, FaHeart, FaComment, FaSun, FaMoon, FaBars, FaTimes, FaLeaf, FaMedal, FaShare } from 'react-icons/fa';
import { supabase } from '../supabase';

const Community = () => {
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [postTags, setPostTags] = useState([]);
  const [error, setError] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [userChallenges, setUserChallenges] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [filterChallenge, setFilterChallenge] = useState(null);
  const [filterTag, setFilterTag] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const maxRetries = 3;
      let attempt = 0;

      // Check cache first
      const cachedData = localStorage.getItem('communityData');
      if (cachedData) {
        const { posts, leaderboard, challenges, userChallenges, referrals } = JSON.parse(cachedData);
        setPosts(posts);
        setLeaderboard(leaderboard);
        setChallenges(challenges);
        setUserChallenges(userChallenges);
        setReferrals(referrals);
      }

      while (attempt < maxRetries) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            navigate('/');
            return;
          }

          // Fetch posts
          const { data: postsData, error: postsError } = await supabase
            .from('posts')
            .select('id, user_id, content, created_at, likes, comments, tags, users(full_name)')
            .order('created_at', { ascending: false });

          if (postsError) throw postsError;

          // Fetch leaderboard
          const { data: leaderboardData, error: leaderboardError } = await supabase
            .from('users')
            .select('full_name, points')
            .order('points', { ascending: false })
            .limit(5);

          if (leaderboardError) throw leaderboardError;

          // Fetch challenges
          const { data: challengesData, error: challengesError } = await supabase
            .from('challenges')
            .select('*')
            .order('start_date', { ascending: false });

          if (challengesError) throw challengesError;

          // Fetch user's challenge participation
          const { data: userChallengesData, error: userChallengesError } = await supabase
            .from('challenge_participants')
            .select('challenge_id, progress, completed')
            .eq('user_id', user.id);

          if (userChallengesError) throw userChallengesError;

          // Fetch referrals
          const { data: referralsData, error: referralsError } = await supabase
            .from('referrals')
            .select('referred_id')
            .eq('referrer_id', user.id);

          if (referralsError) throw referralsError;

          // Update state
          setPosts(postsData);
          setLeaderboard(leaderboardData);
          setChallenges(challengesData);
          setUserChallenges(userChallengesData);
          setReferrals(referralsData);

          // Cache the data
          localStorage.setItem('communityData', JSON.stringify({
            posts: postsData,
            leaderboard: leaderboardData,
            challenges: challengesData,
            userChallenges: userChallengesData,
            referrals: referralsData,
          }));

          return; // Success, exit the retry loop
        } catch (err) {
          if (err.status === 503 && attempt < maxRetries - 1) {
            attempt++;
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
            continue;
          }
          setError('Failed to load community data: ' + err.message);
          return;
        }
      }
    };

    fetchData();

    // Real-time subscriptions
    const postsSubscription = supabase
      .channel('public:posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, (payload) => {
        fetchData();
      })
      .subscribe();

    const challengeParticipantsSubscription = supabase
      .channel('public:challenge_participants')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'challenge_participants' }, (payload) => {
        fetchData();
      })
      .subscribe();

    const referralsSubscription = supabase
      .channel('public:referrals')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'referrals' }, (payload) => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(postsSubscription);
      supabase.removeChannel(challengeParticipantsSubscription);
      supabase.removeChannel(referralsSubscription);
    };
  }, [navigate]);

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (!newPost.trim()) {
      setError('Post content cannot be empty.');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('posts').insert({
        user_id: user.id,
        content: newPost,
        tags: postTags,
        likes: [], // Initialize likes as an empty array (uuid[])
        comments: [], // Initialize comments as an empty array (will be serialized to jsonb)
      });

      if (error) throw error;

      // Check for "Community Star" badge (5 posts)
      const { data: userPosts } = await supabase
        .from('posts')
        .select('id')
        .eq('user_id', user.id);

      if (userPosts.length >= 5) {
        const { data: userData } = await supabase
          .from('users')
          .select('badges')
          .eq('id', user.id)
          .single();

        let badges = userData.badges || [];
        if (!badges.includes('Community Star')) {
          badges.push('Community Star');
          await supabase
            .from('users')
            .update({ badges })
            .eq('id', user.id);
        }
      }

      setNewPost('');
      setPostTags([]);
      setError(''); // Clear any previous errors
    } catch (err) {
      setError('Failed to create post: ' + err.message);
    }
  };

  const handleLike = async (postId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const post = posts.find((p) => p.id === postId);

      // Ensure likes is an array; initialize as empty array if null
      let currentLikes = Array.isArray(post.likes) ? post.likes : [];

      // Check if the user has already liked the post
      const hasLiked = currentLikes.includes(user.id);
      const updatedLikes = hasLiked
        ? currentLikes.filter(id => id !== user.id) // Unlike
        : [...currentLikes, user.id]; // Like

      const { error } = await supabase
        .from('posts')
        .update({ likes: updatedLikes })
        .eq('id', postId);

      if (error) throw error;

      // Update local state to reflect the change
      setPosts(posts.map(p =>
        p.id === postId ? { ...p, likes: updatedLikes } : p
      ));
      setError(''); // Clear any previous errors
    } catch (err) {
      setError('Failed to like post: ' + err.message);
    }
  };

  const handleComment = async (postId, comment) => {
    try {
      const post = posts.find((p) => p.id === postId);
      // Ensure comments is a JSON array; initialize as empty array if null or invalid
      let currentComments = Array.isArray(post.comments) ? post.comments : [];
      const updatedComments = [...currentComments, comment];
      const { error } = await supabase
        .from('posts')
        .update({ comments: updatedComments }) // Supabase will serialize this to jsonb
        .eq('id', postId);

      if (error) throw error;

      // Update local state to reflect the change
      setPosts(posts.map(p =>
        p.id === postId ? { ...p, comments: updatedComments } : p
      ));
      setError(''); // Clear any previous errors
    } catch (err) {
      setError('Failed to add comment: ' + err.message);
    }
  };

  const handleJoinChallenge = async (challengeId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('challenge_participants').upsert({
        user_id: user.id,
        challenge_id: challengeId,
        progress: 0,
        completed: false,
      }, {
        onConflict: ['user_id', 'challenge_id']
      });

      if (error) throw error;

      // Update local state to reflect the user joining the challenge
      setUserChallenges([...userChallenges, { challenge_id: challengeId, progress: 0, completed: false }]);
      setError(''); // Clear any previous errors
    } catch (err) {
      setError('Failed to join challenge: ' + err.message);
    }
  };

  const handleUpdateProgress = async (challengeId, increment) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const challenge = challenges.find((c) => c.id === challengeId);
      const userChallenge = userChallenges.find((uc) => uc.challenge_id === challengeId);

      let newProgress = (userChallenge?.progress || 0) + increment;
      if (newProgress >= challenge.goal) {
        newProgress = challenge.goal;
      }

      const { error } = await supabase
        .from('challenge_participants')
        .upsert({
          user_id: user.id,
          challenge_id: challengeId,
          progress: newProgress,
          completed: newProgress >= challenge.goal,
        }, {
          onConflict: ['user_id', 'challenge_id']
        });

      if (error) throw error;

      // Update local state
      setUserChallenges(userChallenges.map(uc =>
        uc.challenge_id === challengeId
          ? { ...uc, progress: newProgress, completed: newProgress >= challenge.goal }
          : uc
      ));

      // Award badge and update level for completing a challenge
      if (newProgress >= challenge.goal) {
        const { data: userData } = await supabase
          .from('users')
          .select('badges, level')
          .eq('id', user.id)
          .single();

        let badges = userData.badges || [];
        let currentLevel = userData.level || 1;
        const badgeName = challenge.name;
        const challengeLevelMap = {
          'Eco-Warrior': 1,
          'Green Thumb': 2,
          'Carbon Cutter': 3,
          'Water Saver': 4,
          'Plastic Buster': 5,
          'Energy Guardian': 6,
          'Sustainable Chef': 7,
          'Eco-Influencer': 8,
          'Ethical Shopper': 9,
          'Planet Protector': 10,
        };

        if (!badges.includes(badgeName)) {
          badges.push(badgeName);
          const newLevel = challengeLevelMap[challenge.name];
          if (newLevel > currentLevel) {
            currentLevel = newLevel;
          }
          await supabase
            .from('users')
            .update({ badges, level: currentLevel })
            .eq('id', user.id);
        }

        // Special case for Planet Protector: Check if all previous challenges are completed
        if (challenge.name === 'Planet Protector') {
          const allChallenges = challenges.filter(c => c.name !== 'Planet Protector');
          const completedChallenges = await supabase
            .from('challenge_participants')
            .select('challenge_id')
            .eq('user_id', user.id)
            .eq('completed', true);

          const completedChallengeIds = completedChallenges.data.map(c => c.challenge_id);
          const allPreviousCompleted = allChallenges.every(c => completedChallengeIds.includes(c.id));

          if (!allPreviousCompleted) {
            setError('You must complete all previous challenges before completing Planet Protector!');
            await supabase
              .from('challenge_participants')
              .update({ completed: false, progress: 0 })
              .eq('user_id', user.id)
              .eq('challenge_id', challengeId);
            setUserChallenges(userChallenges.map(uc =>
              uc.challenge_id === challengeId
                ? { ...uc, progress: 0, completed: false }
                : uc
            ));
            return;
          }
        }
      }
      setError(''); // Clear any previous errors
    } catch (err) {
      setError('Failed to update challenge progress: ' + err.message);
    }
  };

  const handleReferral = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const referredEmail = prompt('Enter the email of the friend you want to refer:');
      if (!referredEmail) {
        setError('Email cannot be empty.');
        return;
      }

      // Find the referred user by email
      const { data: referredUser, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', referredEmail)
        .single();

      if (userError || !referredUser) {
        setError('User with this email not found.');
        return;
      }

      // Insert referral
      const { error: referralError } = await supabase
        .from('referrals')
        .insert({
          referrer_id: user.id,
          referred_id: referredUser.id,
        });

      if (referralError) throw referralError;

      // Check Eco-Influencer progress
      const { data: referralsData } = await supabase
        .from('referrals')
        .select('referred_id')
        .eq('referrer_id', user.id);

      const referredUsers = referralsData.map(r => r.referred_id);
      let friendsCompleted = 0;

      for (const referredId of referredUsers) {
        const { data: completedChallenges } = await supabase
          .from('challenge_participants')
          .select('id')
          .eq('user_id', referredId)
          .eq('completed', true);

        if (completedChallenges.length >= 3) {
          friendsCompleted += 1;
        }
      }

      const ecoInfluencerChallenge = challenges.find(c => c.name === 'Eco-Influencer');
      if (ecoInfluencerChallenge) {
        await handleUpdateProgress(ecoInfluencerChallenge.id, friendsCompleted - (userChallenges.find(uc => uc.challenge_id === ecoInfluencerChallenge.id)?.progress || 0));
      }
      setError(''); // Clear any previous errors
    } catch (err) {
      setError('Failed to add referral: ' + err.message);
    }
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleSignOut = async () => {
    // Clear cache on sign out
    localStorage.removeItem('communityData');
    await supabase.auth.signOut();
    navigate('/');
  };

  // Filter posts based on selected challenge or tag
  const filteredPosts = posts.filter((post) => {
    const matchesChallenge = filterChallenge
      ? post.tags.includes(`Challenge: ${challenges.find((c) => c.id === filterChallenge)?.name}`)
      : true;
    const matchesTag = filterTag ? post.tags.includes(filterTag) : true;
    return matchesChallenge && matchesTag;
  });

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
            <FaLeaf className={`h-6 w-6 ${isDarkMode ? 'text-teal-300' : 'text-teal-500'}`} />
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
          <Link to="/profile" className="text-white hover:text-gray-200 transition-colors">
            Profile
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
                to="/profile"
                onClick={toggleSidebar}
                className={`block text-lg ${isDarkMode ? 'text-gray-200 hover:text-teal-300' : 'text-gray-800 hover:text-teal-500'} transition-colors`}
              >
                Profile
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
        {error && (
          <motion.p
            className="text-red-500 text-center p-2 bg-red-100 rounded-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {error}
          </motion.p>
        )}

        {/* Climate Action Challenges Section */}
        <section className="space-y-6">
          <h2 className={`text-2xl md:text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} flex items-center space-x-2`}>
            <FaLeaf className="text-green-500" />
            <span>EnviRon Challenges</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {challenges.map((challenge) => {
              const userChallenge = userChallenges.find((uc) => uc.challenge_id === challenge.id);
              const isJoined = !!userChallenge;
              const progress = userChallenge?.progress || 0;
              const progressPercentage = (progress / challenge.goal) * 100;

              const incrementMap = {
                'Eco-Warrior': 0, // Updated automatically via WasteClassifier
                'Green Thumb': 1, // 1 tree
                'Carbon Cutter': 1, // 1 km
                'Water Saver': 10, // 10 liters
                'Plastic Buster': 1, // 1 day
                'Energy Guardian': 1, // 1%
                'Sustainable Chef': 1, // 1 day
                'Eco-Influencer': 0, // Updated via referrals
                'Ethical Shopper': 1, // 1 item
                'Planet Protector': 1, // 1 event
              };

              return (
                <motion.div
                  key={challenge.id}
                  className={`p-6 rounded-2xl shadow-lg ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} border relative overflow-hidden`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="absolute inset-0 shadow-[inset_0_0_10px_rgba(45,212,191,0.3)] rounded-2xl pointer-events-none" />
                  <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-2`}>{challenge.name}</h3>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-4`}>{challenge.description}</p>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
                    Goal: {challenge.goal} {challenge.unit}
                  </p>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
                    Duration: {new Date(challenge.start_date).toLocaleDateString()} - {new Date(challenge.end_date).toLocaleDateString()}
                  </p>
                  {isJoined ? (
                    <>
                      <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
                        <div
                          className="bg-green-500 h-4 rounded-full"
                          style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                        />
                      </div>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
                        Your Progress: {progress} / {challenge.goal} {challenge.unit}
                      </p>
                      {challenge.name === 'Eco-Warrior' ? (
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Progress updates automatically when you classify recyclable waste.
                        </p>
                      ) : challenge.name === 'Eco-Influencer' ? (
                        <button
                          onClick={handleReferral}
                          className={`w-full py-2 rounded-lg font-semibold text-white ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} transition-all`}
                        >
                          Refer a Friend
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpdateProgress(challenge.id, incrementMap[challenge.name])}
                          className={`w-full py-2 rounded-lg font-semibold text-white ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} transition-all`}
                          disabled={progress >= challenge.goal}
                        >
                          Add {incrementMap[challenge.name]} {challenge.unit}
                        </button>
                      )}
                    </>
                  ) : (
                    <button
                      onClick={() => handleJoinChallenge(challenge.id)}
                      className={`w-full py-2 rounded-lg font-semibold text-white ${isDarkMode ? 'bg-green-600 hover:bg-green-700' : 'bg-green-500 hover:bg-green-600'} transition-all`}
                    >
                      Join Challenge
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Leaderboard Section */}
        <section className="space-y-6">
          <h2 className={`text-2xl md:text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} flex items-center space-x-2`}>
            <FaTrophy className="text-yellow-400" />
            <span>Challenge Leaderboard</span>
          </h2>
          <div className="mb-4">
            <label className={`block text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-2`}>Filter by Challenge:</label>
            <select
              value={filterChallenge || ''}
              onChange={(e) => setFilterChallenge(e.target.value || null)}
              className={`w-full p-3 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-gray-100 border-gray-300 text-gray-800'} focus:outline-none focus:ring-2 focus:ring-teal-400 transition-all`}
            >
              <option value="">All Challenges</option>
              {challenges.map((challenge) => (
                <option key={challenge.id} value={challenge.id}>{challenge.name}</option>
              ))}
            </select>
          </div>
          <motion.div
            className={`p-6 rounded-2xl shadow-lg ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} border relative overflow-hidden`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="absolute inset-0 shadow-[inset_0_0_10px_rgba(45,212,191,0.3)] rounded-2xl pointer-events-none" />
            {leaderboard.length > 0 ? (
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
                    <span className={`flex-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{user.full_name || 'Unknown'}</span>
                    <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{user.points || 0} pts</span>
                  </motion.li>
                ))}
              </ul>
            ) : (
              <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>No users in the leaderboard yet.</p>
            )}
          </motion.div>
        </section>

        {/* Forum Section */}
        <section className="space-y-6">
          <h2 className={`text-2xl md:text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} flex items-center space-x-2`}>
            <FaComment className="text-blue-500" />
            <span>Community Forum</span>
          </h2>
          <div className="mb-4">
            <label className={`block text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-2`}>Filter by Tag:</label>
            <select
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              className={`w-full p-3 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-gray-100 border-gray-300 text-gray-800'} focus:outline-none focus:ring-2 focus:ring-teal-400 transition-all`}
            >
              <option value="">All Posts</option>
              <option value="Sustainable Tip">Sustainable Tips</option>
              <option value="Success Story">Success Stories</option>
            </select>
          </div>
          <motion.div
            className={`p-6 rounded-2xl shadow-lg ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} border relative overflow-hidden`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="absolute inset-0 shadow-[inset_0_0_10px_rgba(45,212,191,0.3)] rounded-2xl pointer-events-none" />
            <form onSubmit={handlePostSubmit} className="mb-6 space-y-4">
              <textarea
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder="Share a sustainable tip or success story..."
                className={`w-full p-3 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400' : 'bg-gray-100 border-gray-300 text-gray-800 placeholder-gray-500'} focus:outline-none focus:ring-2 focus:ring-teal-400 transition-all`}
                rows="3"
              />
              <div className="flex flex-wrap gap-2 mb-4">
                {['Sustainable Tip', 'Success Story', ...challenges.map((c) => `Challenge: ${c.name}`)].map((tag) => (
                  <label key={tag} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={postTags.includes(tag)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setPostTags([...postTags, tag]);
                        } else {
                          setPostTags(postTags.filter((t) => t !== tag));
                        }
                      }}
                      className="form-checkbox h-5 w-5 text-teal-500"
                    />
                    <span className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{tag}</span>
                  </label>
                ))}
              </div>
              <motion.button
                type="submit"
                className={`w-full py-3 rounded-lg font-semibold text-white ${isDarkMode ? 'bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700' : 'bg-gradient-to-r from-teal-400 to-blue-400 hover:from-teal-500 hover:to-blue-500'} transition-all shadow-lg`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Share Post
              </motion.button>
            </form>
            <div className="space-y-6">
              {filteredPosts.length > 0 ? (
                filteredPosts.map((post) => (
                  <motion.div
                    key={post.id}
                    className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} shadow-md`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                        {post.users?.full_name || 'Anonymous'}
                      </span>
                      <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {new Date(post.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>{post.content}</p>
                    {post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {post.tags.map((tag, index) => (
                          <span
                            key={index}
                            className={`text-sm px-2 py-1 rounded-full ${isDarkMode ? 'bg-gray-600 text-gray-200' : 'bg-gray-200 text-gray-800'}`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => handleLike(post.id)}
                        className={`flex items-center space-x-1 ${isDarkMode ? 'text-gray-300 hover:text-red-400' : 'text-gray-600 hover:text-red-500'} transition-colors`}
                      >
                        <FaHeart />
                        <span>{post.likes?.length || 0}</span>
                      </button>
                      <button
                        onClick={() => {
                          const comment = prompt('Enter your comment:');
                          if (comment) handleComment(post.id, comment);
                          else if (comment === '') setError('Comment cannot be empty.');
                        }}
                        className={`flex items-center space-x-1 ${isDarkMode ? 'text-gray-300 hover:text-blue-400' : 'text-gray-600 hover:text-blue-500'} transition-colors`}
                      >
                        <FaComment />
                        <span>{post.comments?.length || 0}</span>
                      </button>
                    </div>
                    {post.comments?.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {post.comments.map((comment, index) => (
                          <p key={index} className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            - {comment}
                          </p>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ))
              ) : (
                <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>No posts yet. Be the first to share!</p>
              )}
            </div>
          </motion.div>
        </section>
      </main>
    </div>
  );
};

export default Community;