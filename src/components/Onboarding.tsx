'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Building, Hospital, Factory, Users, ClipboardList, PlusCircle, LineChart, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface OnboardingProps {
  onComplete: () => void;
}

const Onboarding = ({ onComplete }: OnboardingProps) => {
  const [step, setStep] = useState(1);
  const router = useRouter();
  const { user } = useAuth();

  const handleSelectCompanyType = async (type: string) => {
    if (!user?.company_id) {
        console.error("Onboarding: No company_id found for user.");
        // Here you might want to show a toast or an error message to the user
        return;
    }
    try {
        const response = await fetch('https://hariindustries.net/api/clearbook/settings.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                company_id: user.company_id,
                updates: { company_type: type }
            })
        });

        if (!response.ok) {
            const result = await response.json().catch(() => ({}));
            throw new Error(result.message || 'Failed to set company type.');
        }

        setStep(3);
    } catch (error) {
        console.error('Failed to set company type:', error);
        // Here you might want to show a toast or an error message to the user
    }
  };

  const handleFinalStep = (path: string) => {
    router.push(path);
    onComplete();
  };

  if (step === 1) {
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
        <Card className="w-[500px] text-center p-6">
          <CardHeader>
            <CardTitle className="text-3xl font-bold">Welcome to ClearBook</CardTitle>
            <CardDescription className="text-lg pt-2">Smart accounting built for your type of business.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button size="lg" onClick={() => setStep(2)}>Get Started</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
        <Card className="w-[600px] p-4">
          <CardHeader>
            <CardTitle className="text-2xl">Choose your organization type</CardTitle>
            <CardDescription>
              So ClearBook can configure accounts, reports, and workflows automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <button
              onClick={() => handleSelectCompanyType('general')}
              className="flex flex-col items-center justify-center p-6 border rounded-lg hover:bg-muted/50 transition-colors h-full"
            >
              <Building className="h-10 w-10 mb-3 text-primary" />
              <span className="font-semibold text-center">General Business</span>
            </button>
            <button
              onClick={() => handleSelectCompanyType('hospital')}
              className="flex flex-col items-center justify-center p-6 border rounded-lg hover:bg-muted/50 transition-colors h-full"
            >
              <Hospital className="h-10 w-10 mb-3 text-primary" />
              <span className="font-semibold text-center">Hospital / Clinic</span>
            </button>
            <button
              onClick={() => handleSelectCompanyType('manufacturing')}
              className="flex flex-col items-center justify-center p-6 border rounded-lg hover:bg-muted/50 transition-colors h-full"
            >
              <Factory className="h-10 w-10 mb-3 text-primary" />
              <span className="font-semibold text-center">Manufacturing</span>
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (step === 3) {
      return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
            <Card className="w-[500px] text-center p-6">
                <CardHeader>
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <CardTitle className="text-2xl">Configuration Complete!</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="mb-6 text-muted-foreground">
                        ClearBook has created a recommended chart of accounts, tax setup, and reports for your organization.
                        You can adjust these anytime.
                    </p>
                    <Button size="lg" onClick={() => setStep(4)}>Continue</Button>
                </CardContent>
            </Card>
        </div>
      );
  }

  if (step === 4) {
    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
            <Card className="w-[500px] text-center p-6">
                <CardHeader>
                    <Users className="h-12 w-12 text-primary mx-auto mb-4" />
                    <CardTitle className="text-2xl">Set Up Your Team</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="mb-6 text-muted-foreground">
                        Create accounts for your team and assign roles based on their responsibilities. You can do this later from the settings menu.
                    </p>
                </CardContent>
                <CardFooter className="flex justify-center gap-4">
                    <Button size="lg" onClick={() => handleFinalStep('/admin/register-user')}>Add Users</Button>
                    <Button size="lg" variant="outline" onClick={() => setStep(5)}>Skip for Now</Button>
                </CardFooter>
            </Card>
        </div>
    );
  }

  if (step === 5) {
      return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
            <Card className="w-[600px] p-4">
                <CardHeader>
                    <CardTitle className="text-2xl">What would you like to do first?</CardTitle>
                    <CardDescription>Choose one of the common actions below to get started.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                     <Button variant="outline" className="h-auto justify-start p-4 text-left" onClick={() => handleFinalStep('/customers')}>
                        <PlusCircle className="mr-4 h-6 w-6 text-primary" />
                        <div>
                            <p className="font-semibold text-base">Add Customers</p>
                            <p className="font-normal text-sm text-muted-foreground">Start building your customer list.</p>
                        </div>
                    </Button>
                     <Button variant="outline" className="h-auto justify-start p-4 text-left" onClick={() => handleFinalStep('/inventory')}>
                        <ClipboardList className="mr-4 h-6 w-6 text-primary" />
                         <div>
                            <p className="font-semibold text-base">Add Inventory</p>
                            <p className="font-normal text-sm text-muted-foreground">Begin tracking your products or materials.</p>
                        </div>
                    </Button>
                     <Button variant="outline" className="h-auto justify-start p-4 text-left" onClick={() => handleFinalStep('/journal')}>
                        <PlusCircle className="mr-4 h-6 w-6 text-primary" />
                         <div>
                            <p className="font-semibold text-base">Record a Transaction</p>
                            <p className="font-normal text-sm text-muted-foreground">Post a manual journal entry.</p>
                        </div>
                    </Button>
                     <Button variant="outline" className="h-auto justify-start p-4 text-left" onClick={() => handleFinalStep('/profit-loss')}>
                        <LineChart className="mr-4 h-6 w-6 text-primary" />
                         <div>
                            <p className="font-semibold text-base">Generate a Report</p>
                            <p className="font-normal text-sm text-muted-foreground">View your financial statements.</p>
                        </div>
                    </Button>
                </CardContent>
                 <CardFooter className="pt-4">
                    <Button variant="ghost" onClick={onComplete}>Skip for now</Button>
                </CardFooter>
            </Card>
        </div>
      );
  }


  return null;
};

export default Onboarding;
