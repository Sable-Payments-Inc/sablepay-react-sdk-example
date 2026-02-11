'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { SablePay } from '@sablepay/react-sablepay-js';

interface SablePayConfig {
  apiKey: string;
  merchantId: string;
  baseUrl: string;
}

interface SablePayContextValue {
  isInitialized: boolean;
  config: SablePayConfig;
  error: string | null;
}

const SablePayContext = createContext<SablePayContextValue>({
  isInitialized: false,
  config: { apiKey: '', merchantId: '', baseUrl: '' },
  error: null,
});

export function useSablePayContext() {
  return useContext(SablePayContext);
}

export function SablePayAppProvider({ children }: { children: ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config: SablePayConfig = {
    apiKey: process.env.PUBLIC_SABLEPAY_API_KEY || '',
    merchantId: process.env.PUBLIC_SABLEPAY_MERCHANT_ID || '',
    baseUrl: process.env.PUBLIC_SABLEPAY_BASE_URL || '',
  };

  useEffect(() => {
    if (!config.apiKey || !config.merchantId || !config.baseUrl) {
      setError(
        'Missing configuration. Please create a .env.local file with  PUBLIC_SABLEPAY_API_KEY, PUBLIC_SABLEPAY_MERCHANT_ID, and PUBLIC_SABLEPAY_BASE_URL.'
      );
      return;
    }

    try {
      // Use the local proxy to avoid CORS — /api/proxy/ is rewritten to the
      // real backend by next.config.js rewrites.
      const proxyBaseUrl =
        typeof window !== 'undefined'
          ? `${window.location.origin}/api/proxy/`
          : config.baseUrl;

      SablePay.initialize({
        apiKey: config.apiKey,
        merchantId: config.merchantId,
        baseUrl: proxyBaseUrl,
      });
      setIsInitialized(true);
      console.log('[SablePay] Initialized —', SablePay.getInstance().getEnvironment());
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Initialization failed: ${message}`);
    }

    return () => {
      try {
        SablePay.release();
      } catch (_) {
        // ignore if already released
      }
    };
  }, [config.apiKey, config.merchantId, config.baseUrl]);

  return (
    <SablePayContext.Provider value={{ isInitialized, config, error }}>
      {children}
    </SablePayContext.Provider>
  );
}
