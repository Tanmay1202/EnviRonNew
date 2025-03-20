import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
      // Award 10 points for logging in
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const currentPoints = userDoc.data().points || 0;
        await updateDoc(userDocRef, {
          points: currentPoints + 10,
        });
      }
      console.log('User logged in successfully:', userCredential.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
      console.error('Login error:', err.message);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-screen bg-gradient-to-l from-blue-300 to-teal-300">
      <header className="flex justify-between p-4 shadow-md bg-gradient-to-l from-blue-400 to-teal-400">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-blue-500 to-teal-500 rounded-lg shadow-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-white"
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
          <h1 className="text-xl font-bold text-white">EnviRon</h1>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4">
        <div className="w-[400px] bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-center mb-2 bg-gradient-to-l from-blue-400 to-teal-400 bg-clip-text text-transparent">
            Welcome Back!
          </h1>
          <p className="text-center text-gray-600 mb-8">Please sign in to continue to your account</p>
          {error && <p className="text-red-500 text-center mb-4">{error}</p>}
          <form onSubmit={handleSubmit} className="flex flex-col space-y-6">
            <div className="space-y-2">
              <label className="block text-gray-600 text-sm">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                </span>
                <input
                  type="email"
                  name="email"
                  placeholder="Type your email"
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md text-gray-600 focus:outline-none focus:border-blue-400"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-gray-600 text-sm">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
                <input
                  type="password"
                  name="password"
                  placeholder="Type your password"
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md text-gray-600 focus:outline-none focus:border-blue-400"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="flex justify-end">
              <a href="#" className="text-sm text-gray-400 hover:text-gray-600">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 text-white font-medium rounded-md bg-gradient-to-l from-blue-400 to-teal-400 hover:opacity-90 transition-opacity"
            >
              Login
            </button>
          </form>
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Not registered yet?{' '}
              <Link to="/signup" className="text-blue-500 hover:text-blue-600 font-medium">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Login;