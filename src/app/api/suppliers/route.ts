'''import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Creates a new Supplier.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, address, payment_terms, default_payable_account, company_id } = body;

    if (!name || !payment_terms || !default_payable_account || !company_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newSupplier = await db.supplier.create({
      data: {
        name,
        email,
        phone,
        address,
        payment_terms,
        default_payable_account,
        company_id,
      },
    });

    return NextResponse.json(newSupplier, { status: 201 });

  } catch (error) {
    console.error('[SUPPLIERS_POST]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
'''