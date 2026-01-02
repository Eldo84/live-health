import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import outbreakNowLogo from "@/assets/outbreaknow-logo.png";
import { FaFacebook, FaInstagram, FaLinkedin } from "react-icons/fa";

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
    <footer className="border-t border-border bg-muted/30 pt-0 pb-4 max-lg:pb-0 max-lg:pt-2 xl:pl-[160px]">
      <div className="container-prose">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 text-xs sm:text-sm">
          {/* Logo and Description */}
          <div className="space-y-4 lg:col-span-2 min-w-0">
            <div className="flex items-start gap-3">
              <img src={outbreakNowLogo} alt="OutbreakNow Logo" className="h-16 md:h-20 lg:h-24 w-auto flex-shrink-0" />
            </div>
            <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed break-words" dangerouslySetInnerHTML={{ __html: t("footer.description") }} />
          </div>

          {/* Resources */}
          <div className="space-y-4 min-w-0">
            <h4 className="font-semibold text-foreground text-xs sm:text-sm">{t("common.resources")}</h4>
            <div className="flex flex-col space-y-2">
              <Dialog>
                <DialogTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground text-left transition-colors text-xs sm:text-sm break-words">{t("footer.disclaimer")}</button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-background">
                  <DialogHeader>
                    <DialogTitle className="text-sm sm:text-base">{t("footer.disclaimer")}</DialogTitle>
                  </DialogHeader>
                  <div className="px-4 sm:px-6 pb-4 sm:pb-6">
                    <p className="text-foreground leading-relaxed text-sm sm:text-base">
                      {t("footer.disclaimerText")}
                    </p>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog>
                <DialogTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground text-left transition-colors text-xs sm:text-sm break-words">{t("footer.dataSources")}</button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-background">
                  <DialogHeader>
                    <DialogTitle className="text-sm sm:text-base">{t("footer.dataSources")}</DialogTitle>
                  </DialogHeader>
                  <div className="px-4 sm:px-6 pb-4 sm:pb-6">
                    <p className="text-foreground leading-relaxed text-sm sm:text-base">
                      {t("footer.dataSourcesText")}
                    </p>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog>
                <DialogTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground text-left transition-colors text-xs sm:text-sm break-words">{t("footer.privacyLegal")}</button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-background">
                  <DialogHeader>
                    <DialogTitle className="text-sm sm:text-base">{t("footer.privacyLegal")}</DialogTitle>
                  </DialogHeader>
                  <div className="px-4 sm:px-6 pb-4 sm:pb-6">
                    <p className="text-foreground leading-relaxed text-sm sm:text-base">
                      {t("footer.privacyLegalText")}
                    </p>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog>
                <DialogTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground text-left transition-colors text-xs sm:text-sm break-words">{t("footer.termsOfUse")}</button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-background">
                  <DialogHeader>
                    <DialogTitle className="text-sm sm:text-base">{t("footer.termsOfUse")}</DialogTitle>
                  </DialogHeader>
                  <div className="px-4 sm:px-6 pb-4 sm:pb-6">
                    <p className="text-foreground leading-relaxed space-y-4 text-sm sm:text-base">
                      {t("footer.termsOfUseText")}
                    </p>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Contact Us & Newsletter */}
          <div className="space-y-4 min-w-0">
            <h4 className="font-semibold text-foreground text-xs sm:text-sm">{t("footer.contactUs")}</h4>
            <div className="space-y-2">
              <p className="text-muted-foreground text-xs sm:text-sm break-words">
                {t("footer.contactDescription")}
              </p>
              <a 
                href="mailto:contact@outbreaknow.org" 
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-xs sm:text-sm break-all"
              >
                <Mail className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="break-all">contact@outbreaknow.org</span>
              </a>
            </div>
            <div className="pt-2">
              <h4 className="font-semibold text-foreground mb-1.5 text-xs sm:text-sm">{t("footer.partners")}</h4>
              <div className="flex flex-col space-y-1">
                <a 
                  href="https://ghqalliance.org" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-muted-foreground hover:text-foreground transition-colors text-xs break-words"
                >
                  GHQA
                </a>
                <a 
                  href="#" 
                  className="text-muted-foreground hover:text-foreground transition-colors text-xs break-words"
                >
                  GHDAF
                </a>
              </div>
            </div>
            <div className="pt-4">
              <h4 className="font-semibold text-foreground mb-2 text-xs sm:text-sm">{t("footer.newsletter")}</h4>
              <form onSubmit={handleNewsletterSubmit} className="space-y-2">
                <div className="flex gap-2 flex-wrap">
                  <Input
                    type="email"
                    placeholder={t("footer.yourEmail")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting}
                    className="h-9 text-xs sm:text-sm bg-background flex-1 min-w-[200px]"
                  />
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    size="sm"
                    className="whitespace-nowrap flex-shrink-0"
                  >
                    <Mail className="h-3 w-3" />
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-border flex items-center justify-between flex-wrap gap-4">
          <p className="text-muted-foreground text-xs sm:text-sm break-words">
            {t("footer.copyright", { year: new Date().getFullYear() })}
          </p>
          <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
            <a 
              href="https://www.facebook.com/profile.php?id=61574471188540" 
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-80 transition-opacity"
              aria-label="Facebook"
            >
              <FaFacebook className="w-6 h-6" />
            </a>
            <a 
              href="https://www.linkedin.com/company/global-health-and-quality-alliance/" 
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-80 transition-opacity"
              aria-label="LinkedIn"
            >
              <FaLinkedin className="w-6 h-6" />
            </a>
            <a 
              href="https://www.instagram.com/theghqa/" 
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-80 transition-opacity"
              aria-label="Instagram"
            >
              <FaInstagram className="w-6 h-6" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

