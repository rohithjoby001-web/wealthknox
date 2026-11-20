import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../lib/firebase.js';

const AuthContext = createContext(null);

// Turns Firebase's error codes into the kind of plain-language message
// this app's other forms already use, rather than surfacing raw
// "Firebase: Error (auth/...)" strings to the person.
function friendlyAuthError(err) {
  const code = err?.code || '';
  if (code.includes('email-already-in-use')) return 'An account already exists with that email — try signing in instead.';
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) return 'Incorrect email or password.';
  if (code.includes('weak-password')) return 'Choose a password with at least 6 characters.';
  if (code.includes('invalid-email')) return 'That email address looks off.';
  if (code.includes('too-many-requests')) return 'Too many attempts — wait a bit and try again.';
  if (code.includes('network-request-failed')) return "Couldn't reach the server — check your connection.";
  return 'Something went wrong. Please try again.';
}

export function AuthProvider({ children }) {
  // Without a configured Firebase project there's no auth concept at
  // all — the app runs fully local, single-device, no sign-in screen.
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(isFirebaseConfigured);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const signUp = useCallback(async (email, password) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      return { user: cred.user, error: null };
    } catch (err) {
      return { user: null, error: friendlyAuthError(err) };
    }
  }, []);

  const signIn = useCallback(async (email, password) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      return { user: cred.user, error: null };
    } catch (err) {
      return { user: null, error: friendlyAuthError(err) };
    }
  }, []);

  const signOutUser = useCallback(() => firebaseSignOut(auth), []);

  const resetPassword = useCallback(async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { error: null };
    } catch (err) {
      return { error: friendlyAuthError(err) };
    }
  }, []);

  const value = { enabled: isFirebaseConfigured, user, loading, signUp, signIn, signOutUser, resetPassword };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
