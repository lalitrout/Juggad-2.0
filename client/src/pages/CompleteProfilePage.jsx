import React, { useState } from 'react';
import { ArrowLeft, User } from 'lucide-react';
import Header from '../components/Header';
import { Button } from '../components/ui/Button';
import { Input } from '../components/Input';

const CompleteProfilePage = ({ navigateTo, theme, toggleTheme, user }) => {
  const [formData, setFormData] = useState({
    location: '',
    age: '',
    gender: '',
    aadhar: '',
  });
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.location || !formData.age || !formData.gender || !formData.aadhar) {
      setError('All fields are required');
      return;
    }
    try {
      const response = await fetch('http://localhost:5000/membership', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        navigateTo('home');
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to submit profile. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <Header
        navigateTo={navigateTo}
        currentPage="complete-profile"
        theme={theme}
        toggleTheme={toggleTheme}
        showNav={false}
      />
      
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 pb-24 sm:pb-8">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => navigateTo('auth')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              aria-label="Back to auth"
            >
              <ArrowLeft size={24} className="text-gray-600 dark:text-gray-300" />
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Complete Your Profile</h1>
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-6 sm:p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-blue-500 dark:from-emerald-600 dark:to-blue-600 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{user?.email}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">Please provide additional details to complete your profile.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Location *</label>
                <Input
                  type="text"
                  name="location"
                  placeholder="Enter your city or neighborhood"
                  value={formData.location}
                  onChange={handleInputChange}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Age *</label>
                <Input
                  type="number"
                  name="age"
                  placeholder="Enter your age"
                  value={formData.age}
                  onChange={handleInputChange}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Gender *</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:border-emerald-500 dark:focus:border-blue-400"
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Aadhaar Number *</label>
                <Input
                  type="text"
                  name="aadhar"
                  placeholder="Enter your Aadhaar number"
                  value={formData.aadhar}
                  onChange={handleInputChange}
                  className="w-full"
                />
              </div>
              {error && (
                <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
              )}
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 dark:from-emerald-600 dark:to-blue-600 text-white font-medium rounded-md px-6 py-3 hover:from-emerald-600 hover:to-blue-600 dark:hover:from-emerald-700 dark:hover:to-blue-700"
              >
                Submit Profile
              </Button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CompleteProfilePage;