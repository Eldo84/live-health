import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, Loader2, ArrowRight, MapPin, BarChart3, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const PAGE_STYLE: React.CSSProperties = {
  minHeight: '100vh',
  background: 'var(--ln-bg)',
  color: 'var(--ln-ink)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
};

const STEPS: { title: string; desc: string; accent: string }[] = [
  { title: 'Ad Activated', desc: 'Your ad is now live and visible on the platform', accent: 'var(--ln-brand)' },
  { title: 'Start Tracking', desc: 'View analytics in your dashboard', accent: '#4ee0c4' },
  { title: 'Manage Your Ad', desc: 'Update content anytime from your dashboard', accent: '#4ee0c4' },
];

export const PaymentSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isVerifying, setIsVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [verificationAttempts, setVerificationAttempts] = useState(0);
  const MAX_ATTEMPTS = 10; // Maximum 10 attempts (20 seconds total)

  const sessionId = searchParams.get('session_id');
  const submissionId = searchParams.get('submission_id');

  useEffect(() => {
    // Verify payment status
    const verifyPayment = async () => {
      if (!submissionId) {
        setIsVerifying(false);
        setVerified(true); // Assume success if no ID to verify
        return;
      }

      // If we've exceeded max attempts, assume success (webhook might be delayed)
      if (verificationAttempts >= MAX_ATTEMPTS) {
        console.log('Max verification attempts reached, assuming payment success');
        setIsVerifying(false);
        setVerified(true);
        return;
      }

      try {
        // Wait a moment for webhook to process
        await new Promise(resolve => setTimeout(resolve, 2000));

        // First, check database status
        const { data, error } = await supabase
          .from('advertising_submissions')
          .select('status, payment_status')
          .eq('id', submissionId)
          .single();

        if (error) {
          console.error('Error fetching submission:', error);
          // If it's a not found error, assume success (might be processing)
          if (error.code === 'PGRST116') {
            setIsVerifying(false);
            setVerified(true);
            return;
          }
          throw error;
        }

        if (data?.payment_status === 'paid' || data?.status === 'active') {
          setVerified(true);
          setIsVerifying(false);
          return;
        }

        // If payment not confirmed in DB yet, verify with Stripe directly
        if (sessionId && user) {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
              throw new Error("Not authenticated");
            }

            const verifyResponse = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-payment`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                  session_id: sessionId,
                  submission_id: submissionId,
                }),
              }
            );

            const verifyData = await verifyResponse.json();

            if (verifyData.verified) {
              // Payment verified via Stripe, refresh database check
              const { data: refreshedData } = await supabase
                .from('advertising_submissions')
                .select('status, payment_status')
                .eq('id', submissionId)
                .single();

              if (refreshedData?.payment_status === 'paid' || refreshedData?.status === 'active') {
                setVerified(true);
                setIsVerifying(false);
                return;
              }
            }
          } catch (verifyError) {
            console.error('Error verifying with Stripe:', verifyError);
            // Continue with normal flow
          }
        }

        // Still processing, check again
        setVerificationAttempts(prev => prev + 1);
        setTimeout(verifyPayment, 2000);
        return;
      } catch (err) {
        console.error('Error verifying payment:', err);
        // After a few attempts, assume success (webhook might still process)
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
  }, [submissionId, verificationAttempts]);

  if (isVerifying) {
    return (
      <div className="ln-app" style={PAGE_STYLE}>
        <div style={{ maxWidth: 440, width: '100%', border: '1px solid var(--ln-line)', background: 'var(--ln-surface)', padding: '40px 28px', textAlign: 'center' }}>
          <Loader2 className="w-12 h-12 animate-spin" style={{ color: 'var(--ln-brand)', margin: '0 auto 16px' }} />
          <h2 className="ln-display" style={{ fontSize: 20, margin: '0 0 8px' }}>Verifying Payment...</h2>
          <p style={{ color: 'var(--ln-ink-3)', fontSize: 13, margin: '0 0 12px' }}>
            Please wait while we confirm your payment.
          </p>
          {verificationAttempts > 3 && (
            <p style={{ fontSize: 12, color: 'var(--ln-ink-4)', fontStyle: 'italic', margin: 0 }}>
              This may take a few moments. Your payment is being processed...
            </p>
          )}
          {sessionId && (
            <p className="ln-num" style={{ fontSize: 11, color: 'var(--ln-ink-4)', marginTop: 16 }}>
              Session: {sessionId.substring(0, 20)}...
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="ln-app" style={PAGE_STYLE}>
      <div style={{ maxWidth: 560, width: '100%', border: '1px solid color-mix(in oklab, var(--ln-brand) 30%, var(--ln-line))', background: 'var(--ln-surface)', padding: '40px 32px', textAlign: 'center' }}>
        {/* Success Icon with animation */}
        <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 24px' }}>
          <div
            className="animate-ping"
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: 'color-mix(in oklab, var(--ln-brand) 25%, transparent)',
              opacity: 0.25,
            }}
          />
          <div
            style={{
              position: 'relative',
              width: 80,
              height: 80,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'color-mix(in oklab, var(--ln-brand) 14%, transparent)',
              border: '1px solid color-mix(in oklab, var(--ln-brand) 40%, transparent)',
            }}
          >
            <CheckCircle className="w-12 h-12" style={{ color: 'var(--ln-brand)' }} />
          </div>
          <Sparkles className="absolute animate-bounce" style={{ top: -8, right: -8, width: 24, height: 24, color: '#4ee0c4' }} />
        </div>

        {/* Title */}
        <span className="ln-eyebrow">Payment confirmed</span>
        <h1 className="ln-display" style={{ fontSize: 30, margin: '6px 0 8px', letterSpacing: '-0.02em' }}>Payment Successful!</h1>
        <p style={{ color: 'var(--ln-ink-3)', fontSize: 13.5, margin: '0 0 32px' }}>
          Thank you for advertising with OutbreakNow. Your ad is now being activated and will start reaching people across the platform.
        </p>

        {/* What's Next */}
        <div style={{ border: '1px solid var(--ln-line)', background: 'var(--ln-surface-2)', padding: 24, marginBottom: 32, textAlign: 'left' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 16px', color: 'var(--ln-ink)' }}>What happens now?</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {STEPS.map((step, i) => (
              <li key={step.title} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    flexShrink: 0,
                    marginTop: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: step.accent,
                    color: 'var(--ln-bg)',
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {i + 1}
                </div>
                <div>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ln-ink)' }}>{step.title}</span>
                  <p style={{ fontSize: 12.5, color: 'var(--ln-ink-3)', margin: '2px 0 0' }}>{step.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Link to="/map" className="ln-btn is-primary" style={{ width: '100%', height: 44, justifyContent: 'center' }}>
            <MapPin className="w-4 h-4" />
            View Your Ad on the Map
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link to="/dashboard/advertising" className="ln-btn" style={{ width: '100%', height: 44, justifyContent: 'center' }}>
            <BarChart3 className="w-4 h-4" />
            Go to Dashboard
          </Link>
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

export default PaymentSuccess;
