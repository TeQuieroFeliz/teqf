'use client';

import { auth, db } from '@/firebase/client';
import { updatePlannerLastLogin } from '@/actions/planner/planner-auth';
import { getPlannerRequestByEmail } from '@/actions/planner/planner-requests';
import { PlannerUser } from '@/lib/planner-types';
import { AdminUser } from '@/lib/admin-types';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
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

async function fetchPlannerByEmail(email: string): Promise<PlannerUser | null> {
  const snap = await getDocs(
    query(collection(db, 'planners'), where('email', '==', email), where('active', '==', true), limit(1))
  );
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as PlannerUser;
}

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
          // 1. Admin check first (client-side, no serverless cold-start)
          const adminSnap = await getDoc(doc(db, 'admins', user.uid));
          const admin: AdminUser | null =
            adminSnap.exists() && adminSnap.data()?.active === true
              ? ({ id: adminSnap.id, ...adminSnap.data() } as AdminUser)
              : null;

          if (admin) {
            updateDoc(doc(db, 'admins', user.uid), { lastLogin: serverTimestamp() }).catch(console.error);
          }

          // 2. Skip planners check for superadmin (they have no planner record)
          let planner: PlannerUser | null = null;
          if (user.email && admin?.role !== 'superadmin') {
            planner = await fetchPlannerByEmail(user.email);
            if (planner) {
              // fire-and-forget, doesn't block rendering
              updatePlannerLastLogin(user.email).catch(console.error);
            }
          }

          setPlannerUser(planner);
          setAdminUser(admin);
          setMustChangePassword(planner?.mustChangePassword ?? false);
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
    const planner = await fetchPlannerByEmail(user.email);
    setPlannerUser(planner);
    setMustChangePassword(planner?.mustChangePassword ?? false);
  };

  const loginWithEmail = async (email: string, password: string) => {
    setAuthError(null);
    try {
      // Client-side planners check (works after Firestore rules update)
      const planner = await fetchPlannerByEmail(email);

      if (!planner) {
        // Not a planner. Check for pending/rejected requests for clear error messages.
        // If the user is a superadmin, sign-in will succeed and onAuthStateChanged handles it.
        const request = await getPlannerRequestByEmail(email);
        if (request?.status === 'pending') {
          setAuthError('La tua richiesta è in attesa di approvazione. Ti contatteremo presto.');
          return;
        }
        if (request?.status === 'rejected') {
          setAuthError('La tua richiesta è stata rifiutata. Contatta l\'amministratore.');
          return;
        }
        // Could be a superadmin — attempt sign-in and let onAuthStateChanged + guard decide
        await signInWithEmailAndPassword(auth, email, password);
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
        err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential'
          ? 'Email o password errata.'
          : err.code === 'auth/invalid-email'
          ? 'Email non valida.'
          : err.code === 'auth/user-not-found'
          ? 'Non sei autorizzata. Contatta l\'amministratore.'
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
