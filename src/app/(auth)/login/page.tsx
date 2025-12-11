
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Library, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { login } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      await login('test@example.com', 'password');
      toast({
        title: 'Login Successful',
        description: 'Welcome back!',
      });
      router.push('/dashboard');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl">
        <Card className="overflow-hidden rounded-lg shadow-2xl bg-card/80 backdrop-blur-xl border border-white/10">
          <CardHeader className="flex flex-row items-center gap-2 p-4 border-b border-white/20">
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full bg-red-500"></div>
              <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
              <div className="h-3 w-3 rounded-full bg-green-500"></div>
            </div>
          </CardHeader>
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div
              className="relative p-8 bg-cover bg-center hidden md:flex flex-col justify-center items-center text-center text-white"
              style={{ backgroundImage: "url('/login-bg.png')" }}
            >
              <div className="absolute inset-0 bg-black/50" />
              <div className="relative z-10">
                  <Library className="h-12 w-12 text-white mb-4 mx-auto" />
                  <h2 className="text-2xl font-bold">ClearBooks</h2>
                  <p className="text-white/80 mt-2">
                    Your comprehensive financial command center.
                  </p>
              </div>
            </div>
            <div className="p-8">
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold">Welcome Back</h1>
                <p className="text-muted-foreground">
                  Enter your credentials to access your account.
                </p>
              </div>
              <CardContent className="p-0">
                <form onSubmit={handleSubmit}>
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="name@example.com"
                        required
                        defaultValue="test@example.com"
                      />
                    </div>
                    <div className="grid gap-2">
                      <div className="flex items-center">
                        <Label htmlFor="password">Password</Label>
                      </div>
                      <Input id="password" type="password" required defaultValue="password" />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Login
                    </Button>
                  </div>
                </form>
                <div className="mt-4 text-center text-sm">
                This site is protected by reCAPTCHA and the Google Privacy Policy and Terms of Service apply.
                  Don&apos;t have an account?{' '}
                  <Link href="/signup" className="underline">
                    Sign up
                  </Link>
                </div>
              </CardContent>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
