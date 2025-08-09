import React, { useState, useContext, useRef } from "react";
import {
  ArrowLeft,
  User,
  UserCheck,
  Mail,
  HandHeart,
  Loader2,
  Camera,
  Phone,
  Upload,
  X,
} from "lucide-react";
import { AuthContext } from "../AuthContext";
import Swal from "sweetalert2";

// Google SVG Icon with your provided SVG
const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 18 19" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 7.844v3.463h4.844a4.107 4.107 0 0 1-1.795 2.7v2.246h2.907c1.704-1.558 2.685-3.85 2.685-6.575 0-.633-.056-1.246-.162-1.83H9v-.004Z" fill="#3E82F1"></path>
    <path d="M9 14.861c-2.346 0-4.328-1.573-5.036-3.69H.956v2.323A9.008 9.008 0 0 0 9 18.42c2.432 0 4.47-.8 5.956-2.167l-2.907-2.247c-.804.538-1.835.855-3.049.855Z" fill="#32A753"></path>
    <path d="M3.964 5.456H.956a8.928 8.928 0 0 0 0 8.033l3.008-2.318a5.3 5.3 0 0 1-.283-1.699 5.3 5.3 0 0 1 .283-1.699V5.456Z" fill="#F9BB00"></path>
    <path d="m.956 5.456 3.008 2.317c.708-2.116 2.69-3.69 5.036-3.69 1.32 0 2.508.453 3.438 1.338l2.584-2.569C13.465 1.41 11.427.525 9 .525A9.003 9.003 0 0 0 .956 5.456Z" fill="#E74133"></path>
  </svg>
);

const AuthPage = ({ navigateTo }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [profilePic, setProfilePic] = useState(null);
  const [profilePicPreview, setProfilePicPreview] = useState(null);
  const [authInProgress, setAuthInProgress] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  const {
    signInWithGoogle,
    registerWithEmail,
    signInWithEmail,
    uploadProfilePhoto,
  } = useContext(AuthContext);

  const toggleRole = (role) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleProfilePicChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        Swal.fire({ icon: "error", title: "Invalid File", text: "Please select an image file.", confirmButtonText: "OK" });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        Swal.fire({ icon: "error", title: "File Too Large", text: "Please select an image smaller than 5MB.", confirmButtonText: "OK" });
        return;
      }
      setProfilePic(file);
      const reader = new FileReader();
      reader.onloadend = () => setProfilePicPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const removeProfilePic = () => {
    setProfilePic(null);
    setProfilePicPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const showErrorAlert = (code) => {
    let message = "Something went wrong. Please try again.";
    switch (code) {
      case "auth/user-not-found":
        message = "No account found with this email. Please sign up first."; break;
      case "auth/wrong-password":
        message = "Incorrect password. Please try again."; break;
      case "auth/email-already-in-use":
        message = "This email is already in use. Try signing in instead."; break;
      case "auth/invalid-email":
        message = "Invalid email address."; break;
      case "auth/weak-password":
        message = "Password is too weak. Please use a stronger one."; break;
      case "auth/missing-password":
        message = "Password is required."; break;
      default:
        message = code; break;
    }
    Swal.fire({ icon: "error", title: "Authentication Error", text: message, confirmButtonText: "OK" });
  };

  const handleGoogleAuth = async () => {
    try {
      setAuthInProgress(true);
      const rolesToSave = selectedRoles.length > 0 ? selectedRoles : ["poster", "provider"];
      await signInWithGoogle(rolesToSave);
      await Swal.fire({
        icon: "success",
        title: "Welcome!",
        text: isSignUp ? "Account created successfully." : "Logged in successfully.",
        timer: 3000,
        showConfirmButton: false,
        position: "center",
      });
      navigateTo("home");
    } catch (err) {
      console.error("Google sign-in failed:", err);
      showErrorAlert(err.code || "Unknown error");
    } finally {
      setAuthInProgress(false);
    }
  };

  const handleEmailAuth = async () => {
    try {
      setAuthInProgress(true);
      const rolesToSave = selectedRoles.length > 0 ? selectedRoles : ["poster", "provider"];
      const additionalData = {
        phoneNumber: phoneNumber.trim() || "",
        profilePic: profilePic || null,
      };
      if (isSignUp) {
        await registerWithEmail(email, password, rolesToSave, name, additionalData);
      } else {
        await signInWithEmail(email, password);
      }
      await Swal.fire({
        icon: "success",
        title: "Welcome!",
        text: isSignUp ? "Account created successfully." : "Logged in successfully.",
        timer: 3000,
        showConfirmButton: false,
        position: "center",
      });
      navigateTo("home");
    } catch (err) {
      console.error("Email auth failed:", err);
      showErrorAlert(err.code || "Unknown error");
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
      <div className="w-full max-w-4xl">
        <button
          onClick={() => navigateTo("landing")}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400 mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Back to Home</span>
        </button>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl px-8 py-6">
          <div className="flex flex-col md:flex-row gap-0 md:gap-0 justify-center items-stretch">
            {/* Left column: Welcome/Signup Info */}
            <div className="flex-1 flex flex-col gap-3 justify-center items-center p-0 md:p-8">
              <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center mb-2">
                <HandHeart className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-0">
                {isSignUp ? "Create Account" : "Sign In"}
              </h1>
              {isSignUp ? (
                <>
                  <span className="text-base font-semibold text-gray-700 dark:text-gray-200 mt-1">
                    Be a part of your community!
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Register to connect, post and earn.
                  </p>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      I want to...
                    </label>
                    <div className="flex gap-3 justify-center">
                      <button
                        type="button"
                        onClick={() => toggleRole("poster")}
                        className={`p-4 border-2 rounded-lg flex-1 transition-all ${
                          isActive("poster")
                            ? "border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-gray-700 shadow"
                            : "border-gray-200 hover:border-primary-300 dark:border-gray-600 dark:hover:border-primary-500"
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
                        type="button"
                        onClick={() => toggleRole("provider")}
                        className={`p-4 border-2 rounded-lg flex-1 transition-all ${
                          isActive("provider")
                            ? "border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-gray-700 shadow"
                            : "border-gray-200 hover:border-primary-300 dark:border-gray-600 dark:hover:border-primary-500"
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
                  <div className="flex gap-4 items-center mt-4">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden border-2 border-gray-200 dark:border-gray-600">
                        {profilePicPreview ? (
                          <img
                            src={profilePicPreview}
                            alt="Profile preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Camera className="w-8 h-8 text-gray-400" />
                        )}
                      </div>
                      {profilePicPreview && (
                        <button
                          type="button"
                          onClick={removeProfilePic}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    <div className="flex-1">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingPhoto}
                        className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {uploadingPhoto ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Upload size={16} />
                        )}
                        {uploadingPhoto ? 'Uploading...' : profilePicPreview ? 'Change Photo' : 'Upload Photo'}
                      </button>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Max 5MB, JPG/PNG only
                      </p>
                    </div>
                  </div>
                  {/* Name and Phone fields only here */}
                  <div className="flex gap-3 mt-2">
                    <input
                      type="text"
                      placeholder="Your Name *"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    />
                    <div className="relative flex-1">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="tel"
                        placeholder="Phone (Optional)"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePicChange}
                    className="hidden"
                  />
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center gap-2 mt-2 mb-2">
                    <Mail className="w-5 h-5 text-primary-500 dark:text-primary-400" />
                    <span className="text-base font-semibold text-gray-700 dark:text-gray-200">
                      Welcome Back!
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-2 text-center">
                    Enter your credentials to access Jugaad.<br />
                    or use social login below
                  </div>
                  <div className="flex flex-col gap-2 w-full items-center mt-2">
                    <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1 text-xs text-gray-700 font-medium w-fit shadow">
                      <svg width="18" height="18" fill="none"><circle cx="9" cy="9" r="9" fill="#e6f7ff"/><path d="M9 5v4l3 2" stroke="#2196f3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Quick access to your community!
                    </div>
                    <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1 text-xs text-gray-700 font-medium w-fit shadow">
                      <svg width="18" height="18" fill="none"><circle cx="9" cy="9" r="9" fill="#f0fff0"/><path d="M7 9l2 2 4-4" stroke="#4caf50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Secure & verified login
                    </div>
                    <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1 text-xs text-gray-700 font-medium w-fit shadow">
                      <svg width="18" height="18" fill="none"><circle cx="9" cy="9" r="9" fill="#fffbe6"/><path d="M6 12v-1a4 4 0 018 0v1" stroke="#ff9800" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="9" cy="7" r="1.5" fill="#ff9800"/></svg>
                      Privacy first. Your data is safe.
                    </div>
                  </div>
                </>
              )}
            </div>
            {/* Right column: Form */}
            <div className="flex-1 flex flex-col justify-center gap-3 px-0 md:px-8 py-8">
              {/* Only email & password here for signup! */}
              <input
                type="email"
                placeholder="Email *"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
              <input
                type="password"
                placeholder="Password *"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
              <button
                onClick={handleEmailAuth}
                disabled={authInProgress || !email.trim() || !password.trim() || (isSignUp && !name.trim())}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 font-medium rounded-xl hover:from-gray-200 hover:to-gray-300 dark:from-gray-700 dark:to-gray-600 dark:text-white dark:hover:from-gray-600 dark:hover:to-gray-500 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {authInProgress ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Mail size={20} />
                )}
                {isSignUp ? "Sign Up with Email" : "Sign In with Email"}
              </button>
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={authInProgress}
                className="w-full flex items-center justify-center gap-2 py-3 bg-white text-gray-800 font-medium rounded-xl border border-gray-300 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <GoogleIcon />
                {isSignUp ? "Sign Up with Google" : "Sign In with Google"}
              </button>
              <div className="text-center text-gray-500 dark:text-gray-400 text-sm font-medium my-2">
                OR
              </div>
              <button
                type="button"
                onClick={handleGuestContinue}
                disabled={authInProgress}
                className="w-full py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue as Guest
              </button>
              <div className="mt-5 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(signup => {
                      if (signup) {
                        setPhoneNumber("");
                        removeProfilePic();
                      }
                      return !signup;
                    });
                  }}
                  className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium transition-colors"
                >
                  {isSignUp
                    ? "Already have an account? Sign In"
                    : "Don't have an account? Sign Up"}
                </button>
              </div>
              <div className="mt-4 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  By continuing, you agree to our{" "}
                  <button
                    type="button"
                    onClick={() => navigateTo("terms")}
                    className="text-primary-600 hover:underline dark:text-primary-400 font-medium"
                  >
                    Terms of Service
                  </button>{" "}
                  and{" "}
                  <button
                    type="button"
                    onClick={() => navigateTo("privacy")}
                    className="text-primary-600 hover:underline dark:text-primary-400 font-medium"
                  >
                    Privacy Policy
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;