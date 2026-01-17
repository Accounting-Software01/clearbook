'use client';

import { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Download, UploadCloud, Info, FileText, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

const OpeningBalancePage = () => {
    const [openingDate, setOpeningDate] = useState<Date | undefined>(new Date());
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const { toast } = useToast();
    const { user } = useAuth(); // Assume user object has role: 'admin', 'accountant', or 'staff'

    const handleFileChange = (files: FileList | null) => {
        if (files && files.length > 0) {
            const file = files[0];
            if (file.type === 'text/csv') {
                if (file.size <= 5 * 1024 * 1024) { // 5MB limit
                    setCsvFile(file);
                } else {
                    toast({ variant: 'destructive', title: 'File too large', description: 'Please upload a file smaller than 5MB.' });
                }
            } else {
                toast({ variant: 'destructive', title: 'Invalid file type', description: 'Please upload a .csv file.' });
            }
        }
    };

    const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
    const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
    const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => { e.preventDefault(); e.stopPropagation(); };
    const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        handleFileChange(e.dataTransfer.files);
    };
    
    const handleDownloadTemplate = async () => {
        if (!user?.company_id || !user?.role) {
             toast({ variant: 'destructive', title: 'Cannot Download Template', description: 'User information is missing. Please log in again.' });
            return;
        }

        try {
            const response = await fetch(`https://hariindustries.net/api/clearbook/generate-opening-balance-template.php?company_id=${user.company_id}&user_role=${user.role}`);

            // If the server returns a JSON error, show it
            if (response.headers.get('Content-Type')?.includes('application/json')) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'Could not generate template.');
            }

            if (!response.ok) {
                throw new Error(`An HTTP error ${response.status} occurred.`);
            }

            // Otherwise, process the CSV download
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'opening_balance_template.csv';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Download Failed', description: error.message });
        }
    };

    const handleImport = useCallback(async () => {
        if (!openingDate || !csvFile) {
            toast({ variant: 'destructive', title: 'Missing Information', description: 'Please select a date and upload a CSV file.' });
            return;
        }
        if (!user?.company_id || !user?.uid) {
            toast({ variant: 'destructive', title: 'Authentication Error', description: 'Could not verify user. Please log in again.' });
            return;
        }

        setIsImporting(true);
        toast({ title: 'Importing...', description: 'Your opening balances are being processed.' });

        const formData = new FormData();
        formData.append('company_id', user.company_id);
        formData.append('user_id', user.uid);
        formData.append('entry_date', format(openingDate, 'yyyy-MM-dd'));
        formData.append('csv_file', csvFile);

        try {
            const response = await fetch('https://hariindustries.net/api/clearbook/import-opening-balance.php', {
                method: 'POST',
                body: formData,
            });
            const result = await response.json();
            if (!response.ok || result.error) {
                throw new Error(result.error || 'An unknown error occurred during import.');
            }
            toast({ variant: 'success', title: 'Success!', description: 'Opening balances have been imported and posted.' });
            setCsvFile(null);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Import Failed', description: error.message });
        } finally {
            setIsImporting(false);
        }
    }, [openingDate, csvFile, user, toast]);

    return (
        <Card className="max-w-4xl mx-auto">
            <CardHeader className="flex flex-row items-start justify-between">
                <div>
                    <CardTitle className="text-2xl">Import Opening Balances from CSV</CardTitle>
                    <CardDescription>Use this tool to set up the initial balances for your accounts.</CardDescription>
                </div>
                <Button variant="outline" onClick={handleDownloadTemplate}>
                    <Download className="mr-2 h-4 w-4" />
                    Download Template
                </Button>
            </CardHeader>
            <CardContent className="space-y-8 pt-6">
                 <Alert className="bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-700/50 dark:text-blue-300">
                    <Info className="h-4 w-4" />
                    <AlertTitle>Instructions</AlertTitle>
                    <AlertDescription>
                        <ul className="list-disc list-inside space-y-1 pl-2">
                            <li>Click <strong>Download Template</strong> to get a CSV file pre-filled with your Chart of Accounts.</li>
                            <li>Fill in the <strong>Amount</strong> and <strong>Type</strong> (Debit or Credit) for each account.</li>
                            <li>Ensure the total of all Debits equals the total of all Credits.</li>
                            <li>Select your official Opening Balance Date, upload the file, and click import.</li>
                        </ul>
                    </AlertDescription>
                </Alert>

                <div className="space-y-2">
                    <label className="font-semibold text-sm">Opening Balance Date *</label>
                    <DatePicker date={openingDate} onDateChange={setOpeningDate} />
                </div>

                <div className="space-y-2">
                     <label className="font-semibold text-sm">CSV File *</label>
                     <label 
                        htmlFor="csv-upload" 
                        className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isDragging ? 'border-primary bg-primary/10' : 'border-gray-300 bg-gray-50 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:hover:border-gray-500 dark:hover:bg-gray-600'}`}
                        onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop}
                    >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            {csvFile ? (
                                <>
                                <FileText className="w-10 h-10 mb-3 text-primary" />
                                <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">{csvFile.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{(csvFile.size / 1024).toFixed(2)} KB</p>
                                </>    
                            ) : (
                                <>
                                <UploadCloud className="w-10 h-10 mb-3 text-gray-400" />
                                <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">Drag and drop</span> your CSV file here, or click to browse</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Supported format: .csv (Max: 5MB)</p>
                                </>
                            )}
                        </div>
                        <input id="csv-upload" type="file" className="hidden" accept=".csv" onChange={(e) => handleFileChange(e.target.files)} />
                    </label>
                </div>

            </CardContent>
            <CardFooter className="justify-end bg-muted/30 py-4 px-6 rounded-b-lg space-x-2">
                <Button variant="outline" onClick={() => setCsvFile(null)} disabled={isImporting}>Cancel</Button>
                <Button onClick={handleImport} disabled={!csvFile || !openingDate || isImporting}>
                   {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                   {isImporting ? 'Importing...' : 'Import Opening Balances'}
                </Button>
            </CardFooter>
        </Card>
    );
};

export default OpeningBalancePage;
