'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { chartOfAccounts } from '@/lib/chart-of-accounts';
import { Loader2 } from 'lucide-react';

// --- TYPES ---
interface SupplierData {
    // Step 1
    name: string;
    type: 'individual' | 'business';
    contact_person: string;
    phone: string;
    email: string;
    status: 'active' | 'inactive';
    // Step 2
    country: string;
    state: string;
    city: string;
    address: string;
    // Step 3
    ap_account_id: string;
    currency: string;
    payment_terms: 'immediate' | '7' | '14' | '30' | 'custom';
     // Step 4
    vat_registered: 'yes' | 'no';
    vat_number: string;
    wht_applicable: 'yes' | 'no';
    // Step 5
    bank_name: string;
    account_name: string;
    account_number: string;
    preferred_payment_method: 'bank_transfer' | 'cash' | 'cheque';
}

interface SupplierSaveResponse {
    success: boolean;
    message: string;
    supplier_id?: string;
}

interface SupplierRegistrationWizardProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    onComplete: (supplierId?: string, supplierName?: string) => void;
}

const STEPS = [
    { id: 1, title: 'Basic Information' },
    { id: 2, title: 'Address & Location' },
    { id: 3, title: 'Financial & Accounting Setup' },
    { id: 4, title: 'Tax & Compliance' },
    { id: 5, title: 'Banking & Payment Details' },
    { id: 6, title: 'Review & Confirm' },
];

const apAccounts = chartOfAccounts.filter(acc => acc.code.startsWith('2010'));

export function SupplierRegistrationWizard({ isOpen, onOpenChange, onComplete }: SupplierRegistrationWizardProps) {
    const { toast } = useToast();
    const { user } = useAuth();
    const [currentStep, setCurrentStep] = useState(1);
    const [isSaving, setIsSaving] = useState(false);

    const [supplierData, setSupplierData] = useState<Partial<SupplierData>>({
        name: '',
        type: 'business',
        contact_person: '',
        phone: '',
        email: '',
        status: 'active',
        country: 'Nigeria',
        state: '',
        city: '',
        address: '',
        ap_account_id: '201020',
        currency: 'NGN',
        payment_terms: 'immediate',
        vat_registered: 'no',
        vat_number: '',
        wht_applicable: 'no',
        bank_name: '',
        account_name: '',
        account_number: '',
        preferred_payment_method: 'bank_transfer',
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const isNumber = type === 'number';
        setSupplierData(prev => ({ ...prev, [name]: isNumber ? Number(value) : value }));
    };

    const handleSelectChange = (name: keyof SupplierData, value: string) => {
        setSupplierData(prev => ({ ...prev, [name]: value as any }));
    };

    const handleRadioGroupChange = (name: keyof SupplierData, value: string) => {
        setSupplierData(prev => ({ ...prev, [name]: value as any }));
    };


    const nextStep = () => currentStep < STEPS.length && setCurrentStep(prev => prev + 1);
    const prevStep = () => currentStep > 1 && setCurrentStep(prev => prev - 1);
    const goToStep = (step: number) => step >= 1 && step <= STEPS.length && setCurrentStep(step);

    const handleSave = async () => {
       if (!user || !user.uid || !user.company_id) {
            toast({
                title: "Authentication Error",
                description: "Your user session is invalid. Please log out and log back in.",
                variant: "destructive"
            });
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                ...supplierData,
                company_id: user.company_id,
                user_id: user.uid,
            };

            const result = await api<SupplierSaveResponse>('supplier.php', {
                method: 'POST',
                body: JSON.stringify(payload),
            });

            toast({ title: "Success", description: result.message || 'Supplier created successfully!' });
            onComplete(result.supplier_id, supplierData.name);
        } catch (error: any) {
            toast({ title: "Save Failed", description: error.message || "An unknown error occurred.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const isStep1Valid = supplierData.name && supplierData.phone;

    const renderStepContent = () => {
        switch (currentStep) {
            case 1: // Basic Information
                return (
                     <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Supplier Name <span className="text-red-500">*</span></Label>
                                <Input id="name" name="name" value={supplierData.name} onChange={handleInputChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="type">Supplier Type</Label>
                                <Select name="type" value={supplierData.type} onValueChange={(value) => handleSelectChange('type', value)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="business">Company / Business</SelectItem>
                                        <SelectItem value="individual">Individual</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <Label htmlFor="contact_person">Contact Person</Label>
                                <Input id="contact_person" name="contact_person" value={supplierData.contact_person} onChange={handleInputChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone Number <span className="text-red-500">*</span></Label>
                                <Input id="phone" name="phone" value={supplierData.phone} onChange={handleInputChange} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input id="email" name="email" type="email" value={supplierData.email} onChange={handleInputChange} />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="status">Supplier Status</Label>
                                <Select name="status" value={supplierData.status} onValueChange={(value) => handleSelectChange('status', value)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                );
            case 2: // Address & Location
                return (
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="country">Country</Label>
                                <Input id="country" name="country" value={supplierData.country} onChange={handleInputChange} />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="state">State</Label>
                                <Input id="state" name="state" value={supplierData.state} onChange={handleInputChange} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="city">City</Label>
                            <Input id="city" name="city" value={supplierData.city} onChange={handleInputChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="address">Address Line</Label>
                            <Textarea id="address" name="address" value={supplierData.address} onChange={handleInputChange} />
                        </div>
                    </div>
                );
            case 3: // Financial & Accounting Setup
                 return (
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="ap_account_id">Payable Account</Label>
                                <Select name="ap_account_id" value={supplierData.ap_account_id} onValueChange={(value) => handleSelectChange('ap_account_id', value)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {apAccounts.map(acc => <SelectItem key={acc.code} value={acc.code}>{acc.code} - {acc.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="currency">Currency</Label>
                                <Select name="currency" value={supplierData.currency} onValueChange={(value) => handleSelectChange('currency', value)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="NGN">NGN - Nigerian Naira</SelectItem>
                                        <SelectItem value="USD">USD - US Dollar</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2 pt-4 mt-4 border-t">
                            <Label htmlFor="payment_terms">Payment Terms</Label>
                            <Select name="payment_terms" value={supplierData.payment_terms} onValueChange={(value) => handleSelectChange('payment_terms', value)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="immediate">Immediate</SelectItem>
                                    <SelectItem value="7">7 Days</SelectItem>
                                    <SelectItem value="14">14 Days</SelectItem>
                                    <SelectItem value="30">30 Days</SelectItem>
                                    <SelectItem value="custom">Custom</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                );
            case 4: // Tax & Compliance
                 return (
                     <div className="grid gap-6 py-4">
                         <div className="space-y-3">
                             <Label>VAT Registered?</Label>
                            <RadioGroup name="vat_registered" value={supplierData.vat_registered} onValueChange={(value) => handleRadioGroupChange('vat_registered', value)} className="flex space-x-4">
                                <div className="flex items-center space-x-2"><RadioGroupItem value="yes" id="vat-yes" /><Label htmlFor="vat-yes">Yes</Label></div>
                                <div className="flex items-center space-x-2"><RadioGroupItem value="no" id="vat-no" /><Label htmlFor="vat-no">No</Label></div>
                             </RadioGroup>
                         </div>
                        {supplierData.vat_registered === 'yes' && (
                            <div className="space-y-2">
                                <Label htmlFor="vat_number">VAT Number</Label>
                                <Input id="vat_number" name="vat_number" value={supplierData.vat_number} onChange={handleInputChange} />
                            </div>
                        )}
                         <div className="space-y-3 border-t pt-4">
                             <Label>Withholding Tax Applicable?</Label>
                             <RadioGroup name="wht_applicable" value={supplierData.wht_applicable} onValueChange={(value) => handleRadioGroupChange('wht_applicable', value)} className="flex space-x-4">
                                 <div className="flex items-center space-x-2"><RadioGroupItem value="yes" id="wht-yes" /><Label htmlFor="wht-yes">Yes</Label></div>
                                 <div className="flex items-center space-x-2"><RadioGroupItem value="no" id="wht-no" /><Label htmlFor="wht-no">No</Label></div>
                             </RadioGroup>
                         </div>
                    </div>
                );
            case 5: // Banking & Payment Details
                return (
                    <div className="grid gap-4 py-4">
                         <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="bank_name">Bank Name</Label>
                                <Input id="bank_name" name="bank_name" value={supplierData.bank_name} onChange={handleInputChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="account_name">Account Name</Label>
                                <Input id="account_name" name="account_name" value={supplierData.account_name} onChange={handleInputChange} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="account_number">Account Number</Label>
                            <Input id="account_number" name="account_number" value={supplierData.account_number} onChange={handleInputChange} />
                        </div>
                        <div className="space-y-2 pt-4 mt-4 border-t">
                            <Label htmlFor="preferred_payment_method">Preferred Payment Method</Label>
                            <Select name="preferred_payment_method" value={supplierData.preferred_payment_method} onValueChange={(value) => handleSelectChange('preferred_payment_method', value)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                    <SelectItem value="cash">Cash</SelectItem>
                                    <SelectItem value="cheque">Cheque</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                );
            case 6: // Review & Confirm
                return (
                    <div className="space-y-6 py-4">
                        <div className="flex justify-between items-center">
                           <h4 className="font-medium">Basic Information</h4>
                           <Button variant="link" onClick={() => goToStep(1)}>Edit</Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div><p className="text-muted-foreground">Name:</p> <p>{supplierData.name}</p></div>
                            <div><p className="text-muted-foreground">Phone:</p> <p>{supplierData.phone}</p></div>
                            <div><p className="text-muted-foreground">Email:</p> <p>{supplierData.email}</p></div>
                            <div><p className="text-muted-foreground">Contact Person:</p> <p>{supplierData.contact_person}</p></div>
                        </div>
                        <div className="border-t pt-4 flex justify-between items-center">
                           <h4 className="font-medium">Address</h4>
                           <Button variant="link" onClick={() => goToStep(2)}>Edit</Button>
                        </div>
                         <div className="grid grid-cols-2 gap-2 text-sm">
                            <div><p className="text-muted-foreground">Address:</p> <p>{supplierData.address}</p></div>
                            <div><p className="text-muted-foreground">City:</p> <p>{supplierData.city}</p></div>
                        </div>
                        {/* ... Add other review sections ... */}
                    </div>
                );
            default:
                return <div>Unknown Step</div>;
        }
    };

    const progress = (currentStep / STEPS.length) * 100;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Create New Supplier</DialogTitle>
                    <DialogDescription>{`Step ${currentStep} of ${STEPS.length}: ${STEPS[currentStep - 1].title}`}</DialogDescription>
                    <Progress value={progress} className="mt-2" />
                </DialogHeader>

                {renderStepContent()}

                <DialogFooter>
                    {currentStep > 1 && (
                        <Button variant="outline" onClick={prevStep} disabled={isSaving}>Back</Button>
                    )}
                    <div className="flex-grow" />
                    {currentStep === 4 && <Button variant="secondary" onClick={nextStep}>Skip for now</Button>}
                    {currentStep < STEPS.length ? (
                        <Button onClick={nextStep} disabled={!isStep1Valid}>Next</Button>
                    ) : (
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
                            Create Supplier
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
