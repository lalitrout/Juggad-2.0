// components/TaskContent.jsx
import React from "react";
import { MapPin, Clock, MessageCircle, Star } from "lucide-react";
import { Button } from "./ui/Button";
import { getAuth } from "firebase/auth";

const TaskContent = ({
  task,
  userRole,
  currentUid,
  navigateTo,
  theme,
  createAvatar, // Avatar helper function from TaskDetails
  onApply,
  onStartTask,
  onCompleteTask,
  onShowRating,
}) => {
  const auth = getAuth();

  // Helper functions
  const initials = (name = "Member") =>
    name
      .trim()
      .split(" ")
      .map((s) => s[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

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

  // Fallback avatar component if createAvatar is not provided
  const fallbackAvatar = (
    photoURL,
    displayName,
    bgColor = "bg-emerald-100 dark:bg-emerald-800",
    textColor = "text-emerald-700 dark:text-emerald-300"
  ) => {
    if (createAvatar) {
      return createAvatar(photoURL, displayName, "w-12 h-12");
    }
    // Fallback to old method
    return (
      <div
        className={`w-12 h-12 ${bgColor} rounded-full flex items-center justify-center overflow-hidden`}
      >
        <span className={`${textColor} font-semibold`}>
          {initials(displayName)}
        </span>
      </div>
    );
  };

  // Check if current user can message (only poster and accepted provider)
  const canMessage = () => {
    const isPoster = task.poster?.uid === currentUid;
    const isAcceptedProvider = task.acceptedBy?.uid === currentUid;
    return isPoster || isAcceptedProvider;
  };

  // Provider Actions Component
  const ProviderActions = () => {
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
              onClick={onApply}
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
  };

  // Provider Progress Component
  const ProviderProgress = () => {
    if (userRole !== "provider" || task?.acceptedBy?.uid !== currentUid)
      return null;

    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-md p-6 sm:p-8">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-6 text-lg flex items-center gap-2">
          <span className="inline-block w-2 h-2 bg-gradient-to-r from-emerald-400 to-blue-400 rounded-full mr-2"></span>
          Next steps
        </h3>
        <div className="space-y-4">
          {/* Start Task - only show if status is 'assigned' */}
          {task.status === "assigned" && (
            <div className="flex items-center gap-4 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/50">
              <Button
                onClick={onStartTask}
                className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-blue-500 dark:from-emerald-600 dark:to-blue-600 text-white font-medium rounded-md px-6 py-3 min-h-12 hover:from-emerald-600 hover:to-blue-600 dark:hover:from-emerald-700 dark:hover:to-blue-700 shadow"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
                Start Task (Enter OTP)
              </Button>
              <span className="ml-auto text-xs text-emerald-600 dark:text-emerald-300">
                Poster will provide PIN
              </span>
            </div>
          )}
          {/* Complete Task - only show if status is 'in_progress' */}
          {task.status === "in_progress" && (
            <div className="flex items-center gap-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/50">
              <Button
                onClick={onCompleteTask}
                className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-blue-500 dark:from-emerald-600 dark:to-blue-600 text-white font-medium rounded-md px-6 py-3 min-h-12 hover:from-emerald-600 hover:to-blue-600 dark:hover:from-emerald-700 dark:hover:to-blue-700 shadow"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path d="M5 13l4 4L19 7" />
                </svg>
                Complete Task (Enter OTP)
              </Button>
              <span className="ml-auto text-xs text-blue-700 dark:text-blue-300">
                Get final PIN from poster
              </span>
            </div>
          )}
          {/* Rate & Review */}
          <div className="flex items-center gap-4 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/50">
            <Button
              onClick={onShowRating}
              className="flex items-center gap-2 w-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-transparent rounded-md px-6 py-3 min-h-12 hover:bg-yellow-100 dark:hover:bg-yellow-800"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path d="M12 17.75L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
              Rate & Review
            </Button>
            <span className="ml-auto text-xs text-yellow-700 dark:text-yellow-300">
              Feedback helps everyone!
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
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
                : task.status === "in_progress"
                ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300"
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
            <span>Due: {formatIST(task.deadline || task.scheduledAtDate)}</span>
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

      {/* Posted by & Accepted by */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-6 sm:p-8 mb-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
          {userRole === "poster" ? "Posted by You" : "Posted by"}
        </h3>

        {/* Poster row */}
        <div className="flex items-center gap-4 mb-4">
          {/* Use avatar logic from createAvatar helper */}
          {fallbackAvatar(
            task.poster?.photoURL,
            task.poster?.name,
            "bg-emerald-100 dark:bg-emerald-800",
            "text-emerald-700 dark:text-emerald-300"
          )}
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white">
              {userRole === "poster" ? "You" : task.poster?.name}
            </h4>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <Star size={16} className="text-yellow-400" fill="currentColor" />
              <span>
                {task.poster?.rating ?? 4.5} ({task.poster?.reviews ?? 0}{" "}
                reviews)
              </span>
            </div>
          </div>
          {/* PIN card only for poster */}
          {userRole === "poster" && task.pin && (
            <div className="ml-6 flex-1">
              <div className="p-4 rounded-md bg-yellow-50 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700">
                <p className="font-semibold">Your Task PIN:</p>
                <p className="text-2xl tracking-widest font-mono">{task.pin}</p>
                <p className="text-sm mt-1">
                  Share this only with the provider.
                </p>
              </div>
            </div>
          )}
          {/* Show message button only if user can message and is not viewing their own profile */}
          {canMessage() && userRole !== "poster" && (
            <Button
              onClick={() => navigateTo("chat", { chatId: task.id })}
              className="ml-auto border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-md px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <MessageCircle size={16} />
              Message
            </Button>
          )}
        </div>

        {/* Accepted by row (only if assigned) */}
        {task.acceptedBy && (
          <>
            <div className="h-px w-full bg-gray-200 dark:bg-gray-700 my-4" />
            <div className="flex items-center gap-4">
              {fallbackAvatar(
                task.acceptedBy?.photoURL?.trim()
                  ? task.acceptedBy.photoURL
                  : null,
                task.acceptedBy?.name,
                "bg-blue-100 dark:bg-blue-900",
                "text-blue-800 dark:text-blue-300"
              )}
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  Accepted by{" "}
                  {task.acceptedBy?.uid === currentUid
                    ? "You"
                    : task.acceptedBy?.name}
                </h4>
                {task.acceptedBy?.uid === currentUid && (
                  <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300">
                    You are the provider
                  </span>
                )}
              </div>
              {/* Show message button only if user can message and is not viewing their own accepted task */}
              {canMessage() && userRole === "poster" && task.acceptedBy?.uid !== currentUid && (
                <Button
                  onClick={() => navigateTo("chat", { chatId: task.id })}
                  className="ml-auto border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-md px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <MessageCircle size={16} />
                  Message
                </Button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Provider Actions */}
      <ProviderActions />

      {/* Provider Progress */}
      <ProviderProgress />
    </>
  );
};

export default TaskContent;