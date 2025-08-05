import React, { createContext, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import {
  auth,
  db,
  googleProvider,
} from './firebase';
import {
  signInWithPopup,
  signOut,
  onIdTokenChanged,
  setPersistence,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export const AuthContext = createContext();

export const AuthProvider = ({ children, navigateTo }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const hasNavigatedRef = useRef(false);

  // ---------- Cookie helpers ----------
  const setSessionCookie = async (idToken) => {
    try {
      await axios.post('http://localhost:5000/sessionLogin', { idToken }, { withCredentials: true });
    } catch (err) {
      console.error('Failed to create session cookie:', err?.message || err);
    }
  };

  const clearSessionCookie = async () => {
    try {
      await axios.post('http://localhost:5000/logout', {}, { withCredentials: true });
    } catch (err) {
      console.error('Failed to clear session cookie:', err?.message || err);
    }
  };

  // ---------- One-time persistence setup ----------
  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch((e) => {
      console.warn('setPersistence error:', e?.message || e);
    });
  }, []);

  // ---------- Auth observer ----------
  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      hasNavigatedRef.current = false;

      if (!firebaseUser) {
        setUser(null);
        setAuthError(null);
        setLoading(false);
        return;
      }

      try {
        const basic = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || null,
          photoURL: firebaseUser.photoURL || null,
        };
        setUser(basic);
        setLoading(false);

        try {
          const idToken = await firebaseUser.getIdToken();
          await setSessionCookie(idToken);
        } catch (e) {
          console.warn('Session cookie refresh failed:', e?.message || e);
        }

        try {
          const [authStatusRes, userDocSnap] = await Promise.all([
            axios.get('http://localhost:5000/auth-status', { withCredentials: true }),
            getDoc(doc(db, 'users', firebaseUser.uid)),
          ]);

          const fromServer = authStatusRes?.data || {};
          const fromFirestore = userDocSnap.exists() ? userDocSnap.data() : {};

          setUser((prev) => ({ ...(prev || basic), ...fromServer, ...fromFirestore }));

          try {
            const membershipRes = await axios.get('http://localhost:5000/membership', { withCredentials: true });
            if (!hasNavigatedRef.current) {
              if (membershipRes?.data?.isMember) {
                navigateTo && navigateTo('home');
              } else {
                navigateTo && navigateTo('complete-profile');
              }
              hasNavigatedRef.current = true;
            }
          } catch (e) {
            console.warn('Membership check failed:', e?.message || e);
          }
        } catch (e) {
          console.warn('Background hydrate failed:', e?.message || e);
        }

        setAuthError(null);
      } catch (error) {
        console.error('Auth observer error:', error);
        setAuthError('Authentication failed. Please try again.');
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // ---------- Google Sign-in ----------
  const signInWithGoogle = async (role) => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;

      try {
        const idToken = await firebaseUser.getIdToken();
        await setSessionCookie(idToken);
      } catch (e) {
        console.warn('Could not set session cookie after popup:', e?.message || e);
      }

      const userRef = doc(db, 'users', firebaseUser.uid);
      await setDoc(userRef, { role }, { merge: true });

      setAuthError(null);
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      setAuthError('Sign-in failed: ' + error.message);
      throw error;
    }
  };

  // ---------- Email Registration ----------
 const registerWithEmail = async (email, password, role, name) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = result.user;

    await updateProfile(firebaseUser, {
      displayName: name,
    });

    const idToken = await firebaseUser.getIdToken();
    await setSessionCookie(idToken);

    const userRef = doc(db, 'users', firebaseUser.uid);
    await setDoc(userRef, {
      role,
      displayName: name,
    }, { merge: true });

    setAuthError(null);
  } catch (error) {
    console.error('Email Registration Error:', error);
    setAuthError('Registration failed: ' + error.message);
    throw error;
  }
};


  // ---------- Email Sign-in ----------
  const signInWithEmail = async (email, password) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = result.user;

      const idToken = await firebaseUser.getIdToken();
      await setSessionCookie(idToken);

      setAuthError(null);
    } catch (error) {
      console.error('Email Sign-In Error:', error);
      setAuthError('Sign-in failed: ' + error.message);
      throw error;
    }
  };

  // ---------- Logout ----------
  const logout = async () => {
 const result = await Swal.fire({
  title: 'Are you sure?',
  text: 'Do you really want to logout?',
  icon: 'warning',
  showCancelButton: true,
  showConfirmButton: true,
  confirmButtonText: 'Yes, Logout',
  cancelButtonText: 'Cancel',
  customClass: {
    confirmButton: 'bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700',
    cancelButton: 'bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400',
  }
});

  if (result.isConfirmed) {
    try {
      await signOut(auth);
      await clearSessionCookie();
      setUser(null);
      setAuthError(null);
      navigateTo && navigateTo('auth');

      Swal.fire({
        icon: 'success',
        title: 'Logged Out',
        text: 'You have been logged out successfully.',
        timer: 2000,
        showConfirmButton: false,
      });

    } catch (error) {
      console.error('Logout Error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Logout Failed',
        text: 'Something went wrong while logging out.',
      });
    }
  } else {
    Swal.fire({
        icon: 'success',
        title: 'Logging out aborted',
        text: 'You are with us.',
        timer: 2000,
        showConfirmButton: false,
      });
  }
};
  const value = useMemo(
    () => ({
      user,
      loading,
      authError,
      signInWithGoogle,
      signInWithEmail,
      registerWithEmail,
      logout,
    }),
    [user, loading, authError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// --- DEV-ONLY helper: log a fresh ID token ---
if (import.meta.env.DEV) {
  window.copyIdToken = async () => {
    try {
      if (!auth.currentUser) {
        console.warn('⚠️ No user logged in.');
        return;
      }
      const token = await auth.currentUser.getIdToken(true);
      console.log('🔑 Your ID Token:\n', token);
      return token;
    } catch (e) {
      console.error('Failed to get ID token:', e.message);
    }
  };
}
