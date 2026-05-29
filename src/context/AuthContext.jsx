import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const AuthContext = createContext({
  currentUser: null,
  userData: null,
  loading: true
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        // Fetch or create user record in Firestore
        try {
          const userRef = doc(db, 'users', user.uid);
          const snap = await getDoc(userRef);
          if (snap.exists()) {
            setUserData(snap.data());
          } else {
            // Create user document if it doesn't exist
            const newUserData = {
              uid: user.uid,
              displayName: user.displayName || user.email?.split('@')[0] || 'Operator',
              email: user.email,
              photoURL: user.photoURL || '',
              solvedProblems: [],
              streak: 0,
              badges: [],
              completedCourses: [],
              createdAt: Date.now()
            };
            await setDoc(userRef, newUserData);
            setUserData(newUserData);
          }
        } catch (err) {
          console.error("Error loading user profile doc:", err);
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userData,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
