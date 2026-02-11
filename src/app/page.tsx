'use client';

import React, { useState, useCallback } from 'react';
import { SablePay, CreatePaymentRequest, CreatePaymentResponse, PaymentStatusResponse, PaymentItem, isCompleted, isFailed, isExpired, isPending, QrCodeGenerator } from '@sablepay/react-sablepay-js';
import { useSablePayContext } from '@/providers/SablePayAppProvider';

interface MenuItem {
  name: string;
  emoji: string;
  price: number;
}

const MENU: MenuItem[] = [
  { name: 'Espresso', emoji: '☕', price: 1 },
  { name: 'Latte', emoji: '🥛', price: 1 },
  { name: 'Mocha', emoji: '🍫', price: 1 },
  { name: 'Croissant', emoji: '🥐', price: 1 },
  { name: 'Muffin', emoji: '🧁', price: 1 },
  { name: 'Cookie', emoji: '🍪', price: 1 },
];

type Step = 'menu' | 'creating' | 'qr' | 'polling' | 'success' | 'failed';

export default function CoffeeShopPage() {
  const { isInitialized, error: initError } = useSablePayContext();

  const [selected, setSelected] = useState<Map<string, number>>(new Map());
  const [step, setStep] = useState<Step>('menu');
  const [payment, setPayment] = useState<CreatePaymentResponse | null>(null);
  const [status, setStatus] = useState<PaymentStatusResponse | null>(null);
  const [qrUrl, setQrUrl] = useState<string>('');
  const [error, setError] = useState<string>('');

  const totalAmount = Array.from(selected.entries()).reduce(
    (sum, [name, qty]) => {
      const item = MENU.find((m) => m.name === name);
      return sum + (item ? item.price * qty : 0);
    },
    0
  );

  const toggleItem = (name: string) => {
    setSelected((prev) => {
      const copy = new Map(prev);
      if (copy.has(name)) {
        copy.delete(name);
      } else {
        copy.set(name, 1);
      }
      return copy;
    });
  };

  const createPayment = useCallback(async () => {
    if (totalAmount === 0) return;
    setStep('creating');
    setError('');

    try {
      const sablePay = SablePay.getInstance();

      const items: PaymentItem[] = Array.from(selected.entries()).map(
        ([name, qty]) => {
          const menuItem = MENU.find((m) => m.name === name)!;
          return {
            name: menuItem.name,
            quantity: qty,
            amount: menuItem.price,
          };
        }
      );

      const request: CreatePaymentRequest = {
        amount: totalAmount,
        items,
        metadata: { source: 'example-app-coffee-shop' },
      };

      const response = await sablePay.createPayment(request);
      setPayment(response);

      // Generate QR code
      const qrGen = new QrCodeGenerator();
      const dataUrl = await qrGen.generatePaymentQr(response, {
        width: 280,
      });
      setQrUrl(dataUrl || '');
      setStep('qr');

      // Start polling
      pollStatus(response.paymentId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setStep('failed');
    }
  }, [totalAmount, selected]);

  const pollStatus = async (paymentId: string) => {
    setStep('qr');
    const sablePay = SablePay.getInstance();

    const poll = async () => {
      try {
        const statusResp = await sablePay.getPaymentStatus(paymentId);
        setStatus(statusResp);

        if (isCompleted(statusResp.status)) {
          setStep('success');
          return;
        }
        if (isFailed(statusResp.status) || isExpired(statusResp.status)) {
          setStep('failed');
          return;
        }
        // Still pending — poll again
        setTimeout(poll, 3000);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        setStep('failed');
      }
    };

    poll();
  };

  const reset = () => {
    setSelected(new Map());
    setStep('menu');
    setPayment(null);
    setStatus(null);
    setQrUrl('');
    setError('');
  };

  if (initError) {
    return <div className="config-warning">{initError}</div>;
  }

  return (
    <>
      <div className="card">
        <h2 className="card-title">☕ Coffee Shop POS</h2>

        {step === 'menu' && (
          <>
            <div className="menu-grid">
              {MENU.map((item) => (
                <div
                  key={item.name}
                  className={`menu-item ${selected.has(item.name) ? 'selected' : ''}`}
                  onClick={() => toggleItem(item.name)}
                >
                  <span className="emoji">{item.emoji}</span>
                  <span className="name">{item.name}</span>
                  <span className="price">${item.price.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="order-summary">
              <div>
                <div className="order-label">Order Total</div>
                <div className="order-total">${totalAmount.toFixed(2)}</div>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {selected.size} item{selected.size !== 1 ? 's' : ''}
              </div>
            </div>

            <button
              className="btn btn-primary"
              disabled={totalAmount === 0 || !isInitialized}
              onClick={createPayment}
            >
              Create Payment
            </button>
          </>
        )}

        {step === 'creating' && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div className="spinner dark large" />
            <p style={{ marginTop: 16, color: 'var(--text-secondary)' }}>
              Creating payment…
            </p>
          </div>
        )}

        {(step === 'qr' || step === 'polling') && payment && (
          <div className="payment-result">
            <div className="amount">${totalAmount.toFixed(2)}</div>
            <div className="status pending">Awaiting Payment</div>
            <div className="payment-id">ID: {payment.paymentId}</div>

            {qrUrl && (
              <div className="qr-container">
                <img src={qrUrl} alt="Payment QR Code" width={280} height={280} />

                {/* SablePay Branding — below QR */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 16 }}>
                  <img src="/sablePayLogo.png" alt="SablePay" width={32} height={32} />
                  <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>SablePay</span>
                </div>

                <span className="scan-label">
                  Scan to pay · Polling for confirmation…
                </span>
              </div>
            )}

            <div style={{ marginTop: 12 }}>
              <div className="spinner dark" style={{ marginRight: 8 }} />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Checking status…
              </span>
            </div>

            <button className="btn btn-secondary btn-small" onClick={reset} style={{ marginTop: 20 }}>
              Cancel
            </button>
          </div>
        )}

        {step === 'success' && (
          <div className="payment-result">
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <div className="amount">${totalAmount.toFixed(2)}</div>
            <div className="status completed">Payment Completed</div>
            {payment && <div className="payment-id">ID: {payment.paymentId}</div>}

            {status && (
              <div className="status-details">
                {/* {status.txHash && (
                  <div className="status-row">
                    <span className="label">Tx Hash</span>
                    <span className="value">{status.txHash}</span>
                  </div>
                )}
                {status.paidToken && (
                  <div className="status-row">
                    <span className="label">Paid Token</span>
                    <span className="value">{status.paidToken}</span>
                  </div>
                )}
                {status.paidAmount !== undefined && (
                  <div className="status-row">
                    <span className="label">Paid Amount</span>
                    <span className="value success">${status.paidAmount}</span>
                  </div>
                )} */}
              </div>
            )}

            <button className="btn btn-primary" onClick={reset} style={{ marginTop: 20 }}>
              New Order
            </button>
          </div>
        )}

        {step === 'failed' && (
          <div className="payment-result">
            <div style={{ fontSize: 48, marginBottom: 12 }}>❌</div>
            <div className="amount">${totalAmount.toFixed(2)}</div>
            <div className="status failed">
              {status && isExpired(status.status) ? 'Payment Expired' : 'Payment Failed'}
            </div>
            {error && (
              <p style={{ color: 'var(--error)', fontSize: 14, marginTop: 12 }}>
                {error}
              </p>
            )}
            <button className="btn btn-primary" onClick={reset} style={{ marginTop: 20 }}>
              Try Again
            </button>
          </div>
        )}
      </div>
    </>
  );
}
