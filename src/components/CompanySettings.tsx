'use client';

import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface CompanyData {
    company_id: string;
    company_name: string;
    company_logo: string | null;
    company_type: string;
    industry: string;
    address: string;
    contact_email: string;
    contact_phone: string;
    base_currency: string;
    accounting_method: string;
    fiscal_year_start: string;
    fiscal_year_end: string;
}

const CompanySettings = () => {
    const { user, isLoading: isAuthLoading } = useAuth();
    const [formData, setFormData] = useState<Partial<CompanyData>>({});
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const { toast } = useToast();

    useEffect(() => {
        const fetchCompanyData = async () => {
            if (!user) return;

            setIsLoading(true);
            try {
                const response = await fetch(`https://hariindustries.net/clearbook/get_company_settings.php?company_id=${user.company_id}`);
                if (!response.ok) throw new Error('Failed to fetch company data.');
                const data: CompanyData = await response.json();
                setFormData(data);
                if (data.company_logo) {
                    setLogoPreview(`https://hariindustries.net/clearbook/${data.company_logo}`);
                }
            } catch (error: any) {
                toast({ variant: "destructive", title: "Error loading data", description: error.message });
            } finally {
                setIsLoading(false);
            }
        };
        fetchCompanyData();
    }, [user, toast]);

    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleSelectChange = (id: keyof CompanyData, value: string) => {
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
            if (!allowedTypes.includes(file.type)) {
                toast({ variant: "destructive", title: "Invalid File Type", description: "Please select a JPG, PNG, or WEBP image." });
                return;
            }
            setLogoFile(file);
            setLogoPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!user) {
            toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in to save settings." });
            return;
        }
        setIsSaving(true);
        const submissionData = new FormData();

        const fieldsToSubmit = { ...formData };
        delete fieldsToSubmit.accounting_method;
        delete fieldsToSubmit.fiscal_year_start;

        Object.entries(fieldsToSubmit).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                submissionData.append(key, value as string);
            }
        });
        
        submissionData.append('user_id', user.uid);

        if (logoFile) {
            submissionData.append('company_logo', logoFile);
        }

        try {
            const response = await fetch('https://hariindustries.net/clearbook/update_company.php', {
                method: 'POST',
                body: submissionData,
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to save settings.');
            toast({ title: "Success!", description: "Company settings have been updated." });
            if (result.new_logo_path) {
                setLogoPreview(`https://hariindustries.net/clearbook/${result.new_logo_path}?v=${new Date().getTime()}`);
            }
        } catch (error: any) {
            toast({ variant: "destructive", title: "Save Failed", description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading || isAuthLoading) {
        return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            <Card>
                <CardHeader>
                    <div className="flex items-start space-x-4">
                        <Avatar className="h-20 w-20 border">
                            <AvatarImage src={logoPreview || undefined} />
                            <AvatarFallback>{formData.company_name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="space-y-1 pt-2">
                            <CardTitle>Company Profile</CardTitle>
                            <CardDescription>Manage your core details and branding.</CardDescription>
                            <Label htmlFor="logo-upload" className="text-sm font-medium text-primary hover:underline cursor-pointer">Change Logo</Label>
                            <Input id="logo-upload" type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogoChange} />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2"><Label htmlFor="company_name">Company Name</Label><Input id="company_name" value={formData.company_name || ''} onChange={handleInputChange} /></div>
                    <div className="space-y-2"><Label htmlFor="company_id">Company ID</Label><Input id="company_id" value={formData.company_id || ''} readOnly disabled /></div>
                    <div className="space-y-2"><Label htmlFor="industry">Industry</Label><Input id="industry" value={formData.industry || ''} onChange={handleInputChange} placeholder="e.g., Technology" /></div>
                    <div className="space-y-2"><Label htmlFor="company_type">Company Type</Label><Input id="company_type" value={formData.company_type || ''} readOnly disabled /></div>
                    <div className="space-y-2 md:col-span-2"><Label htmlFor="address">Address</Label><Textarea id="address" value={formData.address || ''} onChange={handleInputChange} placeholder="123 Main St, Anytown, USA" /></div>
                    <div className="space-y-2"><Label htmlFor="contact_email">Contact Email</Label><Input id="contact_email" type="email" value={formData.contact_email || ''} onChange={handleInputChange} placeholder="contact@company.com" /></div>
                    <div className="space-y-2"><Label htmlFor="contact_phone">Contact Phone</Label><Input id="contact_phone" type="tel" value={formData.contact_phone || ''} onChange={handleInputChange} placeholder="+1 (555) 123-4567" /></div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Financial Settings</CardTitle><CardDescription>Your financial settings determine how accounting is managed.</CardDescription></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2"><Label htmlFor="base_currency">Base Currency</Label><Select value={formData.base_currency || ''} onValueChange={(v) => handleSelectChange('base_currency' as keyof CompanyData, v)}><SelectTrigger><SelectValue placeholder="Select currency..." /></SelectTrigger><SelectContent><SelectItem value="USD">USD - United States Dollar</SelectItem><SelectItem value="EUR">EUR - Euro</SelectItem><SelectItem value="GBP">NA - Nigerian Nigeria</SelectItem></SelectContent></Select></div>
                    <div className="space-y-2"><Label htmlFor="accounting_method">Accounting Method</Label><Select value={formData.accounting_method || ''} disabled><SelectTrigger><SelectValue placeholder="Select method..." /></SelectTrigger><SelectContent><SelectItem value="Accrual">Accrual</SelectItem><SelectItem value="Cash">Cash</SelectItem></SelectContent></Select><p className="text-xs text-muted-foreground">This setting is locked after initial setup.</p></div>
                    <div className="space-y-2"><Label htmlFor="fiscal_year_start">Fiscal Year Start</Label><Input id="fiscal_year_start" type="month" value={formData.fiscal_year_start || ''} readOnly disabled /><p className="text-xs text-muted-foreground">This setting is locked after initial setup.</p></div>
                    <div className="space-y-2"><Label htmlFor="fiscal_year_end">Fiscal Year End</Label><Input id="fiscal_year_end" value={formData.fiscal_year_end || ''} readOnly disabled /><p className="text-xs text-muted-foreground">This is calculated automatically.</p></div>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button type="submit" disabled={isSaving || isLoading || isAuthLoading}>
                    {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save All Settings'}
                </Button>
            </div>
        </form>
    );
};

export default CompanySettings;
