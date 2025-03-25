// src/components/WasteClassifier.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';

const WasteClassifier = () => {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle file selection (drag-and-drop or click)
  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      setFile(droppedFile);
      setPreviewUrl(URL.createObjectURL(droppedFile));
      setError('');
    } else {
      setError('Please upload a valid image file.');
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type.startsWith('image/')) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setError('');
    } else {
      setError('Please upload a valid image file.');
    }
  };

  // Convert image file to base64 for Gemini API
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(',')[1]); // Remove the "data:image/jpeg;base64," prefix
      reader.onerror = (error) => reject(error);
    });
  };

  // Handle image upload and classification with Gemini API
  const handleUpload = async () => {
    if (!file) {
      setError('Please select an image to upload.');
      return;
    }

    setLoading(true);
    setError('');
    setResult('');

    try {
      // Step 1: Upload image to Supabase Storage
      const { data: { user } } = await supabase.auth.getUser();
      const filePath = `waste/${user.id}/${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('waste-images')
        .upload(filePath, file);

      if (uploadError) {
        throw new Error('Failed to upload image: ' + uploadError.message);
      }

      // Step 2: Get the public URL of the uploaded image
      const { data: { publicUrl } } = supabase.storage
        .from('waste-images')
        .getPublicUrl(filePath);

      // Step 3: Convert image to base64 for Gemini API
      const base64Image = await fileToBase64(file);

      // Step 4: Classify the image using Gemini API
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
                    text: 'Classify this waste item as recyclable or non-recyclable, and identify its type (e.g., Plastic, Paper, Organic). Respond in the format: "Type - Recyclable/Non-Recyclable".',
                  },
                  {
                    inlineData: {
                      mimeType: file.type,
                      data: base64Image,
                    },
                  },
                ],
              },
            ],
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to classify image with Gemini API');
      }

      const classificationResult = data.candidates[0].content.parts[0].text;
      setResult(classificationResult);

      // Step 5: Save classification result to Supabase
      const wasteType = classificationResult.split(' - ')[0]; // e.g., "Plastic"
      await supabase.from('classifications').insert({
        user_id: user.id,
        item: wasteType,
        result: classificationResult,
        image_url: publicUrl,
      });

      // Step 6: Update user points and gamification
      const pointsToAdd = 10;
      const { data: userData } = await supabase
        .from('users')
        .select('points, level, badges')
        .eq('id', user.id)
        .single();

      const newPoints = (userData.points || 0) + pointsToAdd;
      const newLevel = Math.floor(newPoints / 100) + 1;
      let badges = userData.badges || [];

      if (newPoints >= 100 && !badges.includes('Recycler Rookie')) {
        badges.push('Recycler Rookie');
      }
      if (newPoints >= 500 && !badges.includes('Eco Warrior')) {
        badges.push('Eco Warrior');
      }

      await supabase
        .from('users')
        .update({ points: newPoints, level: newLevel, badges })
        .eq('id', user.id);

    } catch (err) {
      setError('Error processing image: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Clean up preview URL to avoid memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="flex flex-col h-full min-h-screen bg-gradient-to-l from-blue-300 to-teal-300">
      {/* Header */}
      <header className="flex justify-between p-4 shadow-md bg-gradient-to-l from-blue-400 to-teal-400">
        <div className="flex items-center space-x-3">
          <div className="p-1.5 bg-gradient-to-r from-blue-500 to-teal-500 rounded-lg shadow-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-white"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-white">EnviRon</h1>
        </div>
        <div className="flex space-x-4">
          <Link to="/dashboard" className="text-white hover:text-gray-200 transition-colors">
            Dashboard
          </Link>
          <Link to="/community" className="text-white hover:text-gray-200 transition-colors">
            Community
          </Link>
          <button
            onClick={handleLogout}
            className="text-white hover:text-gray-200 transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 transform transition-all hover:shadow-xl">
          <h1 className="text-3xl font-bold text-center mb-6 bg-gradient-to-l from-blue-400 to-teal-400 bg-clip-text text-transparent">
            Classify Your Waste
          </h1>

          {/* Drag-and-Drop Area */}
          <div
            className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-all duration-300 ${
              file ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
            }`}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            {previewUrl ? (
              <div className="flex flex-col items-center">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-32 h-32 object-cover rounded-lg mb-4 shadow-md"
                />
                <p className="text-gray-600 text-sm">{file.name}</p>
              </div>
            ) : (
              <div>
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M7 16V4m0 12l-4-4m4 4l4-4m6 4v-6a2 2 0 00-2-2h-6m-4 0H5a2 2 0 00-2 2v6"
                  />
                </svg>
                <p className="mt-2 text-sm text-gray-600">
                  Drag & drop your image here, or{' '}
                  <label
                    htmlFor="file-upload"
                    className="text-blue-500 hover:underline cursor-pointer"
                  >
                    browse
                  </label>
                </p>
                <input
                  id="file-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg text-center">
              {error}
            </div>
          )}

          {/* Process Button */}
          <button
            onClick={handleUpload}
            disabled={loading || !file}
            className={`mt-6 w-full py-3 rounded-lg font-semibold text-white transition-all duration-300 ${
              loading || !file
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600'
            }`}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <svg
                  className="animate-spin h-5 w-5 mr-2 text-white"
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
                Processing...
              </div>
            ) : (
              'Classify Waste'
            )}
          </button>

          {/* Classification Result */}
          {result && (
            <div className="mt-6 p-4 bg-green-100 text-green-800 rounded-lg text-center">
              <h2 className="text-lg font-semibold">Classification Result</h2>
              <p className="mt-2">{result}</p>
              <p className="text-sm text-gray-600 mt-1">
                +10 points added! Check your progress on the dashboard.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default WasteClassifier;