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

// Define types
interface Customer {
  id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
}

interface Item {
  id: string;
  name: string;
  unit_price: number;
}

interface SalesItem {
  id: number; 
  item_id: string; 
  item_name: string;
  unit_price: number;
  quantity: number;
  description?: string;
}

interface Invoice {
  id: string; 
  invoice_number: string;
  customer_id?: string;
  customer_name: string;
  invoice_date: string; 
  due_date: string;     
  total_amount: number;
  amount_due: number;  
  status: 'Paid' | 'Unpaid' | 'Partially Paid';
  previous_balance?: number;
  current_invoice_balance?: number;
  total_balance?: number;
}

// Types for Customer Trail
interface CustomerInvoiceSummary {
  id: string;
  invoice_number: string;
  invoice_date: string;
  total_amount: number;
  amount_due: number;
  status: 'Paid' | 'Unpaid' | 'Partially Paid';
}

interface CustomerPaymentSummary {
  id: string;
  payment_date: string;
  amount: number;
  invoice_number_ref?: string;
  method: string;
}

interface CustomerWaybillSummary {
  id: string;
  waybill_number: string;
  waybill_date: string;
  invoice_number_ref: string;
}

interface CustomerTrailData {
  customer_details: Customer;
  current_outstanding_balance: number;
  invoices: CustomerInvoiceSummary[];
  payments: CustomerPaymentSummary[];
  waybills: CustomerWaybillSummary[];
}


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
  const [narration, setNarration] = useState('');
  const [salesItems, setSalesItems] = useState<SalesItem[]>([
    { id: Date.now(), item_id: '', item_name: '', unit_price: 0, quantity: 1 },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedInvoice, setGeneratedInvoice] = useState<Invoice | null>(null);

  // Customer Trail State
  const [selectedCustomerTrailId, setSelectedCustomerTrailId] = useState<string>('');
  const [customerTrailData, setCustomerTrailData] = useState<CustomerTrailData | null>(null);
  const [isCustomerTrailLoading, setIsCustomerTrailLoading] = useState(false);

  // Invoices List State
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
  const [isInvoiceLoading, setIsInvoiceLoading] = useState(false);
  
  // Dropdowns Data
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [allItems, setAllItems] = useState<Item[]>([]);

  const fetchInitialData = useCallback(async () => {
    if (!user?.company_id) return;
    setIsInitialLoading(true);
    try {
      const [customersRes, itemsRes] = await Promise.all([
        fetch(`https://hariindustries.net/busa-api/database/get-customers.php?company_id=${user.company_id}`),
        fetch(`https://hariindustries.net/busa-api/database/get-sellable-items.php?company_id=${user.company_id}`),
      ]);

      if (!customersRes.ok || !itemsRes.ok) {
        throw new Error('Failed to fetch initial data.');
      }

      const customers = await customersRes.json();
      const items = await itemsRes.json();

      setAllCustomers(customers);
      setAllItems(items);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error fetching data', description: error.message });
    } finally {
      setIsInitialLoading(false);
    }
  }, [user?.company_id, toast]);

  const fetchInvoices = useCallback(async () => {
    if (!user?.company_id) return;
    setIsInvoiceLoading(true);
    try {
      const res = await fetch(`https://hariindustries.net/busa-api/database/get-sales-invoices.php?company_id=${user.company_id}`);
      if(!res.ok) throw new Error('Failed to fetch invoices');
      const invoices = await res.json();
      setAllInvoices(invoices);
    } catch (error: any) {
       toast({ variant: 'destructive', title: 'Error fetching invoices', description: error.message });
    } finally {
      setIsInvoiceLoading(false);
    }
  }, [user?.company_id, toast]);


  useEffect(() => {
    if (user?.company_id) {
      fetchInitialData();
      fetchInvoices();
    }
  }, [user?.company_id, fetchInitialData, fetchInvoices]);

  useEffect(() => {
    const fetchCustomerTrail = async () => {
      if (!selectedCustomerTrailId || !user?.company_id) {
        setCustomerTrailData(null);
        return;
      }

      setIsCustomerTrailLoading(true);
      try {
        const url = new URL('https://hariindustries.net/busa-api/database/get-customer-trail.php');
        url.searchParams.append('company_id', user.company_id);
        url.searchParams.append('customer_id', selectedCustomerTrailId);
        
        const response = await fetch(url.toString());
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'An unknown server error occurred.' }));
          throw new Error(errorData.error || `Server responded with status ${response.status}`);
        }
        
        const result = await response.json();

        if (result.success) {
            setCustomerTrailData(result.data);
        } else {
            throw new Error(result.error || 'Failed to fetch customer trail data.');
        }

      } catch (error: any) {
        console.error("Failed to fetch customer trail:", error);
        toast({ variant: 'destructive', title: 'Error fetching customer trail.', description: error.message || 'Could not load customer history.' });
        setCustomerTrailData(null);
      } finally {
        setIsCustomerTrailLoading(false);
      }
    };

    fetchCustomerTrail();
  }, [selectedCustomerTrailId, user?.company_id, toast]);

  const handleAddItemLine = () => {
    setSalesItems([...salesItems, { id: Date.now(), item_id: '', item_name: '', unit_price: 0, quantity: 1 }]);
  };

  const handleRemoveItemLine = (id: number) => {
    if (salesItems.length > 1) {
      setSalesItems(salesItems.filter(item => item.id !== id));
    } else {
      toast({ variant: 'destructive', title: 'Minimum one item required.' });
    }
  };

  const handleItemLineChange = (id: number, field: keyof SalesItem, value: any) => {
    setSalesItems(salesItems.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'item_id') {
          const selectedItem = allItems.find(i => i.id === value);
          if (selectedItem) {
            updatedItem.item_name = selectedItem.name;
            updatedItem.unit_price = selectedItem.unit_price;
          } else {
            updatedItem.item_name = '';
            updatedItem.unit_price = 0;
          }
        }
        if (field === 'quantity') updatedItem.quantity = Math.max(0, parseInt(value, 10) || 0);
        if (field === 'unit_price') updatedItem.unit_price = Math.max(0, parseFloat(value) || 0);
        return updatedItem;
      }
      return item;
    }));
  };

  const { totalAmount, totalQuantity } = useMemo(() => {
    const total = salesItems.reduce((acc, item) => acc + (item.unit_price * item.quantity), 0);
    const qty = salesItems.reduce((acc, item) => acc + item.quantity, 0);
    return { totalAmount: total, totalQuantity: qty };
  }, [salesItems]);

  const resetForm = () => {
    setInvoiceDate(new Date());
    setDueDate(() => { const d = new Date(); d.setDate(d.getDate() + 30); return d; });
    setSelectedCustomerId('');
    setNarration('');
    setSalesItems([{ id: Date.now(), item_id: '', item_name: '', unit_price: 0, quantity: 1 }]);
    setGeneratedInvoice(null);
  };

  const handleGenerateInvoice = async () => {
    if (!selectedCustomerId || !invoiceDate || !dueDate || totalAmount <= 0) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Please fill all required fields.' });
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
      narration: narration,
      sales_items: salesItems.map(({ id, ...rest }) => ({...rest, item_id: rest.item_id.toString()})),
      total_amount: totalAmount,
      user_id: user.uid,
      company_id: user.company_id,
    };

    try {
      const response = await fetch('https://hariindustries.net/busa-api/database/sales-invoice.php', {
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
        toast({ title: 'Invoice Generated!', description: `Invoice #${result.invoice_number} recorded.` });
        setGeneratedInvoice(result.invoice);
        fetchInvoices(); // Refresh invoice list
      } else {
        throw new Error(result.error || 'Server indicated a failure.');
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Failed to generate invoice.', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isInitialLoading) {
      return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /><p className='ml-4'>Loading essential data...</p></div>
  }

  return (
    <>
      <p className="text-muted-foreground mb-6">Manage sales activities and generate related documents.</p>

      <Tabs defaultValue="sale_form" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="sale_form"><ShoppingCart className="h-4 w-4 mr-2" /> Sale Form</TabsTrigger>
          <TabsTrigger value="invoices"><FileText className="h-4 w-4 mr-2" /> Invoices</TabsTrigger>
          <TabsTrigger value="customers_trail"><Users className="h-4 w-4 mr-2" /> Customers Trail</TabsTrigger>
          <TabsTrigger value="sales_trail"><ListOrdered className="h-4 w-4 mr-2" /> Sales Trail</TabsTrigger>
          <TabsTrigger value="waybills"><Waypoints className="h-4 w-4 mr-2" /> Waybills</TabsTrigger>
        </TabsList>

        {/* Sale Form Tab */}
        <TabsContent value="sale_form">
          <Card>
            <CardHeader><CardTitle>Create Sales Invoice</CardTitle></CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6 mb-6">
                <div className="space-y-2">
                  <label className="font-semibold text-sm">Customer</label>
                  <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId} disabled={isSubmitting}>
                    <SelectTrigger><SelectValue placeholder="Select a customer..." /></SelectTrigger>
                    <SelectContent>{allCustomers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><label className="font-semibold text-sm">Invoice Date</label><DatePicker date={invoiceDate} onDateChange={setInvoiceDate} disabled={isSubmitting} /></div>
                <div className="space-y-2"><label className="font-semibold text-sm">Due Date</label><DatePicker date={dueDate} onDateChange={setDueDate} disabled={isSubmitting} /></div>
              </div>
              <div className="space-y-2 mb-6">
                <label className="font-semibold text-sm">Narration / Remarks</label>
                <Textarea placeholder="e.g., Sale of office supplies" value={narration} onChange={(e) => setNarration(e.target.value)} disabled={isSubmitting}/>
              </div>
              <h3 className="text-lg font-semibold mb-4">Invoice Items</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Item</TableHead>
                    <TableHead className="text-right w-[15%]">Unit Price</TableHead>
                    <TableHead className="text-right w-[15%]">Quantity</TableHead>
                    <TableHead className="text-right w-[20%]">Total</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesItems.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>
                        <Select value={line.item_id} onValueChange={(v) => handleItemLineChange(line.id, 'item_id', v)} disabled={isSubmitting}>
                          <SelectTrigger><SelectValue placeholder="Select an item..." /></SelectTrigger>
                          <SelectContent>{allItems.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell><Input type="number" className="text-right" value={line.unit_price || ''} onChange={(e) => handleItemLineChange(line.id, 'unit_price', parseFloat(e.target.value))} disabled={isSubmitting}/></TableCell>
                      <TableCell><Input type="number" className="text-right" value={line.quantity || ''} onChange={(e) => handleItemLineChange(line.id, 'quantity', parseInt(e.target.value))} disabled={isSubmitting}/></TableCell>
                      <TableCell className="text-right font-bold">{(line.unit_price * line.quantity).toFixed(2)}</TableCell>
                      <TableCell><Button variant="ghost" size="icon" onClick={() => handleRemoveItemLine(line.id)} disabled={isSubmitting || salesItems.length <= 1}><Trash2 className="h-4 w-4" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={2}><Button variant="outline" size="sm" onClick={handleAddItemLine} disabled={isSubmitting}><PlusCircle className="mr-2 h-4 w-4"/>Add Item</Button></TableCell>
                    <TableCell className="text-right font-bold">{totalQuantity}</TableCell>
                    <TableCell className="text-right font-bold">{totalAmount.toFixed(2)}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
              {generatedInvoice && (
                <div className="mt-6 p-4 border rounded-md bg-green-50"><h4 className="font-semibold">Generated: {generatedInvoice.invoice_number}</h4></div>
              )}
            </CardContent>
            <CardFooter className="justify-end space-x-2">
              {generatedInvoice && <><Button variant="outline">Print</Button><Button variant="outline">Waybill</Button></>}
              <Button onClick={handleGenerateInvoice} disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Generate Invoice</Button>
              {generatedInvoice && <Button variant="secondary" onClick={resetForm}>Reset</Button>}
            </CardFooter>
          </Card>
        </TabsContent>

         {/* Invoices Tab */}
        <TabsContent value="invoices">
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
                                    <TableRow key={inv.id}>
                                        <TableCell className="font-bold">{inv.invoice_number}</TableCell>
                                        <TableCell>{inv.customer_name}</TableCell>
                                        <TableCell>{format(new Date(inv.invoice_date), 'PPP')}</TableCell>
                                        <TableCell>{format(new Date(inv.due_date), 'PPP')}</TableCell>
                                        <TableCell className="text-right">{inv.total_amount.toFixed(2)}</TableCell>
                                        <TableCell className="text-right">{inv.amount_due.toFixed(2)}</TableCell>
                                        <TableCell><span className={`px-2 py-1 text-xs rounded-full ${inv.status === 'Paid' ? 'bg-green-100 text-green-800' : inv.status === 'Partially Paid' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>{inv.status}</span></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <p className="text-center text-muted-foreground py-12">No sales invoices found.</p>
                    )}
                </CardContent>
            </Card>
        </TabsContent>


        {/* Customers Trail Tab */}
        <TabsContent value="customers_trail">
          <Card>
            <CardHeader><CardTitle>Customers Trail</CardTitle></CardHeader>
            <CardContent>
              <div className="mb-4">
                <label className="font-semibold text-sm">Select Customer</label>
                <Select value={selectedCustomerTrailId} onValueChange={setSelectedCustomerTrailId} disabled={isCustomerTrailLoading}>
                  <SelectTrigger><SelectValue placeholder="Select a customer to view their trail..." /></SelectTrigger>
                  <SelectContent>{allCustomers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {isCustomerTrailLoading && <div className="flex items-center justify-center h-48"><Loader2 className="h-8 w-8 animate-spin"/></div>}
              {!isCustomerTrailLoading && customerTrailData && (
                <div className="space-y-6">
                  <div className="p-4 border rounded-md">
                    <h4 className="font-semibold mb-2">{customerTrailData.customer_details.name}</h4>
                    <p><strong>Balance:</strong> {customerTrailData.current_outstanding_balance.toFixed(2)}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Invoices</h4>
                    <Table>
                      <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Date</TableHead><TableHead>Amt</TableHead><TableHead>Due</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                      <TableBody>{customerTrailData.invoices.map(inv => <TableRow key={inv.id}><TableCell>{inv.invoice_number}</TableCell><TableCell>{inv.invoice_date}</TableCell><TableCell>{inv.total_amount.toFixed(2)}</TableCell><TableCell>{inv.amount_due.toFixed(2)}</TableCell><TableCell>{inv.status}</TableCell></TableRow>)}</TableBody>
                    </Table>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Payments</h4>
                     <Table>
                      <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Date</TableHead><TableHead>Amt</TableHead><TableHead>Ref</TableHead></TableRow></TableHeader>
                      <TableBody>{customerTrailData.payments.map(p => <TableRow key={p.id}><TableCell>{p.id}</TableCell><TableCell>{p.payment_date}</TableCell><TableCell>{p.amount.toFixed(2)}</TableCell><TableCell>{p.invoice_number_ref}</TableCell></TableRow>)}</TableBody>
                    </Table>
                  </div>
                   <div>
                    <h4 className="font-semibold mb-2">Waybills</h4>
                     <Table>
                      <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Date</TableHead><TableHead>Ref</TableHead></TableRow></TableHeader>
                      <TableBody>{customerTrailData.waybills.map(w => <TableRow key={w.id}><TableCell>{w.waybill_number}</TableCell><TableCell>{w.waybill_date}</TableCell><TableCell>{w.invoice_number_ref}</TableCell></TableRow>)}</TableBody>
                    </Table>
                  </div>
                </div>
              )}
               {!isCustomerTrailLoading && !customerTrailData && selectedCustomerTrailId && (
                 <p className="text-center text-muted-foreground py-12">No data found for this customer.</p>
               )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Other Tabs Placeholder */}
        <TabsContent value="sales_trail"><Card><CardHeader><CardTitle>Sales Trail</CardTitle></CardHeader><CardContent><p>Coming soon...</p></CardContent></Card></TabsContent>
        <TabsContent value="waybills"><Card><CardHeader><CardTitle>Waybills</CardTitle></CardHeader><CardContent><p>Coming soon...</p></CardContent></Card></TabsContent>

      </Tabs>
    </>
  );
};

export default SalesPage;
