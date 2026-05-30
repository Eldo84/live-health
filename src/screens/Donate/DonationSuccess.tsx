import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, Loader2, ArrowRight, Heart, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export const DonationSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [isVerifying, setIsVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [verificationAttempts, setVerificationAttempts] = useState(0);
  const MAX_ATTEMPTS = 10;

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Verify payment status
    const verifyPayment = async () => {
      if (!sessionId) {
        setIsVerifying(false);
        setVerified(true);
        return;
      }

      if (verificationAttempts >= MAX_ATTEMPTS) {
        console.log('Max verification attempts reached, assuming payment success');
        setIsVerifying(false);
        setVerified(true);
        return;
      }

      try {
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check donation status in database
        const { data, error } = await supabase
          .from('donations')
          .select('status')
          .eq('stripe_checkout_session_id', sessionId)
          .single();

        if (error) {
          console.error('Error fetching donation:', error);
          if (error.code === 'PGRST116') {
            setIsVerifying(false);
            setVerified(true);
            return;
          }
          throw error;
        }

        if (data?.status === 'succeeded') {
          setVerified(true);
          setIsVerifying(false);
          return;
        }

        // Still processing, check again
        setVerificationAttempts(prev => prev + 1);
        setTimeout(verifyPayment, 2000);
        return;
      } catch (err) {
        console.error('Error verifying payment:', err);
        if (verificationAttempts >= 3) {
          setIsVerifying(false);
          setVerified(true);
        } else {
          setVerificationAttempts(prev => prev + 1);
          setTimeout(verifyPayment, 2000);
        }
      }
    };

    verifyPayment();
  }, [sessionId, verificationAttempts]);

  const pageShell: React.CSSProperties = {
    minHeight: '100vh',
    background: 'var(--ln-bg)',
    color: 'var(--ln-ink)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 20px',
  };

  if (isVerifying) {
    return (
      <div className="ln-app" style={pageShell}>
        <div
          style={{
            width: '100%',
            maxWidth: 560,
            border: '1px solid var(--ln-line)',
            background: 'var(--ln-surface)',
            padding: '48px 32px',
            textAlign: 'center',
          }}
        >
          <Loader2
            className="w-12 h-12 animate-spin"
            style={{ color: 'var(--ln-brand)', margin: '0 auto 18px' }}
          />
          <h2 className="ln-display" style={{ fontSize: 22, margin: '0 0 8px', letterSpacing: '-0.01em' }}>
            Verifying Donation...
          </h2>
          <p style={{ color: 'var(--ln-ink-3)', fontSize: 13.5, margin: 0 }}>
            Please wait while we confirm your donation.
          </p>
          {verificationAttempts > 3 && (
            <p style={{ color: 'var(--ln-ink-4)', fontSize: 12.5, fontStyle: 'italic', margin: '14px 0 0' }}>
              This may take a few moments. Your donation is being processed...
            </p>
          )}
        </div>
      </div>
    );
  }

  const impactItems: { title: string; body: string }[] = [
    {
      title: 'Supporting Global Health',
      body: 'Your contribution helps expand data coverage to underserved regions',
    },
    {
      title: 'Enhancing Technology',
      body: 'Funding AI improvements and early warning systems',
    },
    {
      title: 'Free Access for All',
      body: 'Helping maintain free access for public health organizations',
    },
  ];

  return (
    <div className="ln-app" style={pageShell}>
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
        {/* Success Icon */}
        <div style={{ position: 'relative', width: 84, height: 84, margin: '0 auto 22px' }}>
          <div
            style={{
              width: 84,
              height: 84,
              borderRadius: '50%',
              background: 'color-mix(in oklab, #4ee0c4 16%, transparent)',
              border: '1px solid color-mix(in oklab, #4ee0c4 40%, transparent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CheckCircle className="w-12 h-12" style={{ color: '#4ee0c4' }} />
          </div>
          <Sparkles
            className="w-6 h-6"
            style={{ position: 'absolute', top: -6, right: -6, color: 'var(--ln-warn)' }}
          />
        </div>

        {/* Title */}
        <span className="ln-eyebrow">Donation received</span>
        <h1 className="ln-display" style={{ fontSize: 34, margin: '8px 0 12px', letterSpacing: '-0.02em' }}>
          Thank You
        </h1>
        <p style={{ color: 'var(--ln-ink-3)', fontSize: 14, lineHeight: 1.5, margin: '0 auto 30px', maxWidth: 480 }}>
          Your generous donation helps us expand global health surveillance and make life-saving
          information accessible worldwide.
        </p>

        {/* Impact Section */}
        <div
          style={{
            border: '1px solid var(--ln-line)',
            background: 'var(--ln-surface-2)',
            padding: '20px 22px',
            marginBottom: 30,
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Heart className="w-4 h-4" style={{ color: '#4ee0c4' }} />
            <span className="ln-display" style={{ fontSize: 16, letterSpacing: '-0.01em' }}>Your Impact</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {impactItems.map((item) => (
              <div key={item.title} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span
                  style={{
                    flex: '0 0 auto',
                    marginTop: 1,
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: 'color-mix(in oklab, #4ee0c4 18%, transparent)',
                    border: '1px solid color-mix(in oklab, #4ee0c4 40%, transparent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CheckCircle className="w-3.5 h-3.5" style={{ color: '#4ee0c4' }} />
                </span>
                <div>
                  <p style={{ fontSize: 13.5, fontWeight: 600, margin: 0, color: 'var(--ln-ink)' }}>{item.title}</p>
                  <p style={{ fontSize: 12.5, color: 'var(--ln-ink-3)', margin: '3px 0 0', lineHeight: 1.45 }}>
                    {item.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Link to="/" className="ln-btn is-primary" style={{ justifyContent: 'center', width: '100%' }}>
            <ArrowRight className="w-4 h-4" />
            Return to Home
          </Link>
          <Link to="/map" className="ln-btn" style={{ justifyContent: 'center', width: '100%' }}>
            Explore the Map
          </Link>
        </div>

        {/* Receipt Info */}
        {sessionId && (
          <p style={{ fontSize: 11.5, color: 'var(--ln-ink-4)', margin: '22px 0 0' }}>
            A receipt has been sent to your email (if provided)
          </p>
        )}
      </div>
    </div>
  );
};

export default DonationSuccess;
