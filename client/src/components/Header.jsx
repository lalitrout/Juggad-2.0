import React, { useEffect, useRef, useState } from "react";
import { Button } from "./ui/Button";
import {
  HandHeart,
  Home,
  MessageCircle,
  Sun,
  Moon,
  Loader2,
} from "lucide-react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "../firebase";
import {
  collection,
  onSnapshot,
  query,
  where,
  limit as qlimit,
} from "firebase/firestore";

function initials(name = "Member") {
  return name
    .trim()
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function toMillis(ts) {
  if (!ts) return 0;
  try {
    if (typeof ts.toMillis === "function") return ts.toMillis();
    if (typeof ts.toDate === "function") return ts.toDate().getTime();
    if (ts instanceof Date) return ts.getTime();
    const d = new Date(ts);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  } catch {
    return 0;
  }
}

function formatTime(ts) {
  try {
    const d = toMillis(ts);
    if (!d) return "";
    return new Date(d).toLocaleString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

const Header = ({
  showNav = true,
  navigateTo,
  currentPage,
  isAuthenticated = false,
  logout,
  theme,
  toggleTheme,
}) => {
  const auth = getAuth();

  // Live UID
  const [uid, setUid] = useState(auth.currentUser?.uid || null);
  // Store full user object for DP
  const [userObj, setUserObj] = useState(auth.currentUser || null);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUid(u?.uid || null);
      setUserObj(u || null); // <-- update user object
    });
    return () => unsub();
  }, [auth]);

  const [openChats, setOpenChats] = useState(false);

  // Chats state
  const [loadingChats, setLoadingChats] = useState(false);
  const [chats, setChats] = useState([]);
  const [chatErr, setChatErr] = useState(null);

  // Tasks assigned to me
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [taskErr, setTaskErr] = useState(null);

  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!openChats) return;
    const onClick = (e) => {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(e.target)) setOpenChats(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [openChats]);

  // Subscribe to user's chats when dropdown opens
  useEffect(() => {
    if (!openChats || !uid) return;

    setLoadingChats(true);
    setChatErr(null);

    const qRef = query(
      collection(db, "chats"),
      where("participants", "array-contains", uid),
      qlimit(50)
    );

    const unsub = onSnapshot(
      qRef,
      (snap) => {
        const items = [];
        snap.forEach((d) => {
          const c = d.data();
          items.push({ id: d.id, ...c });
        });
        items.sort(
          (a, b) =>
            toMillis(b.lastMessageAt || b.createdAt) -
            toMillis(a.lastMessageAt || a.createdAt)
        );
        setChats(items);
        setLoadingChats(false);
      },
      (err) => {
        // Keep this in console for debugging; do not surface raw error to user.
        console.error("[Header chats] onSnapshot error:", err);
        setChats([]); // ensure UI doesn't render stale data
        setChatErr("chats"); // store a lightweight code instead of raw text
        setLoadingChats(false);
      }
    );

    return () => unsub();
  }, [openChats, uid]);

  useEffect(() => {
    if (!openChats || !uid) return;

    setLoadingTasks(true);
    setTaskErr(null);

    const acceptedQuery = query(
      collection(db, "tasks"),
      where("acceptedBy.uid", "==", uid),
      qlimit(50)
    );

    const postedQuery = query(
      collection(db, "tasks"),
      where("postedBy", "==", uid),
      qlimit(50)
    );

    const taskMap = new Map();

    const handleSnapshot = (snap) => {
      let updated = false;
      snap.forEach((doc) => {
        const data = { id: doc.id, ...doc.data() };
        if (!taskMap.has(doc.id)) {
          updated = true;
        }
        taskMap.set(doc.id, data);
      });

      if (updated || taskMap.size !== tasks.length) {
        const rows = Array.from(taskMap.values());
        rows.sort(
          (a, b) =>
            toMillis(b.updatedAt || b.acceptedBy?.acceptedAt || b.createdAt) -
            toMillis(a.updatedAt || a.acceptedBy?.acceptedAt || a.createdAt)
        );
        setTasks(rows);
      }
      setLoadingTasks(false);
    };

    const unsubAccepted = onSnapshot(acceptedQuery, handleSnapshot, (err) => {
      console.error("[Header tasks] acceptedQuery error:", err);
      setTaskErr("tasks");
      setLoadingTasks(false);
    });

    const unsubPosted = onSnapshot(postedQuery, handleSnapshot, (err) => {
      console.error("[Header tasks] postedQuery error:", err);
      setTaskErr("tasks");
      setLoadingTasks(false);
    });

    return () => {
      unsubAccepted();
      unsubPosted();
    };
  }, [openChats, uid]);

  const isLandingPage = currentPage === "landing";
  const navClass = isLandingPage
    ? "bg-white/80 backdrop-blur-md border-b border-gray-200 dark:bg-gray-900/80 dark:border-gray-700"
    : "bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-700";
  const containerClass = isLandingPage
    ? "max-w-7xl mx-auto px-7 sm:px-6 lg:px-8"
    : "container";
  const logoSizeClass = isLandingPage ? "w-10 h-10" : "w-8 h-8";
  const textSizeClass = isLandingPage
    ? "text-2xl bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent"
    : "text-xl text-gray-900 dark:text-white";

  const renderChatRow = (chat) => {
    const others = Array.isArray(chat.participants)
      ? chat.participants.filter((p) => p !== uid)
      : [];
    const other = others[0] || "Member";
    const avatar = initials(chat.otherName || other);
    const title = chat.otherName || chat.title || `Chat with ${other}`;
    const last = chat.lastMessage || "Say hi 👋";
    const when = chat.lastMessageAt || chat.createdAt;

    return (
      <button
        key={chat.id}
        onClick={() => {
          setOpenChats(false);
          navigateTo("chat", {
            chatId: chat.id,
            taskId: chat.taskId || chat.id || null,
          });
        }}
        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
      >
        <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-700 flex items-center justify-center">
          <span className="text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
            {avatar}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {title}
            </p>
            <span className="text-[11px] text-gray-500 dark:text-gray-400 shrink-0">
              {formatTime(when)}
            </span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-300 truncate">
            {last}
          </p>
        </div>
      </button>
    );
  };

  const renderTaskRow = (t) => {
    const posterName = t.poster?.name || t.postedByName || "Someone";
    const avatar = initials(posterName);
    const title = t.title || "Untitled task";
    const when = t.updatedAt || t.acceptedBy?.acceptedAt || t.createdAt;

    return (
      <div
        key={t.id}
        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center">
          <span className="text-blue-700 dark:text-blue-200 text-xs font-semibold">
            {avatar}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {title}
            </p>
            <span className="text-[11px] text-gray-500 dark:text-gray-400 shrink-0">
              {formatTime(when)}
            </span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-300 truncate">
            Assigned by {posterName}
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setOpenChats(false);
            // Your ChatPage treats chatId === task.id
            navigateTo("chat", { chatId: t.id });
          }}
          className="shrink-0 dark:border-gray-600 dark:text-gray-200"
        >
          <MessageCircle className="mr-2 h-4 w-4" />
          Message
        </Button>
      </div>
    );
  };

  // Helper: go to the most recent chat if available
  const openMostRecentChat = () => {
    if (chats && chats.length > 0) {
      const top = [...chats].sort(
        (a, b) =>
          toMillis(b.lastMessageAt || b.createdAt) -
          toMillis(a.lastMessageAt || a.createdAt)
      )[0];
      navigateTo("chat", {
        chatId: top.id,
        taskId: top.taskId || top.id || null,
      });
    } else {
      navigateTo("chat"); // fallback to messages page
    }
  };

  // Avatar rendering logic for header
  const displayName =
    userObj?.displayName ||
    userObj?.email?.split("@")[0] ||
    "User";
  const photoURL = userObj?.photoURL;
  const avatarLetter = displayName[0]?.toUpperCase() || "U";
  const ProfileAvatar = photoURL ? (
    <img
      src={photoURL}
      alt={displayName}
      className="w-8 h-8 rounded-full object-cover border-2 border-blue-300 dark:border-blue-800 shadow"
    />
  ) : (
    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-lg font-bold text-white shadow">
      {avatarLetter}
    </div>
  );

  return (
    <header className={`sticky top-0 z-50 ${navClass}`}>
      <div className={containerClass}>
        <div className="flex justify-between items-center h-16">
          <button
            onClick={() => navigateTo(isAuthenticated ? "home" : "landing")}
            className="flex items-center gap-3"
          >
            <div
              className={`${logoSizeClass} bg-gradient-to-r from-emerald-500 to-blue-500 rounded-lg flex items-center justify-center shadow-lg`}
            >
              <HandHeart className="w-6 h-6 text-white" />
            </div>
            <span className={`font-bold ${textSizeClass}`}>Jugaad</span>
          </button>

          {showNav && (
            <nav className="flex items-center gap-4 md:gap-6 relative">
              {isAuthenticated ? (
                <>
                  <button
                    onClick={() => navigateTo("home")}
                    className={`hidden md:flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                      currentPage === "home"
                        ? "bg-primary-50 text-primary-600 dark:bg-gray-800 dark:text-primary-400"
                        : "text-gray-600 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400"
                    }`}
                  >
                    <Home size={20} />
                    <span>Home</span>
                  </button>

                  {/* Messages with dropdown */}
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => {
                        if (!uid) {
                          navigateTo("auth");
                          return;
                        }
                        setOpenChats((v) => !v);
                      }}
                      className={`hidden md:flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                        currentPage === "chat"
                          ? "bg-primary-50 text-primary-600 dark:bg-gray-800 dark:text-primary-400"
                          : "text-gray-600 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400"
                      }`}
                    >
                      <MessageCircle size={20} />
                      <span>Messages</span>
                    </button>

                    {openChats && (
                      <div className="absolute right-0 mt-2 w-[22rem] max-h-[70vh] overflow-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl">
                        {/* Tasks header */}
                        <div className="px-3 py-2 mt-1 border-t border-gray-200 dark:border-gray-700">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            Chat-Eligible Tasks
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Only showing tasks that are active (assigned or in
                            progress)
                          </p>
                        </div>

                        {/* Tasks content */}
                        {loadingTasks && (
                          <div className="flex items-center gap-2 p-4 text-gray-600 dark:text-gray-300">
                            <Loader2 className="animate-spin" size={16} />
                            <span>Loading tasks…</span>
                          </div>
                        )}

                        {/* Do NOT show raw error message to user */}
                        {!loadingTasks && taskErr && (
                          <div className="p-4 text-sm text-gray-600 dark:text-gray-300">
                            No tasks to display at this moment.
                          </div>
                        )}

                        {!loadingTasks &&
                          !taskErr &&
                          tasks.filter(
                            (t) =>
                              t.status === "assigned" ||
                              t.status === "in_progress"
                          ).length === 0 && (
                            <div className="p-4 text-sm text-gray-600 dark:text-gray-300">
                              No chat-eligible tasks.
                            </div>
                          )}

                        {!loadingTasks &&
                          !taskErr &&
                          tasks.filter(
                            (t) =>
                              t.status === "assigned" ||
                              t.status === "in_progress"
                          ).length > 0 && (
                            <div className="py-2">
                              {tasks
                                .filter(
                                  (t) =>
                                    t.status === "assigned" ||
                                    t.status === "in_progress"
                                )
                                .map((t) => renderTaskRow(t))}
                            </div>
                          )}
                      </div>
                    )}
                  </div>

                  {/* Profile avatar instead of icon */}
                  <button
                    onClick={() => navigateTo("profile")}
                    className={`hidden md:flex items-center px-3 py-2 rounded-lg transition-colors ${
                      currentPage === "profile"
                        ? "bg-primary-50 text-primary-600 dark:bg-gray-800 dark:text-primary-400"
                        : "text-gray-600 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400"
                    }`}
                  >
                    {ProfileAvatar}
                    <span className="ml-2">Profile</span>
                  </button>

                  <Button
                    variant="outline"
                    size="responsive"
                    onClick={logout}
                    className="dark:border-gray-600 dark:text-gray-300 dark:hover:text-black"
                  >
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="responsive"
                    onClick={() => navigateTo("auth")}
                    className="dark:text-gray-300 dark:hover:text-black"
                  >
                    Sign In
                  </Button>
                  <Button
                    size="responsive"
                    onClick={() => navigateTo("auth")}
                    className="dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
                  >
                    Get Started
                  </Button>
                </>
              )}

              <Button
                variant="ghost"
                size="responsive"
                onClick={toggleTheme}
                className="dark:text-gray-300 dark:hover:text-black"
                aria-label={
                  theme === "light"
                    ? "Switch to dark mode"
                    : "Switch to light mode"
                }
              >
                {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
              </Button>
            </nav>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;