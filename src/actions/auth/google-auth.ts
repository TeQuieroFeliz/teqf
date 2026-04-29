import { auth, db } from '@/firebase/client';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';

export const handleGoogleSignIn = async () => {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Check if user exists in Firestore
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      await setDoc(userRef, {
        name: user.displayName || '',
        email: user.email || '',
        role: 'client',
        avatar: user.photoURL || '',
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      return { userId: user.uid };
    }
    return { userId: null };
  } catch (err: any) {
    console.error('Google sign-in error:', err);
    toast.error(err.message || 'Google sign-in failed');
    return { userId: null };
  }
};
