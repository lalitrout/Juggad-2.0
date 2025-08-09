// components/TaskModals.jsx
import React, { useState, useEffect } from "react";
import { X, Star } from "lucide-react";
import { Button } from "./ui/Button";
import { Input } from "./Input";

// All modals in one component
const TaskModals = ({ 
  showOtpModal, 
  setShowOtpModal, 
  showRatingModal, 
  setShowRatingModal, 
  showConfirmApply, 
  setShowConfirmApply,
  otpType,
  task,
  onOtpSubmit,
  onApplyConfirmed
}) => {
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [otpError, setOtpError] = useState("");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  // Reset OTP on modal changes
  useEffect(() => {
    setOtp(["", "", "", ""]);
    setOtpError("");
  }, [showOtpModal, otpType]);

  const handleOtpSubmit = async () => {
    try {
      await onOtpSubmit(otp);
      setShowOtpModal(false);
      setOtpError("");
    } catch (err) {
      setOtpError(err.message || "Something went wrong. Try again.");
    }
  };

  // OTP Modal
  const OtpModal = ({ isOpen, onClose, title }) => {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-40">
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

  // Rating Modal
  const RatingModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-40">
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

  // Confirm Apply Modal
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
            We'll mark this task as assigned to you and notify the poster.
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

  return (
    <>
      <OtpModal
        isOpen={showOtpModal}
        onClose={() => setShowOtpModal(false)}
        title={otpType === "start" ? "Start Task" : "Complete Task"}
      />
      <RatingModal
        isOpen={showRatingModal}
        onClose={() => setShowRatingModal(false)}
      />
      <ConfirmApplyModal
        isOpen={showConfirmApply}
        onCancel={() => setShowConfirmApply(false)}
        onConfirm={onApplyConfirmed}
      />
    </>
  );
};

export default TaskModals;