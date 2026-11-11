'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  SablePay,
  PaymentPoller,
  PaymentStatusResponse,
  isCompleted,
  isFailed,
  isExpired,
  isTerminal,
} from '@sablepay/react-sablepay-js';
import { useSablePayContext } from '@/providers/SablePayAppProvider';

const getStatusColor = (s: string | undefined): string => {
  if (!s) return '';
  if (isCompleted(s)) return 'success';
  if (isFailed(s) || isExpired(s)) return 'error';
  return 'warning';
};

const formatDate = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString() : null);

export default function PaymentStatusPage() {
  const { isInitialized, error: initError } = useSablePayContext();

  const [paymentId, setPaymentId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<PaymentStatusResponse | null>(null);
  const [error, setError] = useState<string>('');
  const [isPolling, setIsPolling] = useState(false);
  const pollerRef = useRef<PaymentPoller | null>(null);

  const stopPolling = useCallback(() => {
    pollerRef.current?.stopPolling();
    pollerRef.current = null;
    setIsPolling(false);
  }, []);

  // Stop polling when leaving the page.
  useEffect(() => stopPolling, [stopPolling]);

  const lookupStatus = useCallback(async () => {
    const id = paymentId.trim();
    if (!id) return;
    setLoading(true);
    setError('');
    setStatus(null);

    try {
      setStatus(await SablePay.getInstance().getPaymentStatus(id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [paymentId]);

  const startPolling = useCallback(() => {
    const id = paymentId.trim();
    if (!id) return;
    stopPolling();
    setError('');

    const sablePay = SablePay.getInstance();
    const poller = new PaymentPoller((pid) => sablePay.getPaymentStatus(pid));
    pollerRef.current = poller;
    setIsPolling(true);

    // Uses the SDK's default schedule: every 3s for 1 min, then backoff up to 10s,
    // stopping automatically on a terminal status or after 10 minutes.
    poller.startPolling(id, (result) => {
      if (result.success && result.data) {
        setStatus(result.data);
        if (isTerminal(result.data.status)) stopPolling();
      } else if (result.error) {
        setError(result.error.message);
        stopPolling();
      }
    });
  }, [paymentId, stopPolling]);

  if (initError) {
    return <div className="config-warning">{initError}</div>;
  }

  const currency = status?.currency_symbol || '$';
  const rows: Array<[string, React.ReactNode, string?]> = status
    ? [
        ['Payment ID', status.paymentId],
        ['Status', status.status, getStatusColor(status.status)],
        ['Amount', status.amount != null ? `${currency}${status.amount}` : null],
        ['Amount (USD)', status.amountUSD != null ? `$${status.amountUSD}` : null],
        ['Paid Amount', status.paidAmount != null ? String(status.paidAmount) : null, 'success'],
        ['Paid Token', status.paidToken],
        ['Network', status.paidNetwork],
        ['Transaction ID', status.transactionId],
        ['Transaction Hash', status.txHash],
        ['Terminal', status.terminalName ?? status.terminalId],
        ['Created At', formatDate(status.createdAt)],
        ['Completed At', formatDate(status.completedAt)],
        ['Expires At', formatDate(status.expiresAt)],
      ]
    : [];

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
              {rows
                .filter(([, value]) => value != null && value !== '')
                .map(([label, value, color]) => (
                  <div className="status-row" key={label}>
                    <span className="label">{label}</span>
                    <span className={`value ${color ?? ''}`}>{value}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <h3 className="card-title">Status Lifecycle</h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          <strong>PENDING</strong> → <strong>COMPLETED</strong> (success)
          <br />
          <strong>PENDING</strong> → <strong>EXPIRED</strong> (timed out)
          <br />
          <strong>PENDING</strong> → <strong>FAILED</strong> (error)
        </p>
      </div>
    </>
  );
}
