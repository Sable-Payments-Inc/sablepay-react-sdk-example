'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSablePayContext } from '@/providers/SablePayAppProvider';

const navLinks = [
  { href: '/', label: 'Home' },
  // { href: '/coffee-shop', label: 'Coffee Shop' },
  // { href: '/simple-payment', label: 'Simple Payment' },
  // { href: '/integration-demo', label: 'Integration' },
  { href: '/payment-status', label: 'Status' },
];

export function AppHeader() {
  const pathname = usePathname();
  const { isInitialized, config, error } = useSablePayContext();

  const envLabel = config.baseUrl.includes('sandbox')
    ? 'SANDBOX'
    : config.baseUrl.includes('api.sablepay')
    ? 'LIVE'
    : 'CUSTOM';

  function handleClick(e: React.MouseEvent<HTMLHeadingElement, MouseEvent>, arg1: string): void {
    throw new Error('Function not implemented.');
  }

  return (
    <header className="app-header">
      <h1 onClick={() => window.location.href = "/"} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <img src="/sablePayLogo.png" alt="SablePay" width={28} height={28} style={{ borderRadius: 4 }} />
        SablePay
        {isInitialized && <span className="env-badge">{envLabel}</span>}
        {error && <span className="env-badge" style={{ background: 'rgba(239,68,68,0.3)' }}>ERROR</span>}
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
