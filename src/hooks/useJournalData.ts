
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
    getJournalSettings,
    getPayees,
    getJournalVouchers,
    type JournalSettings,
    type JournalVoucher,
} from '@/lib/api';
import type { Payee } from '@/types/payee';

export const useJournalData = () => {
    const { user, isLoading: isUserLoading } = useAuth();
    const companyId = user?.company_id;
    const userId = user?.id;

    const [settings, setSettings] = useState<JournalSettings | null>(null);
    const [allPayees, setAllPayees] = useState<Payee[]>([]);
    const [journalVouchers, setJournalVouchers] = useState<JournalVoucher[]>([]);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [initialLoadError, setInitialLoadError] = useState<string | null>(null);

    const fetchJournalData = useCallback(async () => {
        if (!companyId || !userId) return;

        setIsInitialLoading(true);
        setInitialLoadError(null);

        try {
            const [settingsData, payeesData, vouchersData] = await Promise.all([
                getJournalSettings(companyId, userId),
                getPayees(companyId, userId),
                getJournalVouchers(companyId, userId),
            ]);

            setSettings(settingsData);
            setAllPayees(payeesData);
            setJournalVouchers(vouchersData);
        } catch (error: any) {
            setInitialLoadError(error.message || 'Failed to load essential data. Please try again.');
        } finally {
            setIsInitialLoading(false);
        }
    }, [companyId, userId]);

    useEffect(() => {
        if (user && !isUserLoading) {
            fetchJournalData();
        }
    }, [user, isUserLoading, fetchJournalData]);

    return {
        settings,
        allPayees,
        journalVouchers,
        isInitialLoading,
        initialLoadError,
        fetchJournalData,
        companyId,
        userId,
    };
};
