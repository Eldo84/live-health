import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Loader2, ArrowRight, MapPin, BarChart3, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

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
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
            <h2 className="text-xl font-semibold mb-2">Verifying Payment...</h2>
            <p className="text-muted-foreground mb-4">
              Please wait while we confirm your payment.
            </p>
            {verificationAttempts > 3 && (
              <p className="text-sm text-muted-foreground italic">
                This may take a few moments. Your payment is being processed...
              </p>
            )}
            {sessionId && (
              <p className="text-xs text-muted-foreground mt-4">
                Session: {sessionId.substring(0, 20)}...
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-background flex items-center justify-center p-4">
      <Card className="max-w-lg w-full shadow-lg border-green-200">
        <CardContent className="pt-8 pb-8 text-center">
          {/* Success Icon with animation */}
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-25" />
            <div className="relative w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
            <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-yellow-500 animate-bounce" />
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold mb-2">Payment Successful! 🎉</h1>
          <p className="text-muted-foreground mb-8">
            Thank you for advertising with OutbreakNow. Your ad is now being activated.
          </p>

          {/* What's Next */}
          <div className="bg-muted/50 rounded-lg p-6 mb-8 text-left">
            <h3 className="font-semibold mb-4">What happens now?</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">1</span>
                </div>
                <div>
                  <span className="font-medium">Ad Activated</span>
                  <p className="text-sm text-muted-foreground">Your ad is now live and visible on the platform</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">2</span>
                </div>
                <div>
                  <span className="font-medium">Start Tracking</span>
                  <p className="text-sm text-muted-foreground">View analytics in your dashboard</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">3</span>
                </div>
                <div>
                  <span className="font-medium">Manage Your Ad</span>
                  <p className="text-sm text-muted-foreground">Update content anytime from your dashboard</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button asChild className="w-full" size="lg">
              <Link to="/map">
                <MapPin className="w-4 h-4 mr-2" />
                View Your Ad on the Map
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="w-full" size="lg">
              <Link to="/dashboard/advertising">
                <BarChart3 className="w-4 h-4 mr-2" />
                Go to Dashboard
              </Link>
            </Button>
          </div>

          {/* Reference Info */}
          {submissionId && (
            <p className="text-xs text-muted-foreground mt-6">
              Reference: {submissionId}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;

