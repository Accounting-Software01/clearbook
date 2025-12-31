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
    permissions?: string[]; // <-- ADDED: To store user's module permissions
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
 * Fetches permissions for a given role and company type.
 */
const fetchPermissions = async (role: string, company_type: string): Promise<string[]> => {
    try {
        const response = await fetch(`https://hariindustries.net/api/clearbook/get_role_permissions.php?role=${role}&company_type=${company_type}`);
        if (!response.ok) return [];
        const data = await response.json();
        if (data.success && Array.isArray(data.permissions)) {
            // Extract the permission string from each object
            return data.permissions.map((p: { permission: string }) => p.permission);
        }
        return [];
    } catch (error) {
        console.error("Failed to fetch permissions:", error);
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
                // Fetch permissions and add them to the user object
                const permissions = await fetchPermissions(sessionUser.role, sessionUser.company_type);
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
            // Fetch permissions and add them to the user object before setting the state
            const permissions = await fetchPermissions(loggedInUser.role, loggedInUser.company_type);
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
