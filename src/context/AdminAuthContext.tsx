'use client';
import { auth, db } from '@/firebase/client';
import { AdminUser } from '@/lib/admin-types';
import {
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import React, { createContext, useContext, useEffect, useState } from 'react';

type AdminAuthContextType = {
  isLoading: boolean;
  adminUser: AdminUser | null;
  mustChangePassword: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

export function AdminAuthContextProvider({ children }: { children: React.ReactNode }) {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      try {
        if (user) {
          const docRef = doc(db, 'admins', user.uid);
          const snapshot = await getDoc(docRef);
          if (snapshot.exists() && snapshot.data()?.active === true) {
            const admin = { id: snapshot.id, ...snapshot.data() } as AdminUser;
            setAdminUser(admin);
            setMustChangePassword(admin.mustChangePassword === true);
            updateDoc(docRef, { lastLogin: serverTimestamp() }).catch((err) => {
              console.error('[AdminAuth] failed to update lastLogin', err);
            });
          } else {
            setAdminUser(null);
            setMustChangePassword(false);
          }
        } else {
          setAdminUser(null);
          setMustChangePassword(false);
        }
      } catch (error) {
        console.error('[AdminAuth]', error);
        setAdminUser(null);
      } finally {
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AdminAuthContext.Provider value={{ adminUser, isLoading, mustChangePassword, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) throw new Error('AdminAuthContextProvider wrapper is missing');
  return context;
}
