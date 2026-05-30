import React from 'react';
import { Link } from 'react-router-dom';
import { XCircle, ArrowLeft, RefreshCcw, Heart } from 'lucide-react';

export const DonationCancelled: React.FC = () => {
  const points = [
    'Your support makes a difference in global health monitoring',
    'You can donate anytime - every contribution helps',
    'Contact us if you have questions about donating',
  ];

  return (
    <div
      className="ln-app"
      style={{
        minHeight: '100vh',
        background: 'var(--ln-bg)',
        color: 'var(--ln-ink)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 640,
          border: '1px solid var(--ln-line)',
          background: 'var(--ln-surface)',
          padding: '44px 32px 36px',
          textAlign: 'center',
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: 84,
            height: 84,
            margin: '0 auto 22px',
            borderRadius: '50%',
            background: 'color-mix(in oklab, var(--ln-warn) 14%, transparent)',
            border: '1px solid color-mix(in oklab, var(--ln-warn) 40%, transparent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <XCircle className="w-12 h-12" style={{ color: 'var(--ln-warn)' }} />
        </div>

        {/* Title */}
        <span className="ln-eyebrow">Payment not completed</span>
        <h1 className="ln-display" style={{ fontSize: 34, margin: '8px 0 12px', letterSpacing: '-0.02em' }}>
          Donation Cancelled
        </h1>
        <p style={{ color: 'var(--ln-ink-3)', fontSize: 14, lineHeight: 1.5, margin: '0 auto 30px', maxWidth: 480 }}>
          Your donation was cancelled. No payment was processed. You can try again anytime.
        </p>

        {/* Info Box */}
        <div
          style={{
            border: '1px solid var(--ln-line)',
            background: 'var(--ln-surface-2)',
            padding: '20px 22px',
            marginBottom: 30,
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Heart className="w-4 h-4" style={{ color: '#4ee0c4' }} />
            <span className="ln-display" style={{ fontSize: 16, letterSpacing: '-0.01em' }}>We're Still Here</span>
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {points.map((point) => (
              <li key={point} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 12.5, color: 'var(--ln-ink-3)', lineHeight: 1.45 }}>
                <span style={{ color: '#4ee0c4', flex: '0 0 auto', lineHeight: 1.45 }}>•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Link to="/" className="ln-btn is-primary" style={{ justifyContent: 'center', width: '100%' }}>
            <RefreshCcw className="w-4 h-4" />
            Try Donating Again
          </Link>
          <Link to="/map" className="ln-btn" style={{ justifyContent: 'center', width: '100%' }}>
            <ArrowLeft className="w-4 h-4" />
            Explore the Map
          </Link>
          <a href="mailto:contact@theghqa.org" className="ln-btn" style={{ justifyContent: 'center', width: '100%', border: 'none', background: 'transparent', color: 'var(--ln-ink-3)' }}>
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
};

export default DonationCancelled;
