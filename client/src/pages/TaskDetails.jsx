// src/pages/TaskDetails.jsx
import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, MapPin, Clock, MessageCircle, Star, X } from "lucide-react";

import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import { Button } from "../components/ui/Button";
import { Input } from "../components/Input";

import { db } from "../firebase";
import {
  doc,
  onSnapshot,
  runTransaction,
  setDoc,
  serverTimestamp,
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
  const [otpError, setOtpError] = useState("");

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(null);

  // --- helpers ---
  const toDate = (t) => (t?.toDate ? t.toDate() : t || null);
  const toISO = (t) => (t?.toDate ? t.toDate().toISOString() : t || null);
  const initials = (name = "Member") =>
    name
      .trim()
      .split(" ")
      .map((s) => s[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

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
      acceptedBy: d.acceptedBy || null,

      acceptedUser: {
        name: d.acceptedBy?.name || "—",
        uid: d.acceptedBy?.uid || null,
        photoURL: d.acceptedBy?.photoURL || null,
      },

      poster: d.poster || {
        name: d.postedByName || "Member",
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
    };
  };

  const formatIST = (date) => {
    if (!date) return "—";
    try {
      const d = typeof date === "string" ? new Date(date) : date;
      return d.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour12: true,
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return "—";
    }
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
      // Keep poster UID handy for chat creation after transaction
      const posterUid = task?.postedBy;

      await runTransaction(db, async (trx) => {
        const tRef = doc(db, "tasks", task.id);
        const tSnap = await trx.get(tRef);
        if (!tSnap.exists()) throw new Error("Task not found");

        const data = tSnap.data();

        // Only allow open -> assigned (your rules also enforce this)
        if (data.status !== "open") {
          throw new Error(`This task is already ${data.status}.`);
        }

        trx.update(tRef, {
          status: "assigned", // matches your rules enum
          acceptedBy: {
            uid: me.uid,
            name: me.displayName || "Member",
            photoURL: me.photoURL || "",
            acceptedAt: serverTimestamp(),
          },
          updatedAt: serverTimestamp(),
          // Keep postedBy as-is (string UID) – rules verify this
          postedBy: data.postedBy,
        });
      });

      // ✅ Ensure a parent chat doc exists for this task → chatId === task.id
      // This satisfies the chat rules so both participants can read/write messages.
      if (posterUid && auth.currentUser?.uid) {
        await setDoc(
          doc(db, "chats", task.id),
          {
            participants: [posterUid, auth.currentUser.uid],
            taskId: task.id,
            lastMessage: "",
            lastMessageAt: serverTimestamp(),
          },
          { merge: true } // safe to call multiple times
        );
      }

      // Optional optimistic UI
      setTask((prev) =>
        prev
          ? {
              ...prev,
              status: "assigned",
              acceptedBy: {
                uid: auth.currentUser?.uid,
                name: auth.currentUser?.displayName || "User",
                photoURL: auth.currentUser?.photoURL || "",
                acceptedAt: new Date().toISOString(),
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

  // ---------- Modals ----------
  const OtpModal = ({ isOpen, onClose, title }) => {
    const [otp, setOtp] = useState(["", "", "", ""]);
    if (!isOpen) return null;

    const handleOtpSubmit = () => {
      if (otp.every((digit) => digit.length === 1)) {
        console.log("OTP Verified:", otp.join(""));
        onClose();
      } else {
        setOtpError("Please enter a valid 4-digit OTP");
      }
    };

    return (
      <div
        className={`fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
          </div>
          <div className="mb-6">
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Enter the 4-digit OTP to proceed
            </p>
            <div className="flex gap-3 justify-center mb-4">
              {otp.map((digit, index) => (
                <Input
                  key={index}
                  type="text"
                  maxLength="1"
                  className="w-12 h-12 text-center text-xl font-semibold border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-emerald-500 dark:focus:border-blue-400"
                  value={digit}
                  onChange={(e) => {
                    const newOtp = [...otp];
                    newOtp[index] = e.target.value;
                    setOtp(newOtp);
                    setOtpError("");
                    if (e.target.value && index < 3) {
                      const next = document.getElementById(`otp-${index + 1}`);
                      if (next) next.focus();
                    }
                  }}
                  id={`otp-${index}`}
                />
              ))}
            </div>
            {otpError && (
              <p className="text-sm text-red-600 dark:text-red-400 text-center">
                {otpError}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={onClose}
              className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-md px-6 py-3"
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-emerald-500 to-blue-500 dark:from-emerald-600 dark:to-blue-600 text-white font-medium rounded-md px-6 py-3"
              onClick={handleOtpSubmit}
            >
              Verify
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const RatingModal = ({ isOpen, onClose }) => {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState("");
    if (!isOpen) return null;

    return (
      <div
        className={`fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Rate & Review
            </h3>
            <button
              onClick={onClose}
              className="text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
          </div>
          <div className="mb-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {task?.poster?.avatar || "MB"}
                </span>
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white">
                {task?.poster?.name || "Member"}
              </h4>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                Rating
              </label>
              <div className="flex justify-center gap-2 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className={`text-2xl ${
                      star <= rating
                        ? "text-yellow-400"
                        : "text-gray-300 dark:text-gray-500"
                    } hover:text-yellow-400`}
                  >
                    <Star fill="currentColor" />
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                Comment (optional)
              </label>
              <textarea
                placeholder="Share your experience..."
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={onClose}
              className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-md px-6 py-3"
            >
              Skip
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-emerald-500 to-blue-500 dark:from-emerald-600 dark:to-blue-600 text-white font-medium rounded-md px-6 py-3"
              onClick={() => {
                console.log("Review Submitted:", { rating, comment });
                onClose();
              }}
            >
              Submit Review
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const ConfirmApplyModal = ({ isOpen, onCancel, onConfirm }) => {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-40">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Apply for this task?
            </h3>
            <button
              onClick={onCancel}
              className="text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
          <p className="text-gray-700 dark:text-gray-300 mb-6">
            We’ll mark this task as assigned to you and notify the poster.
          </p>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={onCancel}
              className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-md px-6 py-3"
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-blue-500 dark:from-emerald-600 dark:to-blue-600 text-white font-medium rounded-md px-6 py-3"
            >
              Yes, apply
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // ------- UI -------
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
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
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

          {/* Loading / not found / error */}
          {loading && (
            <div
              className={`${
                theme === "light" ? "bg-white" : "bg-gray-800"
              } rounded-xl shadow-md p-6 animate-pulse`}
            >
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-4" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-64" />
            </div>
          )}

          {!loading && (notFound || !task) && !error && (
            <div className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-center">
              <p className="text-gray-700 dark:text-gray-300">
                Task not found.
              </p>
            </div>
          )}

          {error && (
            <div className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-center">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {!loading && task && (
            <>
              {/* Task Info */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-6 sm:p-8 mb-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    ₹{Number(task.budget).toLocaleString("en-IN")}
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      task.status === "open"
                        ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300"
                        : task.status === "assigned"
                        ? "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300"
                        : task.status === "completed"
                        ? "bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300"
                    }`}
                  >
                    {task.status}
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">
                  {task.title}
                </h2>

                <div className="flex flex-wrap gap-4 text-gray-600 dark:text-gray-300 mb-4">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} />
                    <span>{task.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={16} />
                    <span>
                      Due: {formatIST(task.deadline || task.scheduledAtDate)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                    {task.category}
                  </span>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                      task.urgency === "high"
                        ? "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300"
                        : "bg-emerald-100 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300"
                    }`}
                  >
                    {task.urgency} urgency
                  </span>
                  {task.negotiable && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 text-xs font-semibold">
                      Negotiable
                    </span>
                  )}
                  {task.tags?.map((tag, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Description
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {task.description}
                  </p>
                </div>

                {task.requirements && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                      Requirements
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300">
                      {task.requirements}
                    </p>
                  </div>
                )}
              </div>

              {/* Posted by */}
              {(() => {
                const uid = auth.currentUser?.uid;
                const isPoster = uid && task.postedBy === uid;
                const hasAssignee = !!task.acceptedBy;
                const isAssignee = uid && task.acceptedBy?.uid === uid;

                const posterName = isPoster ? "You" : task.poster?.name;
                const assigneeName = isAssignee ? "You" : task.acceptedBy?.name;

                return (
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-6 sm:p-8 mb-6">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                      {isPoster ? "Posted by You" : "Posted by"}
                    </h3>

                    {/* Posted by row */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        {/* Poster avatar */}
                        <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-800 rounded-full flex items-center justify-center overflow-hidden">
                          {task.poster?.avatar ? (
                            <span className="text-emerald-700 dark:text-emerald-300 font-semibold">
                              {task.poster.avatar}
                            </span>
                          ) : (
                            <span className="text-emerald-700 dark:text-emerald-300 font-semibold">
                              {initials(task.poster?.name)}
                            </span>
                          )}
                        </div>

                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            {posterName}
                          </h4>
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                            <Star
                              size={16}
                              className="text-yellow-400"
                              fill="currentColor"
                            />
                            <span>
                              {task.poster?.rating ?? 4.5} (
                              {task.poster?.reviews ?? 0} reviews)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Message button to poster (hide if you are the poster) */}
                      {(isPoster || isAssignee) && (
                        <Button
                          onClick={() =>
                            navigateTo("chat", { chatId: task.id })
                          }
                          className="border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-md px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                        >
                          <MessageCircle size={16} />
                          Message
                        </Button>
                      )}
                    </div>

                    {/* Accepted by row (only when assigned) */}
                    {hasAssignee && (
                      <>
                        <div className="h-px w-full bg-gray-200 dark:bg-gray-700 my-4" />
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            {/* Assignee avatar */}
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center overflow-hidden">
                              <span className="text-blue-800 dark:text-blue-300 font-semibold">
                                {(task.acceptedBy?.name || "Member")
                                  .trim()
                                  .charAt(0)
                                  .toUpperCase()}
                              </span>
                            </div>

                            <div>
                              <h4 className="font-semibold text-gray-900 dark:text-white">
                                Accepted by {assigneeName}
                              </h4>
                              {/* Optional: show a small chip if it's you */}
                              {isAssignee && (
                                <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300">
                                  You are the provider
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Message button to assignee (only for poster) */}
                          {isPoster && (
                            <Button
                              onClick={() =>
                                navigateTo("chat", { chatId: task.id })
                              }
                              className="border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-md px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                            >
                              <MessageCircle size={16} />
                              Message
                            </Button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}

              {/* Actions - Provider side */}
              {(() => {
                const uid = auth.currentUser?.uid;
                const isOpen = task.status === "open";
                const isAssigned = task.status === "assigned";
                const isAcceptedUser = !!uid && task.acceptedBy?.uid === uid;

                if (userRole !== "provider") return null;

                return (
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-6 sm:p-8 mb-6">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                      Apply for this task
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">
                      Interested in helping? Confirm to book this task.
                    </p>
                    <div className="flex gap-3">
                      {isOpen && (
                        <Button
                          className="flex-1 bg-gradient-to-r from-emerald-500 to-blue-500 dark:from-emerald-600 dark:to-blue-600 text-white font-medium rounded-md px-6 py-3 hover:from-emerald-600 hover:to-blue-600 dark:hover:from-emerald-700 dark:hover:to-blue-700 min-h-14"
                          onClick={() => setShowConfirmApply(true)}
                        >
                          Apply Now
                        </Button>
                      )}

                      {isAssigned && (
                        <Button
                          disabled
                          className="flex-1 bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-md px-6 py-3 min-h-14 cursor-not-allowed"
                        >
                          {isAcceptedUser ? "Booked (You)" : "Booked"}
                        </Button>
                      )}

                      <Button className="border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-md px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">
                        Save for Later
                      </Button>
                    </div>
                  </div>
                );
              })()}

              {/* Example: Provider progress only for accepted user (optional UI) */}
              {userRole === "provider" &&
                task.status === "assigned" &&
                auth.currentUser?.uid &&
                task.acceptedBy?.uid === auth.currentUser.uid && (
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-6 sm:p-8">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                      Next steps
                    </h3>
                    <div className="space-y-3">
                      <Button
                        onClick={() => setShowOtpModal(true)}
                        className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 dark:from-emerald-600 dark:to-blue-600 text-white font-medium rounded-md px-6 py-3 min-h-14"
                      >
                        Start Task (Enter OTP)
                      </Button>
                      <Button
                        onClick={() => setShowOtpModal(true)}
                        className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 dark:from-emerald-600 dark:to-blue-600 text-white font-medium rounded-md px-6 py-3 min-h-14"
                      >
                        Complete Task (Enter OTP)
                      </Button>
                      <Button
                        onClick={() => setShowRatingModal(true)}
                        className="w-full border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-md px-6 py-3 min-h-14"
                      >
                        Rate & Review
                      </Button>
                    </div>
                  </div>
                )}
            </>
          )}
        </div>
      </main>

      {/* Modals */}
      <OtpModal
        isOpen={showOtpModal}
        onClose={() => setShowOtpModal(false)}
        title="Verify Task Progress"
      />
      <RatingModal
        isOpen={showRatingModal}
        onClose={() => setShowRatingModal(false)}
      />
      <ConfirmApplyModal
        isOpen={showConfirmApply}
        onCancel={() => setShowConfirmApply(false)}
        onConfirm={handleApplyConfirmed}
      />

      <BottomNav navigateTo={navigateTo} currentPage="task" theme={theme} />
    </div>
  );
};

export default TaskDetails;
