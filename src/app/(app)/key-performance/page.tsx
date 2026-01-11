'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const financialData = [
  { name: 'Total Revenue', value: 1250450 },
  { name: 'Outstanding Balance', value: 150200 },
  { name: 'Overdue Invoices', value: 35500 },
];

const KeyPerformanceChart = () => {
  return (
    <div className="w-full min-h-[320px] p-6 rounded-xl bg-gray-50">
      <h2 className="text-xl font-bold mb-4">Key Performance Overview</h2>
      <div className="w-full h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={financialData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <XAxis dataKey="name" angle={-20} textAnchor="end" height={50} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#4F46E5" barSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default KeyPerformanceChart;
