import React, { useState, useContext, useEffect, useMemo } from "react";
import { Search, Filter, Plus, Clipboard, User, Sparkles, MapPin } from "lucide-react";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import TaskCard from "../components/TaskCard";
import { AuthContext } from "../AuthContext";

import {
  collection,
  query,
  where,
  limit,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase"; // adjust if needed

const HomePage = ({
  navigateTo,
  isAuthenticated,
  theme,
  toggleTheme,
  logout,
}) => {
  // ---- Persistent Role (URL param -> localStorage -> default) ----
  const ROLE_KEY = "jugaad:userRole";
  const [userRole, setUserRole] = useState(() => {
    try {
      const sp = new URLSearchParams(
        typeof window !== "undefined" ? window.location.search : ""
      );
      const urlRole = sp.get("role");
      if (urlRole === "poster" || urlRole === "provider") return urlRole;
    } catch {}
    try {
      const saved =
        typeof window !== "undefined" ? localStorage.getItem(ROLE_KEY) : null;
      if (saved === "poster" || saved === "provider") return saved;
    } catch {}
    return "provider";
  });

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(ROLE_KEY, userRole);
        const sp = new URLSearchParams(window.location.search);
        sp.set("role", userRole);
        window.history.replaceState(
          {},
          "",
          `${window.location.pathname}?${sp.toString()}`
        );
      }
    } catch {}
  }, [userRole]);

  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: "",
    priceRange: "",
    status: "",
    location: ""
  });
  const { user } = useContext(AuthContext);

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 🔹 Use only statuses allowed in Firestore rules
  const ACTIVE_STATUSES = ["open", "assigned", "in_progress"];

  useEffect(() => {
    if (!user && userRole === "poster") {
      setTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const tasksRef = collection(db, "tasks");

    // Poster: only their tasks
    const posterQ = query(
      tasksRef,
      where("postedBy", "==", user?.uid || "__no_user__"),
      limit(50)
    );

    // Provider: tasks that are open or already assigned
    const providerQ = query(
      tasksRef,
      where("status", "in", ACTIVE_STATUSES),
      limit(50)
    );

    const q = userRole === "poster" ? posterQ : providerQ;

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((doc) => {
          const d = doc.data();

          const ts = (t) => (t?.toDate ? t.toDate() : t || null);
          const toISO = (t) =>
            t?.toDate ? t.toDate().toISOString() : t || null;

          return {
            id: doc.id,
            title: d.title || "Untitled task",
            budget: d.budget ?? 0,
            location: d.location || "—",
            status: d.status || "open",
            category: d.category || "general",
            description: d.description || "",
            duration: d.duration || "",
            negotiable: d.negotiable ?? false,
            postedBy: d.postedBy,
            postedByName: d.postedByName || d.posterName || null, // ← read denormalized poster name

            requirements: d.requirements || "",
            acceptedBy: d.acceptedBy || null,
            acceptedByName: d.acceptedBy?.name || d.acceptedByName || null, // ← read denormalized accepter name

            tags: Array.isArray(d.tags) ? d.tags : [],
            createdAt: toISO(d.createdAt),
            updatedAt: toISO(d.updatedAt),
            deadline: toISO(d.scheduledAt),
            createdAtDate: ts(d.createdAt),
            updatedAtDate: ts(d.updatedAt),
            scheduledAtDate: ts(d.scheduledAt),
          };
        });

        setTasks(rows);
        setLoading(false);
      },
      (err) => {
        console.error("onSnapshot error:", err);
        setError(err.message || "Failed to load tasks");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [userRole, user?.uid]);

  const filteredTasks = useMemo(() => {
    let filtered = tasks;
    
    // Search filter
    const term = (searchTerm || "").toLowerCase().trim();
    if (term) {
      filtered = filtered.filter(
        (t) =>
          (t.title || "").toLowerCase().includes(term) ||
          (t.location || "").toLowerCase().includes(term) ||
          (t.description || "").toLowerCase().includes(term) ||
          (t.category || "").toLowerCase().includes(term)
      );
    }
    
    // Category filter
    if (filters.category) {
      filtered = filtered.filter(t => t.category === filters.category);
    }
    
    // Price range filter
    if (filters.priceRange) {
      filtered = filtered.filter(t => {
        const budget = t.budget || 0;
        switch (filters.priceRange) {
          case "0-500": return budget >= 0 && budget <= 500;
          case "500-1000": return budget > 500 && budget <= 1000;
          case "1000-2500": return budget > 1000 && budget <= 2500;
          case "2500+": return budget > 2500;
          default: return true;
        }
      });
    }
    
    // Status filter (for posters)
    if (filters.status && userRole === "poster") {
      filtered = filtered.filter(t => t.status === filters.status);
    }
    
    // Location filter
    if (filters.location) {
      filtered = filtered.filter(t => 
        (t.location || "").toLowerCase().includes(filters.location.toLowerCase())
      );
    }
    
    return filtered;
  }, [tasks, searchTerm, filters, userRole]);

  const userDisplayName =
    user?.displayName || user?.email?.split("@")[0] || "there";

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const getRoleDescription = () => {
    if (userRole === "poster") {
      return {
        title: "Task Poster Dashboard",
        description: "Manage your posted tasks and connect with skilled service providers in your community.",
        cta: "Post a new task to get help with anything you need!"
      };
    }
    return {
      title: "Service Provider Hub",
      description: "Discover meaningful opportunities to help your neighbors while earning extra income.",
      cta: "Browse available tasks and start making a difference today!"
    };
  };

  const roleInfo = getRoleDescription();

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        theme === "light"
          ? "bg-gradient-to-br from-blue-50 via-white to-emerald-50"
          : "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900"
      }`}
    >
      <Header
        navigateTo={navigateTo}
        currentPage="home"
        isAuthenticated={isAuthenticated}
        theme={theme}
        toggleTheme={toggleTheme}
        logout={logout}
      />

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10 pb-32">
        {/* Welcome Section */}
        <div className="mb-8 sm:mb-12">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 sm:gap-8">
            <div className="flex-1">
              <div className="mb-3">
                <h1
                  className={`text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 bg-gradient-to-r ${
                    theme === "light" 
                      ? "from-gray-900 via-blue-800 to-emerald-700" 
                      : "from-white via-blue-200 to-emerald-200"
                  } bg-clip-text text-transparent`}
                >
                  {getGreeting()}, {userDisplayName}! 
                  <span className="inline-block ml-2 animate-pulse">✨</span>
                </h1>
                <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium ${
                  theme === "light"
                    ? "bg-blue-100 text-blue-800 border border-blue-200"
                    : "bg-blue-900/30 text-blue-300 border border-blue-700/50"
                }`}>
                  <Sparkles size={12} />
                  {roleInfo.title}
                </div>
              </div>
              
              <div className="space-y-1">
                <p
                  className={`text-base sm:text-lg font-medium ${
                    theme === "light" ? "text-gray-700" : "text-gray-200"
                  }`}
                >
                  {roleInfo.description}
                </p>
                <p
                  className={`text-sm ${
                    theme === "light" ? "text-gray-600" : "text-gray-400"
                  }`}
                >
                  {roleInfo.cta}
                </p>
              </div>
            </div>

            {/* Enhanced Role Switcher */}
            <div
              className={`flex flex-col sm:flex-row items-stretch gap-3 ${
                theme === "light"
                  ? "bg-white/80 backdrop-blur-sm border-gray-200 shadow-lg"
                  : "bg-gray-800/80 backdrop-blur-sm border-gray-700 shadow-2xl"
              } rounded-2xl p-3 border w-full sm:w-auto min-w-[320px] sm:min-w-0`}
            >
              <div className="text-center mb-2 sm:hidden">
                <p className={`text-xs font-medium ${theme === "light" ? "text-gray-600" : "text-gray-300"}`}>
                  Switch your role
                </p>
              </div>
              
              <button
                onClick={() => setUserRole("poster")}
                className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-300 transform ${
                  userRole === "poster"
                    ? "bg-gradient-to-r from-blue-500 to-emerald-500 text-white shadow-lg scale-105 ring-2 ring-blue-200"
                    : theme === "light"
                    ? "text-gray-600 hover:text-gray-900 hover:bg-gray-50 hover:scale-105"
                    : "text-gray-300 hover:text-white hover:bg-gray-700 hover:scale-105"
                } relative overflow-hidden group`}
              >
                <div className={`absolute inset-0 bg-gradient-to-r from-blue-600 to-emerald-600 opacity-0 ${userRole === "poster" ? "" : "group-hover:opacity-10"} transition-opacity`} />
                <Clipboard size={16} className="relative z-10" />
                <span className="relative z-10">Task Poster</span>
                {userRole === "poster" && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full animate-pulse" />
                )}
              </button>

              <button
                onClick={() => setUserRole("provider")}
                className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-300 transform ${
                  userRole === "provider"
                    ? "bg-gradient-to-r from-emerald-500 to-blue-500 text-white shadow-lg scale-105 ring-2 ring-emerald-200"
                    : theme === "light"
                    ? "text-gray-600 hover:text-gray-900 hover:bg-gray-50 hover:scale-105"
                    : "text-gray-300 hover:text-white hover:bg-gray-700 hover:scale-105"
                } relative overflow-hidden group`}
              >
                <div className={`absolute inset-0 bg-gradient-to-r from-emerald-600 to-blue-600 opacity-0 ${userRole === "provider" ? "" : "group-hover:opacity-10"} transition-opacity`} />
                <User size={16} className="relative z-10" />
                <span className="relative z-10">Service Provider</span>
                {userRole === "provider" && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full animate-pulse" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Search Section */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-6">
            <div className="flex-1 relative w-full group">
              <Search
                className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-colors ${
                  theme === "light" 
                    ? "text-gray-400 group-focus-within:text-blue-500" 
                    : "text-gray-400 group-focus-within:text-blue-400"
                }`}
              />
              <input
                type="text"
                placeholder={
                  userRole === "poster"
                    ? "Search your tasks by title or location..."
                    : "Find tasks by title, location, or skills needed..."
                }
                className={`w-full pl-12 pr-4 py-3 text-base ${
                  theme === "light"
                    ? "bg-white/90 backdrop-blur-sm border-gray-200 text-gray-800 placeholder-gray-500 focus:bg-white"
                    : "bg-gray-800/90 backdrop-blur-sm border-gray-600 text-white placeholder-gray-400 focus:bg-gray-800"
                } rounded-2xl shadow-lg border-2 focus:outline-none focus:ring-4 ${
                  theme === "light" 
                    ? "focus:ring-blue-100 focus:border-blue-400" 
                    : "focus:ring-blue-900/30 focus:border-blue-500"
                } transition-all duration-300`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className={`absolute right-4 top-1/2 transform -translate-y-1/2 ${
                    theme === "light" ? "text-gray-400 hover:text-gray-600" : "text-gray-400 hover:text-gray-200"
                  } transition-colors`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-3 ${
                theme === "light"
                  ? "text-gray-700 bg-white/90 border-gray-200 hover:bg-white hover:shadow-lg"
                  : "text-gray-300 bg-gray-800/90 border-gray-600 hover:bg-gray-800 hover:shadow-2xl"
              } backdrop-blur-sm font-medium px-4 py-3 rounded-2xl shadow-lg hover:scale-105 transition-all duration-300 w-full md:w-auto border-2`}
              aria-expanded={showFilters}
              aria-label="Toggle filters"
            >
              <Filter size={18} />
              <span className="text-base">Filters</span>
              <div className={`ml-2 transform transition-transform ${showFilters ? "rotate-180" : ""}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className={`mt-6 p-6 rounded-2xl border-2 ${
              theme === "light" 
                ? "bg-white/90 backdrop-blur-sm border-gray-200 shadow-lg" 
                : "bg-gray-800/90 backdrop-blur-sm border-gray-600 shadow-2xl"
            } transition-all duration-300`}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Category Filter */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    theme === "light" ? "text-gray-700" : "text-gray-200"
                  }`}>
                    Category
                  </label>
                  <select
                    value={filters.category}
                    onChange={(e) => setFilters({...filters, category: e.target.value})}
                    className={`w-full px-3 py-2 rounded-lg border ${
                      theme === "light"
                        ? "bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-200"
                        : "bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-800"
                    } focus:outline-none focus:ring-2 transition-colors`}
                  >
                    <option value="">All Categories</option>
                    <option value="cleaning">Cleaning</option>
                    <option value="delivery">Delivery</option>
                    <option value="handyman">Handyman</option>
                    <option value="tutoring">Tutoring</option>
                    <option value="gardening">Gardening</option>
                    <option value="tech">Tech Support</option>
                    <option value="general">General</option>
                  </select>
                </div>

                {/* Price Range Filter */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    theme === "light" ? "text-gray-700" : "text-gray-200"
                  }`}>
                    Budget Range
                  </label>
                  <select
                    value={filters.priceRange}
                    onChange={(e) => setFilters({...filters, priceRange: e.target.value})}
                    className={`w-full px-3 py-2 rounded-lg border ${
                      theme === "light"
                        ? "bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-200"
                        : "bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-800"
                    } focus:outline-none focus:ring-2 transition-colors`}
                  >
                    <option value="">Any Budget</option>
                    <option value="0-500">₹0 - ₹500</option>
                    <option value="500-1000">₹500 - ₹1,000</option>
                    <option value="1000-2500">₹1,000 - ₹2,500</option>
                    <option value="2500+">₹2,500+</option>
                  </select>
                </div>

                {/* Status Filter (for posters only) */}
                {userRole === "poster" && (
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      theme === "light" ? "text-gray-700" : "text-gray-200"
                    }`}>
                      Status
                    </label>
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters({...filters, status: e.target.value})}
                      className={`w-full px-3 py-2 rounded-lg border ${
                        theme === "light"
                          ? "bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-200"
                          : "bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-800"
                        } focus:outline-none focus:ring-2 transition-colors`}
                    >
                      <option value="">All Statuses</option>
                      <option value="open">Open</option>
                      <option value="assigned">Assigned</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                )}

                {/* Location Filter */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    theme === "light" ? "text-gray-700" : "text-gray-200"
                  }`}>
                    Location
                  </label>
                  <input
                    type="text"
                    value={filters.location}
                    onChange={(e) => setFilters({...filters, location: e.target.value})}
                    placeholder="Enter area name..."
                    className={`w-full px-3 py-2 rounded-lg border ${
                      theme === "light"
                        ? "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-200"
                        : "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-800"
                    } focus:outline-none focus:ring-2 transition-colors`}
                  />
                </div>
              </div>

              {/* Filter Actions */}
              <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
                <div className={`text-sm ${
                  theme === "light" ? "text-gray-600" : "text-gray-400"
                }`}>
                  {Object.values(filters).filter(Boolean).length} filter{Object.values(filters).filter(Boolean).length !== 1 ? 's' : ''} active
                </div>
                <button
                  onClick={() => setFilters({ category: "", priceRange: "", status: "", location: "" })}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    theme === "light"
                      ? "text-gray-600 bg-gray-100 hover:bg-gray-200"
                      : "text-gray-300 bg-gray-700 hover:bg-gray-600"
                  }`}
                >
                  Clear All
                </button>
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="flex items-center gap-4 text-sm mt-4">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
              theme === "light" 
                ? "bg-blue-50 text-blue-700" 
                : "bg-blue-900/20 text-blue-300"
            }`}>
              <div className="w-2 h-2 bg-current rounded-full animate-pulse" />
              {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'} found
            </div>
            {searchTerm && (
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                theme === "light" 
                  ? "bg-emerald-50 text-emerald-700" 
                  : "bg-emerald-900/20 text-emerald-300"
              }`}>
                <MapPin size={12} />
                Filtered by: "{searchTerm}"
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Section Title */}
        <div
          className={`flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4`}
        >
          <div>
            <h2 className={`text-xl sm:text-2xl font-bold mb-2 ${
              theme === "light" ? "text-gray-900" : "text-white"
            }`}>
              {userRole === "poster"
                ? "Your Posted Tasks"
                : "Available Tasks Near You"}
            </h2>
            <p className={`text-sm ${
              theme === "light" ? "text-gray-600" : "text-gray-400"
            }`}>
              {userRole === "poster"
                ? "Manage and track all your task requests"
                : "Discover opportunities that match your skills"}
            </p>
          </div>
          
          {userRole === "poster" && (
            <button
              onClick={() => navigateTo("post-task")}
              className={`hidden md:inline-flex items-center gap-3 ${
                theme === "light"
                  ? "bg-gradient-to-r from-blue-500 to-emerald-500 hover:from-blue-600 hover:to-emerald-600 shadow-lg"
                  : "bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 shadow-2xl"
              } text-white font-semibold rounded-2xl px-4 py-2 transition-all duration-300 hover:scale-105 hover:shadow-xl transform`}
            >
              <Plus size={20} />
              <span className="text-base">Post New Task</span>
            </button>
          )}
        </div>

        {/* Enhanced Error State */}
        {error && (
          <div className={`text-center py-8 mb-8 rounded-2xl ${
            theme === "light" 
              ? "bg-red-50 border border-red-200" 
              : "bg-red-900/20 border border-red-800"
          }`}>
            <div className={`text-4xl mb-3`}>⚠️</div>
            <h3 className={`text-lg font-semibold mb-2 ${
              theme === "light" ? "text-red-800" : "text-red-300"
            }`}>
              Oops! Something went wrong
            </h3>
            <p className={`${
              theme === "light" ? "text-red-600" : "text-red-400"
            } mb-4`}>
              {error}
            </p>
            <button
              onClick={() => window.location.reload()}
              className={`px-4 py-2 rounded-lg font-medium ${
                theme === "light"
                  ? "bg-red-100 text-red-800 hover:bg-red-200"
                  : "bg-red-800/30 text-red-300 hover:bg-red-800/50"
              } transition-colors`}
            >
              Try Again
            </button>
          </div>
        )}

        {/* Enhanced Loading State */}
        {loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className={`${
                    theme === "light" ? "bg-white" : "bg-gray-800"
                  } rounded-2xl shadow-lg p-6 animate-pulse`}
                >
                  <div className="space-y-4">
                    <div className={`h-4 ${theme === "light" ? "bg-gray-200" : "bg-gray-700"} rounded w-3/4`}></div>
                    <div className={`h-3 ${theme === "light" ? "bg-gray-200" : "bg-gray-700"} rounded w-1/2`}></div>
                    <div className={`h-20 ${theme === "light" ? "bg-gray-100" : "bg-gray-700"} rounded`}></div>
                    <div className="flex gap-2">
                      <div className={`h-6 ${theme === "light" ? "bg-gray-200" : "bg-gray-700"} rounded w-16`}></div>
                      <div className={`h-6 ${theme === "light" ? "bg-gray-200" : "bg-gray-700"} rounded w-20`}></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {filteredTasks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {filteredTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    navigateTo={navigateTo}
                    theme={theme}
                    currentUserId={user?.uid}
                  />
                ))}
              </div>
            ) : (
              /* Enhanced Empty State */
              <div className={`text-center py-16 px-6 rounded-3xl ${
                theme === "light" 
                  ? "bg-gradient-to-br from-gray-50 to-blue-50 border border-gray-100" 
                  : "bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700"
              }`}>
                <div className="mb-6">
                  <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full mb-4 ${
                    theme === "light" 
                      ? "bg-blue-100 text-blue-500" 
                      : "bg-blue-900/30 text-blue-400"
                  }`}>
                    {userRole === "poster" ? (
                      <Clipboard size={40} />
                    ) : (
                      <Search size={40} />
                    )}
                  </div>
                </div>
                
                <h3
                  className={`text-lg sm:text-xl font-bold mb-3 ${
                    theme === "light" ? "text-gray-900" : "text-white"
                  }`}
                >
                  {userRole === "poster" 
                    ? searchTerm 
                      ? "No matching tasks found" 
                      : "Ready to get started?"
                    : searchTerm
                      ? "No tasks match your search"
                      : "No tasks available right now"
                  }
                </h3>
                
                <p
                  className={`text-sm sm:text-base mb-8 max-w-md mx-auto ${
                    theme === "light" ? "text-gray-600" : "text-gray-300"
                  }`}
                >
                  {userRole === "poster"
                    ? searchTerm
                      ? "Try adjusting your search terms or clear the search to see all your tasks."
                      : "Post your first task and connect with skilled service providers in your community!"
                    : searchTerm
                      ? "Try different keywords or clear your search to see all available tasks."
                      : "New opportunities are posted regularly. Check back soon or adjust your search criteria."
                  }
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  {userRole === "poster" && (
                    <button
                      onClick={() => navigateTo("post-task")}
                      className={`inline-flex items-center gap-3 ${
                        theme === "light"
                          ? "bg-gradient-to-r from-blue-500 to-emerald-500 hover:from-blue-600 hover:to-emerald-600"
                          : "bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700"
                      } text-white font-semibold rounded-2xl px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 transform`}
                    >
                      <Plus size={20} />
                      <span className="text-base">
                        {searchTerm ? "Post New Task" : "Post Your First Task"}
                      </span>
                    </button>
                  )}
                  
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className={`inline-flex items-center gap-2 ${
                        theme === "light"
                          ? "text-gray-600 bg-white border-gray-200 hover:bg-gray-50"
                          : "text-gray-300 bg-gray-800 border-gray-600 hover:bg-gray-700"
                      } font-medium rounded-2xl px-4 py-2 border-2 hover:scale-105 transition-all duration-300`}
                    >
                      Clear Search
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Enhanced Floating Action Button */}
      {userRole === "poster" && (
        <button
          onClick={() => navigateTo("post-task")}
          className={`fixed bottom-28 right-6 md:hidden flex items-center justify-center w-16 h-16 rounded-2xl ${
            theme === "light"
              ? "bg-gradient-to-br from-blue-500 to-emerald-500 shadow-xl"
              : "bg-gradient-to-br from-blue-600 to-emerald-600 shadow-2xl"
          } text-white hover:scale-110 active:scale-95 transition-all duration-300 group`}
          aria-label="Post New Task"
        >
          <Plus size={32} className="group-hover:rotate-90 transition-transform duration-300" />
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          </div>
        </button>
      )}

      <BottomNav navigateTo={navigateTo} currentPage="home" theme={theme} />
    </div>
  );
};

export default HomePage;