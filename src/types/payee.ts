'use client';

export interface Payee {
    id: string;
    name: string;
    type: 'Customer' | 'Supplier' | 'Other';
}
