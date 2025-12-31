'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

import { useAuth } from '@/hooks/useAuth'
import CompanySettings from '@/components/CompanySettings'
import UsersAndAccessControl from '@/components/UsersAndAccessControl'
import ApprovalsAndControls from '@/components/ApprovalsAndControls'
import SubscriptionAndBilling from '@/components/SubscriptionAndBilling'
import NotificationsAndAlerts from '@/components/NotificationsAndAlerts'
import SecurityAndAudit from '@/components/SecurityAndAudit'
import SystemPreferences from '@/components/SystemPreferences'
import { cn } from '@/lib/utils'
import { JournalSettings } from '@/components/JournalSettings'
import { JournalApprovals } from '@/components/JournalApprovals'
import ChartOfAccounts from '@/components/accounting/ChartOfAccounts'
import BankAccounts from '@/components/accounting/BankAccounts'
import Taxes from '@/components/accounting/Taxes'
import TaxAuthorities from '@/components/accounting/TaxAuthorities'

const settingsNav = [
  { title: 'Company', href: 'company', component: <CompanySettings /> },
  { title: 'Users & Roles', href: 'users-roles', component: <UsersAndAccessControl /> },
  {
    title: 'Accounting',
    isHeader: true,
  },
  { title: 'Chart of Accounts', href: 'accounting-coa', component: <ChartOfAccounts />, isSubItem: true },
  { title: 'Bank Accounts', href: 'accounting-banks', component: <BankAccounts />, isSubItem: true },
  { title: 'Tax Settings', href: 'accounting-taxes', component: <Taxes />, isSubItem: true },
  { title: 'Tax Authorities', href: 'accounting-authorities', component: <TaxAuthorities />, isSubItem: true },
  { title: 'Voucher Rules', href: 'accounting-voucher', component: <JournalSettings />, isSubItem: true },
  { title: 'Journal Approvals', href: 'accounting-approvals', component: <JournalApprovals />, isSubItem: true },
  { title: 'Approvals & Controls', href: 'approvals-controls', component: <ApprovalsAndControls /> },
  { title: 'Subscription & Billing', href: 'subscription-billing', component: <SubscriptionAndBilling /> },
  { title: 'Notifications', href: 'notifications', component: <NotificationsAndAlerts /> },
  { title: 'Security & Audit', href: 'security-audit', component: <SecurityAndAudit /> },
  { title: 'Preferences', href: 'preferences', component: <SystemPreferences /> },
]

const SettingsPage = () => {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('tab') || 'company'

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-red-500">You do not have permission to access this page.</p>
      </div>
    )
  }

  const activeComponent = settingsNav.find(item => item.href === activeTab)?.component

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>
      <div className="flex flex-col md:flex-row md:space-x-12">
        <aside className="md:w-1/4 lg:w-1/5">
          <nav className="flex flex-col space-y-1">
            {settingsNav.map((item) => (
              item.isHeader ? (
                 <h3 key={item.title} className="px-3 pt-4 pb-2 text-xs font-bold uppercase text-muted-foreground tracking-wider">{item.title}</h3>
              ) : (
                <Link
                  key={item.href}
                  href={`/admin/settings?tab=${item.href}`}
                  className={cn(
                    "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150",
                    item.isSubItem && "pl-8",
                    activeTab === item.href
                      ? "bg-green-100 text-green-800 font-semibold"
                      : "text-gray-600 hover:bg-green-50 hover:text-green-800",
                  )}
                >
                  {item.title}
                </Link>
              )
            ))}
          </nav>
        </aside>
        <main className="flex-1 mt-8 md:mt-0">
          {activeComponent}
        </main>
      </div>
    </div>
  )
}

export default SettingsPage
