'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface AppLayoutProps {
    children: React.ReactNode;
}

/**
 * This layout component wraps all pages in the protected (app) section.
 * It's a Client Component because it uses the `useAuth` hook and `useEffect`.
 * Its primary job is to protect routes and redirect unauthenticated users.
 */
export default function AppLayout({ children }: AppLayoutProps) {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // If the auth state is done loading and there is no user,
        // redirect them to the login page.
        if (!isLoading && !user) {
            router.replace('/login');
        }
    }, [isLoading, user, router]);

    // While the authentication state is loading, show a full-screen spinner.
    // This prevents a flash of the protected content before the user is redirected.
    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    // If a user is authenticated, render the children (the actual page content).
    // We wrap it in a div to provide a basic layout structure.
    if (user) {
         return (
            <div className="flex min-h-screen flex-col">
                {/* You can add a common header or sidebar here */}
                <main className="flex-1">{children}</main>
            </div>
        );
    }

    // If not loading and no user, this will be briefly rendered before the redirect happens.
    // Typically, the loading spinner is shown long enough that this isn't seen.
    return null;
}
