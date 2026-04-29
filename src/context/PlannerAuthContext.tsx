'use client';

import { auth } from '@/firebase/client';
import { getPlannerByEmail, updatePlannerLastLogin } from '@/actions/planner/planner-auth';
import { getPlannerRequestByEmail } from '@/actions/planner/planner-requests';
import { PlannerUser } from '@/lib/planner-types';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import React, { createContext, useContext, useEffect, useState } from 'react';

type PlannerAuthContextType = {
  isLoading: boolean;
  plannerUser: PlannerUser | null;
  mustChangePassword: boolean;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshPlannerUser: () => Promise<void>;
  authError: string | null;
};

const PlannerAuthContext = createContext<PlannerAuthContextType | null>(null);

export function PlannerAuthContextProvider({ children }: { children: React.ReactNode }) {
  const [plannerUser, setPlannerUser] = useState<PlannerUser | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      try {
        if (user?.email) {
          const planner = await getPlannerByEmail(user.email);
          setPlannerUser(planner);
          setMustChangePassword(planner?.mustChangePassword ?? false);
          if (planner) await updatePlannerLastLogin(user.email);
        } else {
          setPlannerUser(null);
          setMustChangePassword(false);
        }
      } catch (err) {
        console.error('[PlannerAuth]', err);
        setPlannerUser(null);
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
      // Check Firestore first: is this planner approved?
      const planner = await getPlannerByEmail(email);

      if (!planner) {
        // Not in planners — check if there's a pending/rejected request
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

      // Planner is approved — sign in, or create Firebase Auth account if missing
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (signInErr: any) {
        if (signInErr.code === 'auth/user-not-found' || signInErr.code === 'auth/invalid-credential') {
          // Firebase Auth account may not exist yet (admin-created planner, first login)
          try {
            await createUserWithEmailAndPassword(auth, email, password);
          } catch (createErr: any) {
            if (createErr.code === 'auth/email-already-in-use') {
              // Account exists but password is wrong
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
    setMustChangePassword(false);
  };

  return (
    <PlannerAuthContext.Provider value={{ plannerUser, mustChangePassword, isLoading, loginWithEmail, logout, refreshPlannerUser, authError }}>
      {children}
    </PlannerAuthContext.Provider>
  );
}

export function usePlannerAuth() {
  const ctx = useContext(PlannerAuthContext);
  if (!ctx) throw new Error('PlannerAuthContextProvider wrapper is missing');
  return ctx;
}
