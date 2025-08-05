import React, { useState, useContext } from "react";
import { ArrowLeft, User, UserCheck, Mail, HandHeart, Loader2 } from "lucide-react";
import { AuthContext } from "../AuthContext";
import Swal from "sweetalert2";

const AuthPage = ({ navigateTo }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [authInProgress, setAuthInProgress] = useState(false);

  const {
    signInWithGoogle,
    registerWithEmail,
    signInWithEmail,
    authError,
  } = useContext(AuthContext);

  const toggleRole = (role) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleGoogleAuth = async () => {
    try {
      setAuthInProgress(true);
      const rolesToSave =
        selectedRoles.length > 0 ? selectedRoles : ["poster", "provider"];
      await signInWithGoogle(rolesToSave);
      await Swal.fire({
        icon: "success",
        title: "Welcome!",
        text: isSignUp
          ? "Account created successfully."
          : "Logged in successfully.",
        timer: 3000,
        showConfirmButton: false,
        toast: true,
        position: "top-end",
      });
      navigateTo("home");
    } catch (err) {
      console.error("Google sign-in failed:", err);
    } finally {
      setAuthInProgress(false);
    }
  };

  const handleEmailAuth = async () => {
    try {
      setAuthInProgress(true);
      const rolesToSave =
        selectedRoles.length > 0 ? selectedRoles : ["poster", "provider"];
      if (isSignUp) {
        await registerWithEmail(email, password, rolesToSave, name);
      } else {
        await signInWithEmail(email, password);
      }
      await Swal.fire({
        icon: "success",
        title: "Welcome!",
        text: isSignUp
          ? "Account created successfully."
          : "Logged in successfully.",
        timer: 3000,
        showConfirmButton: false,
        toast: true,
        position: "top-end",
      });
      navigateTo("home");
    } catch (err) {
      console.error("Email sign-in failed:", err);
    } finally {
      setAuthInProgress(false);
    }
  };

  const handleGuestContinue = () => {
    navigateTo("home");
  };

  const isActive = (role) => selectedRoles.includes(role);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <button
          onClick={() => navigateTo("landing")}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400 mb-8 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Back to Home</span>
        </button>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-accent-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <HandHeart className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Join Jugaad
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Connect with your local community
            </p>
          </div>

          {isSignUp && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                I want to...
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => toggleRole("poster")}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    isActive("poster")
                      ? "border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-gray-700"
                      : "border-gray-200 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-500"
                  }`}
                >
                  <User className="w-6 h-6 mx-auto mb-2 text-primary-600 dark:text-primary-400" />
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    Post Tasks
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Get help from others
                  </div>
                </button>
                <button
                  onClick={() => toggleRole("provider")}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    isActive("provider")
                      ? "border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-gray-700"
                      : "border-gray-200 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-500"
                  }`}
                >
                  <UserCheck className="w-6 h-6 mx-auto mb-2 text-primary-600 dark:text-primary-400" />
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    Provide Services
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Help others earn money
                  </div>
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3 mb-6">
            {isSignUp && (
              <input
                type="text"
                placeholder="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:text-white"
              />
            )}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:text-white"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:text-white"
            />
            <button
              onClick={handleEmailAuth}
              disabled={authInProgress}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 font-medium rounded-xl hover:from-gray-200 hover:to-gray-300 dark:from-gray-700 dark:to-gray-600 dark:text-white dark:hover:from-gray-600 dark:hover:to-gray-500 transition-all shadow-md"
            >
              {authInProgress ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Mail size={20} />
              )}
              {isSignUp ? "Sign Up with Email" : "Sign In with Email"}
            </button>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleGoogleAuth}
              disabled={authInProgress}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-primary-500 to-accent-500 text-white font-medium rounded-xl hover:from-primary-600 hover:to-accent-600 transition-all shadow-md"
            >
              {authInProgress ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <User size={20} />
              )}
              {isSignUp ? "Sign Up with Google" : "Sign In with Google"}
            </button>

            <div className="text-center text-gray-500 dark:text-gray-400 text-sm">
              OR
            </div>

            <button
              onClick={handleGuestContinue}
              className="w-full py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 transition-all shadow-md"
            >
              Continue as Guest
            </button>

            {authError && (
              <div className="text-center text-sm text-red-500 dark:text-red-400">
                {authError}
              </div>
            )}
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium transition-colors"
            >
              {isSignUp
                ? "Already have an account? Sign In"
                : "Don't have an account? Sign Up"}
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              By continuing, you agree to our{" "}
              <button
                onClick={() => navigateTo("terms")}
                className="text-primary-600 hover:underline dark:text-primary-400 dark:hover:underline"
              >
                Terms of Service
              </button>{" "}
              and{" "}
              <button
                onClick={() => navigateTo("privacy")}
                className="text-primary-600 hover:underline dark:text-primary-400 dark:hover:underline"
              >
                Privacy Policy
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
