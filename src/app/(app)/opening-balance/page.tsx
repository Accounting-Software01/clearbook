'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Download, UploadCloud, Info, FileText } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

const OpeningBalancePage = () => {
    const [openingDate, setOpeningDate] = useState<Date | undefined>(new Date("2026-01-13"));
    const [excelFile, setExcelFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const { toast } = useToast();

    const handleFileChange = (files: FileList | null) => {
        if (files && files.length > 0) {
            const file = files[0];
            if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.type === 'application/vnd.ms-excel') {
                if (file.size <= 10 * 1024 * 1024) { // 10MB limit
                    setExcelFile(file);
                } else {
                    toast({ variant: 'destructive', title: 'File too large', description: 'Please upload a file smaller than 10MB.' });
                }
            } else {
                toast({ variant: 'destructive', title: 'Invalid file type', description: 'Please upload an .xlsx or .xls file.' });
            }
        }
    };

    const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation(); // Necessary to allow drop
    };

    const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        handleFileChange(e.dataTransfer.files);
    };
    
    const handleImport = () => {
        if (!openingDate || !excelFile) {
            toast({ variant: 'destructive', title: 'Missing Information', description: 'Please select a date and upload an Excel file.' });
            return;
        }
        toast({ title: 'Importing...', description: 'Your opening balances are being imported.' });
        // Simulate API call
    };

    return (
        <Card className="max-w-4xl mx-auto">
            <CardHeader className="flex flex-row items-start justify-between">
                <div>
                    <CardTitle className="text-2xl">Import Opening Balances from Excel</CardTitle>
                    <CardDescription>Use this tool to set up the initial balances for your accounts.</CardDescription>
                </div>
                <Button variant="outline">
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
                            <li>Download the template file to see the required format.</li>
                            <li>Fill in the account code (or account name), opening balance amount, and balance type (Debit or Credit).</li>
                            <li>Ensure that total debits equal total credits (balanced entries).</li>
                            <li>Select the opening balance date.</li>
                            <li>Upload the completed Excel file.</li>
                        </ul>
                    </AlertDescription>
                </Alert>

                <div className="space-y-2">
                    <label className="font-semibold text-sm">Opening Balance Date *</label>
                    <DatePicker date={openingDate} onDateChange={setOpeningDate} />
                </div>

                <div className="space-y-2">
                     <label className="font-semibold text-sm">Excel File *</label>
                     <label 
                        htmlFor="excel-upload" 
                        className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isDragging ? 'border-primary bg-primary/10' : 'border-gray-300 bg-gray-50 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:hover:border-gray-500 dark:hover:bg-gray-600'}`}
                        onDragEnter={handleDragEnter}
                        onDragLeave={handleDragLeave}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                    >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            {excelFile ? (
                                <>
                                <FileText className="w-10 h-10 mb-3 text-primary" />
                                <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">{excelFile.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{(excelFile.size / 1024).toFixed(2)} KB</p>
                                </>    
                            ) : (
                                <>
                                <UploadCloud className="w-10 h-10 mb-3 text-gray-400" />
                                <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">Drag and drop</span> your Excel file here, or click to browse</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Supported formats: .xlsx, .xls (Max: 10MB)</p>
                                </>
                            )}
                        </div>
                        <input id="excel-upload" type="file" className="hidden" accept=".xlsx, .xls" onChange={(e) => handleFileChange(e.target.files)} />
                    </label>
                </div>

            </CardContent>
            <CardFooter className="justify-end bg-muted/30 py-4 px-6 rounded-b-lg space-x-2">
                <Button variant="outline">Cancel</Button>
                <Button onClick={handleImport}>
                   <UploadCloud className="mr-2 h-4 w-4" />
                   Import Opening Balances
                </Button>
            </CardFooter>
        </Card>
    );
};

export default OpeningBalancePage;
