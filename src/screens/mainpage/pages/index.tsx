import { Helmet } from "react-helmet-async";
import { useState } from "react";
import PartnerRow from "../ui/PatnerRow";
import AdvertiseForm from "../ui/AdvertiseForm";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Heart, Shield, Users, TrendingUp, Zap, AlertTriangle, BarChart3, Menu } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import outbreakNowLogo from "@/assets/outbreaknow-logo.png";
import drLufulwabo from "@/assets/dr-lufulwabo.jpeg";

const Index = () => {
  const [activeTab, setActiveTab] = useState("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const canonical = `${window.location.origin}${location.pathname}`;
  const orgLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'OutbreakNow',
    url: canonical,
    logo: outbreakNowLogo,
    sameAs: [canonical],
  };

  return (
    <>
      <Helmet>
        <title>OutbreakNow | Global Health Surveillance</title>
        <meta
          name="description"
          content="Real-time outbreak intelligence platform. Track global health threats with AI predictions and interactive visualizations."
        />
        <link rel="canonical" href={canonical} />
        <meta
          property="og:title"
          content="OutbreakNow – The Future of Global Health Surveillance"
        />
        <meta
          property="og:description"
          content="Real-time outbreak intelligence to protect communities and empower decision-makers."
        />
        <script type="application/ld+json">{JSON.stringify(orgLd)}</script>
      </Helmet>

      {/* Navigation Tabs */}
      <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container-prose py-3">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setActiveTab("home")}
              className="transition-opacity hover:opacity-80"
              aria-label="Return to home"
            >
              <img src={outbreakNowLogo} alt="OutbreakNow Logo" className="h-24 w-auto" />
            </button>
            
            {/* Desktop Navigation */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="hidden md:flex flex-1">
              <TabsList className="grid w-full grid-cols-5 h-auto p-1">
                <TabsTrigger value="home" className="text-sm md:text-base py-2.5">
                  OutbreakNow
                </TabsTrigger>
                <TabsTrigger value="about" className="text-sm md:text-base py-2.5">
                  About Us
                </TabsTrigger>
                <TabsTrigger value="partner" className="text-sm md:text-base py-2.5">
                  Become a Partner
                </TabsTrigger>
                <TabsTrigger value="advertise" className="text-sm md:text-base py-2.5">
                  Advertise with Us
                </TabsTrigger>
                <TabsTrigger value="donate" className="text-sm md:text-base py-2.5">
                  Donate
                </TabsTrigger>
              </TabsList>
            </Tabs>

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
                    OutbreakNow
                  </Button>
                  <Button
                    variant={activeTab === "about" ? "default" : "ghost"}
                    className="justify-start text-base"
                    onClick={() => {
                      setActiveTab("about");
                      setMobileMenuOpen(false);
                    }}
                  >
                    About Us
                  </Button>
                  <Button
                    variant={activeTab === "partner" ? "default" : "ghost"}
                    className="justify-start text-base"
                    onClick={() => {
                      setActiveTab("partner");
                      setMobileMenuOpen(false);
                    }}
                  >
                    Become a Partner
                  </Button>
                  <Button
                    variant={activeTab === "advertise" ? "default" : "ghost"}
                    className="justify-start text-base"
                    onClick={() => {
                      setActiveTab("advertise");
                      setMobileMenuOpen(false);
                    }}
                  >
                    Advertise with Us
                  </Button>
                  <Button
                    variant={activeTab === "donate" ? "default" : "ghost"}
                    className="justify-start text-base"
                    onClick={() => {
                      setActiveTab("donate");
                      setMobileMenuOpen(false);
                    }}
                  >
                    Donate
                  </Button>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>

      <main>
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
                OutbreakNow – The Future of Global Health Surveillance
              </h1>
              <p className="subheadline mt-4 text-white">
                Real-time outbreak intelligence to protect communities, save
                lives, and empower decision-makers worldwide.
              </p>
              <div className="mt-8 flex items-center justify-center gap-3">
                <Link to="/map">
                  <Button size="lg" variant="hero" className="hover-scale">
                    🔍 View Live Outbreak Map
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
                    Why Choose OutbreakNow?
                  </h2>
                  <p className="mt-4 text-muted-foreground">
                    Advanced technology meets global health expertise to deliver unparalleled outbreak intelligence.
                  </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-xl border bg-card p-6 shadow-elegant hover-scale">
                    <Shield className="w-12 h-12 mb-4 text-primary" />
                    <h3 className="text-xl font-semibold mb-2">Trusted Data Sources</h3>
                    <p className="text-sm text-muted-foreground">
                      Verified information from WHO, CDC, and 200+ health agencies worldwide.
                    </p>
                  </div>
                  <div className="rounded-xl border bg-card p-6 shadow-elegant hover-scale">
                    <TrendingUp className="w-12 h-12 mb-4 text-primary" />
                    <h3 className="text-xl font-semibold mb-2">Predictive Analytics</h3>
                    <p className="text-sm text-muted-foreground">
                      AI-powered forecasting identifies emerging threats before they escalate.
                    </p>
                  </div>
                  <div className="rounded-xl border bg-card p-6 shadow-elegant hover-scale">
                    <Zap className="w-12 h-12 mb-4 text-primary" />
                    <h3 className="text-xl font-semibold mb-2">Lightning Fast Updates</h3>
                    <p className="text-sm text-muted-foreground">
                      Real-time data processing ensures you're always ahead of the curve.
                    </p>
                  </div>
                  <div className="rounded-xl border bg-card p-6 shadow-elegant hover-scale">
                    <AlertTriangle className="w-12 h-12 mb-4 text-primary" />
                    <h3 className="text-xl font-semibold mb-2">Early Warning System</h3>
                    <p className="text-sm text-muted-foreground">
                      Get instant alerts for disease outbreaks in your region or worldwide.
                    </p>
                  </div>
                  <div className="rounded-xl border bg-card p-6 shadow-elegant hover-scale">
                    <BarChart3 className="w-12 h-12 mb-4 text-primary" />
                    <h3 className="text-xl font-semibold mb-2">Interactive Visualizations</h3>
                    <p className="text-sm text-muted-foreground">
                      Dynamic maps and charts make complex data easy to understand.
                    </p>
                  </div>
                  <div className="rounded-xl border bg-card p-6 shadow-elegant hover-scale">
                    <Users className="w-12 h-12 mb-4 text-primary" />
                    <h3 className="text-xl font-semibold mb-2">Community Driven</h3>
                    <p className="text-sm text-muted-foreground">
                      Join thousands of health professionals protecting communities globally.
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
                    Making a Global Impact
                  </h2>
                  <p className="mt-4 text-muted-foreground">
                    Our platform is trusted by health professionals, governments, and organizations worldwide.
                  </p>
                </div>

                <div className="grid gap-6 md:grid-cols-4">
                  <div className="text-center p-6 rounded-xl border bg-card shadow-elegant hover-scale">
                    <div className="text-4xl font-bold text-primary mb-2">200+</div>
                    <div className="text-sm text-muted-foreground">Countries Covered</div>
                  </div>
                  <div className="text-center p-6 rounded-xl border bg-card shadow-elegant hover-scale">
                    <div className="text-4xl font-bold text-primary mb-2">50K+</div>
                    <div className="text-sm text-muted-foreground">Active Users</div>
                  </div>
                  <div className="text-center p-6 rounded-xl border bg-card shadow-elegant hover-scale">
                    <div className="text-4xl font-bold text-primary mb-2">24/7</div>
                    <div className="text-sm text-muted-foreground">Real-Time Monitoring</div>
                  </div>
                  <div className="text-center p-6 rounded-xl border bg-card shadow-elegant hover-scale">
                    <div className="text-4xl font-bold text-primary mb-2">99.9%</div>
                    <div className="text-sm text-muted-foreground">Uptime Reliability</div>
                  </div>
                </div>
              </div>
            </section>

            {/* CTA Section */}
            <section className="section bg-primary/5">
              <div className="container-prose">
                <div className="mx-auto max-w-3xl text-center">
                  <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                    Ready to Stay Ahead of Health Threats?
                  </h2>
                  <p className="mt-4 text-muted-foreground">
                    Join the global community protecting public health with real-time outbreak intelligence.
                  </p>
                  <div className="mt-8 flex items-center justify-center gap-4">
                    <Link to="/map">
                      <Button size="lg" variant="default" className="hover-scale">
                        🔍 Explore the Map
                      </Button>
                    </Link>
                    <Link to="/partnership">
                      <Button size="lg" variant="outline" className="hover-scale">
                        🤝 Partner With Us
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
                    About Us – OutbreakNow
                  </h1>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    OutbreakNow is a real-time outbreak intelligence platform designed to detect, track, and visualize emerging public health threats as they unfold. Built at the intersection of epidemiology, clinical medicine, informatics, and quality improvement, OutbreakNow empowers governments, health systems, researchers, and communities with timely, actionable insights—helping to prevent outbreaks from becoming epidemics.
                  </p>
                </article>
              </div>
            </section>

            {/* Mission Statement */}
            <section className="section">
              <div className="container-prose">
                <div className="mx-auto max-w-4xl text-center mb-12">
                  <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                    Our Mission
                  </h2>
                  <p className="text-xl font-semibold text-primary">
                    Enable rapid detection. Enhance preparedness. Strengthen global health resilience.
                  </p>
                </div>

                <div className="mx-auto max-w-4xl">
                  <p className="text-muted-foreground leading-relaxed text-center">
                    OutbreakNow integrates modern analytics, geospatial visualization, crowdsourced signals, and laboratory/clinical data streams to provide a unified view of public health events. By combining human expertise with intelligent technology, we aim to bridge critical gaps in disease surveillance and response.
                  </p>
                </div>
              </div>
            </section>

            {/* Vision Section */}
            <section className="section bg-muted/30">
              <div className="container-prose">
                <div className="mx-auto max-w-4xl">
                  <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6 text-center">
                    Our Vision
                  </h2>
                  <p className="text-muted-foreground leading-relaxed mb-6 text-center">
                    We envision a world where no outbreak goes unnoticed, where frontline health workers and public health leaders have the tools they need to act swiftly, and where data drives coordinated, life-saving action.
                  </p>
                  <p className="text-lg font-semibold text-center text-primary">
                    OutbreakNow stands at the frontier of digital epidemiology—creating a smarter, faster, and more connected approach to global health security.
                  </p>
                </div>
              </div>
            </section>

            {/* Founder Section */}
            <section className="section">
              <div className="container-prose">
                <div className="mx-auto max-w-4xl">
                  <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-8 text-center">
                    The Visionary Behind OutbreakNow
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
                      Dr. Aimé Lufulwabo, MD, MPH
                    </h3>
                    <p className="text-lg text-primary font-medium mt-1">
                      Medical doctor • Epidemiologist • Public Health Informatics Specialist
                    </p>
                  </div>

                  <div className="space-y-4 text-muted-foreground leading-relaxed">
                    <p>
                      OutbreakNow was founded by Dr. Aimé Lufulwabo, a physician informatician and public health specialist whose career spans clinical medicine, epidemiology, health technology, and Innovation.
                    </p>

                    <p>
                      Dr. Lufulwabo completed his medical education at the University of Lubumbashi in the Democratic Republic of Congo, where his early training in microbiology in medical school sparked his passion for infectious diseases and disease surveillance.
                    </p>

                    <p>
                      He went on to earn a Masters of Public Health from Yale University, specializing in epidemiology and public health informatics, and later pursued postgraduate medical education at Harvard University, focusing on: Patient Safety, Quality Improvement, Clinical Informatics, and Healthcare Leadership.
                    </p>

                    <p>
                      He is the founder and Chairman of the Global Health and Quality Alliance (GHQA) and the American Board of Digital Medicine.
                    </p>

                    <p>
                      OutbreakNow is the culmination of his multidisciplinary expertise—uniting the principles of microbiology, epidemiology, informatics, and quality improvement to create a modern platform capable of transforming how the world detects and responds to outbreaks.
                    </p>

                    <p>
                      Dr. Lufulwabo's work reflects his lifelong commitment to strengthening health systems, improving preparedness, and ensuring that communities—especially those most vulnerable—are protected by timely, accurate, and actionable public health intelligence.
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
                        Contact on LinkedIn
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
                    Our Commitment
                  </h2>
                  
                  <p className="text-center text-muted-foreground mb-8">We believe in:</p>

                  <div className="grid sm:grid-cols-2 gap-6 mb-8">
                    <div className="rounded-xl border bg-card p-6 shadow-elegant hover-scale">
                      <AlertTriangle className="w-10 h-10 mb-3 text-primary" />
                      <h3 className="text-xl font-semibold mb-2">Transparency</h3>
                      <p className="text-sm text-muted-foreground">
                        Open and honest communication in public health data
                      </p>
                    </div>
                    <div className="rounded-xl border bg-card p-6 shadow-elegant hover-scale">
                      <Heart className="w-10 h-10 mb-3 text-primary" />
                      <h3 className="text-xl font-semibold mb-2">Equity</h3>
                      <p className="text-sm text-muted-foreground">
                        Ensuring underserved regions have access to real-time tools
                      </p>
                    </div>
                    <div className="rounded-xl border bg-card p-6 shadow-elegant hover-scale">
                      <Zap className="w-10 h-10 mb-3 text-primary" />
                      <h3 className="text-xl font-semibold mb-2">Innovation</h3>
                      <p className="text-sm text-muted-foreground">
                        Using the best of technology and science
                      </p>
                    </div>
                    <div className="rounded-xl border bg-card p-6 shadow-elegant hover-scale">
                      <Users className="w-10 h-10 mb-3 text-primary" />
                      <h3 className="text-xl font-semibold mb-2">Collaboration</h3>
                      <p className="text-sm text-muted-foreground">
                        Working with universities, governments, and global partners
                      </p>
                    </div>
                  </div>

                  <div className="text-center p-8 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
                    <p className="text-xl font-semibold mb-2">
                      OutbreakNow is more than a platform—
                    </p>
                    <p className="text-2xl font-bold text-primary">
                      It is a movement toward a safer, healthier world.
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
                Join Us in Shaping the Future of Outbreak Response
              </h2>
              <p className="mt-4 text-muted-foreground">
                We're actively seeking partners, collaborators, and sponsors to
                expand OutbreakNow's global coverage, enhance predictive models,
                and make life-saving information more accessible. Whether you're
                a public health agency, research institution, technology
                provider, or NGO, your contribution can help us protect
                millions.
              </p>
              <div className="mt-8">
                <Link to="/partnership">
                  <Button size="lg" variant="secondary" className="hover-scale">
                    🤝 Become a Partner
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
                    Support Our Mission
                  </h2>
                  <p className="mt-4 text-muted-foreground">
                    Your generous donations help us expand global health surveillance,
                    improve predictive models, and make life-saving information
                    accessible to communities worldwide. Every contribution makes a
                    difference in protecting public health.
                  </p>

                  <div className="mt-10 grid gap-6 md:grid-cols-3">
                    <div className="rounded-xl border bg-card p-6 shadow-elegant hover-scale">
                      <h3 className="text-2xl font-bold mb-2">$25</h3>
                      <p className="text-sm text-muted-foreground">
                        Support data collection for one region
                      </p>
                      <Button className="mt-4 w-full" variant="outline">
                        Donate $25
                      </Button>
                    </div>
                    <div className="rounded-xl border bg-primary/10 border-primary p-6 shadow-elegant hover-scale">
                      <h3 className="text-2xl font-bold mb-2">$100</h3>
                      <p className="text-sm text-muted-foreground">
                        Fund AI model improvements
                      </p>
                      <Button className="mt-4 w-full">
                        Donate $100
                      </Button>
                    </div>
                    <div className="rounded-xl border bg-card p-6 shadow-elegant hover-scale">
                      <h3 className="text-2xl font-bold mb-2">Custom</h3>
                      <p className="text-sm text-muted-foreground">
                        Choose your contribution amount
                      </p>
                      <Button className="mt-4 w-full" variant="outline">
                        Custom Amount
                      </Button>
                    </div>
                  </div>

                  <div className="mt-12 p-6 rounded-xl bg-muted/50">
                    <h3 className="font-semibold mb-2">💡 Where Your Donations Go</h3>
                    <ul className="text-sm text-muted-foreground space-y-2 text-left max-w-md mx-auto">
                      <li>• Expanding global data coverage to underserved regions</li>
                      <li>• Enhancing AI prediction accuracy and early warning systems</li>
                      <li>• Maintaining real-time infrastructure and data processing</li>
                      <li>• Providing free access to public health organizations</li>
                      <li>• Research and development of new monitoring technologies</li>
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
