import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { XCircle, ArrowLeft, RefreshCcw, HelpCircle } from 'lucide-react';

const PAGE_STYLE: React.CSSProperties = {
  minHeight: '100vh',
  background: 'var(--ln-bg)',
  color: 'var(--ln-ink)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
};

export const PaymentCancelled: React.FC = () => {
  const [searchParams] = useSearchParams();
  const submissionId = searchParams.get('submission_id');

  const points = [
    "Return to payment when you're ready",
    'Your application approval remains valid',
    'Contact support if you have questions',
  ];

  return (
    <div className="ln-app" style={PAGE_STYLE}>
      <div style={{ maxWidth: 560, width: '100%', border: '1px solid color-mix(in oklab, var(--ln-warn) 30%, var(--ln-line))', background: 'var(--ln-surface)', padding: '40px 32px', textAlign: 'center' }}>
        {/* Icon */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            margin: '0 auto 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'color-mix(in oklab, var(--ln-warn) 12%, transparent)',
            border: '1px solid color-mix(in oklab, var(--ln-warn) 40%, transparent)',
          }}
        >
          <XCircle className="w-12 h-12" style={{ color: 'var(--ln-warn)' }} />
        </div>

        {/* Title */}
        <span className="ln-eyebrow">Checkout interrupted</span>
        <h1 className="ln-display" style={{ fontSize: 30, margin: '6px 0 8px', letterSpacing: '-0.02em' }}>Payment Cancelled</h1>
        <p style={{ color: 'var(--ln-ink-3)', fontSize: 13.5, margin: '0 0 32px' }}>
          Your payment was cancelled. Don't worry — your application is still saved and you can complete the payment anytime.
        </p>

        {/* Info Box */}
        <div style={{ border: '1px solid var(--ln-line)', background: 'var(--ln-surface-2)', padding: 24, marginBottom: 32, textAlign: 'left' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px', color: 'var(--ln-ink)' }}>What you can do:</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {points.map((p) => (
              <li key={p} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12.5, color: 'var(--ln-ink-3)' }}>
                <span style={{ color: 'var(--ln-brand)', lineHeight: 1.4 }}>•</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {submissionId && (
            <Link to={`/payment/${submissionId}`} className="ln-btn is-primary" style={{ width: '100%', height: 44, justifyContent: 'center' }}>
              <RefreshCcw className="w-4 h-4" />
              Try Payment Again
            </Link>
          )}

          <Link to="/dashboard/advertising" className="ln-btn" style={{ width: '100%', height: 44, justifyContent: 'center' }}>
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>

          <a
            href="mailto:contact@theghqa.org"
            className="ln-btn"
            style={{ width: '100%', height: 44, justifyContent: 'center', border: 'none', background: 'transparent' }}
          >
            <HelpCircle className="w-4 h-4" />
            Contact Support
          </a>
        </div>

        {/* Reference Info */}
        {submissionId && (
          <p className="ln-num" style={{ fontSize: 11, color: 'var(--ln-ink-4)', marginTop: 24 }}>
            Reference: {submissionId}
          </p>
        )}
      </div>
    </div>
  );
};

export default PaymentCancelled;
