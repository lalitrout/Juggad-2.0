import React, { useState, useContext, useEffect } from 'react';
import { Star, MapPin, Phone, Mail, Edit, LogOut } from 'lucide-react';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { Button } from '../components/ui/Button';
import { AuthContext } from '../AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

const ProfilePage = ({ navigateTo, theme, toggleTheme, isAuthenticated, logout }) => {
  const { user, loading } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('posted');
  const [postedTasks, setPostedTasks] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [allTasks, setAllTasks] = useState([]);

  useEffect(() => {
    if (!user?.uid) return;

    const fetchTasks = async () => {
      try {
        const postedQuery = query(
          collection(db, "tasks"),
          where("postedBy", "==", user.uid)
        );

        const completedQuery = query(
          collection(db, "tasks"),
          where("status", "==", "completed"),
          where("acceptedBy.uid", "==", user.uid)
        );

        const allQuery = query(
          collection(db, "tasks")
        );

        const [postedSnap, completedSnap, allSnap] = await Promise.all([
          getDocs(postedQuery),
          getDocs(completedQuery),
          getDocs(allQuery),
        ]);

        const allFetched = allSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const filteredAllTasks = allFetched.filter(task =>
          task.postedBy === user.uid || task?.acceptedBy?.uid === user.uid
        );

        setPostedTasks(postedSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setCompletedTasks(completedSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setAllTasks(filteredAllTasks);
      } catch (err) {
        console.error("Error fetching tasks:", err);
      }
    };

    fetchTasks();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600 dark:text-gray-300">
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center text-gray-700 dark:text-gray-300">
        <p>You are not logged in.</p>
        <Button onClick={() => navigateTo('login')} className="mt-4">
          Go to Login
        </Button>
      </div>
    );
  }

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';
  const email = user.email || 'Not provided';
  const phone = user.phoneNumber || 'Not available';
  const photoURL = user.photoURL;
  const avatarLetter = displayName[0]?.toUpperCase() || 'U';
  const joinedDate = user.metadata?.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString()
    : 'Unknown';
  const roles = Array.isArray(user.role) ? user.role : [user.role || 'provider'];

  const renderTaskList = (tasks) => {
    if (tasks.length === 0) {
      return <p className="text-gray-600 dark:text-gray-400">No tasks yet.</p>;
    }
    return (
      <ul className="space-y-3 mt-2">
        {tasks.map((task, index) => (
          <li
            key={index}
            className="border border-gray-200 dark:border-gray-700 p-4 rounded-lg bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow"
          >
            <h4 className="font-semibold text-lg text-gray-900 dark:text-white">
              {task.title}
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
              {task.description}
            </p>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Header
        title="My Profile"
        navigateTo={navigateTo}
        theme={theme}
        toggleTheme={toggleTheme}
        isAuthenticated={isAuthenticated}
        logout={logout}
      />
      <div className="max-w-3xl mx-auto p-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
          <div className="flex items-center gap-4">
           { (
              <div className="w-20 h-20 rounded-full bg-blue-500 flex items-center justify-center text-3xl font-bold text-white">
                {avatarLetter}
              </div>
            )}
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                {displayName}
              </h2>
              <div className="flex flex-wrap gap-2 mt-1">
                {roles.map((r, i) => (
                  <span
                    key={i}
                    className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300"
                  >
                    {r}
                  </span>
                ))}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Member since: {joinedDate}
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <Mail className="w-5 h-5" />
              <span>{email}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <Phone className="w-5 h-5" />
              <span>{phone}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <MapPin className="w-5 h-5" />
              <span>India</span>
            </div>
          </div>

          <div className="mt-6 flex gap-4">
            <Button variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
            <Button onClick={logout} className="bg-red-500 hover:bg-red-600 text-white">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        {/* Tab Switch */}
        <div className="mt-8">
          <div className="flex gap-4 border-b mb-4">
            <button
              onClick={() => setActiveTab('posted')}
              className={`py-2 px-4 ${
                activeTab === 'posted'
                  ? 'border-b-2 border-blue-500 text-blue-500'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              Posted Tasks
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`py-2 px-4 ${
                activeTab === 'completed'
                  ? 'border-b-2 border-blue-500 text-blue-500'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              Completed Tasks
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`py-2 px-4 ${
                activeTab === 'all'
                  ? 'border-b-2 border-blue-500 text-blue-500'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              All Tasks
            </button>
          </div>

          {/* Task Renders */}
          {activeTab === 'posted' && renderTaskList(postedTasks)}
          {activeTab === 'completed' && renderTaskList(completedTasks)}
          {activeTab === 'all' && renderTaskList(allTasks)}
        </div>
      </div>
      <BottomNav navigateTo={navigateTo} />
    </div>
  );
};

export default ProfilePage;
