'use client';
import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { toWords } from 'number-to-words';
import type { Account } from '@/lib/chart-of-accounts';

interface IndividualVoucherPrintProps {
    voucher: any;
    chartOfAccounts: Account[];
}

// Helper function to format the number into a currency string
const toCurrencyWords = (amount: number | string) => {
    const number = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(number) || number < 0) return 'Invalid amount';

    // Convert the number to words (e.g., "one thousand two hundred thirty-four")
    const words = toWords(number);

    // Capitalize the first letter of each word
    const capitalizedWords = words.replace(/\b(\w)/g, s => s.toUpperCase());

    return `${capitalizedWords} Naira Only`;
};


const IndividualVoucherPrint = React.forwardRef<HTMLDivElement, IndividualVoucherPrintProps>((props, ref) => {
    const { voucher, chartOfAccounts } = props;

    const accountsMap = useMemo(() => {
        const newMap = new Map<string, string>();
        if (Array.isArray(chartOfAccounts)) {
            chartOfAccounts.forEach((acc) => {
                newMap.set(acc.code, acc.name);
            });
        }
        return newMap;
    }, [chartOfAccounts]);

    // Memoize the amount in words conversion
    const debitAmountInWords = useMemo(() => {
        if (voucher?.total_debits) {
            return toCurrencyWords(voucher.total_debits);
        }
        return 'N/A';
    }, [voucher?.total_debits]);

    if (!voucher) {
        return <div ref={ref} className="p-10 font-sans">Voucher data is not available.</div>;
    }

    const logoUrl = voucher.company_logo ? `https://hariindustries.net/clearbook/${voucher.company_logo}` : null;

    return (
        <div ref={ref} className="p-10 bg-white text-[#001a4e] font-sans text-xs">
            {/* Header */}
            <header className="mb-8">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                        {logoUrl && <img src={logoUrl} alt="Company Logo" className="h-20 w-20 object-contain" />}
                        <div>
                            <h1 className="text-3xl font-bold text-[#001a4e]">{voucher.company_name || 'Your Company'}</h1>
                            <p className="text-lg text-[#001a4e]">Payment Voucher</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="font-semibold text-lg">Voucher No: {voucher.voucher_number}</p>
                        <p>Date: {voucher.entry_date ? format(new Date(voucher.entry_date), 'dd-MMM-yyyy') : 'N/A'}</p>
                    </div>
                </div>
            </header>

            {/* Payee and Amount Details */}
            <section className="mb-6 p-4 border border-[#001a4e] rounded-md bg-[#e6f0ff]">
                 <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                        <span className="font-semibold">Payee:</span>
                        <span className="ml-2">{accountsMap.get(voucher.lines?.find((l: any) => parseFloat(l.credit) > 0)?.account_id) || 'N/A'}</span>
                    </div>
                    <div className="text-right font-bold text-lg">
                        Amount: {parseFloat(voucher.total_debits).toLocaleString('en-NG', { style: 'currency', currency: 'NGN' })}
                    </div>
                </div>
                <div className="mt-2">
                    <span className="font-semibold">Amount in Words:</span>
                    <span className="ml-2 capitalize italic">{debitAmountInWords}</span>
                </div>
            </section>
            
            {/* Narration */}
            <section className="mb-6">
                <p><span className="font-semibold">Narration:</span> {voucher.narration}</p>
            </section>

            {/* Table for Voucher Lines */}
            <section className="mb-8">
                <table className="w-full border-collapse text-left">
                    <thead className="bg-[#001a4e] text-white">
                        <tr>
                            <th className="p-2 w-1/5">Account ID</th>
                            <th className="p-2 w-2/5">Account Name</th>
                            <th className="p-2 w-1/5 text-right">Debit</th>
                            <th className="p-2 w-1/5 text-right">Credit</th>
                        </tr>
                    </thead>
                    <tbody>
                        {voucher.lines && voucher.lines.map((line: any, index: number) => (
                            <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-[#e6f0ff]'}>
                                <td className="p-2">{line.account_id}</td>
                                <td className="p-2">{accountsMap.get(line.account_id) || 'Account Not Found'}</td>
                                <td className="p-2 text-right font-mono">{parseFloat(line.debit).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                <td className="p-2 text-right font-mono">{parseFloat(line.credit).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="font-bold bg-[#001a4e] text-white">
                        <tr>
                            <td colSpan={2} className="p-2 text-right">TOTAL</td>
                            <td className="p-2 text-right font-mono">{parseFloat(voucher.total_debits).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                            <td className="p-2 text-right font-mono">{parseFloat(voucher.total_credits).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                        </tr>
                    </tfoot>
                </table>
            </section>
            
            {/* Approval and Signature Section */}
            <footer className="mt-12">
                <div className="grid grid-cols-3 gap-8 text-center">
                    <div>
                        <div className="border-t-2 border-dashed border-[#001a4e] pt-2">
                             <p className="font-semibold">{voucher.user_name || 'N/A'}</p>
                             <p className="text-xs text-gray-500">Prepared By</p>
                        </div>
                    </div>
                     <div>
                        <div className="border-t-2 border-dashed border-[#001a4e] pt-2">
                             <p className="font-semibold">&nbsp;</p> {/* Placeholder for name */}
                             <p className="text-xs text-gray-500">Checked By</p>
                        </div>
                    </div>
                     <div>
                        <div className="border-t-2 border-dashed border-[#001a4e] pt-2">
                             <p className="font-semibold">&nbsp;</p> {/* Placeholder for name */}
                             <p className="text-xs text-gray-500">Approved & Received By</p>
                        </div>
                    </div>
                </div>
                <div className="text-center text-xs text-gray-400 mt-10">
                    <p>Printed on {format(new Date(), 'dd-MMM-yyyy hh:mm a')} from ClearBook</p>
                </div>
            </footer>
        </div>
    );
});

IndividualVoucherPrint.displayName = 'IndividualVoucherPrint';
export default IndividualVoucherPrint;
