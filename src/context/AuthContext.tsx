'use client';
import { removeToken } from '@/actions/auth/remove-token';
import { setToken } from '@/actions/auth/set-token';
import { auth } from '@/firebase/client';
import { ParsedToken, signInWithEmailAndPassword, User } from 'firebase/auth';
import React, { createContext, useContext, useEffect, useState } from 'react';

type ParsedTokenType = ParsedToken & { role: string };

type AuthContextType = {
  currentUser: User | null;
  customClaims: ParsedTokenType | null;
  logout: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [customClaims, setCustomClaims] = useState<ParsedTokenType | null>(
    null
  );
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user ?? null);
      if (user) {
        const tokenResult = await user.getIdTokenResult();
        const token = tokenResult.token;
        const refreshToken = user.refreshToken;
        const claims = tokenResult.claims;
        setCustomClaims((claims as ParsedTokenType) ?? null);
        if (token && refreshToken) {
          await setToken({ token, refreshToken });
        }
      } else {
        await removeToken();
        setCustomClaims(null);
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
      value={{ currentUser, logout, signInWithEmail, customClaims }}
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
