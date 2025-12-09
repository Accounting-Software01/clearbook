
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, BookPlus, Scale, FileBarChart2, Landmark, ArrowRightLeft, Library, FilePlus, ShoppingCart, TestTube, FileText } from "lucide-react";
import Link from "next/link";

const reports = [
    {
        href: '/payment-voucher/new',
        title: 'New Payment Voucher',
        description: 'Record a payment for expenses.',
        icon: <FilePlus className="w-8 h-8 text-primary" />,
    },
    {
        href: '/journal',
        title: 'Journal Entry',
        description: 'Record manual journal vouchers.',
        icon: <BookPlus className="w-8 h-8 text-primary" />,
    },
    {
        href: '/ledger',
        title: 'General Ledger',
        description: 'View detailed account history.',
        icon: <BookOpen className="w-8 h-8 text-primary" />,
    },
    {
        href: '/trial-balance',
        title: 'Trial Balance',
        description: 'Check account balances and view all accounts.',
        icon: <Scale className="w-8 h-8 text-primary" />,
    },
    {
        href: '/profit-loss',
        title: 'Profit & Loss',
        description: 'Analyze revenues and expenses over a period.',
        icon: <FileBarChart2 className="w-8 h-8 text-primary" />,
    },
    {
        href: '/balance-sheet',
        title: 'Balance Sheet',
        description: 'See a snapshot of assets and liabilities.',
        icon: <Landmark className="w-8 h-8 text-primary" />,
    },
     {
        href: '/cash-flow',
        title: 'Cash Flow',
        description: 'Track the movement of cash.',
        icon: <ArrowRightLeft className="w-8 h-8 text-primary" />,
    }
]

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4 sm:p-8">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-12">
            <div className="inline-block p-4 bg-primary/10 rounded-full mb-4">
                <Library className="h-12 w-12 text-primary" />
            </div>
            <h1 className="text-4xl font-bold text-primary mb-2">
                Accounting & Financial Reporting Hub
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                A central place to manage accounting tasks and generate key financial reports for your business.
            </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {reports.map((report) => (
                 <Card key={report.href} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-start gap-4">
                        <div className="flex-shrink-0">{report.icon}</div>
                        <div className="flex-grow">
                            <CardTitle>{report.title}</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <CardDescription>{report.description}</CardDescription>
                    </CardContent>
                    <CardFooter>
                         <Button asChild className="w-full">
                            <Link href={report.href}>Go to Page</Link>
                        </Button>
                    </CardFooter>
                </Card>
            ))}
        </div>
      </div>
    </main>
  );
}
