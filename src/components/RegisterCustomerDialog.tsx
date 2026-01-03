'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface RegisterCustomerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomerRegistered: (customer: { id: string; name: string; }) => void;
}

const initialFormData = {
    customerType: 'Individual',
    customerName: '',
    tradingName: '',
    status: 'Active',
    customerCategory: 'Retail',
    primaryPhoneNumber: '',
    alternatePhone: '',
    emailAddress: '',
    contactPerson: '',
    website: '',
    billingAddress: '',
    shippingAddress: '',
    city: '',
    state: '',
    country: 'Nigeria',
    postalCode: '',
    vatApplicable: false,
    vatRegistrationNumber: '',
    customerTIN: '',
    taxCategory: 'VATable',
    withholdingTaxApplicable: false,
    paymentType: 'Cash',
    paymentTerms: 'Immediate',
    creditLimit: 0,
    currency: 'NGN',
    priceLevel: 'Retail',
    defaultSalesRepresentative: '',
    defaultWarehouse: '',
    preferredPaymentMethod: 'Cash',
    discountEligibility: false,
    invoiceDeliveryMethod: 'Email',
    notes: '',
};

export const RegisterCustomerDialog: React.FC<RegisterCustomerDialogProps> = ({ isOpen, onClose, onCustomerRegistered }) => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState(initialFormData);

  const handleClose = () => {
    setFormData(initialFormData);
    setError(null);
    onClose();
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCustomerSubmit = async () => {
    if (!formData.customerName.trim()) {
      setError('Customer name is required.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        company_id: user?.company_id,
        user_id: user?.uid,
      };
      
      const response = await fetch('https://hariindustries.net/api/clearbook/create_customer.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'An unknown server error occurred.' }));
        throw new Error(errorData.error || 'Failed to register customer');
      }
      
      const result = await response.json();
      if (!result.success) {
          throw new Error(result.error || 'Server indicated a failure but provided no error message.')
      }

      toast({ title: 'Success', description: 'Customer registered successfully.' });
      onCustomerRegistered({ id: result.customerId, name: formData.customerName });
      handleClose();

    } catch (error: any) {
      setError(error.message);
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
          <>
            <DialogHeader>
              <DialogTitle>{language?.registerNewCustomer || "Register New Customer"}</DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="basic_info" className="w-full">
                <TabsList className="grid w-full grid-cols-6">
                    <TabsTrigger value="basic_info">Basic</TabsTrigger>
                    <TabsTrigger value="contact">Contact</TabsTrigger>
                    <TabsTrigger value="address">Address</TabsTrigger>
                    <TabsTrigger value="tax">Tax</TabsTrigger>
                    <TabsTrigger value="financial">Financial</TabsTrigger>
                    <TabsTrigger value="sales">Sales</TabsTrigger>
                </TabsList>
                <TabsContent value="basic_info">
                    <div className="grid grid-cols-2 gap-4 py-4">
                        <div><Label>Customer Type</Label><Select value={formData.customerType} onValueChange={(v) => handleInputChange('customerType', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Individual">Individual</SelectItem><SelectItem value="Business">Business</SelectItem><SelectItem value="Government">Government</SelectItem><SelectItem value="NGO">NGO</SelectItem></SelectContent></Select></div>
                        <div><Label>Customer Name</Label><Input value={formData.customerName} onChange={(e) => handleInputChange('customerName', e.target.value)} /></div>
                        <div><Label>Display / Trading Name</Label><Input value={formData.tradingName} onChange={(e) => handleInputChange('tradingName', e.target.value)} /></div>
                        <div><Label>Status</Label><Select value={formData.status} onValueChange={(v) => handleInputChange('status', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Inactive">Inactive</SelectItem><SelectItem value="Blacklisted">Blacklisted</SelectItem></SelectContent></Select></div>
                        <div><Label>Customer Category</Label><Select value={formData.customerCategory} onValueChange={(v) => handleInputChange('customerCategory', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Retail">Retail</SelectItem><SelectItem value="Wholesale">Wholesale</SelectItem><SelectItem value="Distributor">Distributor</SelectItem><SelectItem value="Corporate">Corporate</SelectItem></SelectContent></Select></div>
                    </div>
                </TabsContent>
                <TabsContent value="contact">
                    <div className="grid grid-cols-2 gap-4 py-4">
                        <div><Label>Primary Phone Number</Label><Input value={formData.primaryPhoneNumber} onChange={(e) => handleInputChange('primaryPhoneNumber', e.target.value)} /></div>
                        <div><Label>Alternate Phone</Label><Input value={formData.alternatePhone} onChange={(e) => handleInputChange('alternatePhone', e.target.value)} /></div>
                        <div><Label>Email Address</Label><Input type="email" value={formData.emailAddress} onChange={(e) => handleInputChange('emailAddress', e.target.value)} /></div>
                        <div><Label>Contact Person</Label><Input value={formData.contactPerson} onChange={(e) => handleInputChange('contactPerson', e.target.value)} /></div>
                        <div><Label>Website</Label><Input value={formData.website} onChange={(e) => handleInputChange('website', e.target.value)} /></div>
                    </div>
                </TabsContent>
                <TabsContent value="address">
                    <div className="grid grid-cols-2 gap-4 py-4">
                        <div><Label>Billing Address</Label><Textarea value={formData.billingAddress} onChange={(e) => handleInputChange('billingAddress', e.target.value)} /></div>
                        <div><Label>Shipping Address</Label><Textarea value={formData.shippingAddress} onChange={(e) => handleInputChange('shippingAddress', e.target.value)} /></div>
                        <div><Label>City</Label><Input value={formData.city} onChange={(e) => handleInputChange('city', e.target.value)} /></div>
                        <div><Label>State</Label><Input value={formData.state} onChange={(e) => handleInputChange('state', e.target.value)} /></div>
                        <div><Label>Country</Label><Input value={formData.country} onChange={(e) => handleInputChange('country', e.target.value)} /></div>
                        <div><Label>Postal Code</Label><Input value={formData.postalCode} onChange={(e) => handleInputChange('postalCode', e.target.value)} /></div>
                    </div>
                </TabsContent>
                <TabsContent value="tax">
                    <div className="grid grid-cols-2 gap-4 py-4">
                        <div className="flex items-center space-x-2"><Checkbox id="vatApplicable" checked={formData.vatApplicable} onCheckedChange={(c) => handleInputChange('vatApplicable', c)} /><Label htmlFor="vatApplicable">VAT Applicable?</Label></div>
                        {formData.vatApplicable && <div><Label>VAT Registration Number (TIN)</Label><Input value={formData.vatRegistrationNumber} onChange={(e) => handleInputChange('vatRegistrationNumber', e.target.value)} /></div>}
                        <div><Label>Customer TIN</Label><Input value={formData.customerTIN} onChange={(e) => handleInputChange('customerTIN', e.target.value)} /></div>
                        <div><Label>Tax Category</Label><Select value={formData.taxCategory} onValueChange={(v) => handleInputChange('taxCategory', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="VATable">VATable</SelectItem><SelectItem value="Zero-rated">Zero-rated</SelectItem><SelectItem value="Exempt">Exempt</SelectItem></SelectContent></Select></div>
                        <div className="flex items-center space-x-2"><Checkbox id="whtApplicable" checked={formData.withholdingTaxApplicable} onCheckedChange={(c) => handleInputChange('withholdingTaxApplicable', c)} /><Label htmlFor="whtApplicable">Withholding Tax Applicable?</Label></div>
                    </div>
                </TabsContent>
                <TabsContent value="financial">
                     <div className="grid grid-cols-2 gap-4 py-4">
                        <div><Label>Payment Type</Label><Select value={formData.paymentType} onValueChange={(v) => handleInputChange('paymentType', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Cash">Cash</SelectItem><SelectItem value="Credit">Credit</SelectItem></SelectContent></Select></div>
                        <div><Label>Payment Terms</Label><Select value={formData.paymentTerms} onValueChange={(v) => handleInputChange('paymentTerms', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Immediate">Immediate</SelectItem><SelectItem value="7 days">7 days</SelectItem><SelectItem value="30 days">30 days</SelectItem></SelectContent></Select></div>
                        <div><Label>Credit Limit</Label><Input type="number" value={formData.creditLimit} onChange={(e) => handleInputChange('creditLimit', parseFloat(e.target.value))} /></div>
                        <div><Label>Currency</Label><Input value={formData.currency} onChange={(e) => handleInputChange('currency', e.target.value)} /></div>
                        <div><Label>Price Level</Label><Select value={formData.priceLevel} onValueChange={(v) => handleInputChange('priceLevel', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Retail">Retail</SelectItem><SelectItem value="Wholesale">Wholesale</SelectItem><SelectItem value="Special">Special</SelectItem></SelectContent></Select></div>
                    </div>
                </TabsContent>
                <TabsContent value="sales">
                    <div className="grid grid-cols-2 gap-4 py-4">
                        <div><Label>Default Sales Representative</Label><Input value={formData.defaultSalesRepresentative} onChange={(e) => handleInputChange('defaultSalesRepresentative', e.target.value)} /></div>
                        <div><Label>Default Warehouse / Branch</Label><Input value={formData.defaultWarehouse} onChange={(e) => handleInputChange('defaultWarehouse', e.target.value)} /></div>
                        <div><Label>Preferred Payment Method</Label><Select value={formData.preferredPaymentMethod} onValueChange={(v) => handleInputChange('preferredPaymentMethod', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Cash">Cash</SelectItem><SelectItem value="Bank Transfer">Bank Transfer</SelectItem><SelectItem value="Card">Card</SelectItem></SelectContent></Select></div>
                        <div className="flex items-center space-x-2"><Checkbox id="discountEligibility" checked={formData.discountEligibility} onCheckedChange={(c) => handleInputChange('discountEligibility', c)} /><Label htmlFor="discountEligibility">Discount Eligibility</Label></div>
                        <div><Label>Invoice Delivery Method</Label><Select value={formData.invoiceDeliveryMethod} onValueChange={(v) => handleInputChange('invoiceDeliveryMethod', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Email">Email</SelectItem><SelectItem value="Print">Print</SelectItem><SelectItem value="WhatsApp">WhatsApp</SelectItem></SelectContent></Select></div>
                    </div>
                </TabsContent>
            </Tabs>
            {error && <p className="text-center text-sm text-destructive py-2">{error}</p>}
            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={isSaving}>Cancel</Button>
              <Button onClick={handleCustomerSubmit} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Customer
              </Button>
            </DialogFooter>
          </>
      </DialogContent>
    </Dialog>
  );
};
