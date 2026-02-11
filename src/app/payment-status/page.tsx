'use client';

import React, { useState, useCallback } from 'react';
import { SablePay, PaymentStatusResponse } from '@sablepay/react-sablepay-js';
import { useSablePayContext } from '@/providers/SablePayAppProvider';

export default function PaymentStatusPage() {
  const { isInitialized, error: initError } = useSablePayContext();

  const [paymentId, setPaymentId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<PaymentStatusResponse | null>(null);
  const [error, setError] = useState<string>('');
  const [isPolling, setIsPolling] = useState(false);
  const [pollTimer, setPollTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const lookupStatus = useCallback(async () => {
    if (!paymentId.trim()) return;
    setLoading(true);
    setError('');
    setStatus(null);

    try {
      const sablePay = SablePay.getInstance();
      const resp = await sablePay.getPaymentStatus(paymentId.trim());
      setStatus(resp);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [paymentId]);

  const startPolling = useCallback(() => {
    if (!paymentId.trim()) return;
    setIsPolling(true);

    const poll = async () => {
      try {
        const sablePay = SablePay.getInstance();
        const resp = await sablePay.getPaymentStatus(paymentId.trim());
        setStatus(resp);

        const s = resp.status?.toLowerCase() ?? '';
        if (s === 'completed' || s === 'confirmed' || s === 'failed' || s === 'expired' || s === 'cancelled') {
          setIsPolling(false);
          return;
        }

        const timer = setTimeout(poll, 3000);
        setPollTimer(timer);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        setIsPolling(false);
      }
    };
    poll();
  }, [paymentId]);

  const stopPolling = () => {
    if (pollTimer) clearTimeout(pollTimer);
    setIsPolling(false);
  };

  const getStatusColor = (s: string | undefined): string => {
    if (!s) return '';
    const lower = s.toLowerCase();
    if (lower === 'completed' || lower === 'confirmed') return 'success';
    if (lower === 'failed' || lower === 'expired' || lower === 'cancelled') return 'error';
    return 'warning';
  };

  if (initError) {
    return <div className="config-warning">{initError}</div>;
  }

  return (
    <>
      <div className="card">
        <h2 className="card-title">📋 Payment Status</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 20, fontSize: 14 }}>
          Enter a payment ID to look up its current status. You can also enable
          auto-polling to watch for updates. Mirrors the Android{' '}
          <code>PaymentStatusActivity</code>.
        </p>

        <div className="form-group">
          <label>Payment ID</label>
          <input
            type="text"
            value={paymentId}
            onChange={(e) => setPaymentId(e.target.value)}
            placeholder="Enter payment ID…"
          />
        </div>

        <div className="btn-group">
          <button
            className="btn btn-primary"
            disabled={!isInitialized || !paymentId.trim() || loading}
            onClick={lookupStatus}
          >
            {loading ? (
              <>
                <div className="spinner" /> Checking…
              </>
            ) : (
              'Check Status'
            )}
          </button>

          {!isPolling ? (
            <button
              className="btn btn-secondary"
              disabled={!isInitialized || !paymentId.trim()}
              onClick={startPolling}
            >
              Start Polling
            </button>
          ) : (
            <button className="btn btn-danger" onClick={stopPolling}>
              Stop Polling
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--error)' }}>
          <p style={{ color: 'var(--error)', fontSize: 14 }}>
            <strong>Error:</strong> {error}
          </p>
        </div>
      )}

      {status && (
        <div className="card">
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            Payment Details
            {isPolling && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', fontWeight: 400 }}>
                <div className="spinner dark" style={{ width: 14, height: 14 }} /> polling
              </span>
            )}
          </h3>

          <div className="payment-result" style={{ marginBottom: 0 }}>
            <div className="status-details">
              <div className="status-row">
                <span className="label">Payment ID</span>
                <span className="value">{status.paymentId}</span>
              </div>
              <div className="status-row">
                <span className="label">Status</span>
                <span className={`value ${getStatusColor(status.status)}`}>
                  {status.status}
                </span>
              </div>
              {status.amount !== undefined && (
                <div className="status-row">
                  <span className="label">Amount</span>
                  <span className="value">${status.amount}</span>
                </div>
              )}
              {/* {status.paidAmount !== undefined && (
                <div className="status-row">
                  <span className="label">Paid Amount</span>
                  <span className="value success">${status.amount}</span>
                </div>
              )} */}
              {status.paidToken && (
                <div className="status-row">
                  <span className="label">Paid Token</span>
                  <span className="value">{status.paidToken}</span>
                </div>
              )}
              {status.txHash && (
                <div className="status-row">
                  <span className="label">Transaction Hash</span>
                  <span className="value">{status.txHash}</span>
                </div>
              )}
              {status.expiresAt && (
                <div className="status-row">
                  <span className="label">Expires At</span>
                  <span className="value">{new Date(status.expiresAt).toLocaleString()}</span>
                </div>
              )}
              {status.createdAt && (
                <div className="status-row">
                  <span className="label">Created At</span>
                  <span className="value">{new Date(status.createdAt).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <h3 className="card-title">Status Lifecycle</h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          <strong>pending</strong> → <strong>processing</strong> → <strong>completed</strong> (success)
          <br />
          <strong>pending</strong> → <strong>expired</strong> (timed out)
          <br />
          <strong>pending</strong> → <strong>failed</strong> (error)
        </p>
      </div>
    </>
  );
}
