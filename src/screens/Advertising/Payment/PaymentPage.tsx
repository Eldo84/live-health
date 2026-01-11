import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CreditCard, CheckCircle, XCircle, ArrowLeft, Clock, Shield } from 'lucide-react';
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Payment Error</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={() => navigate('/')} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Submission Not Found</h2>
            <p className="text-muted-foreground mb-6">Unable to load submission details.</p>
            <Button onClick={() => navigate('/dashboard/advertising')} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const planInfo = PLAN_INFO[submission.selected_plan];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-12 px-4">
      <div className="max-w-lg mx-auto">
        {/* Back Button */}
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate('/dashboard/advertising')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        {/* Payment Card */}
        <Card className="shadow-lg">
          <CardHeader className="text-center border-b pb-6">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Complete Your Payment</CardTitle>
            <CardDescription>
              Your advertising application has been approved!
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            {/* Order Summary */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold">Order Summary</h3>
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Company</span>
                <span className="font-medium">{submission.company_name}</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-medium">{planInfo.name}</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {planInfo.duration}
                </span>
              </div>

              {submission.ad_title && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Ad Title</span>
                  <span className="font-medium truncate max-w-[150px]">{submission.ad_title}</span>
                </div>
              )}

              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="text-2xl font-bold text-primary">{planInfo.price}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">One-time payment</p>
              </div>
            </div>

            {/* Security Notice */}
            <div className="flex items-start gap-3 text-sm text-muted-foreground">
              <Shield className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <p>
                Your payment is secured by Stripe. We never store your card details.
              </p>
            </div>

            {/* Payment Button */}
            <Button
              onClick={handlePayment}
              disabled={isProcessing}
              className="w-full h-12 text-lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Redirecting to Stripe...
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5 mr-2" />
                  Pay {planInfo.price}
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              By completing this payment, you agree to our Terms of Service.
            </p>
          </CardContent>
        </Card>

        {/* Features Reminder */}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p className="mb-2">What you'll get:</p>
          <ul className="space-y-1">
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

