'use client';

import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { getCurrentUser, login as apiLogin, logout as apiLogout } from '@/lib/auth';

// Define a user type that matches your application's user object
interface User {
    uid: string;
    email: string;
    full_name: string;
    role: string;
    user_type: string;
    company_type: string;
    company_id: string;
    permissions?: string[]; // <-- This will now store combined permissions
}

// Define the shape of the authentication context
interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (email: string, pass: string) => Promise<void>;
    logout: () => Promise<void>;
}

// Create the authentication context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Define the props for the AuthProvider component
interface AuthProviderProps {
    children: ReactNode;
}

/**
 * Fetches combined permissions (role-based and user-specific) for a given user.
 */
const fetchCombinedPermissions = async (userId: string, companyId: string): Promise<string[]> => {
    try {
        const response = await fetch(`https://hariindustries.net/api/clearbook/get_user_permissions.php?user_id=${userId}&company_id=${companyId}`);
        if (!response.ok) return [];
        const data = await response.json();
        if (data.success) {
            // Combine role and user permissions, ensuring no duplicates
            return [...new Set([...(data.role_permissions || []), ...(data.user_permissions || [])])];
        }
        return [];
    } catch (error) {
        console.error("Failed to fetch combined permissions:", error);
        return [];
    }
};

/**
 * The AuthProvider component wraps the application and provides
 * the authentication context to all child components.
 */
export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkUser = async () => {
            let sessionUser = await getCurrentUser();
            if (sessionUser) {
                // Fetch combined permissions and add them to the user object
                const permissions = await fetchCombinedPermissions(sessionUser.uid, sessionUser.company_id);
                sessionUser = { ...sessionUser, permissions };
                setUser(sessionUser);
            }
            setIsLoading(false);
        };

        checkUser();
    }, []);

    const login = async (email: string, pass: string) => {
        let loggedInUser = await apiLogin(email, pass);
        if (loggedInUser) {
            // Fetch combined permissions and add them to the user object before setting the state
            const permissions = await fetchCombinedPermissions(loggedInUser.uid, loggedInUser.company_id);
            loggedInUser = { ...loggedInUser, permissions };
            setUser(loggedInUser);
        }
    };

    const logout = async () => {
        await apiLogout();
        setUser(null);
    };

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
 */
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};