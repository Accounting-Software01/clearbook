'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';


const useUser = () => {
    const [user, setUser] = useState<{ uid: string } | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Simulate checking for a user session.
        const checkUser = async () => {
            const currentUser = await getCurrentUser();
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

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
