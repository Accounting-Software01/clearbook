import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth'; // We still need the user data from the main auth hook

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// This hook is designed to be used on pages where the user is already authenticated.
export function useProfileAuth() {
    const { user, setUser } = useAuth(); // Assuming useAuth provides a way to update the user context
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const updateProfile = async (fullName: string, email: string) => {
        if (!user) {
            setError('User not authenticated.');
            return { success: false, error: 'User not authenticated.' };
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_URL}/profile-actions.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'update_profile', user_id: user.id, fullName, email }),
            });
            const result = await response.json();

            if (result.success) {
                // Update user in the main context
                const updatedUser = { ...user, name: fullName, email };
                setUser(updatedUser); // This function should be exposed from your AuthProvider
                localStorage.setItem('user', JSON.stringify(updatedUser));
                setLoading(false);
                return { success: true };
            } else {
                throw new Error(result.error || 'Failed to update profile.');
            }
        } catch (err: any) {
            setLoading(false);
            setError(err.message);
            return { success: false, error: err.message };
        }
    };

    const changePassword = async (currentPassword: string, newPassword: string) => {
        if (!user) {
            setError('User not authenticated.');
            return { success: false, error: 'User not authenticated.' };
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_URL}/profile-actions.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'change_password', user_id: user.id, currentPassword, newPassword }),
            });
            const result = await response.json();

            if (result.success) {
                setLoading(false);
                return { success: true };
            } else {
                throw new Error(result.error || 'Failed to change password.');
            }
        } catch (err: any) {
            setLoading(false);
            setError(err.message);
            return { success: false, error: err.message };
        }
    };

    const updateProfilePicture = async (file: File) => {
        if (!user) {
            setError('User not authenticated.');
            return { success: false, error: 'User not authenticated.' };
        }

        setLoading(true);
        setError(null);
        const formData = new FormData();
        formData.append('action', 'update_dp');
        formData.append('user_id', String(user.id));
        formData.append('profilePic', file);

        try {
            const response = await fetch(`${API_URL}/profile-actions.php`, {
                method: 'POST',
                body: formData,
            });
            const result = await response.json();

            if (result.success && result.newImageUrl) {
                const updatedUser = { ...user, profilePicUrl: result.newImageUrl };
                setUser(updatedUser);
                localStorage.setItem('user', JSON.stringify(updatedUser));
                setLoading(false);
                return { success: true, newImageUrl: result.newImageUrl };
            } else {
                throw new Error(result.error || 'Failed to upload image.');
            }
        } catch (err: any) {
            setLoading(false);
            setError(err.message);
            return { success: false, error: err.message };
        }
    };

    return {
        loading,
        error,
        updateProfile,
        changePassword,
        updateProfilePicture,
    };
}
