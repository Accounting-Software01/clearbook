'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useProfileAuth } from '@/hooks/use-profile-auth';

// --- Helper Components ---
const Card = ({ children }: { children: React.ReactNode }) => (<div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">{children}</div>);
const CardHeader = ({ title, subtitle }: { title: string; subtitle: string }) => (<div className="p-6 border-b border-gray-200 dark:border-gray-700"><h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">{title}</h3><p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p></div>);
const CardContent = ({ children }: { children: React.ReactNode }) => (<div className="p-6 space-y-4">{children}</div>);
const CardFooter = ({ children }: { children: React.ReactNode }) => (<div className="bg-gray-50 dark:bg-gray-900/50 p-6 flex justify-end">{children}</div>);

// --- Main Profile Page ------------------------------------------------------

export default function ProfilePage() {
    const { user, isLoading: userLoading } = useAuth();
    const { loading, changePassword } = useProfileAuth();

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    if (userLoading) {
        return <div>Loading user profile...</div>; 
    }
    
    if (!user) {
        return <div>User not found. Please log in again.</div>;
    }

    const showNotification = (message: string, type: 'success' | 'error') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 5000);
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            showNotification("New passwords do not match.", 'error');
            return;
        }
        const result = await changePassword(currentPassword, newPassword);
        if (result.success) {
            showNotification('Password changed successfully!', 'success');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } else {
            showNotification(result.error || 'Failed to change password.', 'error');
        }
    };

    return (
        <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50 mb-8">Your Profile</h1>
            
            {notification && (
                <div className={`p-4 mb-4 rounded-md text-white ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
                    {notification.message}
                </div>
            )}

            <div className="space-y-8">
                {/* Profile Picture Section (Read-Only) */}
                <Card>
                    <CardHeader 
                        title="Profile Picture"
                        subtitle="Your avatar is managed by the system administrator."
                    />
                    <CardContent>
                        <div className="flex items-center gap-6">
                            <img 
                                src={'https://avatar.vercel.sh/clearbook.svg?size=120'} // Static placeholder
                                alt="Profile Picture"
                                className="w-20 h-20 rounded-full object-cover bg-gray-200"
                            />
                            <p className="text-sm text-gray-500">Profile pictures cannot be updated from this page.</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Personal Information Section (Read-Only) */}
                <Card>
                    <CardHeader 
                        title="Personal Information"
                        subtitle="This information cannot be edited."
                    />
                    <CardContent>
                         <div>
                            <Label htmlFor="fullName">Full Name</Label>
                            <Input id="fullName" value={user.full_name || ''} disabled className="mt-1"/>
                        </div>
                        <div>
                            <Label htmlFor="email">Email Address</Label>
                            <Input id="email" type="email" value={user.email || ''} disabled className="mt-1"/>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" disabled>Save Changes</Button>
                    </CardFooter>
                </Card>

                {/* Password Change Section (Functional) */}
                <Card>
                    <form onSubmit={handlePasswordChange}>
                        <CardHeader 
                            title="Change Password"
                            subtitle="For your security, choose a strong and unique password."
                        />
                        <CardContent>
                            <div>
                                <Label htmlFor="currentPassword">Current Password</Label>
                                <Input id="currentPassword" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required disabled={loading} className="mt-1"/>
                            </div>
                             <div>
                                <Label htmlFor="newPassword">New Password</Label>
                                <Input id="newPassword" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required disabled={loading} className="mt-1"/>
                            </div>
                             <div>
                                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                                <Input id="confirmPassword" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required disabled={loading} className="mt-1"/>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" disabled={loading}>{loading ? 'Updating...' : 'Update Password'}</Button>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </div>
    );
}
