"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getLanguageMapping, Language } from '@/lib/contextual-language';
import { useUser } from './UserContext'; // Correctly using useUser from UserContext

interface LanguageContextType {
    language: Language | null;
    companyType: string | null;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
    const { user } = useUser();
    const companyType = user?.company_type || 'hospital'; // Default to 'hospital' if not available

    const [language, setLanguage] = useState<Language | null>(() => getLanguageMapping(companyType));

    useEffect(() => {
        if (user?.company_type) {
            setLanguage(getLanguageMapping(user.company_type));
        }
    }, [user?.company_type]);

    return (
        <LanguageContext.Provider value={{ language, companyType }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = (): LanguageContextType => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
