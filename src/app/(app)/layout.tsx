'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import SessionExpired from '@/components/SessionExpired';
import { SpeedInsights } from "@vercel/speed-insights/next"
interface AppLayoutProps {
    children: React.ReactNode;
}

const INACTIVITY_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart', 'mousedown'] as const;

export default function AppLayout({ children }: AppLayoutProps) {
    const { user, isLoading, logout } = useAuth();
    const router = useRouter();
    const [isIdle, setIsIdle] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const handleIdle = useCallback(() => {
        logout();
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

        ACTIVITY_EVENTS.forEach(event => {
            window.addEventListener(event, resetTimer, { passive: true });
        });

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

    useEffect(() => {
        if (!isLoading && !user) {
          router.replace('/login');
        }
    }, [isLoading, user, router]);

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (isIdle) {
        return <SessionExpired />;
    }

    if (user) {
        return (
            <div className="flex min-h-screen flex-col">
                <main className="flex-1">{children}</main>
            </div>
        );
    }
    
    return null;
}
