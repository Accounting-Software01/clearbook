
import { NextResponse } from 'next/server';

// This is a mock database. In a real application, you would use a proper database.
const mockDatabase = {
  vouchers: [
    { id: 1, status: 'pending', isLocked: false },
  ],
};

// Get voucher status
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const voucherId = searchParams.get('id');

  if (!voucherId) {
    return NextResponse.json({ error: 'Voucher ID is required' }, { status: 400 });
  }

  const voucher = mockDatabase.vouchers.find((v) => v.id === parseInt(voucherId));

  if (!voucher) {
    return NextResponse.json({ error: 'Voucher not found' }, { status: 404 });
  }

  return NextResponse.json(voucher);
}

// Update voucher status (for approval and locking)
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const voucherId = searchParams.get('id');
  const { status, isLocked } = await request.json();

  if (!voucherId) {
    return NextResponse.json({ error: 'Voucher ID is required' }, { status: 400 });
  }

  const voucherIndex = mockDatabase.vouchers.findIndex((v) => v.id === parseInt(voucherId));

  if (voucherIndex === -1) {
    return NextResponse.json({ error: 'Voucher not found' }, { status: 404 });
  }

  if (status) {
    mockDatabase.vouchers[voucherIndex].status = status;
  }

  if (typeof isLocked === 'boolean') {
    mockDatabase.vouchers[voucherIndex].isLocked = isLocked;
  }

  return NextResponse.json(mockDatabase.vouchers[voucherIndex]);
}
