'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, ShieldAlert, Library } from 'lucide-react';

interface CurrentUser {
    uid: string;
    email: string;
    full_name: string;
    role: string;
    user_type: string;
    company_type: string;
    company_id: string;
}

export default function RegisterUserPage() {
    const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();
    const { toast } = useToast();

    // Form state
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('');

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const user = await getCurrentUser();
                if (user?.role !== 'admin_manager') {
                    setCurrentUser(null);
                } else {
                    setCurrentUser(user as CurrentUser);
                }
            } catch (error) {
                console.error("Failed to fetch user", error);
                setCurrentUser(null);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUser();
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) {
            toast({ title: "Error", description: "Not authorized.", variant: 'destructive' });
            return;
        }
        if (!fullName || !email || !password || !role) {
            toast({ title: "Validation Error", description: "Please fill all fields.", variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);
        const formData = new FormData();
        formData.append('full_name', fullName);
        formData.append('email', email);
        formData.append('password', password);
        formData.append('role', role);
        formData.append('user_type', currentUser.user_type);
        formData.append('company_type', currentUser.company_type);
        formData.append('company_id', currentUser.company_id);

        try {
            const response = await fetch('https://hariindustries.net/busa-api/database/create_user.php', {
                method: 'POST',
                body: formData,
            });
            const result = await response.json();
            if (result.success) {
                toast({ title: "Success!", description: "New user registered.", });
                setFullName('');
                setEmail('');
                setPassword('');
                setRole('');
            } else {
                toast({ title: "Registration Failed", description: result.error, variant: 'destructive' });
            }
        } catch (error) {
            toast({ title: "Network Error", description: "Could not connect to the server.", variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const allRoles = [
        { value: "accountant", label: "Accountant" },
        { value: "production_manager", label: "Production Manager" },
        { value: "store_manager", label: "Store Manager" },
        { value: "procurement_manager", label: "Procurement Manager" },
        { value: "sales_manager", label: "Sales Manager" },
    ];

    const availableRoles = currentUser?.company_type === 'manufacturing'
        ? allRoles
        : allRoles.filter(r => ['accountant', 'procurement_manager'].includes(r.value));

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin" /></div>;
    }

    if (!currentUser) {
        return (
            <div className="flex flex-col justify-center items-center h-screen bg-red-50 text-red-800">
                <ShieldAlert className="h-16 w-16 mb-4" />
                <h1 className="text-2xl font-bold">Access Denied</h1>
                <p className="mt-2">You do not have permission to view this page.</p>
                <Button variant="outline" className="mt-6" onClick={() => router.push('/')}>Go to Dashboard</Button>
            </div>
        );
    }

    return (
        <div className="w-full lg:grid lg:grid-cols-2 h-screen">
            <div className="overflow-y-auto">
                 <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                    <div className="w-full max-w-md space-y-8">
                        <div>
                            <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50">Create a New User Account</h2>
                            <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
                                Fill in the details below to register a new manager.
                            </p>
                        </div>
                        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                            <div className="space-y-4 rounded-md shadow-sm">
                                <div>
                                    <Label htmlFor="fullName">Full Name</Label>
                                    <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g., John Doe" required className="mt-1"/>
                                </div>
                                <div>
                                    <Label htmlFor="email">Email Address</Label>
                                    <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="e.g., manager@example.com" required className="mt-1"/>
                                </div>
                                <div>
                                    <Label htmlFor="password">Password</Label>
                                    <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter a strong password" required className="mt-1"/>
                                </div>
                                <div>
                                    <Label htmlFor="role">User Role</Label>
                                    <Select onValueChange={setRole} value={role}>
                                        <SelectTrigger id="role" className="mt-1">
                                            <SelectValue placeholder="Select a role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableRoles.map(role => (
                                                <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div>
                                <Button type="submit" className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
                                    <UserPlus className="mr-2"/>
                                    Create User Account
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            <div className="hidden lg:flex relative flex-col items-center justify-center p-12 text-center sticky top-0 h-screen" style={{ backgroundImage: 'url(/login-bg.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                <div className="absolute inset-0 bg-black/50 z-0"></div>
                 <div className="relative z-10 shrink-0">
                    <Library className="h-16 w-16 text-white mb-6 mx-auto" />
                    <h1 className="text-4xl font-bold text-white">Empower Your Team</h1>
                    <p className="text-white/80 mt-4 text-lg max-w-md">
                        Create accounts for your managers and assign roles to streamline your business operations from a single, secure hub.
                    </p>
                </div>
            </div>
        </div>
    );
}
