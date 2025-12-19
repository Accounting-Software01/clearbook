'''import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Creates a new Goods Received Note (GRN).
 * This also triggers the creation of a journal voucher for the accrual.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { purchase_order_id, received_date, lines, company_id, user_id } = body;

    if (!purchase_order_id || !received_date || !lines || !company_id || !user_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Simplified: Find PO, calculate total, create GRN and Journal Voucher in a transaction
    const purchaseOrder = await db.purchaseOrder.findUnique({
        where: { id: purchase_order_id },
        include: { supplier: true },
    });

    if (!purchaseOrder) {
        return NextResponse.json({ error: 'Purchase Order not found' }, { status: 404 });
    }

    const total_received_value = lines.reduce((acc: number, line: { quantity_received: number; unit_cost: number; }) => acc + (line.quantity_received * line.unit_cost), 0);

    // Create GRN and Journal Voucher in a transaction
    const [newGrn, newJournalVoucher] = await db.$transaction(async (prisma) => {
        const grn = await prisma.goodsReceivedNote.create({
            data: {
                grn_number: `GRN-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
                purchase_order_id,
                supplier_id: purchaseOrder.supplier_id,
                received_date: new Date(received_date),
                total_received_value,
                company_id,
                created_by_user_id: user_id,
                lines: {
                    create: lines.map((line: any) => ({ ...line }))
                }
            },
        });

        const journalVoucher = await prisma.journalVoucher.create({
            data: {
                voucher_number: `JV-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
                entry_date: new Date(received_date),
                narration: `Accrual for goods received against PO #${purchaseOrder.po_number}`,
                company_id,
                created_by_user_id: user_id,
                status: 'posted', // Assuming direct posting for now
                total_debits: total_received_value,
                lines: {
                    create: [
                        // Debit to an expense/inventory account (hardcoded for now)
                        { account_id: '501010', debit: total_received_value, credit: 0, description: `Inventory from ${purchaseOrder.supplier.name}` },
                        // Credit to GRN Accrual account
                        { account_id: '201030', debit: 0, credit: total_received_value, description: `Accrual for GRN-${grn.grn_number}` },
                    ]
                }
            }
        });
        return [grn, journalVoucher];
    });


    return NextResponse.json({ grn: newGrn, journal: newJournalVoucher }, { status: 201 });

  } catch (error) {
    console.error('[GRN_POST]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
'''