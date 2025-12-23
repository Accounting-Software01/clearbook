'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface PageVisit {
    path: string;
    title: string;
}

const MAX_TABS = 5;

const trackVisit = (path: string, title: string) => {
    if (typeof window !== 'undefined' && window.localStorage) {
        // Don't track visits to login, API routes, or pages without a proper title
        if (path.startsWith('/login') || path.startsWith('/api') || !title || title === 'ClearBooks') {
            return;
        }

        const history = localStorage.getItem('pageHistory');
        let parsedHistory: PageVisit[] = history ? JSON.parse(history) : [];

        // Remove any existing instance of the page to update its position
        const cleanedHistory = parsedHistory.filter(p => p.path !== path);

        // Add the new or updated visit to the end (most recent)
        cleanedHistory.push({ path, title });

        // Ensure the history does not exceed the max tab count by removing the oldest
        while (cleanedHistory.length > MAX_TABS) {
            cleanedHistory.shift();
        }

        localStorage.setItem('pageHistory', JSON.stringify(cleanedHistory));
    }
};

const getRecentPages = (): PageVisit[] => {
    if (typeof window !== 'undefined' && window.localStorage) {
        const history = localStorage.getItem('pageHistory');
        return history ? JSON.parse(history) : [];
    }
    return [];
};

export const RecentActivities = ({ currentTitle }: { currentTitle: string }) => {
    const pathname = usePathname();
    const [recentPages, setRecentPages] = useState<PageVisit[]>([]);

    useEffect(() => {
        trackVisit(pathname, currentTitle);
        setRecentPages(getRecentPages());
    }, [pathname, currentTitle]);

    // Don't show tabs if there are none or only the current one
    if (recentPages.length <= 1) {
        return null;
    }

    // Display pages in reverse order so the most recent is first
    const pagesToShow = [...recentPages].reverse();

    return (
        <div>
            <p className="text-xs text-muted-foreground mb-1">Frequent Tabs</p>
            <div className="flex items-center gap-1">
                {pagesToShow.map((page) => (
                    <Button
                        asChild
                        variant={pathname === page.path ? 'secondary' : 'ghost'}
                        size="sm"
                        className="h-7 px-2 text-xs" // Made buttons smaller
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
