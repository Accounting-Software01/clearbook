import { NextResponse } from 'next/server';
import { PaymentVoucher } from '@/types/payment-voucher';
import { promises as fs } from 'fs';
import path from 'path';

// /app/api/payment-voucher/create/route.ts

export async function POST(request: Request) {
    // 1. Get Raw Input & Basic Integrity Check
    let pvData: Partial<PaymentVoucher>;
    try {
        pvData = await request.json();
    } catch (error) {
        return NextResponse.json({
            status: 'error',
            message: 'Invalid JSON payload.',
        }, { status: 400 });
    }

    // --- Validation Phase ---
    const errors: string[] = [];

    // Hard Control #1: Debits must equal Credits
    const { lineItems = [] } = pvData;
    const totalDebit = lineItems.reduce((sum, item) => sum + (Number(item.debitAmount) || 0), 0);
    const totalCredit = lineItems.reduce((sum, item) => sum + (Number(item.creditAmount) || 0), 0);
    
    if (Math.abs(totalDebit - totalCredit) > 0.001) {
        errors.push(`Validation Failed: Total Debits (${totalDebit.toFixed(2)}) must equal Total Credits (${totalCredit.toFixed(2)}).`);
    }

    // Hard Control #2: At least one line item must exist
    if (lineItems.length === 0) {
        errors.push("Validation Failed: A payment voucher must have at least one line item.");
    }
    
    // Hard Control #3: Debits/Credits can't be zero
    if (totalDebit === 0 && totalCredit === 0) {
        errors.push("Validation Failed: Total payment amount cannot be zero.");
    }

    // Hard Control #4: Payee must be selected
    if (!pvData.payeeCode || !pvData.payeeName) {
        errors.push("Validation Failed: A payee must be selected.");
    }

    // Hard Control #5: Source of funds must be selected
    if (!pvData.bankOrCashAccount) {
        errors.push("Validation Failed: A source bank/cash account must be selected.");
    }

    if (errors.length > 0) {
        return NextResponse.json({
            status: 'validation_error',
            message: 'The payment voucher failed validation.',
            errors: errors,
        }, { status: 422 });
    }

    // --- Processing Phase ---
    // 1. Generate unique ID
    const newPvId = `PV/${new Date().getFullYear()}/${String(Math.floor(Math.random() * 90000) + 10000).padStart(5, '0')}`;
    
    // 2. Finalize data for storage
    const finalVoucher: PaymentVoucher = {
        ...pvData,
        id: newPvId,
        status: 'Submitted',
        // In a real app, user would come from session
        preparedBy: pvData.preparedBy || 'user_id_placeholder', 
        auditTrail: [...(pvData.auditTrail || []), { user: 'user_id_placeholder', action: 'Submitted', timestamp: new Date().toISOString() }],
    } as PaymentVoucher;

    // 3. Save to the "database" (a JSON file)
    try {
        const dataDir = path.join(process.cwd(), 'src', 'data', 'payment_vouchers');
        await fs.mkdir(dataDir, { recursive: true });
        const filePath = path.join(dataDir, `${newPvId.replace('/', '-')}.json`);
        await fs.writeFile(filePath, JSON.stringify(finalVoucher, null, 2));

    } catch (error) {
        console.error("Failed to write voucher file:", error);
        return NextResponse.json({
            status: 'error',
            message: 'Internal Server Error: Could not save the voucher.',
        }, { status: 500 });
    }

    // --- Response ---
    return NextResponse.json({
        status: 'success',
        message: `Payment Voucher ${newPvId} has been successfully submitted for approval.`,
        created_voucher_id: newPvId,
    }, { status: 201 });
}
