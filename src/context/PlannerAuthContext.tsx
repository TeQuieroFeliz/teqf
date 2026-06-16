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

      // FIX: getDoc(admins/uid) is non-fatal — if Firestore denies the read (e.g. token not
      // yet propagated right after sign-in), we log a warning and fall through to the planner
      // check instead of crashing the whole auth flow.
      let admin: AdminUser | null = null;
      try {
        const adminSnap = await getDoc(doc(db, 'admins', firebaseUser.uid));
        if (myReq !== requestId) return;
        admin =
          adminSnap.exists() && adminSnap.data()?.active === true
            ? ({ id: adminSnap.id, ...adminSnap.data() } as AdminUser)
            : null;
      } catch (adminErr) {
        if (myReq !== requestId) return;
        console.warn('[PlannerAuth] admins read failed (non-fatal):', adminErr);
        // Continue — user is likely not an admin; planner check below handles their state.
      }

      setAdminUser(admin);

      // Fire-and-forget last-login update (Admin SDK, never blocks render).
      if (firebaseUser.email) {
        updatePlannerLastLogin(firebaseUser.email).catch(console.error);
      }

      // Superadmin has no planner record — finish loading immediately.
      if (admin?.role === 'superadmin') {
        setPlannerUser(null);
        setMustChangePassword(false);
        clearSafety();
        setIsLoading(false);
        return;
      }

      try {
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
              } else if (data?.status === 'pending') {
                // Pending users authenticated via Firebase Auth but are not yet approved.
                setPlannerUser(null);
                setMustChangePassword(false);
                setAuthError('La tua registrazione è in attesa di approvazione. Ti contatteremo presto.');
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
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged fires next and handles all Firestore reads + status checks
      // (pending/rejected/inactive are now checked inside the onSnapshot callback).
      // Reading planners/{uid} here caused a race-condition: the Firestore SDK may not
      // yet have the auth token at the moment right after signInWithEmailAndPassword
      // resolves, producing a spurious "Missing or insufficient permissions" error that
      // blocked the login flow even when credentials were correct.
    } catch (err: any) {
      if (
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/wrong-password'
      ) {
        // Firebase Auth failed — check for a pending/rejected registration request so we
        // can show a more helpful message than "wrong password".
        try {
          const request = await getPlannerRequestByEmail(email);
          if (request?.status === 'pending') {
            setAuthError('La tua richiesta è in attesa di approvazione. Ti contatteremo presto.');
            return;
          }
          if (request?.status === 'rejected') {
            setAuthError("La tua richiesta è stata rifiutata. Contatta l'amministratore.");
            return;
          }
        } catch {
          // getPlannerRequestByEmail is best-effort; swallow errors
        }
        setAuthError('Email o password errata.');
      } else if (err.code === 'auth/invalid-email') {
        setAuthError('Email non valida.');
      } else {
        setAuthError('Errore durante il login. Riprova.');
      }
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
