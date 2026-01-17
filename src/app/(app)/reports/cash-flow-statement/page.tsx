'use client';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Construction, Wind } from 'lucide-react';

const CashFlowStatementPage = () => {
  const [startDate, setStartDate] = React.useState<Date | undefined>(
    new Date(new Date().getFullYear(), 0, 1)
  );
  const [endDate, setEndDate] = React.useState<Date | undefined>(new Date());

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight flex items-center">
        <Wind className="mr-3 h-8 w-8" /> Cash Flow Statement
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>Report Controls</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">From Date</label>
            <DatePicker date={startDate} setDate={setStartDate} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">To Date</label>
            <DatePicker date={endDate} setDate={setEndDate} />
          </div>
          <Button disabled>Generate Report</Button>
        </CardContent>
      </Card>

      <Card className="border-dashed border-cyan-500 bg-cyan-50">
        <CardHeader className="flex-row items-center gap-4">
          <Construction className="h-8 w-8 text-cyan-600" />
          <CardTitle className="text-cyan-800">Under Construction</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-cyan-700">
            The Cash Flow Statement is currently under development. This report requires a sophisticated mapping of ledger transactions to cash flow activities (Operating, Investing, Financing).
          </p>
          <p className="mt-4 text-sm text-cyan-600">
            Future implementation will involve analyzing changes in balance sheet accounts and adjusting net income for non-cash items to accurately reflect cash movements.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default CashFlowStatementPage;
