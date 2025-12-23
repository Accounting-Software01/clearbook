'use client';

import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { getCurrentUser, login as apiLogin, logout as apiLogout } from '@/lib/auth'; // Corrected import

// Define a user type that matches your application's user object
interface User {
    uid: string;
    email: string;
    full_name: string;
    role: string;
    user_type: string;
    company_type: string;
    company_id: string;
}

// Define the shape of the authentication context
interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (email: string, pass: string) => Promise<void>;
    logout: () => Promise<void>;
}

// Create the authentication context with a default undefined value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Define the props for the AuthProvider component
interface AuthProviderProps {
    children: ReactNode;
}

/**
 * The AuthProvider component wraps the application and provides
 * the authentication context to all child components.
 */
export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkUser = async () => {
            const sessionUser = await getCurrentUser();
            if (sessionUser) {
                setUser(sessionUser);
            }
            setIsLoading(false);
        };

        checkUser();
    }, []);

    const login = async (email: string, pass: string) => {
        const loggedInUser = await apiLogin(email, pass);
        setUser(loggedInUser);
    };

    const logout = async () => {
        await apiLogout();
        setUser(null);
    };

    // The value provided to the context consumers
    const value = {
        user,
        isLoading,
        login,
        logout,
    };

    return React.createElement(AuthContext.Provider, { value: value }, children);
}

/**
 * A custom hook to easily access the authentication context.
 * Throws an error if used outside of an AuthProvider.
 */
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
