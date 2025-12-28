'use client';

import React from 'react';
import Image from 'next/image';
import { numberToWords } from '@/lib/number-to-words';

// Define the types for the component props
interface Beneficiary {
  s_n: number;
  name: string;
  bank: string;
  account_no: string;
  amount: number;
  purpose: string;
}

interface PaymentScheduleMandateProps {
  scheduleNo: number;
  date: string;
  bankName: string;
  bankAddress: string;
  debitAccountNo: string;
  debitAccountName: string;
  beneficiaries: Beneficiary[];
  provostName: string;
  financeOfficerName: string;
}

// The component itself
export const PaymentScheduleMandate: React.FC<PaymentScheduleMandateProps> = ({ 
    scheduleNo, 
    date, 
    bankName,
    bankAddress, 
    debitAccountNo, 
    debitAccountName,
    beneficiaries, 
    provostName,
    financeOfficerName
}) => {

    const totalAmount = beneficiaries.reduce((sum, b) => sum + b.amount, 0);

    return (
        <div className="bg-white p-8 max-w-4xl mx-auto border border-gray-300 font-serif">
            {/* Header Section */}
            <div className="flex justify-between items-center mb-4">
                <div className="w-24 h-24 relative">
                     <Image src="/abu_logo.png" alt="Logo" fill style={{ objectFit: 'contain' }} />
                </div>
                <div className="text-center">
                    <h1 className="text-xl font-bold">THE POSTGRADUATE COLLEGE</h1>
                    <h2 className="text-lg font-bold">AHMADU BELLO UNIVERSITY, ZARIA</h2>
                    <p className="text-sm">(Office of the Finance Officer)</p>
                    <h3 className="text-md font-bold mt-2">e-PAYMENT MANDATE SCHEDULE</h3>
                    <p className="text-sm">AUGUST, 2025</p>
                </div>
                <div className="w-24 h-24 relative">
                     <Image src="/abu_logo.png" alt="Logo" fill style={{ objectFit: 'contain' }} />
                </div>
            </div>

            {/* Schedule Info */}
            <div className="flex justify-between items-center mb-6">
                <p><strong>SCHEDULE {scheduleNo}</strong></p>
                <p><strong>DATE: {date}</strong></p>
            </div>

            {/* Bank Address */}
            <div className="mb-6">
                <p>The Manager,</p>
                <p>{bankName},</p>
                <p>{bankAddress}</p>
            </div>
            
            {/* Debit Instruction */}
            <div className="text-sm mb-4">
                <p>Kindly credit the account of the underlisted beneficiary(s) and debit our Account No. <strong>{debitAccountNo}</strong></p>
                 <p>The Postgraduate College ABU/Operating Expenses Acct/01</p>
            </div>

            {/* Beneficiary Table */}
            <table className="w-full border-collapse border border-black mb-4 text-sm">
                <thead>
                    <tr className="border border-black">
                        <th className="border border-black p-1">S/N</th>
                        <th className="border border-black p-1">Name of Beneficiary</th>
                        <th className="border border-black p-1">BANK</th>
                        <th className="border border-black p-1">Account No</th>
                        <th className="border border-black p-1">Amount (N)</th>
                        <th className="border border-black p-1">PURPOSE OF PAYMENT</th>
                    </tr>
                </thead>
                <tbody>
                    {beneficiaries.map((b) => (
                        <tr key={b.s_n} className="border border-black">
                            <td className="border border-black p-1 text-center">{b.s_n}</td>
                            <td className="border border-black p-1">{b.name}</td>
                            <td className="border border-black p-1">{b.bank}</td>
                            <td className="border border-black p-1 text-center">{b.account_no}</td>
                            <td className="border border-black p-1 text-right">{b.amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</td>
                            <td className="border border-black p-1">{b.purpose}</td>
                        </tr>
                    ))}
                     <tr className="font-bold">
                        <td colSpan={4} className="p-1 text-right">TOTAL</td>
                        <td className="border border-black p-1 text-right">{totalAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</td>
                        <td></td>
                    </tr>
                </tbody>
            </table>

            {/* Amount in Words */}
            <div className="flex mb-12">
                <strong className="mr-4">Amount in words:</strong>
                <div className="flex-1 border-b border-black text-center font-bold">
                    {numberToWords(totalAmount)}
                </div>
            </div>

            {/* Signatories */}
            <div className="flex justify-around mt-16">
                <div className="text-center">
                    <p className="border-t border-black pt-1">Authorized Signatory</p>
                    <p className="font-bold mt-4">{provostName}</p>
                    <p>Provost</p>
                </div>
                <div className="text-center">
                    <p className="border-t border-black pt-1">Authorized Signatory</p>
                     <p className="font-bold mt-4">{financeOfficerName}</p>
                    <p>Finance Officer</p>
                </div>
            </div>

        </div>
    );
};
