import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Undo2 } from 'lucide-react';

interface LedgerEntry {
    date: string;
    type: string;
    reference: string;
    description: string;
    debit: number;
    credit: number;
    balance: number;
    voucher_id?: number;
    voucher_type?: string;
    reference_id?: number | null;
    invoice_id?: number;
}

interface LedgerTableProps {
    ledger: LedgerEntry[];
    currency: string;
    onReverse?: (voucherId: number) => void;
}

export const LedgerTable = ({ ledger, currency, onReverse }: LedgerTableProps) => {

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(amount);
    }

    // A payment shows "Reverse" only if it's an original Payment (not
    // itself a Reversal) and nothing else in this same ledger already
    // reverses it — mirroring the same detection used on the standalone
    // Payments page, since a reversed voucher's own status never changes.
    const isAlreadyReversed = (entry: LedgerEntry) => {
        if (!entry.voucher_id) return false;
        return ledger.some(other =>
            other.voucher_type === 'Reversal' && other.reference_id === entry.voucher_id
        );
    };

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-right print:hidden">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {ledger.map((entry, index) => {
                    const canReverse = onReverse
                        && entry.type === 'Payment'
                        && entry.voucher_type !== 'Reversal'
                        && entry.voucher_id
                        && !isAlreadyReversed(entry);
                    const reversed = entry.type === 'Payment' && isAlreadyReversed(entry);

                    return (
                        <TableRow key={index}>
                            <TableCell>{new Date(entry.date).toLocaleDateString()}</TableCell>
                            <TableCell>
                                <Badge variant={entry.type === 'Payment Reversal' ? 'destructive' : 'outline'}>{entry.type}</Badge>
                                {reversed && <Badge variant="destructive" className="ml-1">Reversed</Badge>}
                            </TableCell>
                            <TableCell>{entry.reference}</TableCell>
                            <TableCell>{entry.description}</TableCell>
                            <TableCell className="text-right">{formatCurrency(entry.debit)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(entry.credit)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(entry.balance)}</TableCell>
                            <TableCell className="text-right print:hidden">
                                {canReverse && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-500"
                                        onClick={() => onReverse!(entry.voucher_id!)}
                                    >
                                        <Undo2 className="h-4 w-4 mr-1" /> Reverse
                                    </Button>
                                )}
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
};
