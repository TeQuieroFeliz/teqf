// import { useAuthContext } from '@/context/AuthContext';
// import { Loader2 } from 'lucide-react';
// import { usePathname, useRouter } from 'next/navigation';
// import React, { useEffect } from 'react';

// function AuthorizationProvider({ children }: { children: React.ReactNode }) {
//   const { currentUser, isLoading } = useAuthContext();
//   const pathname = usePathname();
//   const router = useRouter();

//   useEffect(() => {
//     if (isLoading) return;
//     if (pathname === '/') return;
//     if (
//       !currentUser &&
//       (pathname === 'register' ||
//         pathname === 'login' ||
//         pathname === 'forgot-password')
//     )
//       return;
//     if (!currentUser) {
//       router.push('/login');
//       return;
//     }
//     if (
//       currentUser &&
//       (currentUser.role === 'admin' || currentUser.role === 'manager')
//     ) {
//       router.push('/admin-dashboard');
//       return;
//     } else {
//       if (currentUser.status === 'approved') {
//         router.push('/user-dashboard');
//         return;
//       } else {
//         router.push('/status');
//         return;
//       }
//     }
//   }, [currentUser, isLoading, pathname, router]);

//   if (isLoading) {
//     return (
//       <div className="min-h-screen flex items-center justify-center">
//         <Loader2 className="size-5 animate-spin" />
//       </div>
//     );
//   }
//   return <div>{children}</div>;
// }

// export default AuthorizationProvider;
// 'use client';

// import { useAuthContext } from '@/context/AuthContext';
// import { Loader2 } from 'lucide-react';
// import { usePathname, useRouter } from 'next/navigation';
// import React, { useEffect, useState, ReactNode } from 'react';

// // Define your route types for easier management
// const publicRoutes = ['/']; // Routes accessible to everyone
// const authRoutes = ['/login', '/register', '/forgot-password']; // Routes for unauthenticated users
// const statusRoute = '/status'; // The pending status page

// function AuthorizationProvider({ children }: { children: ReactNode }) {
//   const { currentUser, isLoading } = useAuthContext();
//   const pathname = usePathname();
//   const router = useRouter();
//   const [isAuthorized, setIsAuthorized] = useState<boolean | undefined>(
//     undefined
//   );

//   useEffect(() => {
//     // Wait until the authentication status is resolved
//     if (isLoading) {
//       return;
//     }

//     if (pathname === '/') {
//       setIsAuthorized(true);
//       return;
//     }

//     let redirectTo: string | null = null;

//     // --- Case 1: User is not authenticated ---
//     if (!currentUser) {
//       // If the user is not logged in, they are only allowed to access public or auth routes.
//       // If they try to access anything else, redirect them to the login page.
//       if (!authRoutes.includes(pathname) && !publicRoutes.includes(pathname)) {
//         redirectTo = '/login';
//       }
//     } else {
//       // --- Case 2: User is authenticated ---
//       const { role, status } = currentUser;
//       const isAdminPath = pathname.startsWith('/admin-dashboard');
//       const isUserPath = pathname.startsWith('/user-dashboard');

//       // If a logged-in user tries to access an auth page (e.g., /login), redirect them away.
//       if (authRoutes.includes(pathname)) {
//         if (role === 'admin' || role === 'manager') {
//           redirectTo = '/admin-dashboard';
//         } else {
//           // This logic is for 'client' role after login/register
//           if (status !== 'approved') {
//             redirectTo = statusRoute;
//           } else {
//             // This will only run for 'approved' clients
//             redirectTo = '/user-dashboard';
//           }
//         }
//       } else if (role === 'admin' || role === 'manager') {
//         // If an admin is not on an admin path, redirect them.
//         if (!isAdminPath) {
//           redirectTo = '/admin-dashboard';
//         }
//       } else if (role === 'client') {
//         // This is a regular user ('client')
//         if (status === 'approved') {
//           // Redirect an approved client if they are on any page that is NOT their dashboard
//           // This correctly handles redirecting them from '/', '/status', or '/admin-dashboard'
//           if (!isUserPath) {
//             redirectTo = '/user-dashboard';
//           }
//         } else {
//           // If a client's status is not approved, they must be on the status page or public routes.
//           // Redirect them if they try to access any other page.
//           const allowedRoutesForPending = [...publicRoutes, statusRoute];
//           if (!allowedRoutesForPending.includes(pathname)) {
//             redirectTo = statusRoute;
//           }
//         }
//       }
//     }

//     if (redirectTo) {
//       router.replace(redirectTo);
//     } else {
//       setIsAuthorized(true);
//     }
//   }, [currentUser, isLoading, pathname, router, isAuthorized]);

//   // While loading or not authorized, show a full-screen spinner
//   if (isLoading || isAuthorized !== true) {
//     return (
//       <div className="min-h-screen flex items-center justify-center">
//         <Loader2 className="size-8 animate-spin text-primary" />
//       </div>
//     );
//   }

//   // If everything is fine, render the requested page
//   return <>{children}</>;
// }

// export default AuthorizationProvider;
import { useAuthContext } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect, useState, ReactNode } from 'react';

// --- Route & Role Configuration ---
const ROUTES = {
  PUBLIC: ['/', '/get-in-touch', '/catalog', '/portfolio'],
  AUTH: ['/login', '/register', '/forgot-password'],
  ADMIN_DASHBOARD: '/admin-dashboard',
  USER_DASHBOARD: '/user-dashboard',
  STATUS: '/status',
  ADMIN_ONLY: ['/admin-dashboard/user'],
};

function AuthorizationProvider({ children }: { children: ReactNode }) {
  const { currentUser, isLoading } = useAuthContext();
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (
      pathname.startsWith('/admin') ||
      pathname.startsWith('/blog') ||
      pathname.startsWith('/portfolio') ||
      pathname.startsWith('/planner')
    ) {
      setIsAuthorized(true);
      return;
    }

    const isPublicPage = ROUTES.PUBLIC.includes(pathname);
    const isAuthPage = ROUTES.AUTH.includes(pathname);
    const isAdminOnlyPage = ROUTES.ADMIN_ONLY.some((p) =>
      pathname.startsWith(p)
    );
    const isAdminArea = pathname.startsWith(ROUTES.ADMIN_DASHBOARD);
    const isUserArea = pathname.startsWith(ROUTES.USER_DASHBOARD);

    // 1. Handle unauthenticated users
    if (!currentUser) {
      if (isPublicPage || isAuthPage) {
        setIsAuthorized(true);
      } else {
        router.replace('/login');
      }
      return;
    }

    // 2. Handle authenticated users
    const { role, status } = currentUser;

    // ✨ NEW: Allow any logged-in user to access public pages.
    // This rule runs before any role-based redirects.
    if (isPublicPage) {
      setIsAuthorized(true);
      return;
    }

    // Rule: Logged-in users should never see auth pages (like /login).
    if (isAuthPage) {
      if (role === 'admin' || role === 'manager') {
        router.replace(ROUTES.ADMIN_DASHBOARD);
      } else {
        // 'client' role
        router.replace(
          status === 'approved' ? ROUTES.USER_DASHBOARD : ROUTES.STATUS
        );
      }
      return;
    }

    // Rule: Only 'admin' can access admin-only pages.
    if (isAdminOnlyPage && role !== 'admin') {
      router.replace(ROUTES.ADMIN_DASHBOARD);
      return;
    }

    // General routing rules based on role
    switch (role) {
      case 'admin':
      case 'manager':
        if (!isAdminArea) {
          router.replace(ROUTES.ADMIN_DASHBOARD);
        } else {
          setIsAuthorized(true);
        }
        break;

      case 'client':
        if (status === 'approved') {
          if (!isUserArea) {
            router.replace(ROUTES.USER_DASHBOARD);
          } else {
            setIsAuthorized(true);
          }
        } else {
          if (pathname !== ROUTES.STATUS && !isPublicPage) {
            router.replace(ROUTES.STATUS);
          } else {
            setIsAuthorized(true);
          }
        }
        break;

      default:
        router.replace('/login');
        break;
    }
  }, [currentUser, isLoading, pathname, router]);

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}

export default AuthorizationProvider;
