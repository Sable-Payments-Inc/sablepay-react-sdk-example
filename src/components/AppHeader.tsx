'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSablePayContext } from '@/providers/SablePayAppProvider';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/payment-status', label: 'Status' },
];

const ENV_LABELS: Record<string, string> = {
  sandbox: 'SANDBOX',
  production: 'LIVE',
};

export function AppHeader() {
  const pathname = usePathname();
  const { isInitialized, environment, error } = useSablePayContext();

  const envLabel = (environment && ENV_LABELS[environment]) || 'CUSTOM';

  return (
    <header className="app-header">
      <h1>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'inherit', textDecoration: 'none' }}>
          <img src="/sablePayLogo.png" alt="SablePay" width={28} height={28} style={{ borderRadius: 4 }} />
          SablePay
          {isInitialized && <span className="env-badge">{envLabel}</span>}
          {error && <span className="env-badge" style={{ background: 'rgba(239,68,68,0.3)' }}>ERROR</span>}
        </Link>
      </h1>
      <nav>
        {navLinks.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={pathname === href ? 'active' : ''}
          >
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
