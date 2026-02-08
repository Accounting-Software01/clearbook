'use client';

import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { LogIn, ShieldCheck, Lock, Home, ExternalLink, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const SessionExpired = () => {
    const router = useRouter();
    const lastSignInTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const containerRef = useRef<HTMLDivElement>(null);

    const handleSignIn = () => {
        window.location.href = '/login';
    };

    const handleGoToHomepage = () => {
        router.push('/');
    };

    // Optional: Focus trap for accessibility
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                handleGoToHomepage();
            }
            if (e.key === 'Enter' && containerRef.current?.contains(document.activeElement)) {
                handleSignIn();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <div 
            ref={containerRef}
            className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-background via-background/95 to-muted/20 p-4"
            role="dialog"
            aria-labelledby="session-expired-title"
            aria-describedby="session-expired-description"
        >
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-pulse" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-pulse delay-1000" />
            </div>

            <Card className="w-full max-w-6xl h-auto max-h-[90vh] shadow-2xl border-0 bg-gradient-to-br from-card to-card/95 backdrop-blur-sm overflow-hidden animate-in fade-in-0 zoom-in-95 duration-300">
                <CardHeader className="text-center pb-6">
                    <div className="flex flex-col items-center space-y-4">
                        <div className="flex items-center justify-center space-x-3">
                            <div className="relative">
                                <ShieldCheck className="w-10 h-10 text-primary animate-in zoom-in-50 duration-300" />
                                <CheckCircle className="absolute -bottom-1 -right-1 w-5 h-5 text-yellow-500 bg-background rounded-full animate-in zoom-in-0 duration-500 delay-300" />
                            </div>
                            <div className="text-left">
                                <h1 className="text-3xl font-bold tracking-tight">ClearBook</h1>
                                <p className="text-sm text-muted-foreground">Smart accounting for growing organizations</p>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                
                <CardContent className="flex flex-col lg:flex-row gap-8 p-6 lg:p-8">
                    {/* Left Section - Text & Actions */}
                    <div className="flex-1 flex flex-col justify-center space-y-6 lg:pr-8">
                        <div className="space-y-4">
                            <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 rounded-full bg-yellow-500 animate-ping" />
                                <CardTitle 
                                    id="session-expired-title"
                                    className="text-3xl lg:text-4xl font-bold tracking-tight"
                                >
                                    Your session has expired
                                </CardTitle>
                            </div>
                            <CardDescription 
                                id="session-expired-description"
                                className="text-base lg:text-lg text-muted-foreground leading-relaxed"
                            >
                                You have been logged out due to inactivity. Your session has been securely closed. You can sign in again anytime or return to the homepage.
                            </CardDescription>
                        </div>

                        {/* Security Summary */}
                        <div className="bg-muted/30 rounded-lg p-4 space-y-2 animate-in slide-in-from-left-5 duration-500">
                            <div className="flex items-center space-x-2">
                                <Lock className="w-4 h-4 text-green-500" />
                                <span className="text-sm font-medium">Security Summary</span>
                            </div>
                            <ul className="text-sm text-muted-foreground space-y-1 pl-6 list-disc">
                                <li>All active sessions terminated</li>
                                <li>Local browser data cleared</li>
                                <li>No data retained on this device</li>
                            </ul>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4 pt-2">
                            <Button 
                                onClick={handleSignIn} 
                                className="flex-1 h-12 text-base group transition-all duration-300 hover:scale-[1.02]"
                                size="lg"
                            >
                                <LogIn className="mr-2 h-5 w-5 transition-transform group-hover:translate-x-1" /> 
                                Sign in again
                                <ExternalLink className="ml-2 h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </Button>
                            <Button 
                                onClick={handleGoToHomepage} 
                                variant="outline" 
                                className="flex-1 h-12 text-base transition-all duration-300 hover:scale-[1.02]"
                                size="lg"
                            >
                                <Home className="mr-2 h-5 w-5" /> 
                                Go to homepage
                            </Button>
                        </div>

                        {/* Security Note */}
                        <p className="text-xs text-muted-foreground pt-2 flex items-center">
                            <Lock className="w-3 h-3 mr-1" />
                            For your security, you were automatically signed out due to inactivity.
                        </p>
                    </div>

                    {/* Right Section - Visual & Stats */}
                    <div className="flex-1 flex flex-col items-center justify-center lg:pl-8 lg:border-l border-border/50 p-6 lg:p-8 bg-gradient-to-br from-muted/5 via-transparent to-muted/5 rounded-xl">
                        {/* Animated Security Visualization */}
                        <div className="relative w-full max-w-md aspect-square mb-8">
                            {/* Outer pulsing ring */}
                            <div className="absolute inset-0 rounded-full border-2 border-dashed border-primary/10 animate-spin-slow" />
                            
                            {/* Middle security ring */}
                            <div className="absolute inset-8 rounded-full border border-primary/20 animate-spin-slow [animation-direction:reverse] [animation-duration:3s]" />
                            
                            {/* Inner pulsing circle */}
                            <div className={cn(
                                "absolute inset-16 rounded-full bg-primary/5",
                                "animate-pulse [animation-duration:2s]"
                            )} />
                            
                            {/* Lock Icon with enhanced effects */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-primary/10 blur-xl rounded-full animate-pulse" />
                                    <Lock className="relative w-24 h-24 text-primary drop-shadow-lg animate-in zoom-in-50 duration-700 delay-300" />
                                </div>
                            </div>
                            
                            {/* Floating security dots */}
                            {[...Array(6)].map((_, i) => (
                                <div
                                    key={i}
                                    className="absolute w-2 h-2 bg-primary/30 rounded-full"
                                    style={{
                                        top: `${50 + 40 * Math.sin((i * Math.PI) / 3)}%`,
                                        left: `${50 + 40 * Math.cos((i * Math.PI) / 3)}%`,
                                        animation: `float 3s ease-in-out ${i * 0.5}s infinite`
                                    }}
                                />
                            ))}
                        </div>

                        {/* Session Stats */}
                        <div className="text-center space-y-4 w-full max-w-sm">
                            <div>
                                <p className="text-lg font-semibold flex items-center justify-center gap-2">
                                    <ShieldCheck className="w-5 h-5 text-green-500" />
                                    Your data is protected
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Session securely terminated
                                </p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 pt-4">
                                <div className="bg-muted/30 rounded-lg p-3">
                                    <p className="text-xs text-muted-foreground">Last active</p>
                                    <p className="font-medium">Today at {lastSignInTime}</p>
                                </div>
                                <div className="bg-muted/30 rounded-lg p-3">
                                    <p className="text-xs text-muted-foreground">Reason</p>
                                    <p className="font-medium">Inactivity</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>

                <CardFooter className="flex flex-col items-center pt-6 pb-8 border-t border-border/50">
                    <div className="flex flex-col sm:flex-row items-center gap-4 text-sm">
                        <a 
                            href="/help/sign-in" 
                            className="text-primary hover:underline flex items-center gap-1 transition-colors"
                        >
                            Need help signing in?
                        </a>
                        <span className="hidden sm:inline text-muted-foreground">•</span>
                        <a 
                            href="/security" 
                            className="text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                        >
                            Learn about our security
                        </a>
                        <span className="hidden sm:inline text-muted-foreground">•</span>
                        <button 
                            onClick={() => window.open('https://status.clearbook.com', '_blank')}
                            className="text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                        >
                            System status
                        </button>
                    </div>
                </CardFooter>
            </Card>

            {/* Custom CSS for additional animations */}
            <style jsx global>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0) scale(1); }
                    50% { transform: translateY(-10px) scale(1.1); }
                }
                .animate-spin-slow {
                    animation: spin 20s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default SessionExpired;
