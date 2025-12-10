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

interface Item {
    id: string;
    name: string;
}

interface ItemMasterListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectItem: (itemName: string) => void;
  type: 'product' | 'material';
}

export function ItemMasterListDialog({ open, onOpenChange, onSelectItem, type }: ItemMasterListDialogProps) {
    const [items, setItems] = useState<Item[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const endpoint = type === 'product' 
        ? 'https://hariindustries.net/busa-api/database/get-product-list.php' 
        : 'https://hariindustries.net/busa-api/database/get-material-list.php';
    
    const title = type === 'product' ? 'Select a Product' : 'Select a Raw Material';
    const description = `Choose an existing item from your master list.`;

    useEffect(() => {
        if (open) {
            const fetchItems = async () => {
                setIsLoading(true);
                setError(null);
                try {
                    const response = await fetch(endpoint);
                    if (!response.ok) {
                        throw new Error(`Failed to fetch ${type} list from the server.`);
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
    }, [open, endpoint, type]);

    const filteredItems = useMemo(() => {
        return items.filter(item => 
            item.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [items, searchTerm]);

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
                        <div className="flex flex-col justify-center items-center h-full text-destructive">
                            <AlertCircle className="h-6 w-6 mb-2" />
                            <p>{error}</p>
                        </div>
                    ) : (
                        <ul className="space-y-1">
                           {filteredItems.map(item => (
                               <li 
                                    key={item.id}
                                    onClick={() => onSelectItem(item.name)}
                                    className="p-2 rounded-md hover:bg-muted cursor-pointer flex justify-between items-center"
                                >
                                   <span>{item.name}</span>
                               </li>
                           ))}
                        </ul>
                    )}
                     {!isLoading && !error && filteredItems.length === 0 && (
                        <p className="text-center text-muted-foreground p-4">No items found.</p>
                    )}
                </div>
            </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
