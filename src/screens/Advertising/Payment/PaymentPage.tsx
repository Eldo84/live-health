import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CreditCard, XCircle, ArrowLeft, Clock, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { trackAdPaymentInitiated } from '@/lib/analytics';

const PLAN_INFO = {
  basic: { name: 'Basic Plan', price: '$50', duration: '30 days' },
  professional: { name: 'Professional Plan', price: '$150', duration: '60 days' },
  enterprise: { name: 'Enterprise Plan', price: '$300', duration: '90 days' },
};

interface Submission {
  id: string;
  company_name: string;
  selected_plan: 'basic' | 'professional' | 'enterprise';
  status: string;
  payment_status: string;
  ad_title: string | null;
}

const PAGE_STYLE: React.CSSProperties = {
  minHeight: '100vh',
  background: 'var(--ln-bg)',
  color: 'var(--ln-ink)',
};

const SummaryRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, fontSize: 13 }}>
    <span style={{ color: 'var(--ln-ink-3)' }}>{label}</span>
    <span style={{ color: 'var(--ln-ink)', fontWeight: 500, textAlign: 'right' }}>{children}</span>
  </div>
);

export const PaymentPage: React.FC = () => {
  const { submissionId } = useParams<{ submissionId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to complete your payment.",
        variant: "destructive",
      });
      navigate(`/`);
      return;
    }

    fetchSubmission();
  }, [submissionId, user, authLoading]);

  const fetchSubmission = async () => {
    if (!submissionId) {
      setError("No submission ID provided");
      setIsLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('advertising_submissions')
        .select('*')
        .eq('id', submissionId)
        .single();

      if (fetchError) throw fetchError;

      if (!data) {
        setError("Submission not found");
        return;
      }

      // Check if already paid
      if (data.payment_status === 'paid') {
        toast({
          title: "Already Paid",
          description: "This submission has already been paid for.",
        });
        navigate('/dashboard/advertising');
        return;
      }

      // Check if approved for payment
      if (data.status !== 'approved_pending_payment') {
        setError(`This submission cannot be paid for. Current status: ${data.status}`);
        return;
      }

      setSubmission(data);
    } catch (err: any) {
      console.error('Error fetching submission:', err);
      setError(err.message || "Failed to load submission");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!submission || !user) return;

    setIsProcessing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            submission_id: submission.id,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err: any) {
      console.error('Payment error:', err);
      toast({
        title: "Payment Error",
        description: err.message || "Failed to initiate payment. Please try again.",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="ln-app" style={{ ...PAGE_STYLE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--ln-brand)', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--ln-ink-3)', fontSize: 13 }}>Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ln-app" style={{ ...PAGE_STYLE, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ maxWidth: 440, width: '100%', border: '1px solid var(--ln-line)', background: 'var(--ln-surface)', padding: '32px 28px', textAlign: 'center' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              margin: '0 auto 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'color-mix(in oklab, var(--ln-crit) 12%, transparent)',
              border: '1px solid color-mix(in oklab, var(--ln-crit) 35%, transparent)',
            }}
          >
            <XCircle className="w-7 h-7" style={{ color: 'var(--ln-crit)' }} />
          </div>
          <h2 className="ln-display" style={{ fontSize: 20, margin: '0 0 8px' }}>Payment Error</h2>
          <p style={{ color: 'var(--ln-ink-3)', fontSize: 13, margin: '0 0 24px' }}>{error}</p>
          <button onClick={() => navigate('/')} className="ln-btn" style={{ display: 'inline-flex' }}>
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="ln-app" style={{ ...PAGE_STYLE, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ maxWidth: 440, width: '100%', border: '1px solid var(--ln-line)', background: 'var(--ln-surface)', padding: '32px 28px', textAlign: 'center' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              margin: '0 auto 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'color-mix(in oklab, var(--ln-crit) 12%, transparent)',
              border: '1px solid color-mix(in oklab, var(--ln-crit) 35%, transparent)',
            }}
          >
            <XCircle className="w-7 h-7" style={{ color: 'var(--ln-crit)' }} />
          </div>
          <h2 className="ln-display" style={{ fontSize: 20, margin: '0 0 8px' }}>Submission Not Found</h2>
          <p style={{ color: 'var(--ln-ink-3)', fontSize: 13, margin: '0 0 24px' }}>Unable to load submission details.</p>
          <button onClick={() => navigate('/dashboard/advertising')} className="ln-btn" style={{ display: 'inline-flex' }}>
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const planInfo = PLAN_INFO[submission.selected_plan];

  return (
    <div className="ln-app" style={{ ...PAGE_STYLE, padding: '48px 16px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        {/* Back Button */}
        <button
          className="ln-btn"
          style={{ marginBottom: 24 }}
          onClick={() => navigate('/dashboard/advertising')}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        {/* Payment Card */}
        <div style={{ border: '1px solid var(--ln-line)', background: 'var(--ln-surface)' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', borderBottom: '1px solid var(--ln-line)', padding: '32px 28px' }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                margin: '0 auto 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'color-mix(in oklab, var(--ln-brand) 12%, transparent)',
                border: '1px solid color-mix(in oklab, var(--ln-brand) 35%, transparent)',
              }}
            >
              <CreditCard className="w-8 h-8" style={{ color: 'var(--ln-brand)' }} />
            </div>
            <span className="ln-eyebrow">Approved · ready for payment</span>
            <h1 className="ln-display" style={{ fontSize: 26, margin: '6px 0 6px', letterSpacing: '-0.02em' }}>
              Complete Your Payment
            </h1>
            <p style={{ color: 'var(--ln-ink-3)', fontSize: 13, margin: 0 }}>
              Your advertising application has been approved!
            </p>
          </div>

          {/* Body */}
          <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Order Summary */}
            <div style={{ border: '1px solid var(--ln-line)', background: 'var(--ln-surface-2)', padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: 'var(--ln-ink)' }}>Order Summary</h3>
                <span className="ln-chip is-warn">
                  <Clock className="w-3 h-3" />
                  <span style={{ marginLeft: 4 }}>Awaiting Payment</span>
                </span>
              </div>

              <SummaryRow label="Company">{submission.company_name}</SummaryRow>
              <SummaryRow label="Plan">{planInfo.name}</SummaryRow>
              <SummaryRow label="Duration">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Clock className="w-3 h-3" style={{ color: 'var(--ln-ink-4)' }} />
                  {planInfo.duration}
                </span>
              </SummaryRow>

              {submission.ad_title && (
                <SummaryRow label="Ad Title">
                  <span style={{ display: 'inline-block', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {submission.ad_title}
                  </span>
                </SummaryRow>
              )}

              <div style={{ borderTop: '1px solid var(--ln-line)', paddingTop: 12, marginTop: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ln-ink)' }}>Total</span>
                  <span className="ln-num" style={{ fontSize: 28, fontWeight: 600, color: 'var(--ln-brand)' }}>{planInfo.price}</span>
                </div>
                <p style={{ fontSize: 11, color: 'var(--ln-ink-4)', margin: '4px 0 0' }}>One-time payment</p>
              </div>
            </div>

            {/* Security Notice */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 12.5, color: 'var(--ln-ink-3)' }}>
              <Shield className="w-5 h-5" style={{ color: 'var(--ln-brand)', flexShrink: 0, marginTop: 1 }} />
              <p style={{ margin: 0 }}>
                Your payment is secured by Stripe. We never store your card details.
              </p>
            </div>

            {/* Payment Button */}
            <button
              onClick={handlePayment}
              disabled={isProcessing}
              className="ln-btn is-primary"
              style={{ width: '100%', height: 48, fontSize: 15, justifyContent: 'center', opacity: isProcessing ? 0.7 : 1 }}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Redirecting to Stripe...
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5" />
                  Pay {planInfo.price}
                </>
              )}
            </button>

            <p style={{ fontSize: 11, textAlign: 'center', color: 'var(--ln-ink-4)', margin: 0 }}>
              By completing this payment, you agree to our Terms of Service.
            </p>
          </div>
        </div>

        {/* Features Reminder */}
        <div style={{ marginTop: 24, textAlign: 'center', fontSize: 12.5, color: 'var(--ln-ink-3)' }}>
          <p style={{ margin: '0 0 8px', color: 'var(--ln-ink-2)' }}>What you'll get:</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {submission.selected_plan === 'basic' && (
              <>
                <li>✓ Map sponsored section placement</li>
                <li>✓ 30-day display duration</li>
                <li>✓ Basic analytics</li>
              </>
            )}
            {submission.selected_plan === 'professional' && (
              <>
                <li>✓ Map + Homepage placement</li>
                <li>✓ 60-day display duration</li>
                <li>✓ Featured badge</li>
                <li>✓ Advanced analytics</li>
              </>
            )}
            {submission.selected_plan === 'enterprise' && (
              <>
                <li>✓ All platforms (Map, Homepage, Newsletter)</li>
                <li>✓ 90-day display duration</li>
                <li>✓ Pinned to top position</li>
                <li>✓ Custom analytics & reports</li>
              </>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
