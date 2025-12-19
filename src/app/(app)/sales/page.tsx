'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
import { PlusCircle, Trash2, Printer, ArrowRight, Waypoints, FileText, ListOrdered, ShoppingCart, Users, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';

// Define types
// These types should ideally be in a shared types/ folder (e.g., types/sales.d.ts)
interface Customer {
  id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  // Add other customer details like address, contact if needed
}

interface Item {
  id: string;
  name: string;
  unit_price: number;
  // Add other item details if needed (e.g., description, SKU)
}

interface SalesItem {
  id: number; // Client-side unique ID for the line item (Date.now())
  item_id: string; // ID from your items/products database
  item_name: string;
  unit_price: number;
  quantity: number;
  description?: string; // Optional line-item description
}

interface Invoice {
  id: string; // The database ID of the invoice
  invoice_number: string;
  customer_id: string;
  customer_name: string;
  invoice_date: string; // YYYY-MM-DD
  due_date: string;     // YYYY-MM-DD
  total_amount: number; // Total amount of this invoice
  amount_due: number;   // Remaining amount due for this invoice
  status: 'Paid' | 'Unpaid' | 'Partially Paid';
  previous_balance: number; // Sum of amount_due from all prior unpaid/partially paid invoices for this customer
  current_invoice_balance: number; // The total amount for *this* invoice (might be same as total_amount)
  total_balance: number; // previous_balance + current_invoice_balance
  // Add other invoice details as needed, e.g., created_by, created_at
}

// === NEW TYPES FOR CUSTOMER TRAIL ===
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
  // No amount for waybills
}

interface CustomerTrailData {
  customer_details: Customer;
  current_outstanding_balance: number;
  invoices: CustomerInvoiceSummary[];
  payments: CustomerPaymentSummary[];
  waybills: CustomerWaybillSummary[];
}
// ===================================

const MOCK_CUSTOMERS: Customer[] = [
  { id: 'cust001', name: 'ABC Solutions', contact_person: 'John Doe', email: 'john@abc.com', phone: '123-456-7890', address: '123 Main St, Anytown' },
  { id: 'cust002', name: 'XYZ Corp', contact_person: 'Jane Smith', email: 'jane@xyz.com', phone: '098-765-4321', address: '456 Oak Ave, Somewhere' },
  { id: 'cust003', name: 'PQR Enterprises', contact_person: 'Peter Jones', email: 'peter@pqr.com', phone: '111-222-3333', address: '789 Pine Ln, Nowhere' },
];

const MOCK_ITEMS: Item[] = [
  { id: 'prod001', name: 'Product A (SKU123)', unit_price: 100.50 },
  { id: 'prod002', name: 'Service B (Hourly Rate)', unit_price: 50.00 },
  { id: 'prod003', name: 'Product C (Large Pack)', unit_price: 250.75 },
  { id: 'prod004', name: 'Consulting Hour', unit_price: 150.00 },
];

const SalesPage = () => {
  const { toast } = useToast();
  const { user } = useAuth(); // Assuming useAuth provides user.uid and user.company_id

  // State for Sale Form
  const [invoiceDate, setInvoiceDate] = useState<Date | undefined>(new Date());
  const [dueDate, setDueDate] = useState<Date | undefined>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30); // Default due in 30 days
    return d;
  });
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [narration, setNarration] = useState('');
  const [salesItems, setSalesItems] = useState<SalesItem[]>([
    { id: Date.now(), item_id: '', item_name: '', unit_price: 0, quantity: 1 },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedInvoice, setGeneratedInvoice] = useState<Invoice | null>(null);

  // State for Customer Trail tab
  const [selectedCustomerTrailId, setSelectedCustomerTrailId] = useState<string>('');
  const [customerTrailData, setCustomerTrailData] = useState<CustomerTrailData | null>(null);
  const [isCustomerTrailLoading, setIsCustomerTrailLoading] = useState(false);


  // Data for Select dropdowns
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [allItems, setAllItems] = useState<Item[]>([]);

  // Fetch initial data for customers and items
  useEffect(() => {
    const fetchData = async () => {
      // In a real application, you would fetch these from your backend API
      // Example:
      // const customersResponse = await fetch('/api/customers?company_id=' + user?.company_id);
      // if (customersResponse.ok) {
      //   const customersData: Customer[] = await customersResponse.json();
      //   setAllCustomers(customersData);
      // } else {
      //   toast({ variant: 'destructive', title: 'Failed to load customers.' });
      // }

      // const itemsResponse = await fetch('/api/items?company_id=' + user?.company_id);
      // if (itemsResponse.ok) {
      //   const itemsData: Item[] = await itemsResponse.json();
      //   setAllItems(itemsData);
      // } else {
      //   toast({ variant: 'destructive', title: 'Failed to load items.' });
      // }

      // Using mock data for now
      setAllCustomers(MOCK_CUSTOMERS);
      setAllItems(MOCK_ITEMS);
    };

    if (user?.company_id) { // Only fetch if company_id is available
      fetchData();
    }
  }, [user?.company_id, toast]); // Dependency on user.company_id and toast

  // Fetch customer trail data when selectedCustomerTrailId changes
  useEffect(() => {
    const fetchCustomerTrail = async () => {
      if (!selectedCustomerTrailId || !user?.company_id) {
        setCustomerTrailData(null);
        return;
      }

      setIsCustomerTrailLoading(true);
      try {
        // --- TODO: Implement this backend endpoint ---
        // You'll need a PHP endpoint like `get-customer-trail.php`
        // that takes `customer_id` and `company_id` and returns:
        // {
        //   customer_details: Customer,
        //   current_outstanding_balance: number,
        //   invoices: CustomerInvoiceSummary[],
        //   payments: CustomerPaymentSummary[],
        //   waybills: CustomerWaybillSummary[]
        // }
        // Example API call:
        // const response = await fetch(`https://hariindustries.net/busa-api/database/get-customer-trail.php?customer_id=${selectedCustomerTrailId}&company_id=${user.company_id}`);
        // if (!response.ok) {
        //   throw new Error('Failed to fetch customer trail data.');
        // }
        // const data: CustomerTrailData = await response.json();
        // setCustomerTrailData(data);
        // -----------------------------------------------

        // Mocking the API call for demonstration
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
        const mockCustomerDetails = MOCK_CUSTOMERS.find(c => c.id === selectedCustomerTrailId);

        if (mockCustomerDetails) {
            const mockData: CustomerTrailData = {
                customer_details: mockCustomerDetails,
                current_outstanding_balance: 1250.75, // Example
                invoices: [
                    { id: 'inv001', invoice_number: 'INV-20231001-001', invoice_date: '2023-10-01', total_amount: 500.00, amount_due: 0, status: 'Paid' },
                    { id: 'inv002', invoice_number: 'INV-20231115-002', invoice_date: '2023-11-15', total_amount: 750.75, amount_due: 250.75, status: 'Partially Paid' },
                    { id: 'inv003', invoice_number: 'INV-20231201-003', invoice_date: '2023-12-01', total_amount: 1000.00, amount_due: 1000.00, status: 'Unpaid' },
                ],
                payments: [
                    { id: 'pay001', payment_date: '2023-10-10', amount: 500.00, invoice_number_ref: 'INV-20231001-001', method: 'Bank Transfer' },
                    { id: 'pay002', payment_date: '2023-11-20', amount: 500.00, invoice_number_ref: 'INV-20231115-002', method: 'Cash' },
                ],
                waybills: [
                    { id: 'wb001', waybill_number: 'WB-20231001-001', waybill_date: '2023-10-01', invoice_number_ref: 'INV-20231001-001' },
                    { id: 'wb002', waybill_number: 'WB-20231115-002', waybill_date: '2023-11-15', invoice_number_ref: 'INV-20231115-002' },
                ],
            };
            setCustomerTrailData(mockData);
        } else {
            setCustomerTrailData(null);
            // toast({ variant: 'info', title: 'Customer Not Found', description: 'Could not find details for the selected customer.' });
        }
      } catch (error) {
        console.error("Failed to fetch customer trail:", error);
        toast({ variant: 'destructive', title: 'Error fetching customer trail.', description: 'Could not load customer history.' });
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
    // Ensure at least one item line remains
    if (salesItems.length > 1) {
      setSalesItems(salesItems.filter(item => item.id !== id));
    } else {
      toast({ variant: 'destructive', title: 'Minimum one item required.', description: 'An invoice must have at least one item.' });
    }
  };

  const handleItemLineChange = (id: number, field: keyof SalesItem, value: any) => {
    setSalesItems(salesItems.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        // If item_id changes, update unit_price and item_name from allItems
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
        // Ensure quantity and unit_price are valid numbers
        if (field === 'quantity') {
          updatedItem.quantity = Math.max(0, parseInt(value, 10) || 0); // Quantity cannot be negative
        }
        if (field === 'unit_price') {
          updatedItem.unit_price = Math.max(0, parseFloat(value) || 0); // Price cannot be negative
        }
        return updatedItem;
      }
      return item;
    }));
  };

  // Memoized calculation for total amount and quantity
  const { totalAmount, totalQuantity } = useMemo(() => {
    const total = salesItems.reduce((acc, item) => acc + (item.unit_price * item.quantity), 0);
    const qty = salesItems.reduce((acc, item) => acc + item.quantity, 0);
    return { totalAmount: total, totalQuantity: qty };
  }, [salesItems]);

  const resetForm = () => {
    setInvoiceDate(new Date());
    setDueDate(() => {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      return d;
    });
    setSelectedCustomerId('');
    setNarration('');
    setSalesItems([
      { id: Date.now(), item_id: '', item_name: '', unit_price: 0, quantity: 1 },
    ]);
    setGeneratedInvoice(null); // Clear generated invoice on reset
  };

  const handleGenerateInvoice = async () => {
    // Client-side validation
    if (!selectedCustomerId) {
      toast({ variant: 'destructive', title: 'Missing Customer', description: 'Please select a customer.' });
      return;
    }
    if (!invoiceDate || !dueDate) {
      toast({ variant: 'destructive', title: 'Missing Dates', description: 'Please select both invoice and due dates.' });
      return;
    }
    const hasInvalidItems = salesItems.some(item => !item.item_id || item.quantity <= 0 || item.unit_price <= 0);
    if (hasInvalidItems) {
      toast({ variant: 'destructive', title: 'Invalid Items', description: 'Please ensure all item lines have a selected item, a quantity greater than zero, and a unit price greater than zero.' });
      return;
    }
    if (totalAmount <= 0) {
      toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Total invoice amount must be greater than zero.' });
      return;
    }

    if (!user?.uid || !user?.company_id) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'User or Company ID missing. Please ensure you are logged in.' });
      return;
    }

    setIsLoading(true);

    const payload = {
      customer_id: selectedCustomerId,
      invoice_date: format(invoiceDate, 'yyyy-MM-dd'),
      due_date: format(dueDate, 'yyyy-MM-dd'),
      narration: narration,
      sales_items: salesItems.map(({ id, ...rest }) => rest), // Remove client-side 'id'
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
        throw new Error(errorData.error || `Server responded with status ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        toast({ title: 'Invoice Generated!', description: `Invoice #${result.invoice_number} has been successfully recorded.` });
        setGeneratedInvoice(result.invoice); // Store the generated invoice for display/printing
        // Optionally, reset the form after successful generation if you want a fresh form
        // resetForm();
      } else {
        throw new Error(result.error || 'The server indicated a failure, but did not provide an error message.');
      }

    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Failed to generate invoice.', description: error.message || 'An unexpected error occurred.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrintInvoice = () => {
    if (!generatedInvoice) {
      toast({ variant: 'info', title: 'No Invoice to Print', description: 'Please generate an invoice first.' });
      return;
    }
    // In a real application, you'd open a new window or tab to a print-friendly URL
    // For example: `window.open(`/print/invoice/${generatedInvoice.id}`, '_blank');`
    // This route would render a minimalistic view of the invoice for printing.
    console.log('Printing Invoice:', generatedInvoice.invoice_number);
    toast({ title: 'Printing Invoice', description: `Preparing to print invoice #${generatedInvoice.invoice_number}` });
    // Example: window.open(`/print-preview/invoice/${generatedInvoice.id}`, '_blank');
  };

  const handleGenerateWaybill = () => {
    if (!generatedInvoice) {
      toast({ variant: 'info', title: 'No Invoice to Generate Waybill', description: 'Please generate an invoice first.' });
      return;
    }
    // Similar to print invoice, you'd navigate or open a new window to a waybill print view
    // This waybill view should fetch the invoice's items and customer details, but omit amounts.
    console.log('Generating Waybill for Invoice:', generatedInvoice.invoice_number);
    toast({ title: 'Generating Waybill', description: `Preparing waybill for invoice #${generatedInvoice.invoice_number}` });
    // Example: window.open(`/print-preview/waybill/${generatedInvoice.id}`, '_blank');
  };

  return (
    <>
      <p className="text-muted-foreground mb-6">Manage sales activities and generate related documents.</p>

      <Tabs defaultValue="sale_form" className="w-full">
        <TabsList className="grid w-full grid-cols-5"> {/* Adjusted for 5 tabs */}
          <TabsTrigger value="sale_form">
            <ShoppingCart className="h-4 w-4 mr-2" /> Sale Form
          </TabsTrigger>
          <TabsTrigger value="sales_trail">
            <ListOrdered className="h-4 w-4 mr-2" /> Sales Trail
          </TabsTrigger>
          <TabsTrigger value="invoices">
            <FileText className="h-4 w-4 mr-2" /> Invoices
          </TabsTrigger>
          <TabsTrigger value="waybills">
            <Waypoints className="h-4 w-4 mr-2" /> Waybills
          </TabsTrigger>
          <TabsTrigger value="customers_trail">
            <Users className="h-4 w-4 mr-2" /> Customers Trail
          </TabsTrigger>
        </TabsList>

        {/* Tab Content for Sale Form */}
        <TabsContent value="sale_form">
          <Card>
            <CardHeader>
              <CardTitle>Create Sales Invoice</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6 mb-6">
                <div className="space-y-2">
                  <label className="font-semibold text-sm">Customer</label>
                  <Select
                    value={selectedCustomerId}
                    onValueChange={setSelectedCustomerId}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a customer..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allCustomers.length > 0 ? (
                        allCustomers.map(customer => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-customers" disabled>No customers available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="font-semibold text-sm">Invoice Date</label>
                  <DatePicker date={invoiceDate} onDateChange={setInvoiceDate} disabled={isLoading} />
                </div>
                <div className="space-y-2">
                  <label className="font-semibold text-sm">Due Date</label>
                  <DatePicker date={dueDate} onDateChange={setDueDate} disabled={isLoading} />
                </div>
              </div>

              <div className="space-y-2 mb-6">
                <label className="font-semibold text-sm">Narration / Remarks</label>
                <Textarea
                  placeholder="e.g., Sale of office supplies for project Alpha"
                  value={narration}
                  onChange={(e) => setNarration(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <h3 className="text-lg font-semibold mb-4">Invoice Items</h3>
              <div className="overflow-x-auto mb-4">
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
                          <Select
                            value={line.item_id}
                            onValueChange={(value) => handleItemLineChange(line.id, 'item_id', value)}
                            disabled={isLoading}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select an item..." />
                            </SelectTrigger>
                            <SelectContent>
                              {allItems.length > 0 ? (
                                allItems.map(item => (
                                  <SelectItem key={item.id} value={item.id}>
                                    {item.name}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="no-items" disabled>No items available</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="text-right font-mono"
                            placeholder="0.00"
                            value={line.unit_price || ''}
                            onChange={(e) => handleItemLineChange(line.id, 'unit_price', e.target.value)}
                            onFocus={(e) => e.target.select()}
                            disabled={isLoading}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="text-right font-mono"
                            placeholder="0"
                            value={line.quantity || ''}
                            onChange={(e) => handleItemLineChange(line.id, 'quantity', e.target.value)}
                            onFocus={(e) => e.target.select()}
                            disabled={isLoading}
                          />
                        </TableCell>
                        <TableCell className="text-right font-bold font-mono">
                          {(line.unit_price * line.quantity).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveItemLine(line.id)} disabled={isLoading || salesItems.length <= 1}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={2}>
                        <Button variant="outline" size="sm" onClick={handleAddItemLine} disabled={isLoading}>
                          <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                        </Button>
                      </TableCell>
                      <TableCell className="text-right font-bold text-lg">{totalQuantity}</TableCell>
                      <TableCell className="text-right font-bold font-mono text-lg">
                        {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>

              {generatedInvoice && (
                <div className="mt-6 p-4 border rounded-md bg-green-50/50 dark:bg-green-900/20 border-green-200 dark:border-green-700/50">
                  <h4 className="text-lg font-semibold mb-2 flex items-center text-green-700 dark:text-green-300">
                    <ArrowRight className="h-5 w-5 mr-2" /> Invoice Summary
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-800 dark:text-gray-200">
                    <div><strong>Invoice #:</strong> {generatedInvoice.invoice_number}</div>
                    <div><strong>Status:</strong> <span className={`font-medium ${generatedInvoice.status === 'Paid' ? 'text-green-600' : generatedInvoice.status === 'Unpaid' ? 'text-red-600' : 'text-orange-600'}`}>{generatedInvoice.status}</span></div>
                    <div><strong>Customer:</strong> {generatedInvoice.customer_name}</div>
                    <div><strong>Invoice Date:</strong> {format(new Date(generatedInvoice.invoice_date), 'MMM dd, yyyy')}</div>
                    <div><strong>Total Amount:</strong> {generatedInvoice.total_amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</div>
                    <div><strong>Amount Due:</strong> {generatedInvoice.amount_due.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</div>
                    <div className="col-span-full mt-2 pt-2 border-t border-green-200 dark:border-green-700/50">
                      <div className="flex justify-between">
                        <span>Previous Balance:</span>
                        <span className="font-mono text-gray-700 dark:text-gray-300">
                          {generatedInvoice.previous_balance.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Current Invoice Amount:</span>
                        <span className="font-mono text-gray-700 dark:text-gray-300">
                          {generatedInvoice.current_invoice_balance.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                        </span>
                      </div>
                      <div className="flex justify-between text-lg font-bold text-green-800 dark:text-green-100">
                        <span>Total Customer Balance:</span>
                        <span className="font-mono">
                          {generatedInvoice.total_balance.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </CardContent>
            <CardFooter className="justify-end bg-muted/30 py-4 px-6 rounded-b-lg space-x-2">
              {generatedInvoice && (
                <>
                  <Button variant="outline" size="lg" onClick={handlePrintInvoice} disabled={isLoading}>
                    <Printer className="mr-2 h-4 w-4" /> Print Invoice
                  </Button>
                  <Button variant="outline" size="lg" onClick={handleGenerateWaybill} disabled={isLoading}>
                    <Waypoints className="mr-2 h-4 w-4" /> Generate Waybill
                  </Button>
                </>
              )}
              <Button size="lg" onClick={handleGenerateInvoice} disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate Invoice
              </Button>
              {generatedInvoice && (
                <Button variant="secondary" size="lg" onClick={resetForm} disabled={isLoading}>
                  Reset Form
                </Button>
              )}
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Tab Content for Sales Trail */}
        <TabsContent value="sales_trail">
          <Card>
            <CardHeader>
              <CardTitle>Sales Trail (Listed Sales)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">This section will display a chronological list of all sales transactions. This could include sales orders, invoices, and any related documents, allowing for a complete audit trail of sales activities. You'll likely include filters by date, customer, and status, along with pagination.</p>
              {/* TODO: Create and render a <SalesTrailTable user={user} /> component here */}
              {/* This component would fetch and display data from your sales history/invoices tables. */}
              <div className="flex items-center justify-center h-48 bg-muted rounded-md text-muted-foreground">
                Sales Trail Listing Coming Soon...
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Content for Invoices */}
        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">This section will list all generated invoices. It will include functionality for accountants (based on user roles/permissions) to view, manage, mark as paid or partially paid, and print invoices. Filters for status (paid, unpaid, overdue), customer, and date range would be beneficial.</p>
              {/* TODO: Create and render an <InvoiceListTable user={user} /> component here */}
              {/* This component would fetch and display invoice data, including payment status and actions. */}
              <div className="flex items-center justify-center h-48 bg-muted rounded-md text-muted-foreground">
                Invoice Listing Coming Soon...
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Content for Waybills */}
        <TabsContent value="waybills">
          <Card>
            <CardHeader>
              <CardTitle>Waybills</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">This section will list all generated waybills. Waybills serve as a shipping document and do not carry amount information. Users should be able to view and print waybills, potentially linking them back to the original invoice. Filters for date, customer, and invoice number will be useful.</p>
              {/* TODO: Create and render a <WaybillListTable user={user} /> component here */}
              {/* This component would fetch and display waybill data (linked to invoices), without financial details. */}
              <div className="flex items-center justify-center h-48 bg-muted rounded-md text-muted-foreground">
                Waybill Listing Coming Soon...
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Content for Customers Trail */}
        <TabsContent value="customers_trail">
          <Card>
            <CardHeader>
              <CardTitle>Customers Trail</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <label className="font-semibold text-sm">Select Customer</label>
                <Select
                  value={selectedCustomerTrailId}
                  onValueChange={setSelectedCustomerTrailId}
                  disabled={isCustomerTrailLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a customer to view their trail..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allCustomers.length > 0 ? (
                      allCustomers.map(customer => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-customers" disabled>No customers available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {isCustomerTrailLoading && (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2 text-muted-foreground">Loading customer trail...</span>
                </div>
              )}

              {!isCustomerTrailLoading && customerTrailData && (
                <div className="space-y-6">
                  {/* Customer Contact Information */}
                  <div className="p-4 border rounded-md bg-secondary/20">
                    <h4 className="text-lg font-semibold mb-2">Customer Details: {customerTrailData.customer_details.name}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      <div><strong>Contact Person:</strong> {customerTrailData.customer_details.contact_person || 'N/A'}</div>
                      <div><strong>Email:</strong> {customerTrailData.customer_details.email || 'N/A'}</div>
                      <div><strong>Phone:</strong> {customerTrailData.customer_details.phone || 'N/A'}</div>
                      <div className="col-span-full"><strong>Address:</strong> {customerTrailData.customer_details.address || 'N/A'}</div>
                    </div>
                    <div className="mt-4 p-2 bg-primary/10 rounded-md">
                        <strong className="text-base text-primary-foreground">Current Outstanding Balance: </strong>
                        <span className="font-mono text-xl font-bold text-primary">
                            {customerTrailData.current_outstanding_balance.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                        </span>
                    </div>
                  </div>

                  {/* Invoices */}
                  <div>
                    <h4 className="text-lg font-semibold mb-2">Invoices ({customerTrailData.invoices.length})</h4>
                    {customerTrailData.invoices.length > 0 ? (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Invoice #</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead className="text-right">Total Amount</TableHead>
                              <TableHead className="text-right">Amount Due</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {customerTrailData.invoices.map(invoice => (
                              <TableRow key={invoice.id}>
                                <TableCell>{invoice.invoice_number}</TableCell>
                                <TableCell>{format(new Date(invoice.invoice_date), 'MMM dd, yyyy')}</TableCell>
                                <TableCell className="text-right font-mono">{invoice.total_amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</TableCell>
                                <TableCell className="text-right font-mono">{invoice.amount_due.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</TableCell>
                                <TableCell>
                                    <span className={`font-medium ${invoice.status === 'Paid' ? 'text-green-600' : invoice.status === 'Unpaid' ? 'text-red-600' : 'text-orange-600'}`}>
                                        {invoice.status}
                                    </span>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No invoices found for this customer.</p>
                    )}
                  </div>

                  {/* Payments */}
                  <div>
                    <h4 className="text-lg font-semibold mb-2">Payments Received ({customerTrailData.payments.length})</h4>
                    {customerTrailData.payments.length > 0 ? (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Payment #</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Invoice Ref</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                              <TableHead>Method</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {customerTrailData.payments.map(payment => (
                              <TableRow key={payment.id}>
                                <TableCell>{payment.id}</TableCell>
                                <TableCell>{format(new Date(payment.payment_date), 'MMM dd, yyyy')}</TableCell>
                                <TableCell>{payment.invoice_number_ref || 'N/A'}</TableCell>
                                <TableCell className="text-right font-mono">{payment.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</TableCell>
                                <TableCell>{payment.method}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No payments found for this customer.</p>
                    )}
                  </div>

                  {/* Waybills */}
                  <div>
                    <h4 className="text-lg font-semibold mb-2">Waybills ({customerTrailData.waybills.length})</h4>
                    {customerTrailData.waybills.length > 0 ? (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Waybill #</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Invoice Ref</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {customerTrailData.waybills.map(waybill => (
                              <TableRow key={waybill.id}>
                                <TableCell>{waybill.waybill_number}</TableCell>
                                <TableCell>{format(new Date(waybill.waybill_date), 'MMM dd, yyyy')}</TableCell>
                                <TableCell>{waybill.invoice_number_ref}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No waybills found for this customer.</p>
                    )}
                  </div>

                </div>
              )}

              {!isCustomerTrailLoading && !customerTrailData && selectedCustomerTrailId && (
                <div className="flex items-center justify-center h-48 bg-muted rounded-md text-muted-foreground">
                  No trail data available for the selected customer.
                </div>
              )}
               {!isCustomerTrailLoading && !selectedCustomerTrailId && (
                <div className="flex items-center justify-center h-48 bg-muted rounded-md text-muted-foreground">
                  Select a customer to view their detailed trail.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
};

export default SalesPage;
