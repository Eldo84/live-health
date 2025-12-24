import { Helmet } from "react-helmet-async";
import { useState } from "react";
import PartnerRow from "../ui/PartnerRow";
import AdvertiseForm from "../ui/AdvertiseForm";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Heart, Shield, Users, TrendingUp, Zap, AlertTriangle, BarChart3, Menu, Loader2 } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import outbreakNowLogo from "@/assets/outbreaknow-logo.png";
import drLufulwabo from "@/assets/dr-lufulwabo.jpeg";
import { useLanguage, SUPPORTED_LANGUAGES } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [activeTab, setActiveTab] = useState("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [donationModalOpen, setDonationModalOpen] = useState(false);
  const [donationAmount, setDonationAmount] = useState<number | null>(null);
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const { toast } = useToast();
  const canonical = `${window.location.origin}${location.pathname}`;
  const orgLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'OutbreakNow',
    url: canonical,
    logo: outbreakNowLogo,
    sameAs: [canonical],
  };

  const handleDonateClick = (amount: number | null) => {
    setDonationAmount(amount);
    setDonorName("");
    setDonorEmail("");
    setIsAnonymous(false);
    setDonationModalOpen(true);
  };

  const handleDonationSubmit = async () => {
    if (!donationAmount || donationAmount < 1) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid donation amount (minimum $1.00).",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-donation-session`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
          },
          body: JSON.stringify({
            amount: donationAmount,
            donor_name: isAnonymous ? null : donorName || null,
            donor_email: isAnonymous ? null : donorEmail || null,
            is_anonymous: isAnonymous,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create donation session');
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err: any) {
      console.error('Donation error:', err);
      toast({
        title: "Donation Error",
        description: err.message || "Failed to initiate donation. Please try again.",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>{t("landing.seo.title")}</title>
        <meta
          name="description"
          content={t("landing.seo.description")}
        />
        <link rel="canonical" href={canonical} />
        <meta
          property="og:title"
          content={t("landing.hero.title")}
        />
        <meta
          property="og:description"
          content={t("landing.seo.ogDescription")}
        />
        <script type="application/ld+json">{JSON.stringify(orgLd)}</script>
      </Helmet>

      {/* Navigation Tabs */}
      <nav className="fixed top-0 left-0 right-0 z-[100] w-full border-b bg-background backdrop-blur-sm supports-[backdrop-filter]:bg-background/95">
        <div className="container-prose py-3">
          <div className="flex items-center gap-2 md:gap-4 flex-wrap">
            <button 
              onClick={() => setActiveTab("home")}
              className="transition-opacity hover:opacity-80 flex-shrink-0"
              aria-label="Return to home"
            >
              <img src={outbreakNowLogo} alt="OutbreakNow Logo" className="h-16 md:h-20 lg:h-24 w-auto" />
            </button>

            {/* Desktop Navigation */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="hidden md:flex flex-1 min-w-0">
              <TabsList className="flex w-full h-auto p-1 gap-1 flex-wrap">
                <TabsTrigger value="home" className="text-xs md:text-sm lg:text-base py-2.5 px-2 md:px-3 flex-shrink-0 whitespace-nowrap">
                  {t("landing.tabs.outbreakNow")}
                </TabsTrigger>
                <button
                  onClick={() => navigate("/map")}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-2 md:px-3 text-xs md:text-sm lg:text-base font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground py-2.5 flex-shrink-0"
                >
                  {t("landing.tabs.viewMap")}
                </button>
                <TabsTrigger value="about" className="text-xs md:text-sm lg:text-base py-2.5 px-2 md:px-3 flex-shrink-0 whitespace-nowrap">
                  {t("landing.tabs.about")}
                </TabsTrigger>
                <TabsTrigger value="partner" className="text-xs md:text-sm lg:text-base py-2.5 px-2 md:px-3 flex-shrink-0 whitespace-nowrap">
                  {t("landing.tabs.partner")}
                </TabsTrigger>
                <TabsTrigger value="advertise" className="text-xs md:text-sm lg:text-base py-2.5 px-2 md:px-3 flex-shrink-0 whitespace-nowrap">
                  {t("landing.tabs.advertise")}
                </TabsTrigger>
                <TabsTrigger value="donate" className="text-xs md:text-sm lg:text-base py-2.5 px-2 md:px-3 flex-shrink-0 whitespace-nowrap">
                  {t("landing.tabs.donate")}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Desktop Language Selector */}
            <div className="hidden md:flex items-center ml-2 md:ml-4 flex-shrink-0">
              <label className="sr-only" htmlFor="language-select">
                Select language
              </label>
              <select
                id="language-select"
                className="border border-border rounded-md px-2 py-1 text-xs md:text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
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

            {/* Mobile Hamburger Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="md:hidden ml-auto"
                  aria-label="Open menu"
                >
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[350px]">
                <nav className="flex flex-col gap-4 mt-8">
                  <Button
                    variant={activeTab === "home" ? "default" : "ghost"}
                    className="justify-start text-base"
                    onClick={() => {
                      setActiveTab("home");
                      setMobileMenuOpen(false);
                    }}
                  >
                    {t("landing.tabs.outbreakNow")}
                  </Button>
                  <Button
                    variant="ghost"
                    className="justify-start text-base"
                    onClick={() => {
                      navigate("/map");
                      setMobileMenuOpen(false);
                    }}
                  >
                    {t("landing.tabs.viewMap")}
                  </Button>
                  <Button
                    variant={activeTab === "about" ? "default" : "ghost"}
                    className="justify-start text-base"
                    onClick={() => {
                      setActiveTab("about");
                      setMobileMenuOpen(false);
                    }}
                  >
                    {t("landing.tabs.about")}
                  </Button>
                  <Button
                    variant={activeTab === "partner" ? "default" : "ghost"}
                    className="justify-start text-base"
                    onClick={() => {
                      setActiveTab("partner");
                      setMobileMenuOpen(false);
                    }}
                  >
                    {t("landing.tabs.partner")}
                  </Button>
                  <Button
                    variant={activeTab === "advertise" ? "default" : "ghost"}
                    className="justify-start text-base"
                    onClick={() => {
                      setActiveTab("advertise");
                      setMobileMenuOpen(false);
                    }}
                  >
                    {t("landing.tabs.advertise")}
                  </Button>
                  <Button
                    variant={activeTab === "donate" ? "default" : "ghost"}
                    className="justify-start text-base"
                    onClick={() => {
                      setActiveTab("donate");
                      setMobileMenuOpen(false);
                    }}
                  >
                    {t("landing.tabs.donate")}
                  </Button>
                </nav>

                {/* Mobile Language Selector */}
                <div className="mt-8 border-t pt-4">
                  <label
                    htmlFor="language-select-mobile"
                    className="block text-sm font-medium text-muted-foreground mb-2"
                  >
                    Language
                  </label>
                  <select
                    id="language-select-mobile"
                    className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
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
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>

      <main className="pt-[120px]">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* LiveHealth+ Tab */}
          <TabsContent value="home" className="mt-0">
            {/* Hero */}
            <section className="relative section h-screen flex items-center justify-center overflow-hidden">
          {/* Background Video */}
          <video
            src="/globevideo.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
          >
            <track kind="captions" src="/captions.vtt" label="English" default />
            Your browser does not support the video tag.
          </video>

          {/* Overlay */}
          <div className="absolute inset-0 bg-black/40"></div>

          {/* Foreground Content */}
          <div className="relative container-prose z-10">
            <div className="mx-auto max-w-3xl text-center animate-enter">
              <h1 className="headline text-white">
                {t("landing.hero.title")}
              </h1>
              <p className="subheadline mt-4 text-white">
                {t("landing.hero.subtitle")}
              </p>
              <div className="mt-8 flex items-center justify-center gap-3">
                <Link to="/map">
                  <Button size="lg" variant="hero" className="hover-scale">
                    🔍 {t("landing.hero.ctaViewMap")}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

            {/* Sponsors */}
            <PartnerRow />

            {/* Key Features */}
            <section className="section bg-muted/30">
              <div className="container-prose">
                <div className="mx-auto max-w-4xl text-center mb-12">
                  <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                    {t("landing.features.title")}
                  </h2>
                  <p className="mt-4 text-muted-foreground">
                    {t("landing.features.subtitle")}
                  </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-xl border bg-card p-6 shadow-elegant hover-scale">
                    <Shield className="w-12 h-12 mb-4 text-primary" />
                    <h3 className="text-xl font-semibold mb-2">{t("landing.features.trustedData.title")}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t("landing.features.trustedData.body")}
                    </p>
                  </div>
                  <div className="rounded-xl border bg-card p-6 shadow-elegant hover-scale">
                    <TrendingUp className="w-12 h-12 mb-4 text-primary" />
                    <h3 className="text-xl font-semibold mb-2">{t("landing.features.predictiveAnalytics.title")}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t("landing.features.predictiveAnalytics.body")}
                    </p>
                  </div>
                  <div className="rounded-xl border bg-card p-6 shadow-elegant hover-scale">
                    <Zap className="w-12 h-12 mb-4 text-primary" />
                    <h3 className="text-xl font-semibold mb-2">{t("landing.features.fastUpdates.title")}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t("landing.features.fastUpdates.body")}
                    </p>
                  </div>
                  <div className="rounded-xl border bg-card p-6 shadow-elegant hover-scale">
                    <AlertTriangle className="w-12 h-12 mb-4 text-primary" />
                    <h3 className="text-xl font-semibold mb-2">{t("landing.features.earlyWarning.title")}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t("landing.features.earlyWarning.body")}
                    </p>
                  </div>
                  <div className="rounded-xl border bg-card p-6 shadow-elegant hover-scale">
                    <BarChart3 className="w-12 h-12 mb-4 text-primary" />
                    <h3 className="text-xl font-semibold mb-2">{t("landing.features.visualizations.title")}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t("landing.features.visualizations.body")}
                    </p>
                  </div>
                  <div className="rounded-xl border bg-card p-6 shadow-elegant hover-scale">
                    <Users className="w-12 h-12 mb-4 text-primary" />
                    <h3 className="text-xl font-semibold mb-2">{t("landing.features.community.title")}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t("landing.features.community.body")}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Impact Stats */}
            <section className="section">
              <div className="container-prose">
                <div className="mx-auto max-w-4xl text-center mb-12">
                  <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                    {t("landing.impact.title")}
                  </h2>
                  <p className="mt-4 text-muted-foreground">
                    {t("landing.impact.subtitle")}
                  </p>
                </div>

                <div className="grid gap-6 md:grid-cols-4">
                  <div className="text-center p-6 rounded-xl border bg-card shadow-elegant hover-scale">
                    <div className="text-4xl font-bold text-primary mb-2">200+</div>
                    <div className="text-sm text-muted-foreground">{t("landing.impact.countries")}</div>
                  </div>
                  <div className="text-center p-6 rounded-xl border bg-card shadow-elegant hover-scale">
                    <div className="text-4xl font-bold text-primary mb-2">50K+</div>
                    <div className="text-sm text-muted-foreground">{t("landing.impact.users")}</div>
                  </div>
                  <div className="text-center p-6 rounded-xl border bg-card shadow-elegant hover-scale">
                    <div className="text-4xl font-bold text-primary mb-2">24/7</div>
                    <div className="text-sm text-muted-foreground">{t("landing.impact.monitoring")}</div>
                  </div>
                  <div className="text-center p-6 rounded-xl border bg-card shadow-elegant hover-scale">
                    <div className="text-4xl font-bold text-primary mb-2">99.9%</div>
                    <div className="text-sm text-muted-foreground">{t("landing.impact.uptime")}</div>
                  </div>
                </div>
              </div>
            </section>

            {/* CTA Section */}
            <section className="section bg-primary/5">
              <div className="container-prose">
                <div className="mx-auto max-w-3xl text-center">
                  <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                    {t("landing.cta.title")}
                  </h2>
                  <p className="mt-4 text-muted-foreground">
                    {t("landing.cta.subtitle")}
                  </p>
                  <div className="mt-8 flex items-center justify-center gap-4">
                    <Link to="/map">
                      <Button size="lg" variant="default" className="hover-scale">
                        🔍 {t("landing.cta.exploreMap")}
                      </Button>
                    </Link>
                    <Link to="/partnership">
                      <Button size="lg" variant="outline" className="hover-scale">
                        🤝 {t("landing.cta.partnerWithUs")}
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          </TabsContent>

          {/* About Us Tab */}
          <TabsContent value="about" className="mt-0">
            {/* Hero Section */}
            <section className="section pt-20 bg-gradient-to-b from-primary/5 to-background">
              <div className="container-prose">
                <article className="mx-auto max-w-4xl text-center">
                  <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
                    {t("landing.about.title")}
                  </h1>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    {t("landing.about.description")}
                  </p>
                </article>
              </div>
            </section>

            {/* Mission Statement */}
            <section className="section">
              <div className="container-prose">
                <div className="mx-auto max-w-4xl text-center mb-12">
                  <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                    {t("landing.about.missionTitle")}
                  </h2>
                  <p className="text-xl font-semibold text-primary">
                    {t("landing.about.missionSubtitle")}
                  </p>
                </div>

                <div className="mx-auto max-w-4xl">
                  <p className="text-muted-foreground leading-relaxed text-center">
                    {t("landing.about.missionBody")}
                  </p>
                </div>
              </div>
            </section>

            {/* Vision Section */}
            <section className="section bg-muted/30">
              <div className="container-prose">
                <div className="mx-auto max-w-4xl">
                  <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6 text-center">
                    {t("landing.about.visionTitle")}
                  </h2>
                  <p className="text-muted-foreground leading-relaxed mb-6 text-center">
                    {t("landing.about.visionBody")}
                  </p>
                  <p className="text-lg font-semibold text-center text-primary">
                    {t("landing.about.visionHighlight")}
                  </p>
                </div>
              </div>
            </section>

            {/* Founder Section */}
            <section className="section">
              <div className="container-prose">
                <div className="mx-auto max-w-4xl">
                  <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-8 text-center">
                    {t("landing.about.founderTitle")}
                  </h2>
                  
                  <div className="flex justify-center mb-8">
                    <img 
                      src={drLufulwabo} 
                      alt="Dr. Aimé Lufulwabo" 
                      className="rounded-2xl shadow-2xl w-full max-w-sm object-cover"
                    />
                  </div>

                  <div className="text-center mb-6">
                    <h3 className="text-2xl md:text-3xl font-bold">
                      {t("landing.about.founderName")}
                    </h3>
                    <p className="text-lg text-primary font-medium mt-1">
                      {t("landing.about.founderTagline")}
                    </p>
                  </div>

                  <div className="space-y-4 text-muted-foreground leading-relaxed">
                    <p>
                      {t("landing.about.founderP1")}
                    </p>

                    <p>
                      {t("landing.about.founderP2")}
                    </p>

                    <p>
                      {t("landing.about.founderP3")}
                    </p>

                    <p>
                      {t("landing.about.founderP4")}
                    </p>

                    <p>
                      {t("landing.about.founderP5")}
                    </p>

                    <p>
                      {t("landing.about.founderP6")}
                    </p>

                    <div className="pt-4">
                      <a 
                        href="https://www.linkedin.com/in/aim%C3%A9-m-lufulwabo-md-mph-cph-57020023"
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium transition-colors"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                        </svg>
                        {t("landing.about.contactLinkedIn")}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Commitment Section */}
            <section className="section bg-primary/5">
              <div className="container-prose">
                <div className="mx-auto max-w-4xl">
                  <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-8 text-center">
                    {t("landing.about.commitmentTitle")}
                  </h2>
                  
                  <p className="text-center text-muted-foreground mb-8">
                    {t("landing.about.commitmentIntro")}
                  </p>

                  <div className="grid sm:grid-cols-2 gap-6 mb-8">
                    <div className="rounded-xl border bg-card p-6 shadow-elegant hover-scale">
                      <AlertTriangle className="w-10 h-10 mb-3 text-primary" />
                      <h3 className="text-xl font-semibold mb-2">
                        {t("landing.about.commitmentTransparencyTitle")}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {t("landing.about.commitmentTransparency")}
                      </p>
                    </div>
                    <div className="rounded-xl border bg-card p-6 shadow-elegant hover-scale">
                      <Heart className="w-10 h-10 mb-3 text-primary" />
                      <h3 className="text-xl font-semibold mb-2">
                        {t("landing.about.commitmentEquityTitle")}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {t("landing.about.commitmentEquity")}
                      </p>
                    </div>
                    <div className="rounded-xl border bg-card p-6 shadow-elegant hover-scale">
                      <Zap className="w-10 h-10 mb-3 text-primary" />
                      <h3 className="text-xl font-semibold mb-2">
                        {t("landing.about.commitmentInnovationTitle")}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {t("landing.about.commitmentInnovation")}
                      </p>
                    </div>
                    <div className="rounded-xl border bg-card p-6 shadow-elegant hover-scale">
                      <Users className="w-10 h-10 mb-3 text-primary" />
                      <h3 className="text-xl font-semibold mb-2">
                        {t("landing.about.commitmentCollaborationTitle")}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {t("landing.about.commitmentCollaboration")}
                      </p>
                    </div>
                  </div>

                  <div className="text-center p-8 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
                    <p className="text-xl font-semibold mb-2">
                      {t("landing.about.movementLine1")}
                    </p>
                    <p className="text-2xl font-bold text-primary">
                      {t("landing.about.movementLine2")}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </TabsContent>

          {/* Become a Partner Tab */}
          <TabsContent value="partner" className="mt-0">
            <section className="section pt-20">
          <div className="container-prose">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                {t("landing.partner.title")}
              </h2>
              <p className="mt-4 text-muted-foreground">
                {t("landing.partner.body")}
              </p>
              <div className="mt-8">
                <Link to="/partnership">
                  <Button size="lg" variant="secondary" className="hover-scale">
                    🤝 {t("landing.partner.cta")}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
            </section>
          </TabsContent>

          {/* Advertise with Us Tab */}
          <TabsContent value="advertise" className="mt-0">
            <AdvertiseForm />
          </TabsContent>

          {/* Donate Tab */}
          <TabsContent value="donate" className="mt-0">
            <section className="section pt-20">
              <div className="container-prose">
                <div className="mx-auto max-w-3xl text-center">
                  <Heart className="w-16 h-16 mx-auto mb-6 text-primary animate-pulse" />
                  <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                    {t("landing.donate.title")}
                  </h2>
                  <p className="mt-4 text-muted-foreground">
                    {t("landing.donate.intro")}
                  </p>

                  <div className="mt-10 grid gap-6 md:grid-cols-3">
                    <div className="rounded-xl border bg-card p-6 shadow-elegant hover-scale">
                      <h3 className="text-2xl font-bold mb-2">$25</h3>
                      <p className="text-sm text-muted-foreground">
                        {t("landing.donate.tier25")}
                      </p>
                      <Button 
                        className="mt-4 w-full" 
                        variant="outline"
                        onClick={() => handleDonateClick(25)}
                      >
                        {t("landing.donate.button25")}
                      </Button>
                    </div>
                    <div className="rounded-xl border bg-primary/10 border-primary p-6 shadow-elegant hover-scale">
                      <h3 className="text-2xl font-bold mb-2">$100</h3>
                      <p className="text-sm text-muted-foreground">
                        {t("landing.donate.tier100")}
                      </p>
                      <Button 
                        className="mt-4 w-full"
                        onClick={() => handleDonateClick(100)}
                      >
                        {t("landing.donate.button100")}
                      </Button>
                    </div>
                    <div className="rounded-xl border bg-card p-6 shadow-elegant hover-scale">
                      <h3 className="text-2xl font-bold mb-2">Custom</h3>
                      <p className="text-sm text-muted-foreground">
                        {t("landing.donate.tierCustom")}
                      </p>
                      <Button 
                        className="mt-4 w-full" 
                        variant="outline"
                        onClick={() => handleDonateClick(null)}
                      >
                        {t("landing.donate.buttonCustom")}
                      </Button>
                    </div>
                  </div>

                  {/* Donation Modal */}
                  <Dialog open={donationModalOpen} onOpenChange={setDonationModalOpen}>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Make a Donation</DialogTitle>
                        <DialogDescription>
                          Your contribution helps us expand global health surveillance and make life-saving information accessible worldwide.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4 py-4">
                        {/* Donation Amount */}
                        <div>
                          <label className="text-sm font-medium mb-2 block">
                            Donation Amount
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                            <Input
                              type="number"
                              min="1"
                              step="0.01"
                              placeholder="Enter amount"
                              value={donationAmount || ""}
                              onChange={(e) => setDonationAmount(e.target.value ? parseFloat(e.target.value) : null)}
                              className="pl-7"
                              disabled={isProcessing}
                            />
                          </div>
                          {donationAmount !== null && donationAmount < 1 && (
                            <p className="text-xs text-destructive mt-1">
                              Minimum donation is $1.00
                            </p>
                          )}
                        </div>

                        {/* Anonymous Checkbox */}
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="anonymous"
                            checked={isAnonymous}
                            onCheckedChange={(checked) => setIsAnonymous(checked === true)}
                            disabled={isProcessing}
                          />
                          <label
                            htmlFor="anonymous"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            Donate anonymously
                          </label>
                        </div>

                        {/* Donor Information (only if not anonymous) */}
                        {!isAnonymous && (
                          <>
                            <div>
                              <label className="text-sm font-medium mb-2 block">
                                Name (Optional)
                              </label>
                              <Input
                                type="text"
                                placeholder="Your name"
                                value={donorName}
                                onChange={(e) => setDonorName(e.target.value)}
                                disabled={isProcessing}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium mb-2 block">
                                Email (Optional)
                              </label>
                              <Input
                                type="email"
                                placeholder="your.email@example.com"
                                value={donorEmail}
                                onChange={(e) => setDonorEmail(e.target.value)}
                                disabled={isProcessing}
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                We'll send you a receipt via email if provided
                              </p>
                            </div>
                          </>
                        )}

                        {isAnonymous && (
                          <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
                            Your donation will be recorded anonymously. No personal information will be stored.
                          </p>
                        )}
                      </div>

                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setDonationModalOpen(false)}
                          disabled={isProcessing}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleDonationSubmit}
                          disabled={isProcessing || !donationAmount || donationAmount < 1}
                        >
                          {isProcessing ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            `Donate $${donationAmount?.toFixed(2) || '0.00'}`
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <div className="mt-12 p-6 rounded-xl bg-muted/50">
                    <h3 className="font-semibold mb-2">
                      💡 {t("landing.donate.whereTitle")}
                    </h3>
                    <ul className="text-sm text-muted-foreground space-y-2 text-left max-w-md mx-auto">
                      <li>• {t("landing.donate.where1")}</li>
                      <li>• {t("landing.donate.where2")}</li>
                      <li>• {t("landing.donate.where3")}</li>
                      <li>• {t("landing.donate.where4")}</li>
                      <li>• {t("landing.donate.where5")}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </>
  );
};

export default Index;
