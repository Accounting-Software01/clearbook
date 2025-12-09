
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, BookPlus, Scale, FileBarChart2, Landmark, ArrowRightLeft, FilePlus } from "lucide-react";
import Link from "next/link";

const overviewCards = [
    {
        title: 'Total Revenue',
        value: 'KES 1,250,000',
        change: '+15.2% from last month',
        icon: <Scale className="w-6 h-6 text-muted-foreground" />,
    },
    {
        title: 'Net Profit',
        value: 'KES 280,000',
        change: '+12.1% from last month',
        icon: <FileBarChart2 className="w-6 h-6 text-muted-foreground" />,
    },
     {
        title: 'Total Assets',
        value: 'KES 5,600,000',
        change: '',
        icon: <Landmark className="w-6 h-6 text-muted-foreground" />,
    },
    {
        title: 'Cash Balance',
        value: 'KES 850,000',
        change: '-5.2% from last month',
        icon: <ArrowRightLeft className="w-6 h-6 text-muted-foreground" />,
    }
];

export default function Home() {
  return (
    <AppLayout title="Dashboard" description="Welcome back! Here's a summary of your business finances.">
      <div className="space-y-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {overviewCards.map((card) => (
                <Card key={card.title}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                        {card.icon}
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{card.value}</div>
                        <p className="text-xs text-muted-foreground">{card.change}</p>
                    </CardContent>
                </Card>
            ))}
        </div>
        <div>
            <h2 className="text-2xl font-bold tracking-tight mb-4">Recent Activity & Reports</h2>
             <Card>
                <CardContent className="p-6">
                    <p className="text-muted-foreground">Quickly access your financial reports and common tasks from the sidebar navigation on the left.</p>
                </CardContent>
            </Card>
        </div>
      </div>
    </AppLayout>
  );
}
