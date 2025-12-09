
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
import { Library } from 'lucide-react';

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background/80 backdrop-blur-sm p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl animate-zoom-in-fade">
        <Card className="overflow-hidden rounded-lg shadow-2xl">
          <CardHeader className="flex flex-row items-center gap-2 bg-muted/50 p-4 border-b">
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full bg-red-500"></div>
              <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
              <div className="h-3 w-3 rounded-full bg-green-500"></div>
            </div>
          </CardHeader>
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="p-8 bg-muted/50 hidden md:flex flex-col justify-center items-center text-center">
              <Library className="h-12 w-12 text-primary mb-4" />
              <h2 className="text-2xl font-bold">Accounting Hub</h2>
              <p className="text-muted-foreground mt-2">
                Your comprehensive financial command center.
              </p>
            </div>
            <div className="p-8">
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold">Welcome Back</h1>
                <p className="text-muted-foreground">
                  Enter your credentials to access your account.
                </p>
              </div>
              <CardContent className="p-0">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <div className="flex items-center">
                      <Label htmlFor="password">Password</Label>
                    </div>
                    <Input id="password" type="password" required />
                  </div>
                  <Button type="submit" className="w-full">
                    Login
                  </Button>
                </div>
                <div className="mt-4 text-center text-sm">
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
