'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';


// Define a user type that matches the data from session storage
interface User {
    id: string;
    [key: string]: any;
}

const useUser = () => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // getUser is synchronous, so no need for async/await.
        const checkUser = () => {
            
            const currentUser = getCurrentUser();
            setUser(currentUser);
            setIsLoading(false);
        }
        checkUser();
    }, []);

    return { user, isLoading };
};


export default function RootPage() {
  const { user, isLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [isLoading, user, router]);

  // Render a loading spinner while checking auth state to prevent flash of content
  return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  );
}