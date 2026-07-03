'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface BatchDetail {
  id: number;
  batch_number: string;
  production_date: string;
  shift: string;
  operator_name: string;
  status: string;
  notes: string;
  created_at: string;
  // Injection specific
  preform_type?: string;
  good_preforms_qty?: number;
  bad_preforms_qty?: number;
  resin_used_kg?: number;
  masterbatch_used_kg?: number;
  purge_weight_kg?: number;
  bags_produced?: number;
  // Blowing specific
  finished_product?: string;
  total_packs?: number;
  total_pieces?: number;
  bottles_produced?: number;
  bottles_damaged?: number;
  finished_pallets?: number;
  caps_used?: number;
  labels_used?: number;
  gum_used?: number;
  shrink_wrap_used_kg?: number;
}

const API_BASE_URL = 'https://hariindustries.net/api/clearbook';

export default function ProductionDetailPage() {
  const params = useParams();
  const { user, isLoading: authLoading } = useAuth();
  const [batch, setBatch] = useState<BatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.company_id) return;

    const fetchDetail = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const type = searchParams.get('type');
      const batchId = params.id;

      if (!type || !batchId) {
        setError('Missing batch type or ID');
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const url = `${API_BASE_URL}/production.php?action=batches&type=${type}&batch_id=${batchId}&company_id=${user.company_id}`;
        const res = await fetch(url, {
          credentials: 'include',  // ✅ sends session cookie
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (data.success && data.data && data.data.length > 0) {
          setBatch(data.data[0]);
        } else {
          setError('Batch not found');
        }
      } catch (err) {
        console.error('Error fetching batch details:', err);
        setError(err instanceof Error ? err.message : 'Failed to load details');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [params.id, user?.company_id]);

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !batch) {
    return (
      <div className="text-center py-10 text-red-600">
        {error || 'Batch not found'}
      </div>
    );
  }

  const isInjection = !!batch.preform_type;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
          <h1 className="text-2xl font-bold text-white">
            {isInjection ? 'Injection' : 'Blowing'} Production Details
          </h1>
          <p className="text-blue-100 mt-1">Batch: {batch.batch_number}</p>
        </div>

        {/* Basic Information */}
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-gray-500 text-sm">Production Date</p>
              <p className="font-medium">{new Date(batch.production_date).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Shift</p>
              <p className="font-medium">{batch.shift}</p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Operator</p>
              <p className="font-medium">{batch.operator_name}</p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Status</p>
              <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                {batch.status}
              </span>
            </div>
          </div>
        </div>

        {/* Production Details */}
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold mb-4">Production Details</h2>
          {isInjection ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-gray-500 text-sm">Preform Type</p>
                <p className="font-medium">{batch.preform_type}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Good Preforms</p>
                <p className="font-medium text-green-600">{batch.good_preforms_qty?.toLocaleString()} pcs</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Bad Preforms</p>
                <p className="font-medium text-red-600">{batch.bad_preforms_qty?.toLocaleString()} pcs</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">PET Resin Used</p>
                <p className="font-medium">{batch.resin_used_kg?.toLocaleString()} KG</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Masterbatch Used</p>
                <p className="font-medium">{batch.masterbatch_used_kg?.toLocaleString()} KG</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Purge Waste</p>
                <p className="font-medium">{batch.purge_weight_kg?.toLocaleString()} KG</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-gray-500 text-sm">Product</p>
                <p className="font-medium">{batch.finished_product}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Total Packs</p>
                <p className="font-medium">{batch.total_packs?.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Total Pieces</p>
                <p className="font-medium">{batch.total_pieces?.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Bottles Produced</p>
                <p className="font-medium text-green-600">{batch.bottles_produced?.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Bottles Damaged</p>
                <p className="font-medium text-red-600">{batch.bottles_damaged?.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Pallets</p>
                <p className="font-medium">{batch.finished_pallets}</p>
              </div>
            </div>
          )}
        </div>

        {/* Material Consumption (Blowing Only) */}
        {!isInjection && (
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold mb-4">Material Consumption</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-gray-500 text-sm">Caps Used</p>
                <p className="font-medium">{batch.caps_used?.toLocaleString()} pcs</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Labels Used</p>
                <p className="font-medium">{batch.labels_used?.toLocaleString()} pcs</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Gum Used</p>
                <p className="font-medium">{batch.gum_used} boxes</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Shrink Wrap Used</p>
                <p className="font-medium">{batch.shrink_wrap_used_kg?.toLocaleString()} KG</p>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        {batch.notes && (
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-2">Notes</h2>
            <p className="text-gray-600">{batch.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
