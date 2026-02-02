'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { allNavItems } from '@/lib/nav-items';

// ====================================
// Types & Interfaces
// ====================================

interface PageVisitRecord {
  title: string;
  count: number;
  lastVisited: number;
}

interface PageVisit {
  path: string;
  title: string;
}

interface NavItem {
  href?: string;
  label: string;
  subItems?: NavItem[];
}

// ====================================
// Constants
// ====================================

const MAX_FREQUENT_TABS = 4;
const EXCLUDED_PATHS = ['/login', '/api'];

// ====================================
// Helper Functions
// ====================================

const getStorageKey = (userId?: string, companyId?: string): string | null => {
  if (!userId || !companyId) return null;
  return `frequentPageHistory_${companyId}_${userId}`;
};

const findLabelForPath = (items: NavItem[], path: string): string | null => {
  for (const item of items) {
    if (item.href === path) {
      return item.label;
    }
    if (item.subItems) {
      const foundLabel = findLabelForPath(item.subItems, path);
      if (foundLabel) return foundLabel;
    }
  }
  return null;
};

const trackPageVisit = (
  pathname: string,
  fallbackTitle: string,
  storageKey: string | null
): void => {
  if (typeof window === 'undefined' || !storageKey) return;
  if (EXCLUDED_PATHS.some(path => pathname.startsWith(path))) return;

  const preciseTitle = findLabelForPath(allNavItems, pathname);
  const visitTitle = preciseTitle || fallbackTitle;

  if (!visitTitle || visitTitle === 'ClearBooks') return;

  try {
    const history = localStorage.getItem(storageKey);
    const parsedHistory: Record<string, PageVisitRecord> = history 
      ? JSON.parse(history) 
      : {};

    const currentTime = Date.now();

    if (parsedHistory[pathname]) {
      parsedHistory[pathname] = {
        title: visitTitle,
        count: parsedHistory[pathname].count + 1,
        lastVisited: currentTime,
      };
    } else {
      parsedHistory[pathname] = {
        title: visitTitle,
        count: 1,
        lastVisited: currentTime,
      };
    }

    localStorage.setItem(storageKey, JSON.stringify(parsedHistory));
  } catch (error) {
    console.error('Failed to track page visit:', error);
  }
};

const getFrequentPages = (storageKey: string | null): PageVisit[] => {
  if (typeof window === 'undefined' || !storageKey) return [];

  try {
    const history = localStorage.getItem(storageKey);
    const parsedHistory: Record<string, PageVisitRecord> = history 
      ? JSON.parse(history) 
      : {};

    const pages = Object.entries(parsedHistory).map(([path, data]) => ({
      path,
      title: data.title,
      ...data,
    }));

    // Sort by frequency (descending), then by recency (descending)
    pages.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.lastVisited - a.lastVisited;
    });

    return pages
      .slice(0, MAX_FREQUENT_TABS)
      .map(({ path, title }) => ({ path, title }));
  } catch (error) {
    console.error('Failed to retrieve frequent pages:', error);
    return [];
  }
};

// ====================================
// Globe Rotating Dot Component
// ====================================

const GlobeRotatingDot = () => {
  return (
    <div className="relative w-4 h-4 ml-1">
      {/* Static outer ring */}
      <div className="absolute inset-0 rounded-full border border-blue-300"></div>
      
      {/* Rotating dot that moves along the ring */}
      <div className="absolute inset-0 animate-[spin_2s_linear_infinite]">
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
        </div>
      </div>
      
      {/* Additional smaller stationary dots for globe effect */}
      <div className="absolute top-1/2 left-0 transform -translate-y-1/2 w-0.5 h-0.5 rounded-full bg-blue-300"></div>
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-0.5 h-0.5 rounded-full bg-blue-300"></div>
      <div className="absolute top-1/2 right-0 transform -translate-y-1/2 w-0.5 h-0.5 rounded-full bg-blue-300"></div>
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-0.5 h-0.5 rounded-full bg-blue-300"></div>
      
      {/* Optional: Subtle inner glow */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-50/50 to-transparent"></div>
    </div>
  );
};

// ====================================
// Main Component
// ====================================

interface RecentActivitiesProps {
  currentTitle: string;
}

export const RecentActivities = ({ currentTitle }: RecentActivitiesProps) => {
  const pathname = usePathname();
  const { user } = useAuth();
  const [frequentPages, setFrequentPages] = useState<PageVisit[]>([]);

  const storageKey = getStorageKey(user?.uid, user?.company_id);

  const updatePageHistory = useCallback(() => {
    if (!storageKey) return;
    
    trackPageVisit(pathname, currentTitle, storageKey);
    const updatedPages = getFrequentPages(storageKey);
    setFrequentPages(updatedPages);
  }, [pathname, currentTitle, storageKey]);

  useEffect(() => {
    updatePageHistory();
  }, [updatePageHistory]);

  // Don't render if no frequent pages
  if (frequentPages.length === 0) {
    return null;
  }

  return (
    <div className="px-4 py-2 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-4">
              {/* Current Page Indicator */}
              <div className="hidden md:flex items-center space-x-2">
                <div className="relative w-3 h-3">
                  <div className="absolute inset-0 rounded-full bg-blue-500"></div>
                  <div className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-75"></div>
                </div>
                <span className="text-sm font-medium text-gray-700">
                  Current: {currentTitle}
                </span>
              </div>

              {/* Frequent Tabs */}
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Quick Access
                  </span>
                  <div className="flex items-center space-x-1">
                    {frequentPages.map((page) => {
                      const isActive = pathname === page.path;
                      
                      return (
                        <Button
                          key={page.path}
                          asChild
                          variant={isActive ? 'secondary' : 'ghost'}
                          size="sm"
                          className={`
                            h-8 px-3 text-xs font-medium
                            transition-all duration-200
                            ${isActive 
                              ? 'bg-white shadow-sm border border-gray-300' 
                              : 'hover:bg-white hover:shadow-sm'
                            }
                          `}
                        >
                          <Link 
                            href={page.path} 
                            className="flex items-center space-x-2 min-w-0"
                          >
                            <span className="truncate max-w-[120px]">
                              {page.title}
                            </span>
                            {isActive && <GlobeRotatingDot />}
                          </Link>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Badge */}
          <div className="hidden lg:flex items-center">
            <div className="px-3 py-1 bg-white rounded-full border border-gray-200 shadow-sm">
              <span className="text-xs text-gray-600">
                <span className="font-semibold text-blue-600">
                  {frequentPages.length}
                </span>
                {' '}frequent tabs
              </span>
            </div>
          </div>
        </div>

        {/* Mobile View */}
        <div className="md:hidden mt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">
              Current: <span className="font-medium">{currentTitle}</span>
            </span>
            <span className="text-xs text-gray-500">
              {frequentPages.length} frequent
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};