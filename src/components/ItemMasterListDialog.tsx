
'use client';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, AlertCircle } from "lucide-react";

// --- Data Interfaces ---
interface Item {
    id: number; // Corrected to number
    name: string;
}

interface User {
    uid: string;
    company_id: string;
}

// --- Component Props ---
interface ItemMasterListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectItem: (item: Item) => void; // CORRECTED: Expects the full Item object
  type: 'product' | 'raw_material';     // CORRECTED: Aligned with parent components
}

export function ItemMasterListDialog({ open, onOpenChange, onSelectItem, type }: ItemMasterListDialogProps) {
    const [items, setItems] = useState<Item[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [user, setUser] = useState<User | null>(null); // ADDED: User state

    // CORRECTED: Endpoint logic now matches the 'raw_material' type
    const endpoint = type === 'product' 
        ? 'https://hariindustries.net/busa-api/database/get-product-list.php' 
        : 'https://hariindustries.net/busa-api/database/get-material-list.php';
    
    const title = type === 'product' ? 'Select a Product' : 'Select a Raw Material';
    const description = `Choose an existing item from your master list.`;

    // ADDED: Effect to get user session data
    useEffect(() => {
        const sessionData = sessionStorage.getItem("user");
        if (sessionData) {
            setUser(JSON.parse(sessionData));
        }
    }, [open]);

    // CORRECTED: Fetch logic now sends company_id
    useEffect(() => {
        // Only fetch if the dialog is open and we have a user
        if (open && user) {
            const fetchItems = async () => {
                setIsLoading(true);
                setError(null);
                try {
                    // CORRECTED: Appends companyId to the request URL
                    const response = await fetch(`${endpoint}?companyId=${user.company_id}`);
                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(`Failed to fetch ${type} list: ${errorText}`);
                    }
                    const data: Item[] = await response.json();
                    setItems(data);
                } catch (e: any) {
                    setError(e.message || `Failed to fetch ${type} list.`);
                    console.error(e);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchItems();
        }
    }, [open, user, endpoint, type]);

    const filteredItems = useMemo(() => {
        return items.filter(item => 
            item.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [items, searchTerm]);

    const handleSelect = (item: Item) => {
        onSelectItem(item); // Pass the whole object back
        setSearchTerm(''); // Reset search
    }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
            <Input 
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
            <ScrollArea className="h-72 w-full rounded-md border">
                <div className="p-4">
                    {isLoading ? (
                         <div className="flex justify-center items-center h-full">
                            <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                    ) : error ? (
                        <div className="flex flex-col justify-center items-center h-full text-destructive text-center">
                            <AlertCircle className="h-6 w-6 mb-2" />
                            <p>{error}</p>
                        </div>
                    ) : (
                        <ul className="space-y-1">
                           {filteredItems.map(item => (
                               <li 
                                    key={item.id}
                                    onClick={() => handleSelect(item)} // CORRECTED: Pass the full object
                                    className="p-2 rounded-md hover:bg-muted cursor-pointer flex justify-between items-center"
                                >
                                   <span>{item.name}</span>
                               </li>
                           ))}
                        </ul>
                    )}
                     {!isLoading && !error && items.length > 0 && filteredItems.length === 0 && (
                        <p className="text-center text-muted-foreground p-4">No items match your search.</p>
                    )}
                     {!isLoading && !error && items.length === 0 && (
                        <p className="text-center text-muted-foreground p-4">No items have been registered yet.</p>
                    )}
                </div>
            </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
