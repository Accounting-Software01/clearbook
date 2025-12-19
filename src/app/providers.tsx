'use client';

import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import { UserProvider } from '@/contexts/UserContext';
import { LanguageProvider } from '@/contexts/LanguageContext';

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UserProvider>
      <LanguageProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </LanguageProvider>
    </UserProvider>
  );
}
