
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface LedgerEntry {
    date: string;
    type: string;
    reference: string;
    description: string;
    debit: number;
    credit: number;
    balance: number;
}

interface LedgerTableProps {
    ledger: LedgerEntry[];
    currency: string;
}

export const LedgerTable = ({ ledger, currency }: LedgerTableProps) => {

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(amount);
    }

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
                </TableRow>
            </TableHeader>
            <TableBody>
                {ledger.map((entry, index) => (
                    <TableRow key={index}>
                        <TableCell>{new Date(entry.date).toLocaleDateString()}</TableCell>
                        <TableCell><Badge variant="outline">{entry.type}</Badge></TableCell>
                        <TableCell>{entry.reference}</TableCell>
                        <TableCell>{entry.description}</TableCell>
                        <TableCell className="text-right">{formatCurrency(entry.debit)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(entry.credit)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(entry.balance)}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
};
