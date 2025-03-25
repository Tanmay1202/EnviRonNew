// src/components/Community.jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';

const Community = () => {
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, points, level')
        .order('points', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching leaderboard:', error);
        return;
      }
      setLeaderboard(data);
    };

    fetchLeaderboard();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('public:users')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users' }, (payload) => {
        fetchLeaderboard();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  return (
    <div className="flex flex-col h-full min-h-screen bg-gradient-to-l from-blue-300 to-teal-300">
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
        <Link to="/dashboard" className="text-white hover:text-gray-200 transition-colors">
          Back to Dashboard
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-center mb-4 bg-gradient-to-l from-blue-400 to-teal-400 bg-clip-text text-transparent">
            Community Challenge: Recycle 50 kg
          </h2>
          <p className="text-center text-gray-600">Leaderboard (Top 5):</p>
          <ul className="mt-4 space-y-3">
            {leaderboard.map((user, index) => (
              <li
                key={user.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg shadow-sm"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-blue-500 font-semibold">{index + 1}.</span>
                  <span className="text-gray-800">
                    {user.id.slice(0, 5)}...
                  </span>
                </div>
                <div className="text-gray-600">
                  {user.points} pts (Level {user.level})
                </div>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
};

export default Community;