import { Helmet } from "react-helmet-async";
import { useLocation, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Building2, GraduationCap, Hospital, Cpu, Heart, HandCoins, Globe2, TrendingUp, Shield, Lightbulb, Users, Zap, Loader2 } from "lucide-react";
import outbreakNowLogo from "@/assets/outbreaknow-logo.png";
import { Footer } from "@/components/Footer";
import { useLanguage, SUPPORTED_LANGUAGES } from "@/contexts/LanguageContext";

const schema = z.object({
  name: z.string().min(2, "Please enter your name"),
  organization: z.string().min(2, "Please enter your organization"),
  email: z.string().email("Enter a valid email"),
  message: z.string().min(10, "Tell us a bit more about your goals"),
});

type FormValues = z.infer<typeof schema>;

const Partnership = () => {
  const location = useLocation();
  const canonical = `${window.location.origin}${location.pathname}`;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", organization: "", email: "", message: "" },
  });

  const { language, setLanguage, t } = useLanguage();

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    
    try {
      const response = await fetch("https://formspree.io/f/mlgrzwvr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          name: values.name,
          organization: values.organization,
          email: values.email,
          message: values.message,
          _subject: `Partnership Inquiry from ${values.name} - ${values.organization}`,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || data.message || "Failed to submit form. Please try again.");
      }

      // Success - Formspree returns { ok: true } or similar on success
      toast({
        title: "✅ Success!",
        description: "Thank you for your partnership inquiry. We'll get back to you shortly via email.",
        duration: 5000,
      });
      
      form.reset();
    } catch (error: any) {
      console.error("Form submission error:", error);
      toast({
        title: "❌ Submission Failed",
        description: error.message || "Failed to submit your inquiry. Please check your connection and try again later.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Become a Partner | OutbreakNow</title>
        <meta name="description" content="Partner with OutbreakNow to build the next generation of real-time global outbreak intelligence and save lives." />
        <link rel="canonical" href={canonical} />
      </Helmet>

      {/* Navigation Header */}
      <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container-prose py-3">
          <div className="flex items-center gap-4">
            <Link to="/" className="transition-opacity hover:opacity-80">
              <img src={outbreakNowLogo} alt="OutbreakNow Logo" className="h-24 w-auto" />
            </Link>
            <div className="flex-1 flex items-center justify-end gap-4">
              <Link to="/">
                <Button variant="ghost" size="sm">
                  {t("common.home")}
                </Button>
              </Link>
              <Link to="/map">
                <Button variant="ghost" size="sm">
                  {t("common.map")}
                </Button>
              </Link>
              <Link to="/dashboard">
                <Button variant="ghost" size="sm">
                  {t("common.dashboard")}
                </Button>
              </Link>

              {/* Language Selector */}
              <div className="ml-4">
                <label className="sr-only" htmlFor="partnership-language-select">
                  Select language
                </label>
                <select
                  id="partnership-language-select"
                  className="border border-border rounded-md px-2 py-1 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as any)}
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.nativeName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="section pt-16 pb-12 bg-gradient-to-br from-primary/10 via-primary/5 to-background">
          <div className="container-prose">
            <div className="mx-auto max-w-5xl text-center">
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                {t("landing.partnership.heroTitle")}
              </h1>
              <p className="text-xl md:text-2xl font-semibold mb-4 text-foreground/90">
                {t("landing.partnership.heroSubtitle")}
              </p>
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto">
                {t("landing.partnership.heroBody")}
              </p>
            </div>
          </div>
        </section>

        {/* Collaboration Partners */}
        <section className="section py-12">
          <div className="container-prose">
            <div className="mx-auto max-w-6xl">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-8 text-center">
                {t("landing.partnership.collaborateTitle")}
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                <div className="rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-all hover:scale-105 group">
                  <Building2 className="w-8 h-8 mb-2 text-primary mx-auto" />
                  <h3 className="text-xs font-semibold text-center">
                    {t("landing.partnership.collaboratePublicHealth")}
                  </h3>
                </div>

                <div className="rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-all hover:scale-105 group">
                  <GraduationCap className="w-8 h-8 mb-2 text-primary mx-auto" />
                  <h3 className="text-xs font-semibold text-center">
                    {t("landing.partnership.collaborateUniversities")}
                  </h3>
                </div>

                <div className="rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-all hover:scale-105 group">
                  <Hospital className="w-8 h-8 mb-2 text-primary mx-auto" />
                  <h3 className="text-xs font-semibold text-center">
                    {t("landing.partnership.collaborateHealthcare")}
                  </h3>
                </div>

                <div className="rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-all hover:scale-105 group">
                  <Cpu className="w-8 h-8 mb-2 text-primary mx-auto" />
                  <h3 className="text-xs font-semibold text-center">
                    {t("landing.partnership.collaborateTechnology")}
                  </h3>
                </div>

                <div className="rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-all hover:scale-105 group">
                  <Heart className="w-8 h-8 mb-2 text-primary mx-auto" />
                  <h3 className="text-xs font-semibold text-center">
                    {t("landing.partnership.collaborateNgos")}
                  </h3>
                </div>

                <div className="rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-all hover:scale-105 group">
                  <HandCoins className="w-8 h-8 mb-2 text-primary mx-auto" />
                  <h3 className="text-xs font-semibold text-center">
                    {t("landing.partnership.collaborateFoundations")}
                  </h3>
                </div>
              </div>

              <div className="p-5 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-center text-sm text-foreground/80 leading-relaxed">
                  {t("landing.partnership.collaborateNote")}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Why Partner With Us */}
        <section className="section py-12 bg-muted/20">
          <div className="container-prose">
            <div className="mx-auto max-w-6xl">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-8 text-center">
                {t("landing.partnership.whyTitle")}
              </h2>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-lg border bg-card p-5 shadow-sm hover:shadow-md transition-all group">
                  <Globe2 className="w-8 h-8 mb-3 text-primary" />
                  <h3 className="text-base font-semibold mb-2">
                    {t("landing.partnership.whyAdvanceTitle")}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t("landing.partnership.whyAdvanceBody")}
                  </p>
                </div>

                <div className="rounded-lg border bg-card p-5 shadow-sm hover:shadow-md transition-all group">
                  <TrendingUp className="w-8 h-8 mb-3 text-primary" />
                  <h3 className="text-base font-semibold mb-2">
                    {t("landing.partnership.whyTechTitle")}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t("landing.partnership.whyTechBody")}
                  </p>
                </div>

                <div className="rounded-lg border bg-card p-5 shadow-sm hover:shadow-md transition-all group">
                  <Shield className="w-8 h-8 mb-3 text-primary" />
                  <h3 className="text-base font-semibold mb-2">
                    {t("landing.partnership.whySystemsTitle")}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t("landing.partnership.whySystemsBody")}
                  </p>
                </div>

                <div className="rounded-lg border bg-card p-5 shadow-sm hover:shadow-md transition-all group">
                  <Lightbulb className="w-8 h-8 mb-3 text-primary" />
                  <h3 className="text-base font-semibold mb-2">
                    {t("landing.partnership.whyInnovationTitle")}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t("landing.partnership.whyInnovationBody")}
                  </p>
                </div>

                <div className="rounded-lg border bg-card p-5 shadow-sm hover:shadow-md transition-all group">
                  <Users className="w-8 h-8 mb-3 text-primary" />
                  <h3 className="text-base font-semibold mb-2">
                    {t("landing.partnership.whyProtectTitle")}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t("landing.partnership.whyProtectBody")}
                  </p>
                </div>

                <div className="rounded-lg border bg-card p-5 shadow-sm hover:shadow-md transition-all group">
                  <Zap className="w-8 h-8 mb-3 text-primary" />
                  <h3 className="text-base font-semibold mb-2">
                    {t("landing.partnership.whyPreventTitle")}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t("landing.partnership.whyPreventBody")}
                  </p>
                </div>
              </div>

              <div className="mt-8 text-center p-6 rounded-lg bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border border-primary/20">
                <p className="text-base md:text-lg font-semibold mb-1 text-foreground/90">
                  {t("landing.partnership.movementLine1")}
                </p>
                <p className="text-lg md:text-xl font-bold text-primary">
                  {t("landing.partnership.movementLine2")}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Partnership Form */}
        <section className="section py-12">
          <div className="container-prose">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-6">
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">
                  {t("landing.partnership.formTitle")}
                </h2>
                <p className="text-base text-muted-foreground">
                  {t("landing.partnership.formSubtitle")}
                </p>
              </div>

              <div className="rounded-lg border bg-card p-6 md:p-8 shadow-lg">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("landing.partnership.formNameLabel")}</FormLabel>
                            <FormControl>
                              <Input placeholder={t("landing.partnership.formNamePlaceholder")} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="organization"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("landing.partnership.formOrgLabel")}</FormLabel>
                            <FormControl>
                              <Input placeholder={t("landing.partnership.formOrgPlaceholder")} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("landing.partnership.formEmailLabel")}</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder={t("landing.partnership.formEmailPlaceholder")} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("landing.partnership.formMessageLabel")}</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder={t("landing.partnership.formMessagePlaceholder")}
                              rows={5}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        t("landing.partnership.formSubmit")
                      )}
                    </Button>
                  </form>
                </Form>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default Partnership;
