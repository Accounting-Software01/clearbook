
'use client';
import Link from 'next/link';
import { Library, ArrowLeft } from 'lucide-react';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
    children: React.ReactNode;
    title: string;
    description: string;
}

export function AppLayout({ children, title, description }: AppLayoutProps) {
    const router = useRouter();
    const [isMaximized, setIsMaximized] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            router.push('/');
        }, 300); // Match animation duration
    };

    const handleMaximize = () => {
        setIsMaximized(!isMaximized);
    };

    return (
        <div className={cn(
            "min-h-screen bg-background/80 backdrop-blur-sm p-4 sm:p-6 lg:p-8 flex items-center justify-center transition-all duration-300",
            isMaximized ? "p-0" : ""
        )}>
            <div className={cn(
                "w-full transition-all duration-500 ease-in-out",
                isMaximized ? "h-screen" : "max-w-6xl",
                isClosing ? "animate-zoom-out-fade" : "animate-zoom-in-fade"
            )}>
                <Card className={cn("overflow-hidden w-full h-full flex flex-col transition-all duration-500 ease-in-out shadow-2xl", isMaximized ? "rounded-none" : "rounded-lg max-h-[90vh]")}>
                    <CardHeader className="flex flex-row items-center justify-between bg-muted/50 p-4 border-b">
                        <div className="flex items-center gap-2">
                           <div className="flex items-center gap-1.5">
                                <button onClick={handleClose} className="h-3 w-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors"></button>
                                <button onClick={handleClose} className="h-3 w-3 rounded-full bg-yellow-500 hover:bg-yellow-600 transition-colors"></button>
                                <button onClick={handleMaximize} className="h-3 w-3 rounded-full bg-green-500 hover:bg-green-600 transition-colors"></button>
                           </div>
                            <div className="flex items-center gap-2 ml-4">
                                <Library className="h-5 w-5 text-primary" />
                                <h1 className="text-base font-semibold">{title}</h1>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 flex-grow overflow-y-auto">
                        <p className="text-muted-foreground mb-6">{description}</p>
                        <main>{children}</main>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
