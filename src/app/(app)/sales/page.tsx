'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from '@/components/ui/date-picker';
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Trash2, Printer, RefreshCw, Waypoints, FileText, ListOrdered, ShoppingCart, Users, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { apiEndpoints } from '@/lib/apiEndpoints';
import { CustomersTrailTab } from '@/components/customers/CustomersTrailTab';
import { SalesInvoiceDetails } from '@/components/sales/SalesInvoiceDetails';
import { PaymentTrail } from '@/components/sales/PaymentTrail';

// Define types
interface Customer {
  id: string;
  name: string;
  balance: number;
  price_tier: string;
}

interface Item {
  id: string;
  name: string;
  base_price: number;
  price_tiers: Record<string, number>;
}

interface SalesItem {
  id: number; 
  item_id: string; 
  item_name: string;
  unit_price: number;
  quantity: number;
  discount: number;
  vat: number;
  description?: string;
}

interface Invoice {
  id: number; 
  invoice_number: string;
  customer_id?: string;
  customer_name: string;
  invoice_date: string; 
  due_date: string;     
  total_amount: number;
  amount_due: number;  
  status: 'DRAFT' | 'ISSUED' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  previous_balance?: number;
  current_invoice_balance?: number;
  total_balance?: number;
}

const VAT_RATE = 0.075; // 7.5%

const SalesPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();

  // Main loading state
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Sale Form State
  const [invoiceDate, setInvoiceDate] = useState<Date | undefined>(new Date());
  const [dueDate, setDueDate] = useState<Date | undefined>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d;
  });
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [paymentType, setPaymentType] = useState('Credit');
  const [narration, setNarration] = useState('');
  const [salesItems, setSalesItems] = useState<SalesItem[]>([
    { id: Date.now(), item_id: '', item_name: '', unit_price: 0, quantity: 1, discount: 0, vat: 0 },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedInvoice, setGeneratedInvoice] = useState<Invoice | null>(null);

  // Invoices List State
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
  const [isInvoiceLoading, setIsInvoiceLoading] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  
  // Dropdowns Data
  const [customerDropdown, setCustomerDropdown] = useState<Customer[]>([]);
  const [allItems, setAllItems] = useState<Item[]>([]);

  const fetchInitialData = useCallback(async () => {
    if (!user?.company_id) return;
    setIsInitialLoading(true);
    try {
      const [customersRes, itemsRes] = await Promise.all([
        fetch(apiEndpoints.getCustomersInfo(user.company_id)),
        fetch(`${apiEndpoints.getSellableItems}?company_id=${user.company_id}`),
      ]);

      if (!customersRes.ok || !itemsRes.ok) {
        throw new Error('Failed to fetch initial data.');
      }

      const customersData = await customersRes.json();
      const items = await itemsRes.json();

      if (customersData.success && Array.isArray(customersData.data)) {
        setCustomerDropdown(customersData.data);
      }
      
      setAllItems(items);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error fetching data', description: error.message });
    } finally {
      setIsInitialLoading(false);
    }
  }, [user, toast]);

  const fetchInvoices = useCallback(async () => {
    if (!user?.company_id) return;
    setIsInvoiceLoading(true);
    try {
      const res = await fetch(`${apiEndpoints.getSalesInvoices}?company_id=${user.company_id}`);
      if(!res.ok) throw new Error('Failed to fetch invoices');
      const invoices = await res.json();
      setAllInvoices(invoices);
    } catch (error: any) {
       toast({ variant: 'destructive', title: 'Error fetching invoices', description: error.message });
    } finally {
      setIsInvoiceLoading(false);
    }
  }, [user, toast]);


  useEffect(() => {
    if (user?.company_id) {
      fetchInitialData();
      fetchInvoices();
    }
  }, [user, fetchInitialData, fetchInvoices]);

  const handleAddItemLine = () => {
    setSalesItems([...salesItems, { id: Date.now(), item_id: '', item_name: '', unit_price: 0, quantity: 1, discount: 0, vat: 0 }]);
  };

  const handleRemoveItemLine = (id: number) => {
    if (salesItems.length > 1) {
      setSalesItems(salesItems.filter(item => item.id !== id));
    } else {
      toast({ variant: 'destructive', title: 'Minimum one item required.' });
    }
  };

  const handleItemLineChange = (id: number, field: keyof SalesItem, value: any) => {
    const selectedCustomer = customerDropdown.find(c => c.id === selectedCustomerId);
    const customerTier = selectedCustomer?.price_tier;

    setSalesItems(salesItems.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'item_id') {
          const selectedItem = allItems.find(i => i.id === value);
          if (selectedItem) {
            updatedItem.item_name = selectedItem.name;
            updatedItem.unit_price = customerTier && selectedItem.price_tiers[customerTier] 
              ? selectedItem.price_tiers[customerTier] 
              : selectedItem.base_price;
          } else {
            updatedItem.item_name = '';
            updatedItem.unit_price = 0;
          }
        }
        
        // Recalculate derived values
        const grossAmount = updatedItem.unit_price * updatedItem.quantity;
        const netAmount = grossAmount - updatedItem.discount;
        updatedItem.vat = netAmount * VAT_RATE;

        return updatedItem;
      }
      return item;
    }));
  };

  const selectedCustomer = useMemo(() => {
    return customerDropdown.find(c => c.id === selectedCustomerId);
  }, [selectedCustomerId, customerDropdown]);


  const { subTotal, totalDiscount, totalVAT, grandTotal } = useMemo(() => {
    let sub = 0;
    let discount = 0;
    let vat = 0;

    salesItems.forEach(item => {
        const itemTotal = item.unit_price * item.quantity;
        sub += itemTotal;
        discount += item.discount;
        vat += item.vat;
    });

    return {
        subTotal: sub,
        totalDiscount: discount,
        totalVAT: vat,
        grandTotal: sub - discount + vat
    };
  }, [salesItems]);

  const resetForm = () => {
    setInvoiceDate(new Date());
    setDueDate(() => { const d = new Date(); d.setDate(d.getDate() + 30); return d; });
    setSelectedCustomerId('');
    setPaymentType('Credit');
    setNarration('');
    setSalesItems([{ id: Date.now(), item_id: '', item_name: '', unit_price: 0, quantity: 1, discount: 0, vat: 0 }]);
    setGeneratedInvoice(null);
  };

  const handleGenerateInvoice = async (status: 'Draft' | 'Posted') => {
    if (!selectedCustomerId || !invoiceDate || !dueDate || grandTotal <= 0) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Please fill all required fields and ensure total is positive.' });
      return;
    }
    if (!user?.uid || !user?.company_id) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'User not logged in.' });
      return;
    }

    setIsSubmitting(true);
    const payload = {
      customer_id: selectedCustomerId,
      invoice_date: format(invoiceDate, 'yyyy-MM-dd'),
      due_date: format(dueDate, 'yyyy-MM-dd'),
      payment_type: paymentType,
      narration: narration,
      sales_items: salesItems.map(({ id, ...rest }) => ({...rest, item_id: rest.item_id.toString()})),
      sub_total: subTotal,
      total_discount: totalDiscount,
      total_vat: totalVAT,
      grand_total: grandTotal,
      status: status,
      user_id: user.uid,
      company_id: user.company_id,
    };

    try {
      const response = await fetch(apiEndpoints.salesInvoice, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'An unknown error occurred.' }));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        toast({ title: `Invoice ${status}!` });
        setGeneratedInvoice(result.invoice);
        fetchInvoices(); // Refresh invoice list
        if (status === 'Posted') {
            // Potentially disable form here until reset
        }
      } else {
        throw new Error(result.error || 'Server indicated a failure.');
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: `Failed to ${status.toLowerCase()} invoice.`, description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInvoiceClick = (invoiceId: number) => {
    setSelectedInvoiceId(invoiceId);
  };

  const handleBackToInvoices = () => {
    setSelectedInvoiceId(null);
  };

  const handlePaymentSimulated = () => {
    setSelectedInvoiceId(null);
    fetchInvoices();
  };

  if (isInitialLoading) {
      return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /><p className='ml-4'>Loading essential data...</p></div>
  }
  
  const isAdmin = user?.role === 'admin';
  const isAccountant = user?.role === 'accountant';
  const isStaff = user?.role === 'staff';
  

  return (
    <>
       <p className="text-muted-foreground mb-6">
         Manage sales activities and generate all related documents including sales forms, invoices, customer transaction trails, sales audit trails, and delivery waybills.
       </p>

      <Tabs defaultValue="sale_form" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="sale_form"><ShoppingCart className="h-4 w-4 mr-2" /> Sale Form</TabsTrigger>
          <TabsTrigger value="invoices"><FileText className="h-4 w-4 mr-2" /> Invoices</TabsTrigger>
          <TabsTrigger value="customers_trail"><Users className="h-4 w-4 mr-2" /> Customers Trail</TabsTrigger>
          <TabsTrigger value="payment_trail"><ListOrdered className="h-4 w-4 mr-2" /> Payment Trail</TabsTrigger>
          <TabsTrigger value="waybills"><Waypoints className="h-4 w-4 mr-2" /> Waybills</TabsTrigger>
        </TabsList>

        {/* Sale Form Tab */}
        <TabsContent value="sale_form">
          <Card>
            <CardHeader><CardTitle>Create Sales Invoice</CardTitle></CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-6 mb-6">
                <div className="space-y-2">
                  <label className="font-semibold text-sm">Customer</label>
                  <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId} disabled={isSubmitting}>
                    <SelectTrigger><SelectValue placeholder="Select a customer..." /></SelectTrigger>
                    <SelectContent>{customerDropdown.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                  {selectedCustomer && (
                    <div className="text-xs text-muted-foreground space-y-1 mt-2">
                      <p>Balance: <span className="font-semibold">{selectedCustomer.balance.toFixed(2)}</span></p>
                      <p>Price Tier: <span className="font-semibold capitalize">{selectedCustomer.price_tier || 'N/A'}</span></p>
                    </div>
                  )}
                </div>
                <div className="space-y-2"><label className="font-semibold text-sm">Invoice Date</label><DatePicker date={invoiceDate} onDateChange={setInvoiceDate} disabled={isSubmitting} /></div>
                <div className="space-y-2"><label className="font-semibold text-sm">Due Date</label><DatePicker date={dueDate} onDateChange={setDueDate} disabled={isSubmitting} /></div>
                 <div className="space-y-2">
                  <label className="font-semibold text-sm">Payment Type</label>
                  <Select value={paymentType} onValueChange={setPaymentType} disabled={isSubmitting}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Credit">Credit</SelectItem><SelectItem value="Cash">Cash</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2 mb-6">
                <label className="font-semibold text-sm">Narration / Remarks</label>
                <Textarea placeholder="e.g., Sale of office supplies" value={narration} onChange={(e) => setNarration(e.target.value)} disabled={isSubmitting}/>
              </div>
              <h3 className="text-lg font-semibold mb-4">Invoice Items</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30%]">Item</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Discount</TableHead>
                    <TableHead className="text-right">VAT (7.5%)</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesItems.map((line) => {
                    const lineTotal = (line.unit_price * line.quantity) - line.discount + line.vat;
                    return (
                        <TableRow key={line.id}>
                        <TableCell>
                            <Select value={line.item_id} onValueChange={(v) => handleItemLineChange(line.id, 'item_id', v)} disabled={isSubmitting || !selectedCustomerId}>
                            <SelectTrigger><SelectValue placeholder="Select an item..." /></SelectTrigger>
                            <SelectContent>{allItems.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </TableCell>
                        <TableCell><Input type="number" className="text-right" value={line.unit_price} onChange={(e) => handleItemLineChange(line.id, 'unit_price', parseFloat(e.target.value))} disabled={isSubmitting}/></TableCell>
                        <TableCell><Input type="number" className="text-right" value={line.quantity} onChange={(e) => handleItemLineChange(line.id, 'quantity', parseInt(e.target.value))} disabled={isSubmitting}/></TableCell>
                        <TableCell><Input type="number" className="text-right" value={line.discount} onChange={(e) => handleItemLineChange(line.id, 'discount', parseFloat(e.target.value))} disabled={isSubmitting}/></TableCell>
                        <TableCell className="text-right font-medium">{line.vat.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-bold">{lineTotal.toFixed(2)}</TableCell>
                        <TableCell><Button variant="ghost" size="icon" onClick={() => handleRemoveItemLine(line.id)} disabled={isSubmitting || salesItems.length <= 1}><Trash2 className="h-4 w-4" /></Button></TableCell>
                        </TableRow>
                    );
                    })}
                </TableBody>
                <TableFooter>
                    <TableRow>
                        <TableCell colSpan={4}><Button variant="outline" size="sm" onClick={handleAddItemLine} disabled={isSubmitting}><PlusCircle className="mr-2 h-4 w-4"/>Add Item</Button></TableCell>
                        <TableCell className="text-right font-bold">Subtotal</TableCell>
                        <TableCell className="text-right font-bold">{subTotal.toFixed(2)}</TableCell>
                        <TableCell />
                    </TableRow>
                    <TableRow>
                        <TableCell colSpan={4} />
                        <TableCell className="text-right font-semibold">Total Discount</TableCell>
                        <TableCell className="text-right font-semibold">-{totalDiscount.toFixed(2)}</TableCell>
                        <TableCell />
                    </TableRow>
                    <TableRow>
                        <TableCell colSpan={4} />
                        <TableCell className="text-right font-semibold">Total VAT</TableCell>
                        <TableCell className="text-right font-semibold">{totalVAT.toFixed(2)}</TableCell>
                        <TableCell />
                    </TableRow>
                     <TableRow className="bg-muted/50">
                        <TableCell colSpan={4} />
                        <TableCell className="text-right font-bold text-lg">Grand Total</TableCell>
                        <TableCell className="text-right font-bold text-lg">{grandTotal.toFixed(2)}</TableCell>
                        <TableCell />
                    </TableRow>
                </TableFooter>
              </Table>
              {generatedInvoice && (
                <div className="mt-6 p-4 border rounded-md bg-green-50"><h4 className="font-semibold">Generated: {generatedInvoice.invoice_number}</h4></div>
              )}
            </CardContent>
            <CardFooter className="justify-end space-x-2">
              <Button variant="secondary" onClick={() => handleGenerateInvoice('Draft')} disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Save as Draft</Button>
              <Button onClick={() => handleGenerateInvoice('Posted')} disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Post Invoice</Button>
              {generatedInvoice && <Button variant="outline" onClick={resetForm}>New Sale</Button>}
            </CardFooter>
          </Card>
        </TabsContent>

         {/* Invoices Tab */}
        <TabsContent value="invoices">
            {selectedInvoiceId ? (
                <SalesInvoiceDetails 
                    invoiceId={selectedInvoiceId} 
                    onBack={handleBackToInvoices}
                    onPaymentSimulated={handlePaymentSimulated}
                />
            ) : (
                <Card>
                    <CardHeader className="flex flex-row justify-between items-center">
                        <CardTitle>All Sales Invoices</CardTitle>
                        <Button variant="outline" size="sm" onClick={fetchInvoices} disabled={isInvoiceLoading}>
                            <RefreshCw className={`mr-2 h-4 w-4 ${isInvoiceLoading ? 'animate-spin' : ''}`}/>Refresh
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {isInvoiceLoading ? (
                            <div className="flex items-center justify-center h-48"><Loader2 className="h-8 w-8 animate-spin"/></div>
                        ) : allInvoices.length > 0 ? (
                            <Table>
                                <TableHeader><TableRow>
                                    <TableHead>Invoice #</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Due Date</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead className="text-right">Balance Due</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow></TableHeader>
                                <TableBody>
                                    {allInvoices.map(inv => (
                                        <TableRow key={inv.id} onClick={() => handleInvoiceClick(inv.id)} className="cursor-pointer">
                                            <TableCell className="font-bold">{inv.invoice_number}</TableCell>
                                            <TableCell>{inv.customer_name}</TableCell>
                                            <TableCell>{format(new Date(inv.invoice_date), 'PPP')}</TableCell>
                                            <TableCell>{format(new Date(inv.due_date), 'PPP')}</TableCell>
                                            <TableCell className="text-right">{inv.total_amount.toFixed(2)}</TableCell>
                                            <TableCell className="text-right">{inv.amount_due.toFixed(2)}</TableCell>
                                            <TableCell><span className={`px-2 py-1 text-xs rounded-full ${inv.status === 'PAID' ? 'bg-green-100 text-green-800' : inv.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' : inv.status === 'DRAFT' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>{inv.status}</span></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <p className="text-center text-muted-foreground py-12">No sales invoices found.</p>
                        )}
                    </CardContent>
                </Card>
            )}
        </TabsContent>


        {/* Customers Trail Tab */}
        <TabsContent value="customers_trail">
            <Card>
                <CardHeader>
                    <CardTitle>Customer Trail</CardTitle>
                </CardHeader>
                <CardContent>
                    <CustomersTrailTab onRefresh={fetchInitialData} />
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="payment_trail">
          <PaymentTrail />
        </TabsContent>

        <TabsContent value="waybills">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center"><Waypoints className="h-5 w-5 mr-2" /> Waybills</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center text-muted-foreground py-12">
                        <Waypoints className="mx-auto h-12 w-12" />
                        <h3 className="mt-4 text-lg font-semibold">Logistics and Delivery Management</h3>
                        <p className="mt-2 text-sm">
                            A Waybill is a logistics and delivery document generated from a sale or invoice. It contains customer delivery details, items and quantities dispatched, vehicle/driver information, and dispatch dates to confirm that goods have left the warehouse and to support delivery tracking.
                        </p>
                        <p className="mt-4 text-sm font-bold">Coming soon...</p>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>

      </Tabs>
    </>
  );
};

export default SalesPage;
