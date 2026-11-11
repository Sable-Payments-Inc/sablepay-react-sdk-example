'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { SablePay } from '@sablepay/react-sablepay-js';

interface SablePayContextValue {
  isInitialized: boolean;
  /** 'sandbox' | 'production' | 'unknown', derived by the SDK from the API key */
  environment: string | null;
  error: string | null;
}

const SablePayContext = createContext<SablePayContextValue>({
  isInitialized: false,
  environment: null,
  error: null,
});

export function useSablePayContext() {
  return useContext(SablePayContext);
}

export function SablePayAppProvider({ children }: { children: ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [environment, setEnvironment] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_SABLEPAY_API_KEY || '';
  const merchantId = process.env.NEXT_PUBLIC_SABLEPAY_MERCHANT_ID || '';

  useEffect(() => {
    if (!apiKey || !merchantId) {
      setError(
        'Missing configuration. Please create a .env.local file with NEXT_PUBLIC_SABLEPAY_API_KEY and NEXT_PUBLIC_SABLEPAY_MERCHANT_ID.'
      );
      return;
    }

    try {
      // Route API calls through the same-origin proxy to avoid CORS.
      // next.config.js rewrites /api/proxy/* to the real SablePay API.
      SablePay.initialize({
        apiKey,
        merchantId,
        baseUrl: `${window.location.origin}/api/proxy/`,
        enableLogging: process.env.NODE_ENV === 'development',
      });
      setIsInitialized(true);
      setEnvironment(SablePay.getInstance().getEnvironment());
      setError(null);
    } catch (err: unknown) {
      setError(`Initialization failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    return () => {
      SablePay.release();
      setIsInitialized(false);
    };
  }, [apiKey, merchantId]);

  return (
    <SablePayContext.Provider value={{ isInitialized, environment, error }}>
      {children}
    </SablePayContext.Provider>
  );
}
