'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import SessionExpired from '@/components/SessionExpired';

interface AppLayoutProps {
    children: React.ReactNode;
}

const INACTIVITY_TIMEOUT = 10 * 1000; // 10 seconds
const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart', 'mousedown'] as const;

export default function AppLayout({ children }: AppLayoutProps) {
    console.log(`%c========================================\nAPP LAYOUT COMPONENT IS RUNNING!\n========================================`, 'background: #222; color: #bada55; font-size: 20px;');

    const { user, isLoading, logout } = useAuth();
    const router = useRouter();
    const [isIdle, setIsIdle] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const handleIdle = useCallback(() => {
        console.log('%c[TIMER] EXPIRED! Setting idle state and logging out.', 'color: red; font-weight: bold;');
        logout(); // Logout the user
        setIsIdle(true);
    }, [logout]);

    useEffect(() => {
        if (isLoading || !user) {
            return;
        }

        const resetTimer = () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
            timerRef.current = setTimeout(handleIdle, INACTIVITY_TIMEOUT);
        };

        // Add all activity event listeners
        ACTIVITY_EVENTS.forEach(event => {
            window.addEventListener(event, resetTimer, { passive: true });
        });

        // Start the initial timer
        resetTimer();

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
            ACTIVITY_EVENTS.forEach(event => {
                window.removeEventListener(event, resetTimer);
            });
        };
    }, [isLoading, user, handleIdle]);

    // Redirect to login when user is logged out (either manually or by idle timer)
    useEffect(() => {
        if (!isLoading && !user) {
            // If idle, the SessionExpired component will handle the redirect message
            // If not idle (manual logout), redirect immediately
            if (!isIdle) {
                console.log('%c[ROUTER] Redirecting to login (manual logout)', 'color: orange;');
                router.replace('/login');
            }
        }
    }, [isLoading, user, router, isIdle]);

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    // When idle, show the SessionExpired component.
    // The `useAuth` hook will eventually set `user` to null, but we show the component immediately.
    if (isIdle) {
        return <SessionExpired />;
    }

    // If there's a user and they are not idle, show the app.
    if (user) {
        return (
            <div className="flex min-h-screen flex-col">
                <main className="flex-1">{children}</main>
            </div>
        );
    }
    
    // If no user, and not loading, and not idle (initial state or manual logout),
    // this will be null and the useEffect above will redirect.
    return null;
}
