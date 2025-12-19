'use client';

import { Rocket, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SubscriptionExpired = () => {
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
            <div className="text-center p-8 bg-white rounded-lg shadow-md max-w-md">
                <h1 className="text-2xl font-bold mb-2 text-red-600">Subscription Expired</h1>
                <p className="text-gray-600 mb-6">Your subscription has expired. Upgrade your plan to continue managing your business records.</p>
                <div className="flex justify-center gap-4">
                    <Button>
                        <Rocket className="w-4 h-4 mr-2" />
                        Upgrade Plan
                    </Button>
                    <Button variant="outline">
                        <Mail className="w-4 h-4 mr-2" />
                        Contact Billing Support
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default SubscriptionExpired;