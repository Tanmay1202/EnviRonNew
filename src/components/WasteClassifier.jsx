import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase'; // Import Supabase client
import toast from 'react-hot-toast';

const WasteClassifier = () => {
  const [image, setImage] = useState(null);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const handleImageChange = (e) => {
    setImage(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResult('');

    if (!image) {
      setError('Please upload an image');
      return;
    }

    try {
      const classification = 'Recyclable'; // Placeholder; replace with actual classification logic
      const item = image.name || 'Unknown Item';

      setResult(`Classified as: ${classification}`);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Update user points
        const { data: userData, error: fetchError } = await supabase
          .from('users')
          .select('points')
          .eq('id', user.id)
          .single();

        if (fetchError) {
          throw fetchError;
        }

        const currentPoints = userData.points || 0;
        await supabase
          .from('users')
          .update({ points: currentPoints + 20 })
          .eq('id', user.id);

        // Store classification in the 'classifications' table
        await supabase
          .from('classifications')
          .insert({
            user_id: user.id,
            item: item,
            result: classification,
            points_earned: 20,
            timestamp: new Date().toISOString(),
          });

        // Show toast notification for points earned
        toast.success('🎉 +20 Points Earned!', {
          style: {
            background: '#34D399',
            color: '#fff',
          },
        });
      }
    } catch (err) {
      setError('Error classifying image: ' + err.message);
      console.error('Error:', err);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-screen bg-gradient-to-l from-blue-300 to-teal-300">
      <header className="flex justify-between p-3 shadow-md bg-gradient-to-l from-blue-400 to-teal-400">
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
        <Link to="/dashboard" className="text-white hover:text-gray-200">Back to Dashboard</Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 -mt-4">
        <div className="w-[360px] bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-center mb-1 bg-gradient-to-l from-blue-400 to-teal-400 bg-clip-text text-transparent">
            Waste Classifier
          </h1>
          <p className="text-center text-gray-600 mb-6 text-sm">Upload an image to classify waste</p>
          {error && <p className="text-red-500 text-center text-sm mb-4">{error}</p>}
          {result && <p className="text-green-500 text-center text-sm mb-4">{result}</p>}
          <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
            <div className="space-y-1.5">
              <label className="block text-gray-600 text-sm">Upload Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full text-gray-600 text-sm"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 px-4 text-white font-medium rounded-md bg-gradient-to-l from-blue-400 to-teal-400 hover:opacity-90 transition-opacity text-sm mt-2"
            >
              Classify Waste
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default WasteClassifier;