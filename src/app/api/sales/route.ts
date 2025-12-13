import { NextRequest, NextResponse } from 'next/server';


// GET all sales orders for a company
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('company_id');

    if (!companyId) {
        return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    try {
        const salesOrders = await db.salesOrder.findMany({
            where: { company_id: companyId },
            orderBy: { created_at: 'desc' },
        });
        return NextResponse.json(salesOrders, { status: 200 });
    } catch (error) {
        console.error('Error fetching sales orders:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// POST a new sales order
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { customerName, amount, company_id, created_by } = body;

        if (!customerName || !amount || !company_id || !created_by) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const newOrder = await db.salesOrder.create({
            data: {
                customerName,
                amount,
                status: 'pending',
                company_id,
                created_by,
            },
        });

        // Here you would typically trigger a notification to the accountant/admin_manager

        return NextResponse.json(newOrder, { status: 201 });
    } catch (error) {
        console.error('Error creating sales order:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
