'use client';
import { getUserById } from '@/actions/auth/get-user';
import { auth } from '@/firebase/client';
import { UserType } from '@/lib/types';
import { signInWithEmailAndPassword } from 'firebase/auth';
import React, { createContext, useContext, useEffect, useState } from 'react';

type AuthContextType = {
  isLoading: boolean;
  currentUser: UserType | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<UserType | null>>;
  logout: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      try {
        if (user) {
          const { user: userFromDB } = await getUserById(user.uid);
          setCurrentUser(userFromDB);
        } else {
          setCurrentUser(null);
        }
      } catch (error) {
        // BUG-QW fix: use console.error so auth failures are visible as errors.
        console.error('[AuthContext] auth state change failed', error);
      } finally {
        setIsLoading(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const logout = async () => {
    await auth.signOut();
  };

  const signInWithEmail = async (email: string, password: string) => {
    const t = await signInWithEmailAndPassword(auth, email, password);
  };

  return (
    <AuthContext.Provider
      value={{ currentUser,setCurrentUser, logout, signInWithEmail, isLoading }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('AuthContextProvider Wrapper is missing');
  }
  return context as AuthContextType;
};
