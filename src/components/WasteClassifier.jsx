// src/components/WasteClassifier.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCamera, FaLeaf, FaSun, FaMoon, FaBars, FaTimes, FaMedal } from 'react-icons/fa';
import { supabase } from '../supabase';

const WasteClassifier = () => {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [badgeNotification, setBadgeNotification] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/');
      }
    };
    checkUser();
  }, [navigate]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type and size
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        setError('Please upload a valid image (JPEG, PNG, or JPG).');
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('Image size must be less than 5MB.');
        return;
      }

      setImage(file);
      setImagePreview(URL.createObjectURL(file));
      setResult(null);
      setError('');
      setBadgeNotification(null);
    }
  };

  const handleClassify = async () => {
    if (!image) {
      setError('Please upload an image to classify.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setBadgeNotification(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Mock classification logic based on file name
      const itemName = image.name.split('.')[0].toLowerCase();
      const classificationMap = {
        'bottle': { isRecyclable: true, material: 'Plastic', instructions: 'Remove cap and label, rinse thoroughly, then place in blue recycling bin.', tip: 'Use a reusable water bottle to reduce plastic waste.' },
        'can': { isRecyclable: true, material: 'Aluminum', instructions: 'Rinse to remove any residue, then place in blue recycling bin.', tip: 'Opt for bulk purchases to reduce packaging waste.' },
        'paper': { isRecyclable: true, material: 'Paper', instructions: 'Ensure it’s clean and free of food residue, then place in blue recycling bin.', tip: 'Switch to digital documents to reduce paper usage.' },
        'food': { isRecyclable: false, material: 'Organic Waste', instructions: 'Dispose in green compost bin if available, or in black landfill bin.', tip: 'Compost food scraps to reduce landfill waste.' },
        'wrapper': { isRecyclable: false, material: 'Plastic Film', instructions: 'Dispose in black landfill bin. Plastic films are not recyclable in most curbside programs.', tip: 'Use reusable containers to avoid plastic wrappers.' },
      };

      let classificationResult, disposalInstructions, wasteReductionTip;
      const matchedItem = Object.keys(classificationMap).find(key => itemName.includes(key));
      if (matchedItem) {
        const itemData = classificationMap[matchedItem];
        classificationResult = itemData.isRecyclable ? `Recyclable - ${itemData.material}` : `Non-Recyclable - ${itemData.material}`;
        disposalInstructions = itemData.instructions;
        wasteReductionTip = itemData.tip;
      } else {
        // Default to a generic classification if item is not recognized
        const isRecyclable = Math.random() > 0.5;
        classificationResult = isRecyclable ? 'Recyclable - Unknown Material' : 'Non-Recyclable - Unknown Material';
        disposalInstructions = isRecyclable
          ? 'Place in blue recycling bin after ensuring it’s clean.'
          : 'Dispose in black landfill bin.';
        wasteReductionTip = 'Consider researching the item’s recyclability or reducing its use.';
      }

      // Upload image to Supabase Storage
      const fileExt = image.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('waste-images')
        .upload(fileName, image);

      if (uploadError) {
        throw new Error(
          uploadError.message.includes('permission')
            ? 'You do not have permission to upload to this folder. Please contact support.'
            : 'Failed to upload image. Please check your internet connection and try again.'
        );
      }

      const { data: urlData } = supabase.storage
        .from('waste-images')
        .getPublicUrl(fileName);

      const imageUrl = urlData.publicUrl;

      // Insert classification into Supabase
      const weight = classificationResult.includes('Recyclable') ? 0.1 : 0; // 0.1 kg for recyclable items
      const { error: insertError } = await supabase.from('classifications').insert({
        user_id: user.id,
        item: itemName,
        result: classificationResult,
        image_url: imageUrl,
        weight,
      });

      if (insertError) {
        throw new Error('Failed to save classification: ' + insertError.message);
      }

      // Update challenge progress for "Eco-Warrior"
      if (classificationResult.includes('Recyclable')) {
        const { data: challengeData, error: challengeError } = await supabase
          .from('challenges')
          .select('id, goal')
          .eq('name', 'Eco-Warrior')
          .single();

        if (challengeError) {
          throw new Error('Failed to fetch challenge data: ' + challengeError.message);
        }

        if (challengeData) {
          const { data: userChallenge, error: userChallengeError } = await supabase
            .from('challenge_participants')
            .select('progress')
            .eq('user_id', user.id)
            .eq('challenge_id', challengeData.id)
            .single();

          if (userChallengeError && userChallengeError.code !== 'PGRST116') { // PGRST116 means no rows found
            throw new Error('Failed to fetch challenge progress: ' + userChallengeError.message);
          }

          if (userChallenge) {
            let newProgress = userChallenge.progress + weight;
            if (newProgress >= challengeData.goal) {
              newProgress = challengeData.goal;
            }

            const { error: updateChallengeError } = await supabase
              .from('challenge_participants')
              .update({
                progress: newProgress,
                completed: newProgress >= challengeData.goal,
              })
              .eq('user_id', user.id)
              .eq('challenge_id', challengeData.id);

            if (updateChallengeError) {
              throw new Error('Failed to update challenge progress: ' + updateChallengeError.message);
            }

            // Award badge and update level for completing the challenge
            if (newProgress >= challengeData.goal) {
              const { data: userData, error: userDataError } = await supabase
                .from('users')
                .select('badges, level')
                .eq('id', user.id)
                .single();

              if (userDataError) {
                throw new Error('Failed to fetch user data for badge update: ' + userDataError.message);
              }

              let badges = userData.badges || [];
              let currentLevel = userData.level || 1;
              if (!badges.includes('Eco-Warrior')) {
                badges.push('Eco-Warrior');
                if (currentLevel < 1) { // Ensure level doesn't decrease
                  currentLevel = 1;
                }
                const { error: badgeUpdateError } = await supabase
                  .from('users')
                  .update({ badges, level: currentLevel })
                  .eq('id', user.id);

                if (badgeUpdateError) {
                  throw new Error('Failed to award badge: ' + badgeUpdateError.message);
                }
                setBadgeNotification('Eco-Warrior');
              }
            }
          } else {
            // User hasn't joined the challenge yet, insert a new record
            const { error: insertChallengeError } = await supabase
              .from('challenge_participants')
              .insert({
                user_id: user.id,
                challenge_id: challengeData.id,
                progress: weight,
                completed: weight >= challengeData.goal,
              });

            if (insertChallengeError) {
              throw new Error('Failed to join challenge: ' + insertChallengeError.message);
            }

            // Check if the challenge is completed with this classification
            if (weight >= challengeData.goal) {
              const { data: userData, error: userDataError } = await supabase
                .from('users')
                .select('badges, level')
                .eq('id', user.id)
                .single();

              if (userDataError) {
                throw new Error('Failed to fetch user data for badge update: ' + userDataError.message);
              }

              let badges = userData.badges || [];
              let currentLevel = userData.level || 1;
              if (!badges.includes('Eco-Warrior')) {
                badges.push('Eco-Warrior');
                if (currentLevel < 1) { // Ensure level doesn't decrease
                  currentLevel = 1;
                }
                const { error: badgeUpdateError } = await supabase
                  .from('users')
                  .update({ badges, level: currentLevel })
                  .eq('id', user.id);

                if (badgeUpdateError) {
                  throw new Error('Failed to award badge: ' + badgeUpdateError.message);
                }
                setBadgeNotification('Eco-Warrior');
              }
            }
          }
        }
      }

      // Update user points and badges
      const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('points, badges')
        .eq('id', user.id)
        .single();

      if (fetchError) {
        throw new Error('Failed to fetch user data: ' + fetchError.message);
      }

      const newPoints = (userData.points || 0) + (classificationResult.includes('Recyclable') ? 20 : 5);
      let badges = userData.badges || [];

      // Check for "Recycler Pro" badge (10 recyclable items)
      const { data: recyclableCountData, error: recyclableCountError } = await supabase
        .from('classifications')
        .select('id')
        .eq('user_id', user.id)
        .ilike('result', 'Recyclable%');

      if (recyclableCountError) {
        throw new Error('Failed to fetch recyclable count: ' + recyclableCountError.message);
      }

      if (recyclableCountData.length >= 10 && !badges.includes('Recycler Pro')) {
        badges.push('Recycler Pro');
        setBadgeNotification('Recycler Pro');
      }

      // Check for "Climate Champion" badge (5 kg CO2 saved)
      const co2Saved = recyclableCountData.length * 0.2; // 0.2 kg CO2 per recyclable item
      if (co2Saved >= 5 && !badges.includes('Climate Champion')) {
        badges.push('Climate Champion');
        setBadgeNotification('Climate Champion');
      }

      const { error: updateError } = await supabase
        .from('users')
        .update({ points: newPoints, badges })
        .eq('id', user.id);

      if (updateError) {
        throw new Error('Failed to update user data: ' + updateError.message);
      }

      setResult({
        classification: classificationResult,
        instructions: disposalInstructions,
        tip: wasteReductionTip,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
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
            <FaLeaf className={`h-6 w-6 ${isDarkMode ? 'text-teal-300' : 'text-teal-500'}`} />
          </motion.div>
          <h1 className="text-xl md:text-2xl font-bold text-white">EnviRon</h1>
        </div>
        <div className="hidden md:flex items-center space-x-4">
          <Link to="/dashboard" className="text-white hover:text-gray-200 transition-colors">
            Dashboard
          </Link>
          <Link to="/community" className="text-white hover:text-gray-200 transition-colors">
            Community
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
                to="/community"
                onClick={toggleSidebar}
                className={`block text-lg ${isDarkMode ? 'text-gray-200 hover:text-teal-300' : 'text-gray-800 hover:text-teal-500'} transition-colors`}
              >
                Community
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
      <main className="flex-1 flex items-center justify-center p-4 md:p-6">
        <motion.div
          className={`w-full max-w-md ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} rounded-2xl shadow-lg p-8 border relative overflow-hidden`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="absolute inset-0 shadow-[inset_0_0_10px_rgba(45,212,191,0.3)] rounded-2xl pointer-events-none" />
          <h2 className={`text-2xl md:text-3xl font-bold text-center mb-6 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            Classify Waste
          </h2>

          {/* Error Message */}
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

          {/* Badge Notification */}
          {badgeNotification && (
            <motion.div
              className={`text-center mb-4 p-3 rounded-lg ${isDarkMode ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-100 text-yellow-700'} flex items-center justify-center space-x-2`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <FaMedal className="text-yellow-400" />
              <span>Congratulations! You earned the "{badgeNotification}" badge!</span>
            </motion.div>
          )}

          {/* Image Upload */}
          <div className="mb-6">
            <label className={`block text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-2`}>Upload an image of the waste item</label>
            <div className="flex items-center justify-center w-full">
              <label
                htmlFor="image-upload"
                className={`flex flex-col items-center justify-center w-full h-40 border-2 ${isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-gray-100'} border-dashed rounded-lg cursor-pointer hover:bg-gray-200 transition-all`}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <FaCamera className={`w-8 h-8 mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Click to upload an image</p>
                  </div>
                )}
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Classify Button */}
          <motion.button
            onClick={handleClassify}
            disabled={loading}
            className={`w-full py-3 rounded-lg font-semibold text-white ${loading ? 'bg-gray-500 cursor-not-allowed' : isDarkMode ? 'bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700' : 'bg-gradient-to-r from-teal-400 to-blue-400 hover:from-teal-500 hover:to-blue-500'} transition-all shadow-lg flex items-center justify-center space-x-2`}
            whileHover={{ scale: loading ? 1 : 1.05 }}
            whileTap={{ scale: loading ? 1 : 0.95 }}
          >
            {loading ? (
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
              <span>Classify</span>
            )}
          </motion.button>

          {/* Classification Result */}
          {result && (
            <motion.div
              className={`mt-6 p-4 rounded-lg ${result.classification.includes('Recyclable') ? (isDarkMode ? 'bg-green-900' : 'bg-green-100') : (isDarkMode ? 'bg-red-900' : 'bg-red-100')}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h3 className={`text-lg font-bold ${result.classification.includes('Recyclable') ? (isDarkMode ? 'text-green-300' : 'text-green-700') : (isDarkMode ? 'text-red-300' : 'text-red-700')}`}>
                Result: {result.classification}
              </h3>
              <p className={`mt-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <span className="font-medium">Disposal Instructions:</span> {result.instructions}
              </p>
              <p className={`mt-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <span className="font-medium">Waste Reduction Tip:</span> {result.tip}
              </p>
            </motion.div>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default WasteClassifier;