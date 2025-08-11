import { useState, useContext } from "react";
import { ArrowLeft, FileText, MapPin, Tag, X, Clock, DollarSign, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { FaRupeeSign } from "react-icons/fa";
import Header from "../components/Header";
import { Button } from "../components/ui/Button";
import { Input } from "../components/Input";
import Swal from "sweetalert2";

import { db, auth } from "../firebase";
import {
  addDoc,
  collection,
  serverTimestamp,
  Timestamp,
  doc,
  getDoc,
} from "firebase/firestore";
import { AuthContext } from "../AuthContext";

const PostTaskPage = ({ navigateTo, theme, toggleTheme, isLoggedIn }) => {
  const { user } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    duration: "",
    location: "",
    date: "",
    time: "",
    budget: "custom",
    customBudget: "",
    negotiable: false,
    requirements: "",
  });

  const [selectedTags, setSelectedTags] = useState([]);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const availableTags = [
    "Physical Work",
    "Tech Skills",
    "Vehicle Required",
    "Tools Needed",
    "Indoor",
    "Outdoor",
    "Urgent",
    "Flexible",
    "Weekend",
    "Weekday",
  ];

  const categories = [
    { value: "Cleaning", icon: "🧹", desc: "House cleaning, office cleanup" },
    { value: "Delivery", icon: "🚚", desc: "Package delivery, food delivery" },
    { value: "Tech Support", icon: "💻", desc: "Computer help, software setup" },
    { value: "Moving", icon: "📦", desc: "Furniture moving, relocation help" },
    { value: "Pet Care", icon: "🐕", desc: "Pet sitting, dog walking" },
    { value: "Handyman", icon: "🔧", desc: "Repairs, installations, fixes" },
    { value: "Tutoring", icon: "📚", desc: "Academic help, skill teaching" },
    { value: "Shopping", icon: "🛒", desc: "Grocery shopping, errands" },
    { value: "Yard Work", icon: "🌱", desc: "Gardening, lawn maintenance" },
    { value: "Other", icon: "✨", desc: "Custom tasks and services" },
  ];

  const durations = [
    { value: "30 minutes", icon: "⚡" },
    { value: "1 hour", icon: "🕐" },
    { value: "2 hours", icon: "🕑" },
    { value: "Half-day", icon: "🌅" },
    { value: "Full-day", icon: "☀️" },
    { value: "Multiple days", icon: "📅" },
  ];

  const budgetOptions = [
    { value: "99", label: "₹99", subtitle: "Quick Task", popular: false, color: "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-700 dark:text-green-300" },
    { value: "349", label: "₹349", subtitle: "Most Popular", popular: true, color: "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300" },
    { value: "799", label: "₹799", subtitle: "Premium", popular: false, color: "bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/20 dark:border-purple-700 dark:text-purple-300" },
    { value: "custom", label: "Custom", subtitle: "Set your own price", popular: false, color: "bg-gray-50 border-gray-200 text-gray-700 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300" },
  ];

  const steps = [
    { number: 1, title: "Task Details", icon: FileText, completed: false },
    { number: 2, title: "Location & Time", icon: MapPin, completed: false },
    { number: 3, title: "Budget", icon: DollarSign, completed: false },
    { number: 4, title: "Additional Info", icon: Tag, completed: false },
  ];

  const validateForm = (data = formData) => {
    const newErrors = {};
    if (!data.title?.trim()) newErrors.title = "Task title is required";
    if (!data.description?.trim()) newErrors.description = "Description is required";
    if (!data.category) newErrors.category = "Category is required";
    if (!data.location?.trim()) newErrors.location = "Location is required";
    
    // Budget validation
    if (data.budget === "custom" && (!data.customBudget || Number(data.customBudget) <= 0)) {
      newErrors.customBudget = "Please enter a valid custom amount";
    }
    
    return newErrors;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    // Clear specific error for the field being edited
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    // Real-time validation for custom budget
    if (name === "customBudget" && value) {
      const numValue = Number(value);
      if (numValue <= 0) {
        setErrors((prev) => ({
          ...prev,
          customBudget: "Amount must be greater than 0"
        }));
      }
    }
  };

  const handleTagToggle = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const buildScheduledAt = (dateStr, timeStr) => {
    if (!dateStr && !timeStr) return null;
    const date = dateStr ? new Date(dateStr) : new Date();
    let hours = 9,
      minutes = 0;
    if (timeStr) {
      const [h, m] = timeStr.split(":").map(Number);
      if (!Number.isNaN(h)) hours = h;
      if (!Number.isNaN(m)) minutes = m;
    }
    const combined = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      hours,
      minutes,
      0,
      0
    );
    return Timestamp.fromDate(combined);
  };

  const getBudgetValue = (budget, customBudget) => {
    if (budget === "custom") {
      const val = Number(customBudget);
      return Number.isFinite(val) && val > 0 ? val : null;
    }
    const val = Number(budget);
    return Number.isFinite(val) ? val : null;
  };

  const fetchUserDataFromFirestore = async (userId) => {
    try {
      const userDocRef = doc(db, "users", userId);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        return userDoc.data();
      }
    } catch (error) {
      console.log("No user document found in Firestore:", error.message);
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user || !user.uid) {
      await Swal.fire({
        icon: "warning",
        title: "Authentication Required",
        text: "Please log in to post a task.",
        confirmButtonText: "Login",
      });
      return;
    }

    // Validate form
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      
      // Show validation error alert
      await Swal.fire({
        icon: "error",
        title: "Please Fix the Following Issues",
        html: Object.values(validationErrors).map(error => `• ${error}`).join('<br>'),
        confirmButtonText: "Fix Issues",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Show loading state
      const loadingAlert = Swal.fire({
        title: 'Creating Your Task...',
        text: 'Please wait while we post your task.',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // Enhanced user data fetching
      let freshDisplayName = user?.displayName;
      let freshPhotoURL = user?.photoURL;
      
      // Try to get fresh data from Firebase Auth
      if (auth.currentUser) {
        try {
          await auth.currentUser.reload();
          const currentUser = auth.currentUser;
          
          freshDisplayName = currentUser.displayName || user?.displayName;
          freshPhotoURL = currentUser.photoURL || user?.photoURL;
        } catch (authError) {
          console.warn("Could not reload auth user:", authError.message);
        }
      }

      // Try to get additional user data from Firestore
      const firestoreUserData = await fetchUserDataFromFirestore(user.uid);
      if (firestoreUserData) {
        freshDisplayName = firestoreUserData.displayName || freshDisplayName;
        freshPhotoURL = firestoreUserData.photoURL || freshPhotoURL;
      }

      // Additional fallbacks for display name
      if (!freshDisplayName) {
        if (user?.email) {
          freshDisplayName = user.email.split("@")[0];
        } else {
          freshDisplayName = "Anonymous User";
        }
      }

      // Prepare payload
      const budgetValue = getBudgetValue(formData.budget, formData.customBudget);
      if (budgetValue === null) {
        throw new Error("Please set a valid budget amount");
      }

      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        duration: formData.duration || "",
        location: formData.location.trim(),
        scheduledAt: buildScheduledAt(formData.date, formData.time),
        budget: budgetValue,
        negotiable: !!formData.negotiable,
        requirements: formData.requirements?.trim() || "",
        tags: selectedTags,
        postedBy: user.uid,
        postedByName: freshDisplayName,
        postedByPhotoURL: freshPhotoURL || null,
        acceptedBy: null,
        status: "open",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Enhanced debug logging
      console.log('Posting task with user data:', {
        userId: user.uid,
        userEmail: user.email,
        postedByName: payload.postedByName,
        postedByPhotoURL: payload.postedByPhotoURL,
        hasPhotoURL: !!payload.postedByPhotoURL,
        budget: payload.budget,
        scheduledAt: payload.scheduledAt,
        tagsCount: selectedTags.length
      });

      // Add document to Firestore
      const docRef = await addDoc(collection(db, "tasks"), payload);
      
      console.log("Task created successfully with ID:", docRef.id);

      // Close loading and show success
      Swal.close();
      
      await Swal.fire({
        icon: "success",
        title: "Task Posted Successfully! 🎉",
        html: `
          <div class="text-left mt-4">
            <p><strong>Task:</strong> ${payload.title}</p>
            <p><strong>Budget:</strong> ₹${payload.budget}</p>
            <p><strong>Category:</strong> ${payload.category}</p>
          </div>
        `,
        timer: 3000,
        showConfirmButton: true,
        confirmButtonText: "View Tasks",
      });

      // Reset form
      setFormData({
        title: "",
        description: "",
        category: "",
        duration: "",
        location: "",
        date: "",
        time: "",
        budget: "custom",
        customBudget: "",
        negotiable: false,
        requirements: "",
      });
      setSelectedTags([]);
      setErrors({});

      navigateTo("home");

    } catch (err) {
      console.error("Error posting task:", err);
      
      // Close any loading state
      Swal.close();
      
      let errorMessage = "Something went wrong while posting your task.";
      
      // Handle specific error types
      if (err.code === 'permission-denied') {
        errorMessage = "You don't have permission to post tasks. Please check your account.";
      } else if (err.code === 'network-error') {
        errorMessage = "Network error. Please check your connection and try again.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      await Swal.fire({
        icon: "error",
        title: "Failed to Post Task",
        text: errorMessage,
        confirmButtonText: "Try Again",
        footer: "If the problem persists, please contact support."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Clear form function
  const clearForm = () => {
    setFormData({
      title: "",
      description: "",
      category: "",
      duration: "",
      location: "",
      date: "",
      time: "",
      budget: "custom",
      customBudget: "",
      negotiable: false,
      requirements: "",
    });
    setSelectedTags([]);
    setErrors({});
  };

  const getStepProgress = () => {
    let completed = 0;
    if (formData.title && formData.description && formData.category) completed++;
    if (formData.location) completed++;
    if (formData.budget && (formData.budget !== "custom" || formData.customBudget)) completed++;
    return Math.round((completed / 4) * 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-200">
      <Header
        navigateTo={navigateTo}
        currentPage="post-task"
        isLoggedIn={isLoggedIn}
        theme={theme}
        toggleTheme={toggleTheme}
        showNav={false}
      />

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 pb-24 sm:pb-8 scroll-pb-24">
        <div className="max-w-4xl mx-auto">
          {/* Header with Progress */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => navigateTo("home")}
                className="p-3 hover:bg-white dark:hover:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 transition-all duration-200 hover:shadow-md"
                aria-label="Back to home"
                disabled={isSubmitting}
              >
                <ArrowLeft
                  size={20}
                  className="text-gray-600 dark:text-gray-300"
                />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Post a New Task
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Get help with your tasks from nearby helpers
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Progress
                </span>
                <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  {getStepProgress()}% Complete
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-blue-500 h-2 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${getStepProgress()}%` }}
                ></div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* 1. Task Details */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm p-8 hover:shadow-md transition-all duration-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                  <FileText size={24} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Task Details
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Tell us what you need help with
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
                    What do you need help with? *
                  </label>
                  <Input
                    type="text"
                    name="title"
                    placeholder="e.g., Help me move furniture to my new apartment"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                    disabled={isSubmitting}
                    className="w-full p-4 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:border-emerald-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-emerald-500/20 dark:focus:ring-blue-400/20 focus:bg-white dark:focus:bg-gray-700 transition-all duration-200 disabled:opacity-50"
                    aria-invalid={!!errors.title}
                    aria-describedby={errors.title ? "title-error" : undefined}
                  />
                  {errors.title && (
                    <div className="flex items-center gap-2 mt-2">
                      <AlertCircle size={16} className="text-red-500" />
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {errors.title}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
                    Detailed Description *
                  </label>
                  <textarea
                    name="description"
                    placeholder="Provide more details about what you need help with, any specific requirements, and what the helper should expect..."
                    className="w-full p-4 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:border-emerald-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-emerald-500/20 dark:focus:ring-blue-400/20 focus:bg-white dark:focus:bg-gray-700 transition-all duration-200 min-h-[120px] resize-y disabled:opacity-50"
                    value={formData.description}
                    onChange={handleInputChange}
                    required
                    disabled={isSubmitting}
                    aria-invalid={!!errors.description}
                    aria-describedby={errors.description ? "description-error" : undefined}
                  />
                  {errors.description && (
                    <div className="flex items-center gap-2 mt-2">
                      <AlertCircle size={16} className="text-red-500" />
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {errors.description}
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
                      Category *
                    </label>
                    <div className="relative">
                      <select
                        name="category"
                        className="w-full p-4 pr-12 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:border-emerald-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-emerald-500/20 dark:focus:ring-blue-400/20 focus:bg-white dark:focus:bg-gray-700 transition-all duration-200 disabled:opacity-50 appearance-none cursor-pointer"
                        value={formData.category}
                        onChange={handleInputChange}
                        required
                        disabled={isSubmitting}
                        aria-invalid={!!errors.category}
                        aria-describedby={errors.category ? "category-error" : undefined}
                      >
                        <option value="" className="text-gray-500">
                          Choose a category for your task
                        </option>
                        {categories.map((category) => (
                          <option key={category.value} value={category.value} className="py-2">
                            {category.icon} {category.value} - {category.desc}
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                    {formData.category && (
                      <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                          <span className="text-lg">
                            {categories.find(c => c.value === formData.category)?.icon}
                          </span>
                          <span className="font-medium">{formData.category}</span>
                        </div>
                        <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
                          {categories.find(c => c.value === formData.category)?.desc}
                        </p>
                      </div>
                    )}
                    {errors.category && (
                      <div className="flex items-center gap-2 mt-2">
                        <AlertCircle size={16} className="text-red-500" />
                        <p className="text-sm text-red-600 dark:text-red-400">
                          {errors.category}
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
                      Estimated Duration
                    </label>
                    <div className="relative">
                      <select
                        name="duration"
                        className="w-full p-4 pr-12 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 focus:bg-white dark:focus:bg-gray-700 transition-all duration-200 disabled:opacity-50 appearance-none cursor-pointer"
                        value={formData.duration}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                      >
                        <option value="" className="text-gray-500">
                          Select estimated duration
                        </option>
                        {durations.map((duration) => (
                          <option key={duration.value} value={duration.value} className="py-2">
                            {duration.icon} {duration.value}
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                    {formData.duration && (
                      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                          <span className="text-lg">
                            {durations.find(d => d.value === formData.duration)?.icon}
                          </span>
                          <span className="font-medium">{formData.duration}</span>
                        </div>
                        <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                          Expected time to complete this task
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Location & Timing */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm p-8 hover:shadow-md transition-all duration-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                  <MapPin size={24} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Location & Timing
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Where and when do you need help?
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
                    Task Location *
                  </label>
                  <Input
                    type="text"
                    name="location"
                    placeholder="Enter your address or neighborhood (e.g., Bandra West, Mumbai)"
                    value={formData.location}
                    onChange={handleInputChange}
                    required
                    disabled={isSubmitting}
                    className="w-full p-4 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:border-emerald-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-emerald-500/20 dark:focus:ring-blue-400/20 focus:bg-white dark:focus:bg-gray-700 transition-all duration-200 disabled:opacity-50"
                    aria-invalid={!!errors.location}
                    aria-describedby={errors.location ? "location-error" : undefined}
                  />
                  {errors.location && (
                    <div className="flex items-center gap-2 mt-2">
                      <AlertCircle size={16} className="text-red-500" />
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {errors.location}
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock size={18} className="text-blue-600 dark:text-blue-400" />
                      <label className="block text-sm font-medium text-gray-900 dark:text-white">
                        Preferred Date
                      </label>
                    </div>
                    <Input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full p-3 border border-blue-200 dark:border-blue-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all duration-200 disabled:opacity-50"
                    />
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock size={18} className="text-purple-600 dark:text-purple-400" />
                      <label className="block text-sm font-medium text-gray-900 dark:text-white">
                        Preferred Time
                      </label>
                    </div>
                    <Input
                      type="time"
                      name="time"
                      value={formData.time}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      className="w-full p-3 border border-purple-200 dark:border-purple-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:border-purple-500 dark:focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 dark:focus:ring-purple-400/20 transition-all duration-200 disabled:opacity-50"
                    />
                  </div>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <Info size={20} className="text-amber-600 dark:text-amber-400 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-amber-800 dark:text-amber-300 mb-1">
                        Flexible Scheduling
                      </h4>
                      <p className="text-sm text-amber-700 dark:text-amber-400">
                        Date and time are optional. You can discuss and finalize the schedule with your helper later.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Pricing & Payment */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm p-8 hover:shadow-md transition-all duration-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                  <FaRupeeSign size={24} className="text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Budget & Payment
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Set your budget for this task
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-4">
                    Choose your budget
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {budgetOptions.map((option) => (
                      <label
                        key={option.value}
                        className={`relative flex flex-col items-center p-6 border-2 rounded-2xl cursor-pointer transition-all duration-200 hover:shadow-lg transform hover:-translate-y-1 ${
                          formData.budget === option.value
                            ? `${option.color} border-current shadow-lg scale-105`
                            : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-700"
                        } ${isSubmitting ? 'opacity-50 cursor-not-allowed hover:transform-none' : ''}`}
                      >
                        {option.popular && (
                          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                            <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                              POPULAR
                            </span>
                          </div>
                        )}
                        <input
                          type="radio"
                          name="budget"
                          value={option.value}
                          checked={formData.budget === option.value}
                          onChange={handleInputChange}
                          disabled={isSubmitting}
                          className="sr-only"
                        />
                        <div className="text-2xl font-bold text-current mb-2">
                          {option.label}
                        </div>
                        <div className="text-sm text-current opacity-80 text-center">
                          {option.subtitle}
                        </div>
                        {formData.budget === option.value && (
                          <div className="absolute top-3 right-3">
                            <CheckCircle2 size={20} className="text-current" />
                          </div>
                        )}
                      </label>
                    ))}
                  </div>
                </div>

                {formData.budget === "custom" && (
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-2xl p-6 border border-gray-200 dark:border-gray-600">
                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
                      Enter your custom amount *
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                        <FaRupeeSign size={18} />
                      </div>
                      <Input
                        type="number"
                        name="customBudget"
                        placeholder="Enter amount (e.g., 500)"
                        value={formData.customBudget}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                        min="1"
                        step="1"
                        className="w-full p-4 pl-12 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-lg font-medium focus:outline-none focus:border-emerald-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-emerald-500/20 dark:focus:ring-blue-400/20 transition-all duration-200 disabled:opacity-50"
                        aria-invalid={!!errors.customBudget}
                        aria-describedby={errors.customBudget ? "customBudget-error" : undefined}
                      />
                    </div>
                    {errors.customBudget && (
                      <div className="flex items-center gap-2 mt-2">
                        <AlertCircle size={16} className="text-red-500" />
                        <p className="text-sm text-red-600 dark:text-red-400">
                          {errors.customBudget}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="negotiable"
                      checked={formData.negotiable}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      className="mt-1 text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-400 rounded transition-colors disabled:opacity-50"
                    />
                    <div>
                      <div className="font-medium text-blue-900 dark:text-blue-100">
                        💬 Price is negotiable
                      </div>
                      <div className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        Allow helpers to propose different pricing for your task
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* 4. Additional Details */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm p-8 hover:shadow-md transition-all duration-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                  <Tag size={24} className="text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Additional Details
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Add more context to help find the right helper
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
                    Special Requirements or Tools Needed (Optional)
                  </label>
                  <textarea
                    name="requirements"
                    placeholder="Any specific skills, tools, or requirements? (e.g., 'Must have own transportation', 'Experience with heavy lifting required')"
                    className="w-full p-4 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:border-purple-500 dark:focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 dark:focus:ring-purple-400/20 focus:bg-white dark:focus:bg-gray-700 transition-all duration-200 min-h-[100px] resize-y disabled:opacity-50"
                    value={formData.requirements}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-4">
                    Add Tags (Select all that apply)
                  </label>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    {availableTags.map((tag) => (
                      <label
                        key={tag}
                        className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all duration-200 border-2 hover:shadow-sm ${
                          selectedTags.includes(tag)
                            ? "bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/30 dark:to-blue-900/30 border-emerald-300 dark:border-emerald-600 text-emerald-700 dark:text-emerald-300 shadow-sm"
                            : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700"
                        } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedTags.includes(tag)}
                          onChange={() => !isSubmitting && handleTagToggle(tag)}
                          disabled={isSubmitting}
                          className="text-emerald-600 focus:ring-emerald-500 dark:focus:ring-emerald-400 rounded transition-colors disabled:opacity-50"
                        />
                        <span className="text-sm font-medium text-gray-900 dark:text-white flex-1">
                          {tag}
                        </span>
                        {selectedTags.includes(tag) && (
                          <CheckCircle2 size={18} className="text-emerald-500 dark:text-emerald-400" />
                        )}
                      </label>
                    ))}
                  </div>

                  {selectedTags.length > 0 && (
                    <div className="mt-6 bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800">
                      <div className="text-sm font-medium text-emerald-800 dark:text-emerald-300 mb-3 flex items-center gap-2">
                        <Tag size={16} />
                        Selected Tags ({selectedTags.length})
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedTags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-4 py-2 rounded-full bg-white dark:bg-gray-800 border border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 text-sm font-medium shadow-sm"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => !isSubmitting && handleTagToggle(tag)}
                              disabled={isSubmitting}
                              className="ml-2 text-current hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full"
                              aria-label={`Remove ${tag} tag`}
                            >
                              <X size={14} />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Button Bar */}
            <div className="sticky bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-6 sm:static sm:bg-transparent sm:dark:bg-transparent sm:border-0 sm:p-0 z-30 rounded-t-2xl sm:rounded-none shadow-2xl sm:shadow-none">
              <div className="max-w-4xl mx-auto flex gap-4">
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (isSubmitting) return;
                    
                    // Check if form has data
                    const hasData = formData.title || formData.description || formData.location || selectedTags.length > 0;
                    
                    if (hasData) {
                      Swal.fire({
                        title: 'Discard Changes?',
                        text: "You have unsaved changes. Are you sure you want to leave?",
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#d33',
                        cancelButtonColor: '#3085d6',
                        confirmButtonText: 'Yes, discard',
                        cancelButtonText: 'Keep editing'
                      }).then((result) => {
                        if (result.isConfirmed) {
                          clearForm();
                          navigateTo("home");
                        }
                      });
                    } else {
                      navigateTo("home");
                    }
                  }}
                  disabled={isSubmitting}
                  className="flex-1 h-14 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl px-6 py-3 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {isSubmitting ? 'Posting...' : 'Cancel'}
                </Button>
                
                <Button
                  type="submit"
                  disabled={isSubmitting || Object.keys(errors).length > 0}
                  className="flex-2 h-14 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 hover:from-emerald-600 hover:via-blue-600 hover:to-purple-600 text-white font-semibold rounded-xl px-8 py-3 disabled:from-gray-400 disabled:via-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none disabled:shadow-none"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-3">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Creating Your Task...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      🚀 Post Task
                    </span>
                  )}
                </Button>
              </div>
            </div>

            {/* Progress indicator for mobile */}
            <div className="sm:hidden fixed top-0 left-0 right-0 z-50">
              {isSubmitting && (
                <div className="bg-gradient-to-r from-emerald-500 to-blue-500 h-1 animate-pulse"></div>
              )}
            </div>
          </form>

          {/* Success Preview Card - Shows progress summary */}
          {(formData.title || formData.description || formData.location) && (
            <div className="mt-8 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <CheckCircle2 size={20} className="text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-semibold text-green-800 dark:text-green-300">
                  Task Preview
                </h3>
              </div>
              <div className="space-y-2 text-sm">
                {formData.title && (
                  <p><span className="font-medium text-green-700 dark:text-green-300">Title:</span> {formData.title}</p>
                )}
                {formData.category && (
                  <p><span className="font-medium text-green-700 dark:text-green-300">Category:</span> {formData.category}</p>
                )}
                {formData.location && (
                  <p><span className="font-medium text-green-700 dark:text-green-300">Location:</span> {formData.location}</p>
                )}
                {(formData.budget !== "custom" ? formData.budget : formData.customBudget) && (
                  <p><span className="font-medium text-green-700 dark:text-green-300">Budget:</span> ₹{formData.budget === "custom" ? formData.customBudget : formData.budget}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default PostTaskPage;