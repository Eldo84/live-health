import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import outbreakNowLogo from "@/assets/outbreaknow-logo.png";

export const Footer = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setIsSubmitting(true);
    try {
      // TODO: Implement newsletter subscription logic
      await new Promise(resolve => setTimeout(resolve, 500));
      toast({
        title: "Subscribed successfully!",
        description: "You'll receive outbreak alerts and updates.",
      });
      setEmail("");
    } catch (error) {
      toast({
        title: "Subscription failed",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <footer className="border-t border-border bg-muted/30 py-20 pb-12">
      <div className="container-prose">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 text-sm">
          {/* Logo and Description */}
          <div className="space-y-4 lg:col-span-2">
            <div className="flex items-start gap-3">
              <img src={outbreakNowLogo} alt="OutbreakNow Logo" className="h-16 w-auto" />
            </div>
            <p className="text-muted-foreground">
              OutbreakNow is a platform developed by <strong className="text-foreground">EldoNova+ Technologies</strong> in partnership with the <strong className="text-foreground">Global Health and Quality Alliance (GHQA)</strong> to advance real-time outbreak monitoring, enhance global public health intelligence, and support rapid response efforts worldwide.
            </p>
          </div>

          {/* Resources */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Resources</h4>
            <div className="flex flex-col space-y-2">
              <Dialog>
                <DialogTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground text-left transition-colors">Disclaimer</button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-background">
                  <DialogHeader>
                    <DialogTitle>Disclaimer</DialogTitle>
                  </DialogHeader>
                  <div className="px-6 pb-6">
                    <p className="text-foreground leading-relaxed">
                      OutbreakNow provides outbreak and public health data for informational purposes only. While every effort is made to ensure accuracy, the platform is not a substitute for professional medical advice or guidance from public health authorities.
                    </p>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog>
                <DialogTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground text-left transition-colors">Data Sources</button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-background">
                  <DialogHeader>
                    <DialogTitle>Data Sources</DialogTitle>
                  </DialogHeader>
                  <div className="px-6 pb-6">
                    <p className="text-foreground leading-relaxed">
                      Data is compiled from multiple verified sources, including WHO, CDC, ECDC, national ministries of health, and the OutbreakNow Global Outbreak Monitoring System. Data feeds are updated in real-time or near real-time depending on source availability.
                    </p>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog>
                <DialogTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground text-left transition-colors">Privacy & Legal</button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-background">
                  <DialogHeader>
                    <DialogTitle>Privacy & Legal</DialogTitle>
                  </DialogHeader>
                  <div className="px-6 pb-6">
                    <p className="text-foreground leading-relaxed">
                      OutbreakNow is committed to protecting user privacy and adhering to applicable data protection regulations. All personal information is handled in accordance with our privacy policy. By using the platform, you agree to our terms of service and legal notices.
                    </p>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog>
                <DialogTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground text-left transition-colors">Terms of Use</button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-background">
                  <DialogHeader>
                    <DialogTitle>Terms of Use</DialogTitle>
                  </DialogHeader>
                  <div className="px-6 pb-6">
                    <p className="text-foreground leading-relaxed space-y-4">
                      By accessing or using OutbreakNow, you agree to comply with these Terms of Use. The platform is intended for informational and educational purposes only and must not be relied upon as the sole source for medical or public health decision-making. Data and content are provided "as is" without warranties of any kind, either expressed or implied. OutbreakNow and its partners shall not be held liable for any loss, injury, or damage arising from the use of this platform. Users are responsible for verifying information through official public health channels before taking action. OutbreakNow reserves the right to modify, suspend, or discontinue any aspect of the platform at any time without prior notice.
                    </p>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Quick Links 1 */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Quick Links</h4>
            <div className="flex flex-col space-y-2">
              <a 
                href="#" 
                className="text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                Fund projects
              </a>
              <a 
                href="#" 
                className="text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                Communities
              </a>
              <a 
                href="#" 
                className="text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                Features
              </a>
              <a 
                href="#" 
                className="text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                Enterprise
              </a>
            </div>
          </div>

          {/* Quick Links 2 */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Quick Links</h4>
            <div className="flex flex-col space-y-2">
              <a 
                href="#" 
                className="text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                Feeds
              </a>
              <a 
                href="#" 
                className="text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                Dokta+
              </a>
              <a 
                href="#" 
                className="text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                RxMarket
              </a>
              <a 
                href="#" 
                className="text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                Explore
              </a>
            </div>
          </div>

          {/* Contact Us & Newsletter */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Contact Us</h4>
            <div className="space-y-2">
              <p className="text-muted-foreground text-sm">
                Have questions, suggestions, or partnership inquiries?
              </p>
              <a 
                href="mailto:contact@outbreaknow.org" 
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                <Mail className="h-4 w-4" />
                contact@outbreaknow.org
              </a>
            </div>
            <div className="pt-2">
              <h4 className="font-semibold text-foreground mb-1.5 text-sm">Partners</h4>
              <div className="flex flex-col space-y-1">
                <a 
                  href="https://ghqalliance.org" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-muted-foreground hover:text-foreground transition-colors text-xs"
                >
                  GHQA
                </a>
                <a 
                  href="#" 
                  className="text-muted-foreground hover:text-foreground transition-colors text-xs"
                >
                  GHDAF
                </a>
              </div>
            </div>
            <div className="pt-4">
              <h4 className="font-semibold text-foreground mb-2 text-sm">Newsletter</h4>
              <form onSubmit={handleNewsletterSubmit} className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="Your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting}
                    className="h-9 text-sm bg-background"
                  />
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    size="sm"
                    className="whitespace-nowrap"
                  >
                    <Mail className="h-3 w-3" />
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-border flex items-center justify-between flex-wrap gap-4">
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} OutbreakNow. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <a 
              href="#" 
              className="hover:opacity-80 transition-opacity"
              aria-label="Social media"
            >
              <img className="w-6 h-6" alt="Social platform" src="/social-platforms-logo-3.svg" />
            </a>
            <a 
              href="#" 
              className="hover:opacity-80 transition-opacity"
              aria-label="Social media"
            >
              <img className="w-6 h-6" alt="Social platform" src="/social-platforms-logo-1.svg" />
            </a>
            <a 
              href="#" 
              className="hover:opacity-80 transition-opacity"
              aria-label="Social media"
            >
              <img className="w-6 h-6" alt="Social platform" src="/social-platforms-logo.svg" />
            </a>
            <a 
              href="#" 
              className="hover:opacity-80 transition-opacity"
              aria-label="Social media"
            >
              <img className="w-6 h-6" alt="Social platform" src="/social-platforms-logo-2.svg" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

