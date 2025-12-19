'use client';

import { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { getCurrentUser, logout as authLogout } from '@/lib/auth';

export interface User {
  uid: string;
  email: string;
  full_name: string;
  role: string;
  user_type: string;
  company_type: string;
  company_id: string;
}

interface UserContextType {
    user: User | null;
    isLoading: boolean;
    sessionExpired: boolean;
    logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [sessionExpired, setSessionExpired] = useState(false);

    useEffect(() => {
        const checkUser = async () => {
            if (typeof window !== 'undefined') {
                try {
                    const currentUser = await getCurrentUser();
                    setUser(currentUser as User);
                } catch (error) {
                    console.error("Failed to get current user:", error);
                    setUser(null);
                    setSessionExpired(true);
                } finally {
                    setIsLoading(false);
                }
            }
        };
        checkUser();
    }, []);

    const logout = async () => {
        await authLogout();
        setUser(null);
        setSessionExpired(true);
    };

    return (
        <UserContext.Provider value={{ user, isLoading, sessionExpired, logout }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};