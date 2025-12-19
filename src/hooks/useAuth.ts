'use client';

import { useState, useEffect } from 'react';

const USER_SESSION_KEY = 'user';

interface User {
    uid: string;
    email: string;
    full_name: string;
    role: string;
    user_type: string;
    company_type: string;
    company_id: string;
}

export const useAuth = () => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        try {
            const sessionData = sessionStorage.getItem(USER_SESSION_KEY);
            if (sessionData) {
                const parsedUser = JSON.parse(sessionData) as User;
                setUser(parsedUser);
            }
        } catch (error) {
            console.error("Failed to parse user session:", error);
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    return { user, isLoading };
};
