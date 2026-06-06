'use client';

import { auth, db } from '@/firebase/client';
import { updatePlannerLastLogin } from '@/actions/planner/planner-auth';
import { getPlannerRequestByEmail } from '@/actions/planner/planner-requests';
import { PlannerUser, TeamRole } from '@/lib/planner-types';
import { AdminUser } from '@/lib/admin-types';
import { sectionPermissionsFor, SectionPermissions } from '@/lib/user-permissions';
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
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useState } from 'react';

type PlannerAuthContextType = {
  isLoading: boolean;
  plannerUser: PlannerUser | null;
  adminUser: AdminUser | null;
  isSuperAdmin: boolean;
  mustChangePassword: boolean;
  // Section-level permission matrix (PART-2)
  permissions: SectionPermissions;
  // Convenience permission helpers based on teamRole (retrocompatibili)
  canCreateProjects: boolean;
  canManageCashControl: boolean;
  canManageCatalogs: boolean;
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
    // BUG-03 fix: requestId prevents stale callbacks from a previous auth state from
    // stomping on state set by a newer one (race on rapid user switch).
    let requestId = 0;
    let plannerUnsub: (() => void) | null = null;
    let safetyTimer: ReturnType<typeof setTimeout> | null = null;

    const clearSafety = () => {
      if (safetyTimer) { clearTimeout(safetyTimer); safetyTimer = null; }
    };

    const authUnsub = auth.onAuthStateChanged(async (firebaseUser) => {
      // Cancel any previous planner listener and safety timer
      if (plannerUnsub) { plannerUnsub(); plannerUnsub = null; }
      clearSafety();

      const myReq = ++requestId;

      // BUG-04 fix: safety timeout — if onSnapshot never fires (rules-deny silence),
      // stop spinner after 6s so the user sees an error state instead of hanging.
      safetyTimer = setTimeout(() => {
        if (myReq !== requestId) return;
        setIsLoading(false);
      }, 6000);

      if (!firebaseUser) {
        if (myReq !== requestId) return;
        setPlannerUser(null);
        setAdminUser(null);
        setMustChangePassword(false);
        clearSafety();
        setIsLoading(false);
        return;
      }

      try {
        // BUG-12 fix: parallelise admin fetch and last-login update (don't block render on
        // last-login write which is fire-and-forget).
        const adminPromise = getDoc(doc(db, 'admins', firebaseUser.uid));
        // BUG-05 fix: REMOVED updateDoc(admins, lastLogin) — rules reject it. The server
        // action updatePlannerLastLogin runs with Admin SDK and is the only valid path.
        const lastLoginPromise = firebaseUser.email
          ? updatePlannerLastLogin(firebaseUser.email).catch(console.error)
          : Promise.resolve();

        const adminSnap = await adminPromise;
        // Fire-and-forget — we don't await lastLoginPromise here.
        void lastLoginPromise;

        if (myReq !== requestId) return;

        const admin: AdminUser | null =
          adminSnap.exists() && adminSnap.data()?.active === true
            ? ({ id: adminSnap.id, ...adminSnap.data() } as AdminUser)
            : null;

        setAdminUser(admin);

        // Superadmin has no planner record — skip and finish loading
        if (admin?.role === 'superadmin') {
          setPlannerUser(null);
          setMustChangePassword(false);
          clearSafety();
          setIsLoading(false);
          return;
        }

        // Real-time listener keyed by uid (direct doc — no compound index needed).
        // Falls back to email query for legacy users who predate uid-keyed docs.
        const uidDocRef = doc(db, 'planners', firebaseUser.uid);

        // BUG-04 fix: pass onError to onSnapshot so a rules-deny doesn't hang the spinner.
        plannerUnsub = onSnapshot(
          uidDocRef,
          async (uidSnap) => {
            if (myReq !== requestId) return;
            clearSafety();

            const data = uidSnap.data();

            if (uidSnap.exists() && data?.active !== false) {
              if (data?.status === 'rejected') {
                setPlannerUser(null);
                setMustChangePassword(false);
                signOut(auth).catch(console.error);
              } else {
                setPlannerUser({ id: uidSnap.id, ...data } as PlannerUser);
                setMustChangePassword(data?.mustChangePassword ?? false);
              }
            } else if (uidSnap.exists() && data?.active === false) {
              setPlannerUser(null);
              setMustChangePassword(false);
            } else if (firebaseUser.email) {
              // uid-keyed doc absent — legacy user: query by email once
              const legacySnap = await getDocs(
                query(
                  collection(db, 'planners'),
                  where('email', '==', firebaseUser.email),
                  where('active', '==', true)
                )
              );
              if (myReq !== requestId) return;
              if (!legacySnap.empty) {
                const d = legacySnap.docs[0];
                setPlannerUser({ id: d.id, ...d.data() } as PlannerUser);
                setMustChangePassword(d.data().mustChangePassword ?? false);
              } else {
                setPlannerUser(null);
                setMustChangePassword(false);
              }
            } else {
              setPlannerUser(null);
              setMustChangePassword(false);
            }
            setIsLoading(false);
          },
          (err) => {
            // BUG-04 fix: onError handler — rules-deny or network error stops the spinner.
            if (myReq !== requestId) return;
            clearSafety();
            console.error('[PlannerAuth] onSnapshot error', err);
            setAuthError('Errore di connessione. Riprova più tardi.');
            setIsLoading(false);
          }
        );
      } catch (err) {
        if (myReq !== requestId) return;
        clearSafety();
        console.error('[PlannerAuth]', err);
        setPlannerUser(null);
        setAdminUser(null);
        setIsLoading(false);
      }
    });

    return () => {
      authUnsub();
      if (plannerUnsub) plannerUnsub();
      clearSafety();
    };
  }, []);

  const refreshPlannerUser = async () => {
    // onSnapshot already keeps plannerUser in sync; this is a no-op for compatibility
  };

  const loginWithEmail = async (email: string, password: string) => {
    setAuthError(null);
    try {
      try {
        const credential = await signInWithEmailAndPassword(auth, email, password);

        // Block users whose registration is pending, rejected, or account inactive
        const plannerSnap = await getDoc(doc(db, 'planners', credential.user.uid));
        if (plannerSnap.exists()) {
          const data = plannerSnap.data();
          if (data?.status === 'pending') {
            await signOut(auth);
            setAuthError('La tua registrazione è in attesa di approvazione. Ti contatteremo presto.');
            return;
          }
          if (data?.status === 'rejected') {
            await signOut(auth);
            setAuthError('La tua registrazione è stata rifiutata. Contatta l\'amministratore.');
            return;
          }
          if (data?.active === false) {
            await signOut(auth);
            setAuthError('Account disattivato. Contatta l\'amministratore.');
            return;
          }
        }
      } catch (signInErr: any) {
        if (signInErr.code === 'auth/user-not-found' || signInErr.code === 'auth/invalid-credential') {
          // Check for pending/rejected requests to show a helpful error
          const request = await getPlannerRequestByEmail(email);
          if (request?.status === 'pending') {
            setAuthError('La tua richiesta è in attesa di approvazione. Ti contatteremo presto.');
            return;
          }
          if (request?.status === 'rejected') {
            setAuthError("La tua richiesta è stata rifiutata. Contatta l'amministratore.");
            return;
          }
          setAuthError('Email o password errata.');
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
          ? "Non sei autorizzata. Contatta l'amministratore."
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
  const teamRole = plannerUser?.teamRole;

  // Support both new team-array format and legacy teamRole string
  const rawTeam = (plannerUser as any)?.team;
  const teamArr: string[] = Array.isArray(rawTeam)
    ? rawTeam
    : rawTeam === 'XB'   ? ['XB']
    : rawTeam === 'TeQF' ? ['TeQF']
    : teamRole === 'xb_planner' ? ['XB']
    : teamRole === 'teqf_user'  ? ['TeQF']
    : teamRole === 'both'       ? ['XB', 'TeQF']
    : [];

  // PART-2: structured section permissions (view/edit per section)
  const permissions = sectionPermissionsFor(teamArr, isSuperAdmin);

  // Retrocompatibili alias — computed from team array
  const canCreateProjects    = isSuperAdmin || teamArr.includes('XB')   || teamRole === 'xb_planner' || teamRole === 'both';
  const canManageCashControl = isSuperAdmin || teamArr.includes('TeQF') || teamRole === 'teqf_user'  || teamRole === 'both';
  // BUG-09 fix: canManageCatalogs now includes TeQF (they can view+edit catalogs too)
  const canManageCatalogs    = isSuperAdmin || teamArr.includes('XB') || teamArr.includes('TeQF') || teamRole === 'xb_planner' || teamRole === 'teqf_user' || teamRole === 'both';

  return (
    <PlannerAuthContext.Provider
      value={{
        plannerUser,
        adminUser,
        isSuperAdmin,
        mustChangePassword,
        permissions,
        canCreateProjects,
        canManageCashControl,
        canManageCatalogs,
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
