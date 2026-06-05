// app/production-trail/page.tsx
'use client';

import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface ProductionBatch {
  id: number;
  batch_number: string;
  production_date: string;
  shift: string;
  operator_name: string;
  status: string;
  batch_type: 'injection' | 'blowing';
  // Injection specific
  preform_type?: string;
  good_preforms_qty?: number;
  bad_preforms_qty?: number;
  resin_used_kg?: number;
  masterbatch_used_kg?: number;
  // Blowing specific
  finished_product?: string;
  total_packs?: number;
  total_pieces?: number;
  bottles_produced?: number;
  bottles_damaged?: number;
  finished_pallets?: number;
  created_at: string;
}

interface FilterOptions {
  startDate: string;
  endDate: string;
  shift: string;
  batchType: string;
  productType: string;
}

export default function ProductionTrailPage() {
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [filteredBatches, setFilteredBatches] = useState<ProductionBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterOptions>({
    startDate: '',
    endDate: '',
    shift: '',
    batchType: '',
    productType: '',
  });
  const [statistics, setStatistics] = useState({
    totalBatches: 0,
    totalInjectionQty: 0,
    totalBlowingQty: 0,
    avgEfficiency: 0,
    totalScrap: 0,
  });

  useEffect(() => {
    fetchProductionData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [batches, filters]);

  const fetchProductionData = async () => {
    setLoading(true);
    try {
      const companyId = 'HARI123'; // Get from session/context
      const [injectionRes, blowingRes] = await Promise.all([
        fetch(`/api/production?type=injection&company_id=${companyId}`),
        fetch(`/api/production?type=blowing&company_id=${companyId}`),
      ]);

      const injectionData = await injectionRes.json();
      const blowingData = await blowingRes.json();

      const injectionBatches = (injectionData.data || []).map((batch: any) => ({
        ...batch,
        batch_type: 'injection' as const,
      }));

      const blowingBatches = (blowingData.data || []).map((batch: any) => ({
        ...batch,
        batch_type: 'blowing' as const,
      }));

      const allBatches = [...injectionBatches, ...blowingBatches].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setBatches(allBatches);
      calculateStatistics(allBatches);
    } catch (error) {
      console.error('Error fetching production data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStatistics = (data: ProductionBatch[]) => {
    const injectionBatches = data.filter((b) => b.batch_type === 'injection');
    const blowingBatches = data.filter((b) => b.batch_type === 'blowing');

    const totalInjectionQty = injectionBatches.reduce(
      (sum, b) => sum + (b.good_preforms_qty || 0),
      0
    );
    const totalBlowingQty = blowingBatches.reduce(
      (sum, b) => sum + (b.total_pieces || 0),
      0
    );
    const totalScrap =
      injectionBatches.reduce((sum, b) => sum + (b.bad_preforms_qty || 0), 0) +
      blowingBatches.reduce((sum, b) => sum + (b.bottles_damaged || 0), 0);

    setStatistics({
      totalBatches: data.length,
      totalInjectionQty,
      totalBlowingQty,
      avgEfficiency: 0, // Calculate based on your efficiency formula
      totalScrap,
    });
  };

  const applyFilters = () => {
    let filtered = [...batches];

    if (filters.startDate) {
      filtered = filtered.filter(
        (b) => new Date(b.production_date) >= new Date(filters.startDate)
      );
    }
    if (filters.endDate) {
      filtered = filtered.filter(
        (b) => new Date(b.production_date) <= new Date(filters.endDate)
      );
    }
    if (filters.shift) {
      filtered = filtered.filter((b) => b.shift === filters.shift);
    }
    if (filters.batchType) {
      filtered = filtered.filter((b) => b.batch_type === filters.batchType);
    }
    if (filters.productType && filters.productType !== 'all') {
      filtered = filtered.filter(
        (b) => b.finished_product === filters.productType
      );
    }

    setFilteredBatches(filtered);
  };

  const resetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      shift: '',
      batchType: '',
      productType: '',
    });
  };

  const exportToExcel = () => {
    const exportData = filteredBatches.map((batch) => ({
      'Batch Number': batch.batch_number,
      'Date': batch.production_date,
      'Type': batch.batch_type.toUpperCase(),
      'Shift': batch.shift,
      'Operator': batch.operator_name,
      'Status': batch.status,
      ...(batch.batch_type === 'injection'
        ? {
            'Preform Type': batch.preform_type,
            'Good Preforms': batch.good_preforms_qty,
            'Bad Preforms': batch.bad_preforms_qty,
            'Resin Used (KG)': batch.resin_used_kg,
            'Masterbatch Used (KG)': batch.masterbatch_used_kg,
          }
        : {
            'Product': batch.finished_product,
            'Total Packs': batch.total_packs,
            'Total Pieces': batch.total_pieces,
            'Bottles Produced': batch.bottles_produced,
            'Bottles Damaged': batch.bottles_damaged,
            'Pallets': batch.finished_pallets,
          }),
      'Created At': new Date(batch.created_at).toLocaleString(),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Production Trail');
    XLSX.writeFile(wb, `production_trail_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 95) return 'text-green-600 bg-green-100';
    if (efficiency >= 85) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Production Trail Report</h1>
            <p className="text-gray-600 mt-1">Track injection molding and blowing production history</p>
          </div>
          <button
            onClick={exportToExcel}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export to Excel
          </button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
            <p className="text-gray-500 text-sm">Total Batches</p>
            <p className="text-2xl font-bold">{statistics.totalBatches}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
            <p className="text-gray-500 text-sm">Injection Output (pcs)</p>
            <p className="text-2xl font-bold">{statistics.totalInjectionQtoLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
            <p className="text-gray-500 text-sm">Blowing Output (pcs)</p>
            <p className="text-2xl font-bold">{statistics.totalBlowingQty.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
            <p className="text-gray-500 text-sm">Total Scrap</p>
            <p className="text-2xl font-bold">{statistics.totalScrap.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-indigo-500">
            <p className="text-gray-500 text-sm">Avg Efficiency</p>
            <p className="text-2xl font-bold">{statistics.avgEfficiency}%</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Shift</label>
              <select
                value={filters.shift}
                onChange={(e) => setFilters({ ...filters, shift: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Shifts</option>
                <option value="Morning">Morning</option>
                <option value="Afternoon">Afternoon</option>
                <option value="Night">Night</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Batch Type</label>
              <select
                value={filters.batchType}
                onChange={(e) => setFilters({ ...filters, batchType: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="injection">Injection</option>
                <option value="blowing">Blowing</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
              <select
                value={filters.productType}
                onChange={(e) => setFilters({ ...filters, productType: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                disabled={filters.batchType === 'injection'}
              >
                <option value="all">All Products</option>
                <option value="75cl">75cl</option>
                <option value="50cl">50cl</option>
                <option value="33cl">33cl</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={resetFilters}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition w-full"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </div>

        {/* Production Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Batch #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Shift
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Output
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Scrap
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-4 text-center">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    </td>
                  </tr>
                ) : filteredBatches.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                      No production records found
                    </td>
                  </tr>
                ) : (
                  filteredBatches.map((batch) => (
                    <tr key={`${batch.batch_type}-${batch.id}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {batch.batch_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(batch.production_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            batch.batch_type === 'injection'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {batch.batch_type === 'injection' ? 'Injection' : 'Blowing'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {batch.shift}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {batch.batch_type === 'injection'
                          ? batch.preform_type
                          : batch.finished_product}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                        {batch.batch_type === 'injection'
                          ? `${batch.good_preforms_qty?.toLocaleString()} pcs`
                          : `${batch.total_pieces?.toLocaleString()} pcs`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600">
                        {batch.batch_type === 'injection'
                          ? batch.bad_preforms_qty?.toLocaleString()
                          : batch.bottles_damaged?.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                          {batch.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => window.open(`/production-trail/${batch.id}?type=${batch.batch_type}`, '_blank')}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
