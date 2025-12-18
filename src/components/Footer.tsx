import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import outbreakNowLogo from "@/assets/outbreaknow-logo.png";

export const Footer = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setIsSubmitting(true);
    try {
      // TODO: Implement newsletter subscription logic
      await new Promise(resolve => setTimeout(resolve, 500));
      toast({
        title: t("footer.subscribeSuccess"),
        description: t("footer.subscribeSuccessDesc"),
      });
      setEmail("");
    } catch (error) {
      toast({
        title: t("footer.subscribeFailed"),
        description: t("footer.subscribeFailedDesc"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <footer className="border-t border-border bg-muted/30 pt-32 pb-12 max-lg:pb-0">
      <div className="container-prose">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 text-sm">
          {/* Logo and Description */}
          <div className="space-y-4 lg:col-span-2">
            <div className="flex items-start gap-3">
              <img src={outbreakNowLogo} alt="OutbreakNow Logo" className="h-20 md:h-24 w-auto" />
            </div>
            <p className="text-muted-foreground" dangerouslySetInnerHTML={{ __html: t("footer.description") }} />
          </div>

          {/* Resources */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">{t("common.resources")}</h4>
            <div className="flex flex-col space-y-2">
              <Dialog>
                <DialogTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground text-left transition-colors">{t("footer.disclaimer")}</button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-background">
                  <DialogHeader>
                    <DialogTitle>{t("footer.disclaimer")}</DialogTitle>
                  </DialogHeader>
                  <div className="px-6 pb-6">
                    <p className="text-foreground leading-relaxed">
                      {t("footer.disclaimerText")}
                    </p>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog>
                <DialogTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground text-left transition-colors">{t("footer.dataSources")}</button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-background">
                  <DialogHeader>
                    <DialogTitle>{t("footer.dataSources")}</DialogTitle>
                  </DialogHeader>
                  <div className="px-6 pb-6">
                    <p className="text-foreground leading-relaxed">
                      {t("footer.dataSourcesText")}
                    </p>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog>
                <DialogTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground text-left transition-colors">{t("footer.privacyLegal")}</button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-background">
                  <DialogHeader>
                    <DialogTitle>{t("footer.privacyLegal")}</DialogTitle>
                  </DialogHeader>
                  <div className="px-6 pb-6">
                    <p className="text-foreground leading-relaxed">
                      {t("footer.privacyLegalText")}
                    </p>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog>
                <DialogTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground text-left transition-colors">{t("footer.termsOfUse")}</button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-background">
                  <DialogHeader>
                    <DialogTitle>{t("footer.termsOfUse")}</DialogTitle>
                  </DialogHeader>
                  <div className="px-6 pb-6">
                    <p className="text-foreground leading-relaxed space-y-4">
                      {t("footer.termsOfUseText")}
                    </p>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Quick Links 1 */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">{t("footer.quickLinks")}</h4>
            <div className="flex flex-col space-y-2">
              <a 
                href="#" 
                className="text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                {t("footer.fundProjects")}
              </a>
              <a 
                href="#" 
                className="text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                {t("footer.communities")}
              </a>
              <a 
                href="#" 
                className="text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                {t("footer.features")}
              </a>
              <a 
                href="#" 
                className="text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                {t("footer.enterprise")}
              </a>
            </div>
          </div>

          {/* Quick Links 2 */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">{t("footer.quickLinks")}</h4>
            <div className="flex flex-col space-y-2">
              <a 
                href="#" 
                className="text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                {t("footer.feeds")}
              </a>
              <a 
                href="#" 
                className="text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                {t("footer.doktaPlus")}
              </a>
              <a 
                href="#" 
                className="text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                {t("footer.rxMarket")}
              </a>
              <a 
                href="#" 
                className="text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                {t("footer.explore")}
              </a>
            </div>
          </div>

          {/* Contact Us & Newsletter */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">{t("footer.contactUs")}</h4>
            <div className="space-y-2">
              <p className="text-muted-foreground text-sm">
                {t("footer.contactDescription")}
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
              <h4 className="font-semibold text-foreground mb-1.5 text-sm">{t("footer.partners")}</h4>
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
              <h4 className="font-semibold text-foreground mb-2 text-sm">{t("footer.newsletter")}</h4>
              <form onSubmit={handleNewsletterSubmit} className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder={t("footer.yourEmail")}
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
            {t("footer.copyright", { year: new Date().getFullYear() })}
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

