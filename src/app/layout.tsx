import type { Metadata } from 'next';
import { SablePayAppProvider } from '@/providers/SablePayAppProvider';
import { AppHeader } from '@/components/AppHeader';
import './globals.css';

export const metadata: Metadata = {
  title: 'SablePay Example App',
  description: 'Example app demonstrating SablePay JS SDK integration for React / Next.js',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SablePayAppProvider>
          <AppHeader />
          <main className="page-container">{children}</main>
        </SablePayAppProvider>
      </body>
    </html>
  );
}
