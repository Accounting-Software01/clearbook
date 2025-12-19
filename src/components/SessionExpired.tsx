
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { LogIn, ShieldCheck, Lock } from 'lucide-react';

const SessionExpired = () => {
    const router = useRouter();

    const handleSignIn = () => {
        window.location.href = '/login';
    };

    const handleGoToHomepage = () => {
        router.push('/');
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <Card className="w-[800px] shadow-2xl flex flex-col">
                <CardHeader className="text-center">
                    <div className="flex justify-center items-center mb-4">
                        <ShieldCheck className="w-8 h-8 mr-2 text-primary" />
                        <div>
                            <h1 className="text-2xl font-bold">ClearBook</h1>
                            <p className="text-sm text-muted-foreground">Smart accounting for growing organizations</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="flex-grow flex">
                    <div className="w-1/2 pr-8 flex flex-col justify-center">
                        <CardTitle className="text-3xl font-bold mb-4">You’ve logged out successfully</CardTitle>
                        <CardDescription className="mb-6">
                            Your ClearBook session has been securely closed. You can sign in again anytime or return to the homepage.
                        </CardDescription>
                        <div className="flex space-x-4">
                            <Button onClick={handleSignIn} className="w-full">
                                <LogIn className="mr-2 h-4 w-4" /> Sign in again
                            </Button>
                            <Button onClick={handleGoToHomepage} variant="outline" className="w-full">
                                Go to homepage
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-4">For your security, all active sessions were closed.</p>
                    </div>
                    <div className="w-1/2 pl-8 border-l flex flex-col items-center justify-center bg-gradient-to-br from-muted/5 to-muted/20 rounded-r-lg p-8">
                        <div className="relative flex items-center justify-center w-56 h-56">
                            {/* Pulsing circle */}
                            <div className="absolute w-full h-full rounded-full bg-primary/5 animate-pulse"></div>
                            {/* Slow spinning dashed circle */}
                            <div className="absolute w-full h-full rounded-full border-2 border-dashed border-primary/30 animate-spin-slow"></div>
                            {/* Fast spinning inner circle */}
                            <div className="absolute w-3/4 h-3/4 rounded-full border border-primary/20 animate-spin-slow [animation-direction:reverse] [animation-duration:2s]"></div>
                            
                            {/* Lock Icon with glow effect */}
                            <div className="relative">
                                <Lock className="absolute top-0 left-0 w-24 h-24 text-primary blur-md opacity-75" />
                                <Lock className="relative w-24 h-24 text-primary" />
                            </div>
                        </div>
                        <p className="text-lg font-semibold mt-8 text-center">Your data is safe.</p>
                        <p className="text-sm text-muted-foreground mt-2">Last signed in: Today at 7:42 PM</p>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-center flex-col items-center pt-6">
                    <a href="#" className="text-sm text-primary hover:underline">Need help signing in?</a>
                </CardFooter>
            </Card>
        </div>
    );
};

export default SessionExpired;
