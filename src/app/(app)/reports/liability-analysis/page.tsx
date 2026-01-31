'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

// --- Type Definitions ---
type Liability = {
    account_code: string;
    account_name: string;
    balance: number;
};

// --- Main Page Component ---
const LiabilityAnalysisPage = () => {
    const { user } = useAuth();
    const [liabilities, setLiabilities] = useState<Liability[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [totalLiability, setTotalLiability] = useState(0);

    const fetchLiabilities = async () => {
        if (!user) return;
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`https://hariindustries.net/api/clearbook/liability-analysis.php?company_id=${user.company_id}`);
            const data = await res.json();

            if (res.ok && data.success) {
                setLiabilities(data.data);
                // Calculate the total liability
                const total = data.data.reduce((sum: number, item: Liability) => sum + item.balance, 0);
                setTotalLiability(total);
            } else {
                setError(data.message || 'Failed to fetch liability data.');
            }
        } catch (err) {
            setError('A network error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLiabilities();
    }, [user]);

    const handlePrint = () => {
        window.print();
    };

    // --- Render Logic ---
    if (loading) {
        return <div className="p-4">Loading liability analysis...</div>;
    }

    if (error) {
        return <div className="p-4 text-red-500">Error: {error}</div>;
    }

    return (
        <div className="p-4 md:p-6">
            <Card className="w-full max-w-4xl mx-auto print-container">
                <CardHeader className="flex flex-row justify-between items-center">
                    <div>
                        <CardTitle>Liability Analysis</CardTitle>
                        <CardDescription>A summary of all outstanding liabilities.</CardDescription>
                    </div>
                    <Button variant="outline" onClick={handlePrint} className="hide-on-print">Print Report</Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Account Code</TableHead>
                                <TableHead>Account Name</TableHead>
                                <TableHead className="text-right">Balance</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {liabilities.length > 0 ? (
                                liabilities.map((item) => (
                                    <TableRow key={item.account_code}>
                                        <TableCell>{item.account_code}</TableCell>
                                        <TableCell>{item.account_name}</TableCell>
                                        <TableCell className="text-right font-medium">
                                            {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(item.balance)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center">No liabilities found.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                    {/* Total Liability Summary */}
                    <div className="flex justify-end mt-4 pt-4 border-t">
                        <div className="text-right">
                            <p className="font-semibold">Total Liabilities:</p>
                            <p className="text-xl font-bold">
                                {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(totalLiability)}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
             <style jsx global>{`
                @media print {
                    .hide-on-print {
                        display: none;
                    }
                    body {
                        -webkit-print-color-adjust: exact;
                    }
                }
            `}</style>
        </div>
    );
};

export default LiabilityAnalysisPage;
