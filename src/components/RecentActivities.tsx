'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

interface PageVisit {
    path: string;
    title: string;
}

const MAX_TABS = 5;

// Get a unique storage key for the user and company
const getStorageKey = (userId?: string, companyId?: string) => {
    if (!userId || !companyId) return null;
    return `pageHistory_${companyId}_${userId}`;
};

const trackVisit = (path: string, title: string, storageKey: string | null) => {
    if (typeof window !== 'undefined' && window.localStorage && storageKey) {
        // Don't track visits to login, API routes, or pages without a proper title
        if (path.startsWith('/login') || path.startsWith('/api') || !title || title === 'ClearBooks') {
            return;
        }

        const fullPath = path + window.location.hash;

        const history = localStorage.getItem(storageKey);
        let parsedHistory: PageVisit[] = history ? JSON.parse(history) : [];

        // Remove any existing instance of the page to update its position
        const cleanedHistory = parsedHistory.filter(p => p.path !== fullPath);

        // Add the new or updated visit to the end (most recent)
        cleanedHistory.push({ path: fullPath, title });

        // Ensure the history does not exceed the max tab count by removing the oldest
        while (cleanedHistory.length > MAX_TABS) {
            cleanedHistory.shift();
        }

        localStorage.setItem(storageKey, JSON.stringify(cleanedHistory));
    }
};

const getRecentPages = (storageKey: string | null): PageVisit[] => {
    if (typeof window !== 'undefined' && window.localStorage && storageKey) {
        const history = localStorage.getItem(storageKey);
        return history ? JSON.parse(history) : [];
    }
    return [];
};

export const RecentActivities = ({ currentTitle }: { currentTitle: string }) => {
    const pathname = usePathname();
    const { user } = useAuth();
    const [recentPages, setRecentPages] = useState<PageVisit[]>([]);

    const storageKey = getStorageKey(user?.uid, user?.company_id);

    const updateHistory = useCallback(() => {
        if (storageKey) {
            trackVisit(pathname, currentTitle, storageKey);
            setRecentPages(getRecentPages(storageKey));
        }
    }, [pathname, currentTitle, storageKey]);


    useEffect(() => {
        updateHistory();

        // Also update history when the URL hash changes (for tabs)
        window.addEventListener('hashchange', updateHistory);

        return () => {
            window.removeEventListener('hashchange', updateHistory);
        };
    }, [updateHistory]);

    // Don't show tabs if there are none or only the current one
    if (recentPages.length <= 1) {
        return null;
    }

    // Display pages in reverse order so the most recent is first
    const pagesToShow = [...recentPages].reverse();

    const fullPathname = pathname + (typeof window !== 'undefined' ? window.location.hash : '');

    return (
        <div>
            <p className="text-xs text-muted-foreground mb-1">Frequent Tabs</p>
            <div className="flex items-center gap-1">
                {pagesToShow.map((page) => (
                    <Button
                        asChild
                        variant={fullPathname === page.path ? 'secondary' : 'ghost'}
                        size="sm"
                        className="h-7 px-2 text-xs"
                        key={page.path}
                    >
                        <Link href={page.path}>
                            {page.title}
                        </Link>
                    </Button>
                ))}
            </div>
        </div>
    );
};
