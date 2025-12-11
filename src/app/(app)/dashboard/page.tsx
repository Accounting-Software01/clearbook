
'use client';

import React from 'react';
import { CardDescription, CardTitle } from "@/components/ui/card";


export default function DashboardPage() {
  return (
    <>
       <div className="flex flex-col items-center justify-center h-full text-center">
            <CardTitle className="text-2xl mb-2">Welcome to ClearBooks</CardTitle>
            <CardDescription>
                You can manage all your accounting tasks from here. Use the sidebar to navigate to different sections of the application.
            </CardDescription>
        </div>
    </>
  );
}
