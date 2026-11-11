'use client';

import React, { useState, useEffect } from 'react';
import {
  SablePay,
  CreatePaymentRequest,
  PaymentItem,
  PaymentResult,
  PaymentFlowError,
  PaymentFlowErrorType,
} from '@sablepay/react-sablepay-js';
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

type Step = 'menu' | 'paying' | 'success' | 'failed';

/** The SDK reports a user-closed payment window as an UNKNOWN error with this message. */
const isUserCancel = (err: PaymentFlowError) =>
  err.type === PaymentFlowErrorType.UNKNOWN && err.message === 'Payment cancelled';

export default function CoffeeShopPage() {
  const { isInitialized, error: initError } = useSablePayContext();

  const [selected, setSelected] = useState<Map<string, number>>(new Map());
  const [step, setStep] = useState<Step>('menu');
  const [paymentId, setPaymentId] = useState<string>('');
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [failure, setFailure] = useState<PaymentFlowError | null>(null);

  // Close any open payment window if the user navigates away.
  useEffect(() => () => SablePay.cancelPayment(), []);

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

  const startPayment = () => {
    if (totalAmount === 0) return;

    const items: PaymentItem[] = Array.from(selected.entries()).map(([name, qty]) => {
      const menuItem = MENU.find((m) => m.name === name)!;
      return { name: menuItem.name, quantity: qty, price: menuItem.price };
    });

    const request: CreatePaymentRequest = {
      amount: totalAmount,
      items,
      metadata: { source: 'example-app-coffee-shop' },
    };

    setStep('paying');
    setFailure(null);
    setResult(null);

    // The SDK opens its own payment window (QR code, countdown, status polling)
    // and reports the outcome through these callbacks.
    SablePay.launchPayment(request, {
      onPaymentCreated: (response) => setPaymentId(response.paymentId),
      onSuccess: (res) => {
        setResult(res);
        setStep('success');
      },
      onFailure: (err) => {
        if (isUserCancel(err)) {
          setStep('menu');
          return;
        }
        setFailure(err);
        setStep('failed');
      },
    });
  };

  const reset = () => {
    SablePay.cancelPayment();
    setSelected(new Map());
    setStep('menu');
    setPaymentId('');
    setResult(null);
    setFailure(null);
  };

  if (initError) {
    return <div className="config-warning">{initError}</div>;
  }

  const currency = result?.currency_symbol || '$';

  return (
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
            onClick={startPayment}
          >
            Pay with SablePay
          </button>
        </>
      )}

      {step === 'paying' && (
        <div className="payment-result">
          <div className="amount">${totalAmount.toFixed(2)}</div>
          <div className="status pending">Awaiting Payment</div>
          {paymentId && <div className="payment-id">ID: {paymentId}</div>}
          <div style={{ marginTop: 12 }}>
            <div className="spinner dark" style={{ marginRight: 8 }} />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Complete the payment in the SablePay window…
            </span>
          </div>
          <button className="btn btn-secondary btn-small" onClick={reset} style={{ marginTop: 20 }}>
            Cancel
          </button>
        </div>
      )}

      {step === 'success' && result && (
        <div className="payment-result">
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <div className="amount">{currency}{result.amount.toFixed(2)}</div>
          <div className="status completed">Payment Completed</div>
          <div className="payment-id">ID: {result.paymentId}</div>

          <div className="status-details">
            {result.paidAmount != null && (
              <div className="status-row">
                <span className="label">Paid Amount</span>
                <span className="value success">{result.paidAmount}</span>
              </div>
            )}
            {result.paidToken && (
              <div className="status-row">
                <span className="label">Paid Token</span>
                <span className="value">{result.paidToken}</span>
              </div>
            )}
            {result.paidNetwork && (
              <div className="status-row">
                <span className="label">Network</span>
                <span className="value">{result.paidNetwork}</span>
              </div>
            )}
            {result.transactionHash && (
              <div className="status-row">
                <span className="label">Tx Hash</span>
                <span className="value">{result.transactionHash}</span>
              </div>
            )}
          </div>

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
            {failure?.type === PaymentFlowErrorType.PAYMENT_EXPIRED ? 'Payment Expired' : 'Payment Failed'}
          </div>
          {failure?.paymentId && <div className="payment-id">ID: {failure.paymentId}</div>}
          {failure?.message && (
            <p style={{ color: 'var(--error)', fontSize: 14, marginTop: 12 }}>
              {failure.message}
            </p>
          )}
          <button className="btn btn-primary" onClick={reset} style={{ marginTop: 20 }}>
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
