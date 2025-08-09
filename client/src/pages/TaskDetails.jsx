import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";

import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import TaskContent from "../components/TaskContent";
import TaskModals from "../components/TaskModals";

import { auth, db } from "../firebase";
import {
  doc,
  onSnapshot,
  runTransaction,
  setDoc,
  serverTimestamp,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";


const TaskDetails = ({
  navigateTo,
  taskId,
  theme,
  toggleTheme,
  isLoggedIn,
}) => {
  const auth = getAuth();

  const [showOtpModal, setShowOtpModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showConfirmApply, setShowConfirmApply] = useState(false);
  const [otpType, setOtpType] = useState("start");

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(null);

  // --- helpers ---
  const toDate = (t) => (t?.toDate ? t.toDate() : t || null);
  const toISO = (t) => (t?.toDate ? t.toDate().toISOString() : t || null);

  // Avatar component helper - same logic as ProfilePage
  const createAvatar = (photoURL, displayName, size = "w-12 h-12") => {
    const avatarLetter = displayName ? displayName[0]?.toUpperCase() : "U";

    return photoURL ? (
      <img
        src={photoURL}
        alt={displayName || "User"}
        className={`${size} rounded-full object-cover border-2 border-blue-300 dark:border-blue-800 shadow`}
        onError={(e) => {
          // Fallback to letter avatar if image fails to load
          e.target.style.display = "none";
          const fallback = e.target.nextElementSibling;
          if (fallback) fallback.style.display = "flex";
        }}
      />
    ) : (
      <div
        className={`${size} rounded-full bg-blue-500 flex items-center justify-center text-lg font-bold text-white shadow`}
      >
        {avatarLetter}
      </div>
    );
  };

  const mapTask = (snap) => {
    const d = snap.data() || {};
    return {
      id: snap.id,
      title: d.title || "Untitled task",
      description: d.description || "",
      budget: d.budget ?? 0,
      location: d.location || "—",
      category: d.category || "general",
      urgency: d.urgency || "medium",
      negotiable: d.negotiable ?? false,
      tags: Array.isArray(d.tags) ? d.tags : [],
      status: d.status || "open",
      requirements: d.requirements || "",
      postedBy: d.postedBy || null,
      postedByName: d.postedByName || null,
      postedByPhotoURL: d.postedByPhotoURL || null,
      acceptedBy: d.acceptedBy || null,
      // Fixed the acceptedUser mapping
      acceptedUser: d.acceptedBy
        ? {
            name: d.acceptedBy.name || "User", // Fixed: was displayNameame
            uid: d.acceptedBy.uid || null,
            photoURL: d.acceptedBy.photoURL || null, // This should now work
          }
        : {
            name: "User",
            uid: null,
            photoURL: null,
          },
      poster: {
        name: d.postedByName || "Member",
        photoURL: d.postedByPhotoURL || null,
        rating: typeof d.posterRating === "number" ? d.posterRating : 4.5,
        reviews: typeof d.posterReviews === "number" ? d.posterReviews : 0,
        avatar: (d.postedByName || "MB")
          .split(" ")
          .map((s) => s[0])
          .join("")
          .slice(0, 2)
          .toUpperCase(),
      },
      createdAt: toISO(d.createdAt),
      updatedAt: toISO(d.updatedAt),
      deadline: toISO(d.scheduledAt),
      scheduledAtDate: toDate(d.scheduledAt),
      pin: d.pin || null,
    };
  };

  // --- live fetch ---
  useEffect(() => {
    if (!taskId) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setNotFound(false);
    setError(null);

    const ref = doc(db, "tasks", taskId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setNotFound(true);
          setTask(null);
        } else {
          setTask(mapTask(snap));
        }
        setLoading(false);
      },
      (err) => {
        console.error("Task onSnapshot error:", err);
        setError(err.message || "Failed to load task");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [taskId]);

  // derive role from postedBy string UID
  const currentUid = auth.currentUser?.uid || null;
  const userRole = useMemo(() => {
    if (!task || !currentUid) return "provider";
    return task.postedBy === currentUid ? "poster" : "provider";
  }, [task, currentUid]);

  // --- Book (Apply) handler: open -> assigned ---

  const handleApplyConfirmed = async () => {
    try {
      const me = auth.currentUser;
      if (!me) {
        navigateTo("login");
        return;
      }

      // 🔹 Get latest user data from Firestore
      const userRef = doc(db, "users", me.uid);
      const userSnap = await getDoc(userRef);

      let name = me.displayName || me.email?.split("@")[0] || "User";
      let photoURL = me.photoURL || "";

      if (userSnap.exists()) {
        const userData = userSnap.data();
        name = userData.displayName || name;
        photoURL = userData.photoURL || photoURL;
      }

      const posterUid = task?.postedBy;

      await runTransaction(db, async (trx) => {
        const tRef = doc(db, "tasks", task.id);
        const tSnap = await trx.get(tRef);
        if (!tSnap.exists()) throw new Error("Task not found");

        const data = tSnap.data();

        if (data.status !== "open") {
          throw new Error(`This task is already ${data.status}.`);
        }

        const generatedPin = Math.floor(1000 + Math.random() * 9000).toString();

        trx.update(tRef, {
          status: "assigned",
          acceptedBy: {
            uid: me.uid,
            name,
            photoURL,
            acceptedAt: serverTimestamp(),
          },
          updatedAt: serverTimestamp(),
          postedBy: data.postedBy,
          pin: generatedPin,
        });
      });

      // 🔹 Create chat for communication
      if (posterUid && me.uid) {
        await setDoc(
          doc(db, "chats", task.id),
          {
            participants: [posterUid, me.uid],
            taskId: task.id,
            lastMessage: "",
            lastMessageAt: serverTimestamp(),
          },
          { merge: true }
        );
      }

      // 🔹 Update local state immediately for better UX
      setTask((prev) =>
        prev
          ? {
              ...prev,
              status: "assigned",
              acceptedBy: {
                uid: me.uid,
                name,
                photoURL,
                acceptedAt: new Date().toISOString(),
              },
              acceptedUser: {
                uid: me.uid,
                name,
                photoURL,
              },
            }
          : prev
      );
    } catch (e) {
      console.error("apply error", e);
      alert(e?.message || "Failed to book this task.");
    } finally {
      setShowConfirmApply(false);
    }
  };

  // --- OTP: start/complete logic with new pin for complete ---
  const handleOtpSubmit = async (otp) => {
    const enteredOtp = otp.join("");
    if (enteredOtp.length !== 4) {
      throw new Error("Please enter a valid 4-digit OTP");
    }

    const tRef = doc(db, "tasks", task.id);
    const tSnap = await getDoc(tRef);
    if (!tSnap.exists()) throw new Error("Task not found");

    const data = tSnap.data();
    if (enteredOtp !== data.pin) {
      throw new Error("Incorrect PIN. Please try again.");
    }

    if (otpType === "start" && data.status === "assigned") {
      // Move to in_progress and generate a new PIN for completion
      const newPin = Math.floor(1000 + Math.random() * 9000).toString();
      await updateDoc(tRef, {
        status: "in_progress",
        updatedAt: serverTimestamp(),
        pin: newPin,
      });
    } else if (otpType === "complete" && data.status === "in_progress") {
      // Complete the task
      await updateDoc(tRef, {
        status: "completed",
        updatedAt: serverTimestamp(),
        completedAt: serverTimestamp(), // Track completion time
      });
    }
  };

  // Handler functions for TaskContent
  const handleApply = () => setShowConfirmApply(true);
  const handleStartTask = () => {
    setOtpType("start");
    setShowOtpModal(true);
  };
  const handleCompleteTask = () => {
    setOtpType("complete");
    setShowOtpModal(true);
  };
  const handleShowRating = () => setShowRatingModal(true);

  // ------- Main UI -------
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <Header
        showNav={false}
        navigateTo={navigateTo}
        currentPage="task"
        theme={theme}
        toggleTheme={toggleTheme}
        isLoggedIn={isLoggedIn}
      />

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 pb-24 sm:pb-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => navigateTo("home")}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              aria-label="Back to home"
            >
              <ArrowLeft
                size={24}
                className="text-gray-600 dark:text-gray-300"
              />
            </button>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
              Task Details
            </h1>
          </div>

          {/* Loading state */}
          {loading && (
            <div
              className={`${
                theme === "light" ? "bg-white" : "bg-gray-800"
              } rounded-xl shadow-md p-6 animate-pulse`}
            >
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-4" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-64 mb-2" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48" />
            </div>
          )}

          {/* Task not found */}
          {!loading && (notFound || !task) && !error && (
            <div className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-center">
              <p className="text-gray-700 dark:text-gray-300">
                Task not found.
              </p>
              <button
                onClick={() => navigateTo("home")}
                className="mt-4 text-blue-600 dark:text-blue-400 hover:underline"
              >
                Return to Home
              </button>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-red-200 dark:border-red-700 text-center">
              <p className="text-red-600 dark:text-red-400 mb-2">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Task content */}
          {!loading && task && (
            <TaskContent
              task={task}
              userRole={userRole}
              currentUid={currentUid}
              navigateTo={navigateTo}
              theme={theme}
              createAvatar={createAvatar}
              onApply={handleApply}
              onStartTask={handleStartTask}
              onCompleteTask={handleCompleteTask}
              onShowRating={handleShowRating}
            />
          )}
        </div>
      </main>

      {/* Modals */}
      <TaskModals
        showOtpModal={showOtpModal}
        setShowOtpModal={setShowOtpModal}
        showRatingModal={showRatingModal}
        setShowRatingModal={setShowRatingModal}
        showConfirmApply={showConfirmApply}
        setShowConfirmApply={setShowConfirmApply}
        otpType={otpType}
        task={task}
        onOtpSubmit={handleOtpSubmit}
        onApplyConfirmed={handleApplyConfirmed}
      />

      <BottomNav navigateTo={navigateTo} currentPage="task" theme={theme} />
    </div>
  );
};

export default TaskDetails;
