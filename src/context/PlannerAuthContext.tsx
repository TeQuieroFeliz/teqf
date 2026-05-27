'use client';

import { auth, db } from '@/firebase/client';
import { getPlannerByEmail, updatePlannerLastLogin } from '@/actions/planner/planner-auth';
import { getPlannerRequestByEmail } from '@/actions/planner/planner-requests';
import { getAdminByEmail } from '@/actions/admin/user-crud';
import { PlannerUser } from '@/lib/planner-types';
import { AdminUser } from '@/lib/admin-types';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useState } from 'react';

type PlannerAuthContextType = {
  isLoading: boolean;
  plannerUser: PlannerUser | null;
  adminUser: AdminUser | null;
  isSuperAdmin: boolean;
  mustChangePassword: boolean;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshPlannerUser: () => Promise<void>;
  authError: string | null;
};

const PlannerAuthContext = createContext<PlannerAuthContextType | null>(null);

export function PlannerAuthContextProvider({ children }: { children: React.ReactNode }) {
  const [plannerUser, setPlannerUser] = useState<PlannerUser | null>(null);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      try {
        if (user) {
          const [planner, adminSnap] = await Promise.all([
            user.email ? getPlannerByEmail(user.email) : Promise.resolve(null),
            getDoc(doc(db, 'admins', user.uid)),
          ]);

          const admin: AdminUser | null =
            adminSnap.exists() && adminSnap.data()?.active === true
              ? ({ id: adminSnap.id, ...adminSnap.data() } as AdminUser)
              : null;

          if (admin) {
            updateDoc(doc(db, 'admins', user.uid), { lastLogin: serverTimestamp() }).catch(console.error);
          }

          setPlannerUser(planner);
          setAdminUser(admin);
          setMustChangePassword(planner?.mustChangePassword ?? false);
          if (planner && user.email) await updatePlannerLastLogin(user.email);
        } else {
          setPlannerUser(null);
          setAdminUser(null);
          setMustChangePassword(false);
        }
      } catch (err) {
        console.error('[PlannerAuth]', err);
        setPlannerUser(null);
        setAdminUser(null);
      } finally {
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const refreshPlannerUser = async () => {
    const user = auth.currentUser;
    if (!user?.email) return;
    const planner = await getPlannerByEmail(user.email);
    setPlannerUser(planner);
    setMustChangePassword(planner?.mustChangePassword ?? false);
  };

  const loginWithEmail = async (email: string, password: string) => {
    setAuthError(null);
    try {
      const planner = await getPlannerByEmail(email);

      if (!planner) {
        // Check if it's an admin user
        const admin = await getAdminByEmail(email);
        if (admin) {
          if (admin.role === 'superadmin') {
            await signInWithEmailAndPassword(auth, email, password);
            return;
          } else {
            setAuthError('Esta área es exclusiva para planners.');
            return;
          }
        }

        // Not in planners or admins — check request status
        const request = await getPlannerRequestByEmail(email);
        if (request?.status === 'pending') {
          setAuthError('La tua richiesta è in attesa di approvazione. Ti contatteremo presto.');
        } else if (request?.status === 'rejected') {
          setAuthError('La tua richiesta è stata rifiutata. Contatta l\'amministratore.');
        } else {
          setAuthError('Non sei autorizzata. Contatta l\'amministratore.');
        }
        return;
      }

      // Planner approved — sign in or create Firebase Auth account on first login
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (signInErr: any) {
        if (signInErr.code === 'auth/user-not-found' || signInErr.code === 'auth/invalid-credential') {
          try {
            await createUserWithEmailAndPassword(auth, email, password);
          } catch (createErr: any) {
            if (createErr.code === 'auth/email-already-in-use') {
              setAuthError('Email o password errata.');
            } else {
              throw createErr;
            }
          }
        } else {
          throw signInErr;
        }
      }
    } catch (err: any) {
      const msg =
        err.code === 'auth/wrong-password'
          ? 'Email o password errata.'
          : err.code === 'auth/invalid-email'
          ? 'Email non valida.'
          : 'Errore durante il login. Riprova.';
      setAuthError(msg);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setPlannerUser(null);
    setAdminUser(null);
    setMustChangePassword(false);
  };

  const isSuperAdmin = adminUser?.role === 'superadmin';

  return (
    <PlannerAuthContext.Provider
      value={{
        plannerUser,
        adminUser,
        isSuperAdmin,
        mustChangePassword,
        isLoading,
        loginWithEmail,
        logout,
        refreshPlannerUser,
        authError,
      }}
    >
      {children}
    </PlannerAuthContext.Provider>
  );
}

export function usePlannerAuth() {
  const ctx = useContext(PlannerAuthContext);
  if (!ctx) throw new Error('PlannerAuthContextProvider wrapper is missing');
  return ctx;
}
