"use client";
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter
} from "@/components/ui/table";
import { DateRange } from 'react-day-picker';
import { addDays, format } from 'date-fns';


const formatCurrency = (amount: number | null | undefined, currency: string = 'USD') => {
    if (amount === null || amount === undefined || isNaN(amount)) {
        return '-';
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
};


// Mock data - replace with API call
const mockLedgerEntries = [
    { date: '2024-07-01', description: 'Opening Balance', debit: null, credit: null, balance: 145000.00 },
    { date: '2024-07-15', description: 'Payment from Customer A', debit: 15000.00, credit: null, balance: 160000.00 },
    { date: '2024-07-22', description: 'Salary Payments', debit: null, credit: 30000.00, balance: 130000.00 },
    { date: '2024-07-28', description: 'Payment to Supplier B', debit: null, credit: 25000.00, balance: 105000.00 },
];

const chartOfAccounts = [
    { code: '101100', name: 'Cash at Bank - Main Account' },
    { code: '101110', name: 'Cash at Bank - Operations Account' },
    { code: '101120', name: 'Cash at Bank - Sales Collection Account' },
    { code: '101130', name: 'Cash at Hand - Head Office' },
    { code: '101140', name: 'Cash at Hand - Factory' },
    { code: '101150', name: 'Cash at Hand - Depot/Branches' },
    { code: '101200', name: 'Trade Receivables - Customers' },
    { code: '101210', name: 'Accounts Receivable Control (AUTO)' },
    { code: '101220', name: 'Staff Debtors' },
    { code: '101230', name: 'Other Receivables' },
    { code: '101240', name: 'Prepayments - Insurance' },
    { code: '101250', name: 'Prepayments - Rent' },
    { code: '101260', name: 'Prepayments - Other' },
    { code: '101300', name: 'Inventory - Raw Materials' },
    { code: '101310', name: 'Inventory Control - Raw Materials (AUTO)' },
    { code: '101320', name: 'Inventory - Work-in-Progress' },
    { code: '101330', name: 'Inventory Control - WIP (AUTO)' },
    { code: '101340', name: 'Inventory - Finished Goods' },
    { code: '101350', name: 'Inventory Control - Finished Goods (AUTO)' },
    { code: '101360', name: 'Inventory - Packaging Materials' },
    { code: '101370', name: 'Inventory - Spare Parts & Consumables' },
    { code: '101400', name: 'Inter-Branch Receivable (AUTO)' },
    { code: '101410', name: 'Withholding Tax Receivable' },
    { code: '101420', name: 'VAT Refundable (Input VAT)' },
    { code: '101430', name: 'Deposits with Suppliers' },
    { code: '102100', name: 'Property, Plant & Equipment Control (AUTO)' },
    { code: '102110', name: 'Land' },
    { code: '102120', name: 'Buildings - Factory' },
    { code: '102130', name: 'Buildings - Administrative' },
    { code: '102140', name: 'Plant & Machinery - Production Lines' },
    { code: '102150', name: 'Borehole & Water Treatment Facilities' },
    { code: '102160', name: 'Factory Generators' },
    { code: '102170', name: 'Motor Vehicles - Distribution' },
    { code: '102180', name: 'Office Equipment' },
    { code: '102190', name: 'Furniture & Fixtures' },
    { code: '102200', name: 'Capital Work-in-Progress (CWIP)' },
    { code: '102300', name: 'Intangible Assets - Software' },
    { code: '102310', name: 'Accumulated Depreciation - Buildings' },
    { code: '102320', name: 'Accumulated Depreciation - Plant & Machinery' },
    { code: '102330', name: 'Accumulated Depreciation - Motor Vehicles' },
    { code: '102340', name: 'Accumulated Depreciation - Office Equipment' },
    { code: '102350', name: 'Impairment Loss Assets' },
    { code: '201010', name: 'Accounts Payable Control (AUTO)' },
    { code: '201020', name: 'Trade Creditors - Suppliers' },
    { code: '201030', name: 'Accrued Expenses' },
    { code: '201040', name: 'Accrued Payroll' },
    { code: '201110', name: 'Payroll Control Account (AUTO)' },
    { code: '201210', name: 'VAT Output Payable' },
    { code: '201220', name: 'VAT Input Offset' },
    { code: '201230', name: 'PAYE Tax Payable' },
    { code: '201240', name: 'Withholding Tax (WHT) Payable' },
    { code: '201250', name: 'Corporate Income Tax Payable' },
    { code: '201260', name: 'Pension Payable' },
    { code: '201270', name: 'NHF Payable' },
    { code: '201280', name: 'NSITF Payable' },
    { code: '201290', name: 'Other Statutory Deductions Payable' },
    { code: '201300', name: 'Short-Term Loan - Bank OD' },
    { code: '201310', name: 'Current Portion of Long-Term Loan' },
    { code: '201400', name: 'Inter-Branch Payable (AUTO)' },
    { code: '202100', name: 'Long-Term Loan - Bank' },
];


const GeneralLedgerPage = () => {
  const [ledgerEntries, setLedgerEntries] = useState(mockLedgerEntries);
  const [selectedAccount, setSelectedAccount] = useState('101100');
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
    from: new Date(2024, 6, 1),
    to: addDays(new Date(2024, 6, 31), 0),
  })

  const endingBalance = ledgerEntries.length > 0 ? ledgerEntries[ledgerEntries.length - 1].balance : 0;
  const selectedAccountName = chartOfAccounts.find(acc => acc.code === selectedAccount)?.name || '';

  return (
    <div className="container mx-auto p-4 md:p-8">
        <Card className="max-w-5xl mx-auto">
            <CardHeader>
                <CardTitle>General Ledger</CardTitle>
                <CardDescription>
                    View the detailed transaction history for any account.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex flex-col md:flex-row gap-4 mb-6 p-4 border rounded-lg items-end bg-muted/20">
                    <div className="flex-1 space-y-2">
                        <label htmlFor="account-select" className="font-semibold text-sm">Account</label>
                        <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                            <SelectTrigger id="account-select">
                                <SelectValue placeholder="Select an account..." />
                            </SelectTrigger>
                            <SelectContent>
                                {chartOfAccounts.map(account => (
                                    <SelectItem key={account.code} value={account.code}>
                                        {account.code} - {account.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex-1 space-y-2">
                         <label htmlFor="date-range" className="font-semibold text-sm">Date Range</label>
                         <DateRangePicker date={dateRange} onDateChange={setDateRange} id="date-range"/>
                    </div>
                    <div className="self-end">
                        <Button>View Ledger</Button>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Account: {selectedAccount} - {selectedAccountName}</CardTitle>
                        <CardDescription>
                            Transactions from {dateRange?.from ? format(dateRange.from, 'LLL dd, y') : ''} to {dateRange?.to ? format(dateRange.to, 'LLL dd, y') : ''}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Debit</TableHead>
                                    <TableHead className="text-right">Credit</TableHead>
                                    <TableHead className="text-right">Balance</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {ledgerEntries.map((entry, index) => (
                                    <TableRow key={index}>
                                        <TableCell>{format(new Date(entry.date), 'dd-MM-yyyy')}</TableCell>
                                        <TableCell>{entry.description}</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(entry.debit)}</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(entry.credit)}</TableCell>
                                        <TableCell className="text-right font-mono font-semibold">{formatCurrency(entry.balance)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                            <TableFooter>
                                <TableRow>
                                    <TableCell colSpan={4} className="text-right font-bold">Ending Balance</TableCell>
                                    <TableCell className="text-right font-bold font-mono">{formatCurrency(endingBalance)}</TableCell>
                                </TableRow>
                            </TableFooter>
                        </Table>
                    </CardContent>
                </Card>

            </CardContent>
        </Card>
    </div>
  );
};

export default GeneralLedgerPage;
