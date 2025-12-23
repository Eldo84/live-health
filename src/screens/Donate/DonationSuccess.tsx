import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
            <h2 className="text-xl font-semibold mb-2">Verifying Donation...</h2>
            <p className="text-muted-foreground mb-4">
              Please wait while we confirm your donation.
            </p>
            {verificationAttempts > 3 && (
              <p className="text-sm text-muted-foreground italic">
                This may take a few moments. Your donation is being processed...
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
          <h1 className="text-3xl font-bold mb-2">Thank You! 🎉</h1>
          <p className="text-muted-foreground mb-8">
            Your generous donation helps us expand global health surveillance and make life-saving information accessible worldwide.
          </p>

          {/* Impact Message */}
          <div className="bg-muted/50 rounded-lg p-6 mb-8 text-left">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Heart className="w-5 h-5 text-primary" />
              Your Impact
            </h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">✓</span>
                </div>
                <div>
                  <span className="font-medium">Supporting Global Health</span>
                  <p className="text-muted-foreground">Your contribution helps expand data coverage to underserved regions</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">✓</span>
                </div>
                <div>
                  <span className="font-medium">Enhancing Technology</span>
                  <p className="text-muted-foreground">Funding AI improvements and early warning systems</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">✓</span>
                </div>
                <div>
                  <span className="font-medium">Free Access for All</span>
                  <p className="text-muted-foreground">Helping maintain free access for public health organizations</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button asChild className="w-full" size="lg">
              <Link to="/">
                <ArrowRight className="w-4 h-4 mr-2" />
                Return to Home
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="w-full" size="lg">
              <Link to="/map">
                Explore the Map
              </Link>
            </Button>
          </div>

          {/* Receipt Info */}
          {sessionId && (
            <p className="text-xs text-muted-foreground mt-6">
              A receipt has been sent to your email (if provided)
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DonationSuccess;

