import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../firebase/config';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Determine user role and centre based on email
        let role = 'staff';
        let centre = '';

        if (user.email === 'admin@aaryavart.org') {
          role = 'admin';
          centre = 'Admin';
        } else if (user.email === 'lucknow@aaryavart.org') {
          centre = 'Lucknow';
        } else if (user.email === 'gorakhpur@aaryavart.org') {
          centre = 'Gorakhpur';
        }

        setUser({
          uid: user.uid,
          email: user.email,
          role,
          centre
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const value = {
    user,
    loading,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 