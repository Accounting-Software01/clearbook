'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Search, Package, ShoppingCart, Trash2, PlusCircle, Settings, Clock, Tag, User, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

// UI Components
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';


// Hooks and Libs
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { apiEndpoints } from '@/lib/apiEndpoints';

// --- Types --- 
interface Customer {
  id: string;
  name: string;
  balance: number;
  price_tier: string;
}

interface Item {
  id: string;
  name: string;
  code: string; // Assuming items have a code
  category: string; // Assuming items have a category
  stock: number;
  base_price: number;
  price_tiers: Record<string, number>;
}

interface CartItem extends Item {
    quantity: number;
    unit_price: number;
    discount: number;
    vat: number;
}

const currencyFormatter = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' });

// --- Sub-components ---

const ProductListItem = ({ product, onAddToCart, disabled }: { product: Item, onAddToCart: (product: Item) => void, disabled: boolean }) => (
    <Card 
        className={`hover:shadow-md ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`} 
        onClick={() => !disabled && onAddToCart(product)}
    >
        <CardContent className="p-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
                <div className="bg-gray-100 p-3 rounded-lg"><Package className="h-6 w-6 text-gray-500" /></div>
                <div>
                    <p className="font-semibold">{product.name}</p>
                    <div className="text-sm text-muted-foreground flex gap-4">
                        <span><Tag className="h-3 w-3 inline-block mr-1" />{product.code || 'N/A'}</span>
                        <span><Badge variant="outline">{product.category || 'N/A'}</Badge></span>
                    </div>
                </div>
            </div>
            <div className="text-right">
                <p className="font-bold text-primary text-lg">{currencyFormatter.format(product.base_price)}</p>
                <p className="text-sm text-muted-foreground">Stock: {product.stock}</p>
            </div>
        </CardContent>
    </Card>
);

const CartItemView = ({ item, onRemove, onQuantityChange }: { item: CartItem, onRemove: (id: string) => void, onQuantityChange: (id: string, quantity: number) => void }) => (
    <div className="flex justify-between items-center mb-4">
        <div>
            <p className="font-semibold">{item.name}</p>
            <p className="text-sm text-muted-foreground">{currencyFormatter.format(item.unit_price)}</p>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onQuantityChange(item.id, item.quantity - 1)} disabled={item.quantity <= 1}>-</Button>
            <Input 
                type="number" 
                className="w-16 h-8 text-center" 
                value={item.quantity}
                onChange={(e) => onQuantityChange(item.id, parseInt(e.target.value, 10) || 1)}
            />
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onQuantityChange(item.id, item.quantity + 1)}>+</Button>
            <p className="font-bold w-24 text-right">{currencyFormatter.format(item.unit_price * item.quantity)}</p>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onRemove(item.id)}>
                <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
        </div>
    </div>
);


const EmptyCart = () => (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <ShoppingCart className="h-16 w-16 mb-4" />
        <h3 className="text-lg font-semibold">Cart is empty</h3>
        <p className="text-sm">Select a customer, then add products</p>
    </div>
);

const RecentTransactions = ({ companyId }: { companyId?: string }) => {
    const [transactions, setTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!companyId) {
            setIsLoading(false);
            return;
        }
        
        fetch(`https://hariindustries.net/api/clearbook/get-sales-trail.php?company_id=${companyId}`)
            .then(res => {
                if (!res.ok) throw new Error('Network response was not ok');
                return res.json();
            })
            .then(data => {
                setTransactions(data);
                setIsLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setIsLoading(false);
            });
    }, [companyId]);


    if (isLoading) return <div><Loader2 className="h-4 w-4 animate-spin" /> Loading transactions...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <div>
            <h3 className="text-lg font-semibold mb-2">Recent Transactions</h3>
            {transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent transactions found.</p>
            ) : (
                <ul className="space-y-2">
                    {transactions.map((txn: any) => (
                        <li key={txn.id} className="flex justify-between items-center p-2 bg-gray-100 dark:bg-gray-800 rounded-md">
                            <div>
                                <p className="font-semibold">{txn.item_name || 'Sale'}</p>
                                <p className="text-sm text-muted-foreground">Invoice #{txn.invoice_number}</p>
                            </div>
                            <div className="text-right">
                                <p className="font-semibold">{currencyFormatter.format(txn.total_amount || 0)}</p>
                                <p className="text-sm text-muted-foreground">{txn.created_at ? format(new Date(txn.created_at), 'p') : ''}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

const RecentInvoices = ({ companyId }: { companyId?: string }) => {
    const [invoices, setInvoices] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { user } = useAuth();
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!companyId) {
            setIsLoading(false);
            return;
        }

        fetch(`https://hariindustries.net/api/clearbook/get-sales-invoices.php?company_id=${companyId}`)
            .then(res => {
                if (!res.ok) throw new Error('Network response was not ok');
                return res.json();
            })
            .then(data => {
                setInvoices(data);
                setIsLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setIsLoading(false);
            });
    }, [companyId]);

    const handlePrint = (invoiceId: string) => {
        // Ensure we have the IDs before opening the window
        if (!user?.uid || !companyId) {
            alert('Error: Could not get user or company information to print.');
            return;
        }
    
        const printUrl = `https://hariindustries.net/print.php?invoice_id=${invoiceId}&company_id=${companyId}&user_id=${user.uid}`;
        
        window.open(printUrl, '_blank');
    };
    

    if (isLoading) return <div><Loader2 className="h-4 w-4 animate-spin" /> Loading invoices...</div>;
    if (error) return <div>Error: {error}</div>;

     return (
        <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Recent Invoices</h3>
             {invoices.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent invoices found.</p>
            ) : (
                <ul className="space-y-2">
                    {invoices.map((invoice: any) => (
                        <li key={invoice.id} className="flex justify-between items-center p-2 bg-gray-100 dark:bg-gray-800 rounded-md">
                            <div>
                                <p className="font-semibold">Invoice #{invoice.invoice_number || invoice.id}</p>
                                <p className="text-sm text-muted-foreground">{invoice.customer_name}</p>
                            </div>
                            <div className="flex items-center gap-2">
                               <p className="font-semibold">{currencyFormatter.format(invoice.total_amount || 0)}</p>
                               
                                <Button variant="outline" size="sm" onClick={() => handlePrint(invoice.id)}>Print</Button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

// --- Main POS Component ---

export default function PointOfSalePage() {
    const { toast } = useToast();
    const { user } = useAuth();

    const [vatRate, setVatRate] = useState(7.5);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Data state
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    
    // POS state
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
    const [activeCategory, setActiveCategory] = useState('All Products');
    const [cart, setCart] = useState<CartItem[]>([]);

    useEffect(() => {
        setCart(currentCart => currentCart.map(item => {
            const grossAmount = item.unit_price * item.quantity;
            const newVat = (grossAmount - item.discount) * (vatRate / 100);
            return { ...item, vat: newVat };
        }));
    }, [vatRate]);
    
    const fetchInitialData = useCallback(async () => {
        if (!user?.company_id) return;
        setIsLoading(true);
        try {
            const [customersRes, itemsRes] = await Promise.all([
                fetch(apiEndpoints.getCustomersInfo(user.company_id)),
                fetch(`${apiEndpoints.getSellableItems}?company_id=${user.company_id}`),
            ]);

            if (!customersRes.ok || !itemsRes.ok) throw new Error('Failed to fetch initial data.');

            const customersData = await customersRes.json();
            const itemsData = await itemsRes.json();

            if (customersData.success) setCustomers(customersData.data);
            setItems(itemsData);
            
            const uniqueCategories = ['All Products', ...new Set(itemsData.map((i: Item) => i.category).filter(Boolean))];
            setCategories(uniqueCategories);

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error fetching data', description: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        if (user?.company_id) fetchInitialData();
    }, [user, fetchInitialData]);

    const selectedCustomer = useMemo(() => customers.find(c => c.id === selectedCustomerId), [selectedCustomerId, customers]);

    const handleAddToCart = (product: Item) => {
        if (!selectedCustomerId) {
            toast({ variant: 'destructive', title: 'Please select a customer first.'});
            return;
        }
    
        const customerTier = selectedCustomer?.price_tier;
        const unit_price = customerTier && product.price_tiers[customerTier] 
            ? product.price_tiers[customerTier] 
            : product.base_price;
    
        setCart(prevCart => {
            const existingItem = prevCart.find(item => item.id === product.id);
            if (existingItem) {
                // Just increment the quantity by 1
                return prevCart.map(item => {
                    if (item.id === product.id) {
                        const newQuantity = item.quantity + 1;
                        const grossAmount = item.unit_price * newQuantity;
                        const newVat = (grossAmount - item.discount) * (vatRate / 100);
                        return { ...item, quantity: newQuantity, vat: newVat };
                    }
                    return item;
                });
            } else {
                // Add the new item to the cart
                const grossAmount = unit_price * 1;
                const newVat = (grossAmount - 0) * (vatRate / 100);
                return [...prevCart, { ...product, quantity: 1, unit_price, discount: 0, vat: newVat }];
            }
        });
    };
  
    const handleQuantityChange = (itemId: string, newQuantity: number) => {
        if (newQuantity < 1) {
            // If the user tries to go below 1, remove the item instead
            handleRemoveFromCart(itemId);
            return;
        }

        setCart(prevCart => prevCart.map(item => {
            if (item.id === itemId) {
                const grossAmount = item.unit_price * newQuantity;
                const newVat = (grossAmount - item.discount) * (vatRate / 100);
                return { ...item, quantity: newQuantity, vat: newVat };
            }
            return item;
        }));
    };

    
    const handleRemoveFromCart = (itemId: string) => {
        setCart(prevCart => prevCart.filter(item => item.id !== itemId));
    };

    const handleClearCart = () => setCart([]);

    const { subTotal, totalDiscount, totalVAT, grandTotal } = useMemo(() => {
        let sub = 0, discount = 0, vat = 0;
        cart.forEach(item => {
            sub += item.unit_price * item.quantity;
            discount += item.discount;
            vat += item.vat;
        });
        return { subTotal: sub, totalDiscount: discount, totalVAT: vat, grandTotal: sub - discount + vat };
    }, [cart]);


    const handleCompleteSale = async () => {
        if (!selectedCustomerId || cart.length === 0) {
            toast({ variant: 'destructive', title: 'Validation Error', description: 'Please select a customer and add items to the cart.' });
            return;
        }
        if (!user?.uid || !user?.company_id) {
            toast({ variant: 'destructive', title: 'Authentication Error', description: 'User not logged in.' });
            return;
        }

        setIsSubmitting(true);
        const payload = {
            customer_id: selectedCustomerId,
            invoice_date: format(new Date(), 'yyyy-MM-dd'),
            due_date: format(new Date(), 'yyyy-MM-dd'),
            payment_type: 'Cash', 
            narration: `Point of Sale transaction on ${format(new Date(), 'PPP')}`,
            sales_items: cart.map(item => ({ 
                item_id: item.id.toString(),
                item_name: item.name,
                unit_price: item.unit_price,
                quantity: item.quantity,
                discount: item.discount,
                vat: item.vat,
            })),
            sub_total: subTotal,
            total_discount: totalDiscount,
            total_vat: totalVAT,
            grand_total: grandTotal,
            status: 'Posted', 
            user_id: user.uid,
            company_id: user.company_id,
        };

        try {
            const response = await fetch(apiEndpoints.salesInvoice, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Failed to complete sale.');
            }
            toast({ title: "Sale Completed!", description: `Invoice ${result.invoice.invoice_number} created.` });
            handleClearCart();
            setSelectedCustomerId('');
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to complete sale.', description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const filteredProducts = items.filter(p => activeCategory === 'All Products' || p.category === activeCategory);
    
    if (isLoading) {
        return <div className="flex items-center justify-center h-screen"><Loader2 className="h-12 w-12 animate-spin" /><p className='ml-4 text-lg'>Loading POS...</p></div>
    }

    return (
        <div className="flex flex-col h-screen bg-gray-50/50">
            <header className="flex items-center justify-between p-4 bg-white border-b">
                <h1 className="text-2xl font-bold">Point of Sale</h1>
                <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId} disabled={isSubmitting || cart.length > 0}>
                    <SelectTrigger className="w-[280px]">
                        <User className="h-4 w-4 mr-2 text-muted-foreground"/>
                        <SelectValue placeholder="Select a customer..." />
                    </SelectTrigger>
                    <SelectContent>
                        {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </header>

            <main className="flex-1 flex gap-4 p-4 overflow-hidden">
                {/* Products Section */}
                <div className="flex-[3] flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input placeholder="Search products by name, code..." className="pl-10" />
                        </div>
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="outline"><Clock className="mr-2 h-4 w-4" /> Recent</Button>
                            </SheetTrigger>
                            <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
                                <SheetHeader>
                                    <SheetTitle>Recent Activity</SheetTitle>
                                </SheetHeader>
                                <div className="py-4">
                                    <RecentTransactions companyId={user?.company_id} />
                                    <Separator className="my-6" />
                                    <RecentInvoices companyId={user?.company_id} />
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        {categories.map(cat => (
                            <Button key={cat} variant={activeCategory === cat ? 'default' : 'outline'} onClick={() => setActiveCategory(cat)}>{cat}</Button>
                        ))}
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                        {filteredProducts.map(product => (
                            <ProductListItem key={product.id} product={product} onAddToCart={handleAddToCart} disabled={!selectedCustomerId || isSubmitting}/>
                        ))}
                    </div>
                </div>

                {/* Cart Section */}
                <Card className="flex-[2] flex flex-col">
                    <CardHeader className="flex-row items-center justify-between">
                        <CardTitle>Cart Items ({cart.reduce((acc, item) => acc + item.quantity, 0)})</CardTitle>
                        <Button variant="destructive" size="sm" onClick={handleClearCart} disabled={cart.length === 0 || isSubmitting}>
                            <Trash2 className="mr-2 h-4 w-4" /> Clear
                        </Button>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col justify-between p-4">
                        <div className="flex-1 overflow-y-auto">

                           {cart.length > 0 ? cart.map(item => <CartItemView key={item.id} item={item} onRemove={handleRemoveFromCart} onQuantityChange={handleQuantityChange} />) : <EmptyCart />}

                        </div>
                        <div>
                          <Separator className="my-4" />
                          <div className="space-y-2 text-sm">
                              <div className="flex justify-between"><span>Subtotal:</span> <span className="font-medium">{currencyFormatter.format(subTotal)}</span></div>
                                <div className="flex justify-between items-center">
                                    <label htmlFor="vat-rate" className="flex items-center gap-2">Tax (%):</label>
                                    <div className="flex items-center gap-2">
                                        <Input 
                                            id="vat-rate"
                                            type="number" 
                                            className="w-20 h-8 text-right"
                                            value={vatRate}
                                            onChange={(e) => setVatRate(parseFloat(e.target.value) || 0)}
                                            disabled={isSubmitting}
                                        />
                                        <span className="font-medium w-24 text-right">{currencyFormatter.format(totalVAT)}</span>
                                    </div>
                                </div>
                              <div className="flex justify-between text-lg font-bold"><span >Total:</span> <span>{currencyFormatter.format(grandTotal)}</span></div>
                          </div>
                          <Button size="lg" className="w-full mt-4" onClick={handleCompleteSale} disabled={cart.length === 0 || isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} 
                            Complete Sale
                          </Button>
                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
