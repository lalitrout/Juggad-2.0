import React, { useState, useContext, useEffect, useRef } from 'react';
import { Star, MapPin, Phone, Mail, Edit, LogOut, Image as ImageIcon, UploadCloud } from 'lucide-react';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { Button } from '../components/ui/Button';
import { AuthContext } from '../AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

// --- Toast Feedback ---
function Toast({ message, type = "success", onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 2500);
    return () => clearTimeout(t);
  }, [message, onClose]);
  return (
    <div className={`fixed top-5 left-1/2 -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg z-50 text-white ${type === "success" ? "bg-green-600" : "bg-red-600"}`}>
      {message}
    </div>
  );
}

// --- Modal ---
function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 min-w-[320px] max-w-[90vw] relative">
        <button className="absolute top-3 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" onClick={onClose}>&times;</button>
        {children}
      </div>
    </div>
  );
}

const ProfilePage = ({ navigateTo, theme, toggleTheme, isAuthenticated, logout }) => {
  const { user, loading, updateUserProfile } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('posted');
  const [postedTasks, setPostedTasks] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ displayName: '', phoneNumber: '', photoURL: '' });
  const [selectedFile, setSelectedFile] = useState(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [uploading, setUploading] = useState(false);
  const nameRef = useRef();
  const fileInputRef = useRef();

  useEffect(() => {
    if (!user?.uid) return;
    const fetchTasks = async () => {
      try {
        const postedQuery = query(collection(db, "tasks"), where("postedBy", "==", user.uid));
        const completedQuery = query(collection(db, "tasks"), where("status", "==", "completed"), where("acceptedBy.uid", "==", user.uid));
        const allQuery = query(collection(db, "tasks"));
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

  useEffect(() => {
    if (editOpen && user) {
      setForm({
        displayName: user.displayName || '',
        phoneNumber: user.phoneNumber || '',
        photoURL: user.photoURL || ''
      });
      setSelectedFile(null);
      setTimeout(() => {
        if (nameRef.current) nameRef.current.focus();
      }, 200);
    }
  }, [editOpen, user]);

  // --- Handle Photo File Selection ---
  function handlePhotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setFormError("Please select an image file.");
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setFormError("Please select an image smaller than 5MB.");
      return;
    }

    setSelectedFile(file);
    setFormError('');

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm(f => ({ ...f, photoURL: reader.result }));
    };
    reader.readAsDataURL(file);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600 dark:text-gray-300 animate-pulse">
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
  const joinedDate = user.metadata?.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'Unknown';
  const roles = Array.isArray(user.role) ? user.role : [user.role || 'provider'];

  // Avatar logic
  const Avatar = photoURL ? (
    <img
      src={photoURL}
      alt={displayName}
      className="w-20 h-20 rounded-full object-cover border-4 border-blue-300 dark:border-blue-800 shadow"
    />
  ) : (
    <div className="w-20 h-20 rounded-full bg-blue-500 flex items-center justify-center text-3xl font-bold text-white shadow">
      {avatarLetter}
    </div>
  );

  // Edit Profile Handler
  async function handleSaveProfile(e) {
    e.preventDefault();
    setFormError('');
    
    if (!form.displayName.trim()) {
      setFormError("Name can't be empty");
      nameRef.current && nameRef.current.focus();
      return;
    }
    
    if (form.phoneNumber && !/^[\d\s\-\+]{8,}$/.test(form.phoneNumber)) {
      setFormError("Enter a valid phone number");
      return;
    }
    
    // If no file selected, accept any valid URL
    if (!selectedFile && form.photoURL && !/^https?:\/\/.+/i.test(form.photoURL)) {
      setFormError("Photo URL must be a valid URL");
      return;
    }

    setSaving(true);
    try {
      const profileData = {
        displayName: form.displayName,
        phoneNumber: form.phoneNumber,
        photoURL: selectedFile ? '' : form.photoURL // Clear URL if uploading new file
      };

      await updateUserProfile(profileData, selectedFile);
      
      setEditOpen(false);
      setToast({ message: "Profile updated!", type: "success" });
    } catch (err) {
      setFormError("Failed to update profile: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  // Remove selected file
  const removeSelectedFile = () => {
    setSelectedFile(null);
    setForm(f => ({ ...f, photoURL: user.photoURL || '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Render task list
  const renderTaskList = (tasks) => {
    if (tasks.length === 0) {
      return <p className="text-gray-600 dark:text-gray-400">No tasks yet.</p>;
    }
    return (
      <ul className="space-y-3 mt-2">
        {tasks.map((task, index) => (
          <li
            key={index}
            className="border border-gray-200 dark:border-gray-700 p-4 rounded-xl bg-white dark:bg-gray-800 shadow-sm hover:shadow-lg transition-shadow flex flex-col gap-2"
          >
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-semibold text-lg text-gray-900 dark:text-white">{task.title}</h4>
              {task.status === 'completed' && (
                <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs font-bold bg-green-100 dark:bg-green-900 px-2 py-0.5 rounded">
                  <Star className="w-4 h-4" /> Completed
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{task.description}</p>
            <div className="flex justify-between items-center text-xs text-gray-400 dark:text-gray-500 mt-1">
              <span>
                {task.date ? new Date(task.date).toLocaleDateString() : ''}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="text-blue-500 border-blue-200 dark:border-blue-800"
                onClick={() => navigateTo('task', { taskId: task.id })}
              >
                View
              </Button>
            </div>
          </li>
        ))}
      </ul>
    );
  };

  // UI
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
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md sticky top-4 z-10 mb-6">
          <div className="flex items-center gap-4">
            {Avatar}
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">{displayName}</h2>
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
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-2">
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
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
            <Button onClick={logout} className="bg-red-500 hover:bg-red-600 text-white">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        {/* Edit Modal */}
        <Modal open={editOpen} onClose={() => setEditOpen(false)}>
          <form className="flex flex-col gap-4" onSubmit={handleSaveProfile}>
            <h3 className="text-xl font-semibold mb-2">Edit Profile</h3>
            
            {/* Photo Preview */}
            <div className="flex items-center gap-3 mb-2">
              {form.photoURL ? (
                <img src={form.photoURL} alt="Avatar preview" className="w-14 h-14 rounded-full object-cover border" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-blue-200 flex items-center justify-center text-2xl font-bold text-white">
                  <ImageIcon className="w-6 h-6 text-blue-700" />
                </div>
              )}
              <div className="flex-1">
                <span className="text-xs text-gray-400">Avatar Preview</span>
                {selectedFile && (
                  <div className="text-xs text-green-600 mt-1">
                    New photo selected: {selectedFile.name}
                    <button 
                      type="button" 
                      onClick={removeSelectedFile}
                      className="ml-2 text-red-500 hover:text-red-700"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* File Upload */}
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium flex items-center gap-1">
                Profile Photo
                <UploadCloud className="w-4 h-4 text-blue-500" />
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                disabled={saving}
                onChange={handlePhotoChange}
                className="mt-1 block w-full text-gray-700 dark:text-gray-200"
              />
              {saving && selectedFile && <span className="text-xs text-blue-500">Uploading...</span>}
            </label>

            {/* Name Field */}
            <label>
              <span className="text-sm font-medium">Name <span className="text-red-500">*</span></span>
              <input
                ref={nameRef}
                className="mt-1 block w-full px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                value={form.displayName}
                onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
                required
                maxLength={32}
                placeholder="Enter your name"
              />
            </label>

            {/* Phone Field */}
            <label>
              <span className="text-sm font-medium">Phone</span>
              <input
                className="mt-1 block w-full px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                value={form.phoneNumber}
                onChange={e => setForm(f => ({ ...f, phoneNumber: e.target.value }))}
                maxLength={18}
                placeholder="e.g. +91 9876543210"
              />
            </label>

            {/* Photo URL Field */}
            <label>
              <span className="text-sm font-medium">Photo URL (optional)</span>
              <input
                className="mt-1 block w-full px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                value={form.photoURL}
                onChange={e => setForm(f => ({ ...f, photoURL: e.target.value }))}
                placeholder="Paste image url or upload above"
                disabled={!!selectedFile}
              />
              {selectedFile && (
                <span className="text-xs text-gray-500">Photo URL disabled while file is selected</span>
              )}
            </label>

            {formError && <div className="text-sm text-red-500">{formError}</div>}
            
            <Button type="submit" disabled={saving} className="bg-blue-500 text-white mt-2">
              {saving ? "Saving..." : "Save"}
            </Button>
          </form>
        </Modal>

        {toast && <Toast {...toast} onClose={() => setToast(null)} />}

        {/* Tab Switch */}
        <div className="mt-4">
          <nav className="flex gap-4 border-b mb-4" role="tablist" aria-label="Profile Task Tabs">
            {[
              { key: 'posted', label: 'Posted Tasks' },
              { key: 'completed', label: 'Completed Tasks' },
              { key: 'all', label: 'All Tasks' }
            ].map(tab => (
              <button
                key={tab.key}
                role="tab"
                aria-selected={activeTab === tab.key}
                aria-controls={`tabpanel-${tab.key}`}
                id={`tab-${tab.key}`}
                onClick={() => setActiveTab(tab.key)}
                className={`py-2 px-4 font-medium focus:outline-none transition ${
                  activeTab === tab.key
                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
          <section
            id={`tabpanel-${activeTab}`}
            role="tabpanel"
            aria-labelledby={`tab-${activeTab}`}
            className="min-h-[150px]"
          >
            {activeTab === 'posted' && renderTaskList(postedTasks)}
            {activeTab === 'completed' && renderTaskList(completedTasks)}
            {activeTab === 'all' && renderTaskList(allTasks)}
          </section>
        </div>
      </div>
      <BottomNav navigateTo={navigateTo} />
    </div>
  );
};

export default ProfilePage;