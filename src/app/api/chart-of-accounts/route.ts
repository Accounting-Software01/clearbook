import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Define the structure of an account for type safety
interface Account {
    code: string;
    name: string;
    type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense' | 'Other';
}

// The handler for the POST request to update the chart of accounts
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const newAccounts: Account[] = body.accounts;

        // --- Basic Validation ---
        const validAccountTypes = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense', 'Other'];
        const isValid = newAccounts.every(
            (acc: Account) =>
                acc.code &&
                typeof acc.code === 'string' &&
                acc.name &&
                typeof acc.name === 'string' &&
                acc.type &&
                validAccountTypes.includes(acc.type)
        );

        if (!isValid) {
            return NextResponse.json({ message: 'Invalid account data' }, { status: 400 });
        }

        // --- File Generation ---
        // Create the TypeScript file content as a string
        const fileContent = `
export interface Account {
    code: string;
    name: string;
    type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense' | 'Other';
};

export const chartOfAccounts: Account[] = ${JSON.stringify(newAccounts, null, 4)};
        `.trim();

        // --- File System Operation ---
        // Define the path to the file that will be written
        const filePath = path.join(process.cwd(), 'src', 'lib', 'chart-of-accounts.ts');

        // Write the new content to the file
        await fs.writeFile(filePath, fileContent, 'utf8');

        // --- Success Response ---
        return NextResponse.json({ message: 'Chart of accounts updated successfully' });

    } catch (error) {
        console.error("Failed to update chart of accounts:", error);
        // --- Error Response ---
        return NextResponse.json({ message: 'Failed to update chart of accounts' }, { status: 500 });
    }
}
