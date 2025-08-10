import { useState, useContext } from "react";
import { ArrowLeft, FileText, MapPin, Tag, X } from "lucide-react";
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
    "Cleaning",
    "Delivery",
    "Tech Support",
    "Moving",
    "Pet Care",
    "Handyman",
    "Tutoring",
    "Shopping",
    "Yard Work",
    "Other",
  ];

  const durations = [
    "30 minutes",
    "1 hour",
    "2 hours",
    "Half-day",
    "Full-day",
    "Multiple days",
  ];

  const budgetOptions = [
    { value: "99", label: "₹99 Quick Task" },
    { value: "349", label: "₹349 Most Popular" },
    { value: "799", label: "₹799 Premium" },
    { value: "custom", label: "Custom Amount" },
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <Header
        navigateTo={navigateTo}
        currentPage="post-task"
        isLoggedIn={isLoggedIn}
        theme={theme}
        toggleTheme={toggleTheme}
        showNav={false}
      />

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 pb-24 sm:pb-8 scroll-pb-24">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => navigateTo("home")}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              aria-label="Back to home"
              disabled={isSubmitting}
            >
              <ArrowLeft
                size={24}
                className="text-gray-600 dark:text-gray-300"
              />
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Post a New Task
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 1. Task Details */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-6 sm:p-8">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <FileText size={20} />
                1. Task Details
              </h2>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Task Title *
                </label>
                <Input
                  type="text"
                  name="title"
                  placeholder="e.g., Help me move furniture to my new apartment"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  disabled={isSubmitting}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:border-emerald-500 dark:focus:border-blue-400 focus:ring focus:ring-emerald-500/10 dark:focus:ring-blue-400/10 min-h-14 disabled:opacity-50"
                  aria-invalid={!!errors.title}
                  aria-describedby={errors.title ? "title-error" : undefined}
                />
                {errors.title && (
                  <p
                    id="title-error"
                    className="text-sm text-red-600 dark:text-red-400 mt-1 animate-pulse"
                  >
                    {errors.title}
                  </p>
                )}
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Detailed Description *
                </label>
                <textarea
                  name="description"
                  placeholder="Provide a detailed description of what you need help with..."
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:border-emerald-500 dark:focus:border-blue-400 focus:ring focus:ring-emerald-500/10 dark:focus:ring-blue-400/10 min-h-[140px] disabled:opacity-50"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  disabled={isSubmitting}
                  aria-invalid={!!errors.description}
                  aria-describedby={
                    errors.description ? "description-error" : undefined
                  }
                />
                {errors.description && (
                  <p
                    id="description-error"
                    className="text-sm text-red-600 dark:text-red-400 mt-1 animate-pulse"
                  >
                    {errors.description}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Category *
                  </label>
                  <select
                    name="category"
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:border-emerald-500 dark:focus:border-blue-400 focus:ring focus:ring-emerald-500/10 dark:focus:ring-blue-400/10 min-h-14 disabled:opacity-50"
                    value={formData.category}
                    onChange={handleInputChange}
                    required
                    disabled={isSubmitting}
                    aria-invalid={!!errors.category}
                    aria-describedby={
                      errors.category ? "category-error" : undefined
                    }
                  >
                    <option value="">Select a category</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  {errors.category && (
                    <p
                      id="category-error"
                      className="text-sm text-red-600 dark:text-red-400 mt-1 animate-pulse"
                    >
                      {errors.category}
                    </p>
                  )}
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Estimated Duration
                  </label>
                  <select
                    name="duration"
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:border-emerald-500 dark:focus:border-blue-400 focus:ring focus:ring-emerald-500/10 dark:focus:ring-blue-400/10 min-h-14 disabled:opacity-50"
                    value={formData.duration}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                  >
                    {["", ...durations].map((d) => (
                      <option key={d} value={d}>
                        {d || "Select duration"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 2. Location & Timing */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-6 sm:p-8">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <MapPin size={20} />
                2. Location & Timing
              </h2>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Task Location *
                </label>
                <Input
                  type="text"
                  name="location"
                  placeholder="Enter address or neighborhood"
                  value={formData.location}
                  onChange={handleInputChange}
                  required
                  disabled={isSubmitting}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:border-emerald-500 dark:focus:border-blue-400 focus:ring focus:ring-emerald-500/10 dark:focus:ring-blue-400/10 min-h-14 disabled:opacity-50"
                  aria-invalid={!!errors.location}
                  aria-describedby={
                    errors.location ? "location-error" : undefined
                  }
                />
                {errors.location && (
                  <p
                    id="location-error"
                    className="text-sm text-red-600 dark:text-red-400 mt-1 animate-pulse"
                  >
                    {errors.location}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Preferred Date
                  </label>
                  <Input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:border-emerald-500 dark:focus:border-blue-400 focus:ring focus:ring-emerald-500/10 dark:focus:ring-blue-400/10 min-h-14 disabled:opacity-50"
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Preferred Time
                  </label>
                  <Input
                    type="time"
                    name="time"
                    value={formData.time}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:border-emerald-500 dark:focus:border-blue-400 focus:ring focus:ring-emerald-500/10 dark:focus:ring-blue-400/10 min-h-14 disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            {/* 3. Pricing & Payment */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-6 sm:p-8">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <FaRupeeSign size={20} />
                3. Pricing & Payment
              </h2>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Budget Options
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {budgetOptions.map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-center gap-3 p-4 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer transition-colors duration-200 ${
                        formData.budget === option.value
                          ? "border-emerald-500 bg-emerald-50 dark:border-blue-600 dark:bg-gray-700"
                          : "hover:bg-gray-50 dark:hover:bg-gray-700"
                      } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <input
                        type="radio"
                        name="budget"
                        value={option.value}
                        checked={formData.budget === option.value}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                        className="text-emerald-600 focus:ring-emerald-500 dark:focus:ring-blue-400 disabled:opacity-50"
                      />
                      <span className="font-medium text-gray-900 dark:text-white">
                        {option.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {formData.budget === "custom" && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Custom Amount *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-5 text-gray-500 dark:text-gray-400">
                      <FaRupeeSign size={16} />
                    </span>
                    <Input
                      type="number"
                      name="customBudget"
                      placeholder="Enter amount"
                      value={formData.customBudget}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      min="1"
                      step="1"
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:border-emerald-500 dark:focus:border-blue-400 focus:ring focus:ring-emerald-500/10 dark:focus:ring-blue-400/10 min-h-14 pl-8 disabled:opacity-50"
                      aria-invalid={!!errors.customBudget}
                      aria-describedby={errors.customBudget ? "customBudget-error" : undefined}
                    />
                  </div>
                  {errors.customBudget && (
                    <p
                      id="customBudget-error"
                      className="text-sm text-red-600 dark:text-red-400 mt-1 animate-pulse"
                    >
                      {errors.customBudget}
                    </p>
                  )}
                </div>
              )}

              <div className="mb-6">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    name="negotiable"
                    checked={formData.negotiable}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    className="text-emerald-600 focus:ring-emerald-500 dark:focus:ring-blue-400 rounded disabled:opacity-50"
                  />
                  <span className="text-gray-900 dark:text-white">
                    Price is negotiable
                  </span>
                </label>
              </div>
            </div>

            {/* 4. Additional Details */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-6 sm:p-8">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Tag size={20} />
                4. Additional Details
              </h2>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Requirements (Optional)
                </label>
                <textarea
                  name="requirements"
                  placeholder="Any specific requirements or tools needed..."
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:border-emerald-500 dark:focus:border-blue-400 focus:ring focus:ring-emerald-500/10 dark:focus:ring-blue-400/10 min-h-[100px] disabled:opacity-50"
                  value={formData.requirements}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Add Tags (select all that apply)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                  {availableTags.map((tag) => (
                    <label
                      key={tag}
                      className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors duration-200 ${
                        selectedTags.includes(tag)
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-800 dark:text-emerald-300"
                          : "hover:bg-gray-100 dark:hover:bg-gray-700"
                      } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedTags.includes(tag)}
                        onChange={() => !isSubmitting && handleTagToggle(tag)}
                        disabled={isSubmitting}
                        className="text-emerald-600 focus:ring-emerald-500 dark:focus:ring-blue-400 rounded disabled:opacity-50"
                      />
                      <span className="text-sm text-gray-900 dark:text-white">
                        {tag}
                      </span>
                    </label>
                  ))}
                </div>

                {selectedTags.length > 0 && (
                  <div className="mt-4">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Selected Tags ({selectedTags.length}):
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedTags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => !isSubmitting && handleTagToggle(tag)}
                            disabled={isSubmitting}
                            className="ml-1 text-current hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50"
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

            {/* Submit Button Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-4 sm:static sm:bg-transparent sm:dark:bg-transparent sm:border-0 sm:p-0 sm:mt-6 z-30">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-4 max-w-5xl">
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
                  className="flex-1 min-h-14 sm:min-h-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-md px-6 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Posting...' : 'Cancel'}
                </Button>
                
                <Button
                  type="submit"
                  disabled={isSubmitting || Object.keys(errors).length > 0}
                  className="flex-1 min-h-14 sm:min-h-10 bg-gradient-to-r from-emerald-500 to-blue-500 dark:from-emerald-600 dark:to-blue-600 text-white font-medium rounded-md px-6 py-3 hover:from-emerald-600 hover:to-blue-600 dark:hover:from-emerald-700 dark:hover:to-blue-700 disabled:from-gray-500 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Posting Task...
                    </span>
                  ) : (
                    'Post Task'
                  )}
                </Button>
              </div>
            </div>

            {/* Progress indicator for mobile */}
            <div className="sm:hidden fixed top-0 left-0 right-0 z-50">
              {isSubmitting && (
                <div className="bg-emerald-500 h-1 animate-pulse"></div>
              )}
            </div>
          </form>

          {/* Debug info for development (remove in production) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs">
              <h3 className="font-semibold mb-2">Debug Info:</h3>
              <pre className="text-gray-600 dark:text-gray-400">
                User: {user?.email || 'Not logged in'}
                {'\n'}Form Errors: {JSON.stringify(errors, null, 2)}
                {'\n'}Selected Tags: {selectedTags.join(', ') || 'None'}
                {'\n'}Budget: {formData.budget === 'custom' ? `Custom: ₹${formData.customBudget}` : `₹${formData.budget}`}
              </pre>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default PostTaskPage;