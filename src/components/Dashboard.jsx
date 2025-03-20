import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

const Dashboard = () => {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (auth.currentUser) {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }
      }
    };
    fetchUserData();
  }, []);

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
      </header>

      <main className="flex-1 flex items-center justify-center px-4 -mt-4">
        <div className="w-[360px] bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-center mb-1 bg-gradient-to-l from-blue-400 to-teal-400 bg-clip-text text-transparent">
            Dashboard
          </h1>
          {userData ? (
            <>
              <p className="text-center text-gray-600 mb-4">
                Welcome, {userData.fullName} ({auth.currentUser.email})!
              </p>
              <p className="text-center text-gray-600 mb-2">Points: {userData.points}</p>
              <p className="text-center text-gray-600 mb-2">Level: {userData.level}</p>
              <p className="text-center text-gray-600 mb-6">
                Badges: {userData.badges.join(', ') || 'None'}
              </p>
              <button
                onClick={() => auth.signOut()}
                className="w-full py-2 px-4 text-white font-medium rounded-md bg-gradient-to-l from-red-400 to-red-500 hover:opacity-90 transition-opacity text-sm"
              >
                Sign Out
              </button>
            </>
          ) : (
            <p className="text-center text-gray-600">Loading...</p>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;