
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

export default function SignupPage() {
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
                Create an account to manage your finances.
              </p>
            </div>
            <div className="p-8">
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold">Create an Account</h1>
                    <p className="text-muted-foreground">
                    Enter your information to get started.
                    </p>
                </div>
                <CardContent className="p-0">
                    <div className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="full-name">Full Name</Label>
                        <Input id="full-name" placeholder="John Doe" required />
                    </div>
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
                        <Label htmlFor="password">Password</Label>
                        <Input id="password" type="password" required />
                    </div>
                    <Button type="submit" className="w-full">
                        Create Account
                    </Button>
                    </div>
                    <div className="mt-4 text-center text-xs text-muted-foreground space-y-2">
                      <p>
                        By creating an account, you agree to the{' '}
                        <Link href="#" className="underline">
                          terms & conditions
                        </Link>{' '}
                        and our{' '}
                        <Link href="#" className="underline">
                          privacy policy
                        </Link>
                        .
                      </p>
                      <p>
                        This site is protected by reCAPTCHA and the Google{' '}
                        <Link href="#" className="underline">
                          Privacy Policy
                        </Link>{' '}
                        and{' '}
                        <Link href="#" className="underline">
                          Terms of Service
                        </Link>{' '}
                        apply.
                      </p>
                       <p className="text-sm pt-2">
                        Already using Accounting Hub?{' '}
                        <Link href="/login" className="underline font-semibold">
                            Sign in here
                        </Link>
                      </p>
                    </div>
                </CardContent>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
