import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { XCircle, ArrowLeft, RefreshCcw, Heart } from 'lucide-react';

export const DonationCancelled: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-background flex items-center justify-center p-4">
      <Card className="max-w-lg w-full shadow-lg border-orange-200">
        <CardContent className="pt-8 pb-8 text-center">
          {/* Icon */}
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-12 h-12 text-orange-500" />
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold mb-2">Donation Cancelled</h1>
          <p className="text-muted-foreground mb-8">
            Your donation was cancelled. No payment was processed. You can try again anytime.
          </p>

          {/* Info Box */}
          <div className="bg-muted/50 rounded-lg p-6 mb-8 text-left">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Heart className="w-5 h-5 text-primary" />
              We're Still Here
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Your support makes a difference in global health monitoring</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>You can donate anytime - every contribution helps</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Contact us if you have questions about donating</span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button asChild className="w-full" size="lg">
              <Link to="/">
                <RefreshCcw className="w-4 h-4 mr-2" />
                Try Donating Again
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="w-full" size="lg">
              <Link to="/map">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Explore the Map
              </Link>
            </Button>

            <Button asChild variant="ghost" className="w-full">
              <a href="mailto:contact@theghqa.org">
                Contact Support
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DonationCancelled;

