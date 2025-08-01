import React, { useState, useContext, useEffect, useMemo } from "react";
import { Search, Filter, Plus, Clipboard, User } from "lucide-react";
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
    const term = (searchTerm || "").toLowerCase().trim();
    if (!term) return tasks;
    return tasks.filter(
      (t) =>
        (t.title || "").toLowerCase().includes(term) ||
        (t.location || "").toLowerCase().includes(term)
    );
  }, [tasks, searchTerm]);

  const userDisplayName =
    user?.displayName || user?.email?.split("@")[0] || "there";

  return (
    <div
      className={`min-h-screen ${
        theme === "light"
          ? "bg-gradient-to-br from-emerald-50 via-white to-blue-50"
          : "bg-gray-900"
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

      <main className="max-w-7xl mx-auto px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 pb-32">
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sm:gap-6 pt-4">
            <div>
              <h1
                className={`text-4xl sm:text-3xl font-bold ${
                  theme === "light" ? "text-gray-900" : "text-white"
                } mb-6`}
              >
                Welcome back, {userDisplayName}! 👋
              </h1>
              <p
                className={`text-sm sm:text-base ${
                  theme === "light" ? "text-gray-600" : "text-gray-300"
                }`}
              >
                {userRole === "poster"
                  ? "Manage your posted tasks and find help from your community."
                  : "Discover opportunities to help your neighbors and earn money."}
              </p>
            </div>

            <div
              className={`flex flex-row items-center gap-2 sm:gap-4 ${
                theme === "light"
                  ? "bg-white border-gray-200"
                  : "bg-gray-800 border-gray-700"
              } rounded-2xl p-2 shadow-lg border w-full sm:w-auto`}
            >
              <button
                onClick={() => setUserRole("poster")}
                className={`flex items-center justify-center gap-1 sm:gap-2 rounded-xl px-3 py-3 sm:px-4 sm:py-2 text-xs sm:text-base font-medium transition-all w-full sm:w-auto text-center ${
                  userRole === "poster"
                    ? "bg-gradient-to-r from-emerald-500 to-blue-500 text-white shadow-md"
                    : theme === "light"
                    ? "text-gray-600 hover:text-gray-900"
                    : "text-gray-300 hover:text-white"
                }`}
              >
                <Clipboard size={16} className="sm:size-5" />
                Task Poster
              </button>

              <button
                onClick={() => setUserRole("provider")}
                className={`flex items-center justify-center gap-1 sm:gap-2 rounded-xl px-3 py-3 sm:px-4 sm:py-2 text-xs sm:text-base font-medium transition-all w-full sm:w-auto text-center ${
                  userRole === "provider"
                    ? "bg-gradient-to-r from-emerald-500 to-blue-500 text-white shadow-md"
                    : theme === "light"
                    ? "text-gray-600 hover:text-gray-900"
                    : "text-gray-300 hover:text-white"
                }`}
              >
                <User size={16} className="sm:size-5" />
                Service Provider
              </button>
            </div>
          </div>
        </div>

        {/* Search bar + filters */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-4 sm:mb-6">
            <div className="flex-1 relative w-full">
              <Search
                className={`absolute left-4 top-3 w-5 h-5 ${
                  theme === "light" ? "text-gray-400" : "text-gray-300"
                }`}
              />
              <input
                type="text"
                placeholder={
                  userRole === "poster"
                    ? "Search your tasks..."
                    : "Search available tasks..."
                }
                className={`w-full pl-12 pr-4 py-3 ${
                  theme === "light"
                    ? "bg-white border-gray-200 text-gray-800"
                    : "bg-gray-800 border-gray-700 text-white"
                } rounded-xl shadow-sm focus:outline-none focus:ring-2 dark:focus:ring-gray-800 focus:ring-blue-400`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 ${
                theme === "light"
                  ? "text-gray-700 bg-white border-gray-200"
                  : "text-gray-300 bg-gray-800 border-gray-700"
              } font-medium px-4 py-3 rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition w-full md:w-auto`}
              aria-expanded={showFilters}
              aria-label="Toggle filters"
            >
              <Filter size={20} />
              <span>Filters</span>
            </button>
          </div>
        </div>

        {/* Section Title */}
        <div
          className={`flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-4 ${
            theme === "light" ? "text-gray-900" : "text-white"
          }`}
        >
          <h2 className="text-xl sm:text-2xl font-bold">
            {userRole === "poster"
              ? "Your Posted Tasks"
              : "Available Tasks Near You"}
          </h2>
          {userRole === "poster" && (
            <button
              onClick={() => navigateTo("post-task")}
              className={`hidden md:inline-flex items-center gap-2 ${
                theme === "light"
                  ? "bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600"
                  : "bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700"
              } text-white font-medium rounded-xl px-4 py-2 shadow-lg transition-all w-full md:w-auto`}
            >
              <Plus size={20} />
              Post New Task
            </button>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="text-center py-6">
            <p
              className={`${
                theme === "light" ? "text-red-600" : "text-red-400"
              }`}
            >
              {error}
            </p>
          </div>
        )}

        {/* Task list */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={`${
                  theme === "light" ? "bg-white" : "bg-gray-800"
                } rounded-xl shadow-md p-4 animate-pulse h-40`}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {filteredTasks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
              <div className="text-center py-8 sm:py-12">
                <div
                  className={`${
                    theme === "light" ? "text-gray-400" : "text-gray-300"
                  } mb-4`}
                >
                  <Search size={48} className="mx-auto" />
                </div>
                <h3
                  className={`text-lg font-medium ${
                    theme === "light" ? "text-gray-900" : "text-white"
                  } mb-2`}
                >
                  No tasks found
                </h3>
                <p
                  className={`text-sm sm:text-base ${
                    theme === "light" ? "text-gray-600" : "text-gray-300"
                  } mb-4`}
                >
                  {userRole === "poster"
                    ? "You haven't posted any tasks yet."
                    : "No tasks match your search criteria."}
                </p>
                {userRole === "poster" && (
                  <button
                    onClick={() => navigateTo("post-task")}
                    className={`inline-flex items-center gap-2 ${
                      theme === "light"
                        ? "bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600"
                        : "bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700"
                    } text-white font-medium rounded-xl px-4 py-2 shadow-lg transition-all`}
                  >
                    Post Your First Task
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {userRole === "poster" && (
        <button
          onClick={() => navigateTo("post-task")}
          className={`fixed bottom-24 right-4 sm:right-6 md:hidden flex items-center justify-center w-14 h-14 rounded-full ${
            theme === "light"
              ? "bg-gradient-to-br from-emerald-500 to-blue-500"
              : "bg-gradient-to-br from-emerald-600 to-blue-600"
          } text-white shadow-xl hover:scale-105 transition`}
          aria-label="Post New Task"
        >
          <Plus size={28} />
        </button>
      )}

      <BottomNav navigateTo={navigateTo} currentPage="home" theme={theme} />
    </div>
  );
};

export default HomePage;
