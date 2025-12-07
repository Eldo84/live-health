import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { XCircle, ArrowLeft, RefreshCcw, HelpCircle } from 'lucide-react';

export const PaymentCancelled: React.FC = () => {
  const [searchParams] = useSearchParams();
  const submissionId = searchParams.get('submission_id');

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-background flex items-center justify-center p-4">
      <Card className="max-w-lg w-full shadow-lg border-orange-200">
        <CardContent className="pt-8 pb-8 text-center">
          {/* Icon */}
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-12 h-12 text-orange-500" />
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold mb-2">Payment Cancelled</h1>
          <p className="text-muted-foreground mb-8">
            Your payment was cancelled. Don't worry - your application is still saved and you can complete the payment anytime.
          </p>

          {/* Info Box */}
          <div className="bg-muted/50 rounded-lg p-6 mb-8 text-left">
            <h3 className="font-semibold mb-3">What you can do:</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Return to payment when you're ready</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Your application approval remains valid</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Contact support if you have questions</span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {submissionId && (
              <Button asChild className="w-full" size="lg">
                <Link to={`/payment/${submissionId}`}>
                  <RefreshCcw className="w-4 h-4 mr-2" />
                  Try Payment Again
                </Link>
              </Button>
            )}
            
            <Button asChild variant="outline" className="w-full" size="lg">
              <Link to="/dashboard/advertising">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>

            <Button asChild variant="ghost" className="w-full">
              <a href="mailto:support@outbreaknow.com">
                <HelpCircle className="w-4 h-4 mr-2" />
                Contact Support
              </a>
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

export default PaymentCancelled;

