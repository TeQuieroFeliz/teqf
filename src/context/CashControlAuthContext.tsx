'use client';
// BUG-07 (deferred refactor): consolidare in un unico FirebaseUserProvider a root
// insieme a AuthContext, AdminAuthContext e PlannerAuthContext per eliminare
// i 4 onAuthStateChanged paralleli che aumentano il costo di lettura Firestore.

import { auth } from '@/firebase/client';
import { onAuthStateChanged, User } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type CashControlRole = 'admin' | 'team';

type CashControlAuthState = {
  isLoading: boolean;
  firebaseUser: User | null;
  cashControlRole: CashControlRole | null;
  uid: string | null;
  email: string | null;
  displayName: string | null;
};

const CashControlAuthContext = createContext<CashControlAuthState | null>(null);

export function CashControlAuthContextProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CashControlAuthState>({
    isLoading: true,
    firebaseUser: null,
    cashControlRole: null,
    uid: null,
    email: null,
    displayName: null,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setState({
          isLoading: false,
          firebaseUser: null,
          cashControlRole: null,
          uid: null,
          email: null,
          displayName: null,
        });
        return;
      }
      try {
        const tokenResult = await user.getIdTokenResult(true);
        const role = (tokenResult.claims.cashControlRole as CashControlRole) ?? null;
        setState({
          isLoading: false,
          firebaseUser: user,
          cashControlRole: role,
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
        });
      } catch (err) {
        console.error('[CashControlAuth]', err);
        setState({
          isLoading: false,
          firebaseUser: user,
          cashControlRole: null,
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
        });
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <CashControlAuthContext.Provider value={state}>
      {children}
    </CashControlAuthContext.Provider>
  );
}

export function useCashControlAuth() {
  const ctx = useContext(CashControlAuthContext);
  if (!ctx) throw new Error('CashControlAuthContextProvider missing');
  return ctx;
}
