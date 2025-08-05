// src/components/BottomNav.jsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Home, Plus, MessageCircle, User, Loader2 } from "lucide-react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "../firebase";
import {
  collection,
  onSnapshot,
  query,
  where,
  limit as qlimit,
} from "firebase/firestore";

// --- helpers ---
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

function initials(name = "Member") {
  return name
    .trim()
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatTime(ts) {
  try {
    const d = toMillis(ts);
    if (!d) return "";
    return new Date(d).toLocaleString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

const BottomNav = ({ navigateTo, currentPage }) => {
  const auth = getAuth();

  const [uid, setUid] = useState(auth.currentUser?.uid || null);
  const [openAssigned, setOpenAssigned] = useState(false);
  const panelRef = useRef(null);

  const [loadingTasks, setLoadingTasks] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [taskErr, setTaskErr] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUid(u?.uid || null));
    return () => unsub();
  }, [auth]);

  useEffect(() => {
    if (!openAssigned || !uid) return;

    setLoadingTasks(true);
    setTaskErr(null);

    const tRef = query(
      collection(db, "tasks"),
      where("acceptedBy.uid", "==", uid),
      qlimit(50)
    );

    const unsub = onSnapshot(
      tRef,
      (snap) => {
        const rows = [];
        snap.forEach((d) => rows.push({ id: d.id, ...d.data() }));
        rows.sort(
          (a, b) =>
            toMillis(b.updatedAt || b.acceptedBy?.acceptedAt || b.createdAt) -
            toMillis(a.updatedAt || a.acceptedBy?.acceptedAt || a.createdAt)
        );
        setTasks(rows);
        setLoadingTasks(false);
      },
      (err) => {
        console.error("[BottomNav dropup] tasks onSnapshot error:", err);
        setTasks([]);
        setTaskErr("tasks");
        setLoadingTasks(false);
      }
    );

    return () => unsub();
  }, [openAssigned, uid]);

  useEffect(() => {
    if (!openAssigned) return;
    const onClick = (e) => {
      if (!panelRef.current) return;
      if (!panelRef.current.contains(e.target)) setOpenAssigned(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [openAssigned]);

  useEffect(() => {
    if (!openAssigned) return;
    const onKey = (e) => {
      if (e.key === "Escape") setOpenAssigned(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openAssigned]);

  const handleMessagesClick = useCallback(() => {
    const me = auth.currentUser;
    if (!me) {
      navigateTo("auth");
      return;
    }
    setOpenAssigned((v) => !v);
  }, [auth, navigateTo]);

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

        <button
          onClick={() => {
            setOpenAssigned(false);
            navigateTo("chat", { chatId: t.id });
          }}
          className="shrink-0 inline-flex items-center gap-1 rounded-md border border-gray-300 dark:border-gray-600 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <MessageCircle className="h-4 w-4" />
          Message
        </button>
      </div>
    );
  };

  return (
    <>
      <nav className="bottom-nav dark:bg-gray-900 dark:border-gray-700 sm:hidden">
        <button
          onClick={() => {
            setOpenAssigned(false);
            navigateTo("home");
          }}
          className={`bottom-nav-item dark:text-gray-300 dark:hover:text-blue-400 ${
            currentPage === "home" ? "active dark:text-blue-400" : ""
          }`}
        >
          <Home size={20} />
          <span>Home</span>
        </button>

        <button
          onClick={() => {
            setOpenAssigned(false);
            navigateTo("post-task");
          }}
          className={`bottom-nav-item dark:text-gray-300 dark:hover:text-blue-400 ${
            currentPage === "post-task" ? "active dark:text-blue-400" : ""
          }`}
        >
          <Plus size={20} />
          <span>Post</span>
        </button>

        <button
          onClick={handleMessagesClick}
          className={`bottom-nav-item dark:text-gray-300 dark:hover:text-blue-400 ${
            openAssigned || currentPage === "chat" ? "active dark:text-blue-400" : ""
          }`}
          aria-expanded={openAssigned}
          aria-controls="assigned-dropup"
          aria-label="Assigned messages"
        >
          <MessageCircle size={20} />
          <span>Messages</span>
        </button>

        <button
          onClick={() => {
            setOpenAssigned(false);
            navigateTo("profile");
          }}
          className={`bottom-nav-item dark:text-gray-300 dark:hover:text-blue-400 ${
            currentPage === "profile" ? "active dark:text-blue-400" : ""
          }`}
        >
          <User size={20} />
          <span>Profile</span>
        </button>
      </nav>

      {openAssigned && (
        <div
          className="fixed inset-0 z-[60] sm:hidden"
          role="dialog"
          aria-modal="true"
        >
          <div className="absolute inset-0 bg-black/30" />
          <div
            id="assigned-dropup"
            ref={panelRef}
            className="absolute bottom-0 left-0 right-0
              rounded-t-2xl border border-gray-200 dark:border-gray-700
              bg-white dark:bg-gray-900 shadow-2xl
              max-h-[70vh] overflow-hidden"
          >
            <div className="flex justify-center py-2">
              <div className="h-1.5 w-10 rounded-full bg-gray-300 dark:bg-gray-700" />
            </div>

            <div className="px-4 pb-2 border-b border-gray-200 dark:border-gray-700">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                Chat-Eligible Tasks
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Only showing tasks that are active (assigned or in progress)
              </p>
            </div>

            <div className="max-h-[60vh] overflow-y-auto py-2">
              {loadingTasks && (
                <div className="flex items-center gap-2 p-4 text-gray-600 dark:text-gray-300">
                  <Loader2 className="animate-spin" size={16} />
                  <span>Loading tasks…</span>
                </div>
              )}

              {!loadingTasks && taskErr && (
                <div className="p-4 text-sm text-gray-600 dark:text-gray-300">
                  Failed to load assigned tasks.
                </div>
              )}

              {!loadingTasks && !taskErr && tasks.length === 0 && (
                <div className="p-4 text-sm text-gray-600 dark:text-gray-300">
                  No assigned tasks yet.
                </div>
              )}

              {!loadingTasks && !taskErr && tasks.length > 0 && (
                <div className="px-2">{tasks.map((t) => renderTaskRow(t))}</div>
              )}
            </div>

            <div className="p-2 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <button
                onClick={() => setOpenAssigned(false)}
                className="px-3 py-2 text-xs text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setOpenAssigned(false);
                  navigateTo("chat");
                }}
                className="px-3 py-2 text-xs text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white"
              >
                Open messages page
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BottomNav;
