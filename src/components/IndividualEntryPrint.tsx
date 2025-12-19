'use client';
import React, { useMemo } from 'react';
import { format } from 'date-fns';
import type { Account } from '@/lib/chart-of-accounts';

interface IndividualEntryPrintProps {
    entry: any;
    chartOfAccounts: Account[];
}

const IndividualEntryPrint = React.forwardRef<HTMLDivElement, IndividualEntryPrintProps>((props, ref) => {
    const { entry, chartOfAccounts } = props;

    const accountsMap = useMemo(() => {
        const newMap = new Map<string, string>();
        if (Array.isArray(chartOfAccounts)) {
            chartOfAccounts.forEach((acc) => {
                newMap.set(acc.code, acc.name);
            });
        }
        return newMap;
    }, [chartOfAccounts]);

    if (!entry) {
        return <div ref={ref} className="p-10 font-sans">Entry data is not available.</div>;
    }

    const logoUrl = entry.company_logo ? `https://hariindustries.net/clearbook/${entry.company_logo}` : null;

    return (
        <div ref={ref} className="p-10 bg-white text-[#001a4e] font-sans text-xs">
            {/* Header */}
            <header className="mb-8">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                        {logoUrl && <img src={logoUrl} alt="Company Logo" className="h-20 w-20 object-contain" />}
                        <div>
                            <h1 className="text-3xl font-bold text-[#001a4e]">{entry.company_name || 'Your Company'}</h1>
                            <p className="text-lg text-[#001a4e]">Journal Entry</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="font-semibold text-lg">Entry No: {entry.entry_number}</p>
                        <p>Date: {entry.entry_date ? format(new Date(entry.entry_date), 'dd-MMM-yyyy') : 'N/A'}</p>
                    </div>
                </div>
            </header>

            {/* Narration */}
            <section className="mb-6">
                <p><span className="font-semibold">Narration:</span> {entry.narration}</p>
            </section>

            {/* Table for Entry Lines */}
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
                        {entry.lines && entry.lines.map((line: any, index: number) => (
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
                            <td className="p-2 text-right font-mono">{parseFloat(entry.total_debits).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                            <td className="p-2 text-right font-mono">{parseFloat(entry.total_credits).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                        </tr>
                    </tfoot>
                </table>
            </section>
            
            {/* Approval and Signature Section */}
            <footer className="mt-12">
                <div className="grid grid-cols-3 gap-8 text-center">
                    <div>
                        <div className="border-t-2 border-dashed border-[#001a4e] pt-2">
                             <p className="font-semibold">{entry.user_name || 'N/A'}</p>
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

IndividualEntryPrint.displayName = 'IndividualEntryPrint';
export default IndividualEntryPrint;