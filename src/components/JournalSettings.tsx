'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription } from '@/components/ui/form';
import { DatePicker } from '@/components/ui/date-picker';
import { Loader2 } from 'lucide-react';

const journalSettingsSchema = z.object({
  manualJournalsEnabled: z.boolean(),
  requireApproval: z.boolean(),
  allowBackdating: z.boolean(),
  backdatingLimitDays: z.coerce.number().int().min(0).optional(),
  restrictedAccounts: z.string().optional(),
  periodLockDate: z.date().optional(),
  yearEndLockDate: z.date().optional(),
});

type JournalSettingsFormValues = z.infer<typeof journalSettingsSchema>;

export const JournalSettings = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  const form = useForm<JournalSettingsFormValues>({
    resolver: zodResolver(journalSettingsSchema),
    defaultValues: {
      manualJournalsEnabled: true,
      requireApproval: false,
      allowBackdating: false,
      backdatingLimitDays: 0,
      restrictedAccounts: '',
      periodLockDate: undefined,
      yearEndLockDate: undefined,
    },
  });

  useEffect(() => {
    const fetchSettings = async () => {
      setIsFetching(true);
      try {
        const response = await fetch('/api/journal-settings');
        if (response.ok) {
          const settings = await response.json();
          // Dates need to be converted from string to Date objects
          if (settings.periodLockDate) {
            settings.periodLockDate = new Date(settings.periodLockDate);
          }
          if (settings.yearEndLockDate) {
            settings.yearEndLockDate = new Date(settings.yearEndLockDate);
          }
          form.reset(settings);
        } else {
          throw new Error('Failed to fetch settings');
        }
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not load journal settings.',
        });
      } finally {
        setIsFetching(false);
      }
    };
    fetchSettings();
  }, [form, toast]);

  const onSubmit = async (data: JournalSettingsFormValues) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/journal-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      toast({
        title: 'Settings Saved',
        description: 'Journal settings have been updated successfully.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not save journal settings.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Voucher Rules</CardTitle>
                <CardDescription>Set up rules for voucher posting and approvals.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
        </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Voucher & Period Lock Settings</CardTitle>
        <CardDescription>Manage rules for journal entries and accounting periods.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6 pt-4">
            <div className="space-y-4 rounded-lg border p-4">
                <h3 className="font-semibold">Journal Entry Rules</h3>
                <FormField
                control={form.control}
                name="manualJournalsEnabled"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                        <FormLabel>Enable Manual Journals</FormLabel>
                    </div>
                    <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="requireApproval"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                        <FormLabel>Require Approval</FormLabel>
                    </div>
                    <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="allowBackdating"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                        <FormLabel>Allow Backdating</FormLabel>
                    </div>
                    <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    </FormItem>
                )}
                />
                {form.watch('allowBackdating') && (
                <FormField
                    control={form.control}
                    name="backdatingLimitDays"
                    render={({ field }) => (
                    <FormItem className="pl-6">
                        <FormLabel>Backdating Limit (Days)</FormLabel>
                        <FormControl>
                        <Input type="number" {...field} className="max-w-xs" />
                        </FormControl>
                    </FormItem>
                    )}
                />
                )}
                <FormField
                    control={form.control}
                    name="restrictedAccounts"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Restrict Accounts in Journals</FormLabel>
                        <FormControl>
                        <Textarea
                            {...field}
                            placeholder="Enter account codes, separated by commas (e.g., 101010, 201020)"
                        />
                        </FormControl>
                        <FormDescription>
                        Force certain transactions through payment/receipt modules by restricting cash/bank accounts here.
                        </FormDescription>
                    </FormItem>
                    )}
                />
            </div>

            <div className="space-y-4 rounded-lg border p-4">
                <h3 className="font-semibold">Accounting Period Locks</h3>
                 <FormField
                    control={form.control}
                    name="periodLockDate"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Monthly/Period Lock Date</FormLabel>
                            <FormControl>
                                <DatePicker date={field.value} onDateChange={field.onChange} />
                            </FormControl>
                            <FormDescription>
                                No entries can be made on or before this date. Usually set at month-end.
                            </FormDescription>
                        </FormItem>
                    )}
                    />
                <FormField
                    control={form.control}
                    name="yearEndLockDate"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Financial Year-End Lock Date</FormLabel>
                            <FormControl>
                                <DatePicker date={field.value} onDateChange={field.onChange} />
                            </FormControl>
                            <FormDescription>
                                A hard lock for year-end closing. Overrides the period lock.
                            </FormDescription>
                        </FormItem>
                    )}
                    />
            </div>

          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Settings
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
};
