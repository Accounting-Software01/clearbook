'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from '@/lib/api';
import { Supplier } from '@/types/supplier';
import { TaxAuthority } from '@/types/tax-authority';
import { Loader2, Search } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface Payee {
  id: number | string;
  name: string;
  meta: string;
  raw: Supplier | TaxAuthority;
}

interface SelectPayeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectPayee: (payee: Supplier | TaxAuthority) => void;
  payeeType: 'Supplier' | 'Staff' | 'Govt' | 'Other';
}

export const SelectPayeeDialog: React.FC<SelectPayeeDialogProps> = ({ open, onOpenChange, onSelectPayee, payeeType }) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [payees, setPayees] = useState<Payee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && user?.company_id) {
      const fetchPayees = async () => {
        setIsLoading(true);
        setError(null);
        setPayees([]);
        try {
          if (payeeType === 'Supplier') {
            const response = await api.get(`/api/suppliers?company_id=${user.company_id}`);
            // CORRECTED: Use response.data.map
            if (response.data && Array.isArray(response.data)) {
              const normalizedPayees = response.data.map((s: Supplier) => ({
                id: s.id,
                name: s.name,
                meta: s.bank_name ? `${s.bank_name} - ${s.account_number}` : 'No bank details',
                raw: s,
              }));
              setPayees(normalizedPayees);
            } else {
              setPayees([]); // API did not return a valid array
            }

          } else if (payeeType === 'Govt') {
            const response = await api.get(`/api/clearbook/get_tax_authorities.php?company_id=${user.company_id}`);
            // CORRECTED: Use response.data.map
            if (response.data && Array.isArray(response.data)) {
              const normalizedPayees = response.data.map((g: TaxAuthority) => ({
                id: g.id,
                name: g.name,
                meta: g.authority_type,
                raw: g,
              }));
              setPayees(normalizedPayees);
            } else {
                setPayees([]); // API did not return a valid array
            }

          } else {
            setPayees([]);
          }
        } catch (err) {
          setError(`Failed to fetch ${payeeType}s. Please check the API and network connection.`);
          console.error(err);
        } finally {
          setIsLoading(false);
        }
      };
      fetchPayees();
    }
  }, [open, payeeType, user?.company_id]);

  const filteredPayees = payees.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (payee: Payee) => {
    onSelectPayee(payee.raw);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Select a {payeeType}</DialogTitle>
          <DialogDescription>Search for a payee by name.</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-full"
            />
          </div>
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center items-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
             <p className="text-red-500 text-center p-4">{error}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayees.length > 0 ? (
                  filteredPayees.map((payee) => (
                    <TableRow key={payee.id}>
                      <TableCell className="font-medium">{payee.name}</TableCell>
                      <TableCell className="text-muted-foreground">{payee.meta}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => handleSelect(payee)}>
                          Select
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                      No {payeeType}s found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
