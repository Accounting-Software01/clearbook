'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePathname, useRouter } from 'next/navigation';

// A simple loader component
const Loader = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
    <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full"></div>
  </div>
);

export const SubscriptionCheck = ({ children }: { children: React.ReactNode }) => {
  const { subscriptionStatus, isAuthLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Don't run any logic until auth is fully loaded and we have a path
    if (isAuthLoading || !pathname) {
      return;
    }

// Define all pages that DO NOT require a subscription check
const publicPaths = [
  '/',             // Your main landing page
  '/login',        // The login page
  '/free-trial',   // The free trial sign-up page
  '/contact'       // The contact page
];

const isPublicPage = publicPaths.includes(pathname) || pathname.startsWith('/subscription');



    // If subscription is inactive and user is on a protected page, redirect.
    if (subscriptionStatus === 'inactive' && !isPublicPage) {
      router.push('/subscription');
      return;
    }

    // If subscription is active and user lands on the main subscription page, go to dashboard.
    if (subscriptionStatus === 'active' && pathname === '/subscription') {
      router.push('/dashboard');
    }

  }, [subscriptionStatus, isAuthLoading, pathname, router]);

  // Show a loader while auth state is being determined.
  if (isAuthLoading || subscriptionStatus === 'loading') {
    return <Loader />;
  }

  // All checks passed, render the page.
  return <>{children}</>;
};
