'use client';

import React from 'react';
import { PaymentScheduleMandate } from '@/components/PaymentScheduleMandate';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

const mandateData = {
  scheduleNo: 137,
  date: "29/08/2025",
  bankName: "ABU Microfinance Bank",
  bankAddress: "ABU Samaru Zaria.",
  debitAccountNo: "0304001810",
  debitAccountName: "The Postgraduate College ABU/Operating Expenses Acct/01",
  beneficiaries: [
    { s_n: 1, name: "Saifullahi Misbahu", bank: "Jaiz Bank", account_no: "0006106995", amount: 80000.00, purpose: "Monthly Stipend Aug'25" },
    { s_n: 2, name: "Shuaibu Saminu Junaidu", bank: "First Bank", account_no: "3066894880", amount: 80000.00, purpose: '" "' },
    { s_n: 3, name: "Nura Garba", bank: "Union Bank", account_no: "0119927233", amount: 180000.00, purpose: "Refund for Chair" },
    { s_n: 4, name: "Abubakar Balarabe", bank: "Access Bank", account_no: "0055881571", amount: 49000.00, purpose: "Refund for Refreshment" },
  ],
  provostName: "Prof. O.O. Okubanjo",
  financeOfficerName: "Hauwa Yusuf Hassan (Mrs)"
};

const PrintMandatePage = () => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-gray-100 p-8">
        <div className="flex justify-end mb-4 print:hidden">
            <Button onClick={handlePrint}><Printer className="mr-2 h-4 w-4" />Print Mandate</Button>
        </div>
        <PaymentScheduleMandate {...mandateData} />
    </div>
  );
};

export default PrintMandatePage;
