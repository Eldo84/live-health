import { Helmet } from "react-helmet-async";
import { useLocation, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Building2, GraduationCap, Hospital, Cpu, Heart, HandCoins, Globe2, TrendingUp, Shield, Lightbulb, Users, Zap } from "lucide-react";
import outbreakNowLogo from "@/assets/outbreaknow-logo.png";
import { Footer } from "@/components/Footer";

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
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", organization: "", email: "", message: "" },
  });

  const onSubmit = (values: FormValues) => {
    console.log("Partnership inquiry submitted:", values);
    toast({
      title: "Thanks for reaching out!",
      description: "We'll get back to you shortly.",
    });
    form.reset();
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
                  Home
                </Button>
              </Link>
              <Link to="/map">
                <Button variant="ghost" size="sm">
                  Map
                </Button>
              </Link>
              <Link to="/dashboard">
                <Button variant="ghost" size="sm">
                  Dashboard
                </Button>
              </Link>
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
                Become a Partner
              </h1>
              <p className="text-xl md:text-2xl font-semibold mb-4 text-foreground/90">
                Join Us in Shaping the Future of Outbreak Response
              </p>
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto">
                OutbreakNow is building the next generation of real-time global outbreak intelligence. Partner with us to strengthen early detection systems, accelerate data-sharing, and deliver life-saving insights worldwide.
              </p>
            </div>
          </div>
        </section>

        {/* Collaboration Partners */}
        <section className="section py-12">
          <div className="container-prose">
            <div className="mx-auto max-w-6xl">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-8 text-center">
                We Actively Collaborate With
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                <div className="rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-all hover:scale-105 group">
                  <Building2 className="w-8 h-8 mb-2 text-primary mx-auto" />
                  <h3 className="text-xs font-semibold text-center">Public Health Agencies</h3>
                </div>

                <div className="rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-all hover:scale-105 group">
                  <GraduationCap className="w-8 h-8 mb-2 text-primary mx-auto" />
                  <h3 className="text-xs font-semibold text-center">Universities & Research</h3>
                </div>

                <div className="rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-all hover:scale-105 group">
                  <Hospital className="w-8 h-8 mb-2 text-primary mx-auto" />
                  <h3 className="text-xs font-semibold text-center">Healthcare Systems</h3>
                </div>

                <div className="rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-all hover:scale-105 group">
                  <Cpu className="w-8 h-8 mb-2 text-primary mx-auto" />
                  <h3 className="text-xs font-semibold text-center">Technology Partners</h3>
                </div>

                <div className="rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-all hover:scale-105 group">
                  <Heart className="w-8 h-8 mb-2 text-primary mx-auto" />
                  <h3 className="text-xs font-semibold text-center">NGOs & Networks</h3>
                </div>

                <div className="rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-all hover:scale-105 group">
                  <HandCoins className="w-8 h-8 mb-2 text-primary mx-auto" />
                  <h3 className="text-xs font-semibold text-center">Foundations</h3>
                </div>
              </div>

              <div className="p-5 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-center text-sm text-foreground/80 leading-relaxed">
                  Your partnership can directly contribute to expanding global surveillance coverage, improving predictive modeling, and making critical outbreak information more accessible worldwide.
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
                Why Partner With Us?
              </h2>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-lg border bg-card p-5 shadow-sm hover:shadow-md transition-all group">
                  <Globe2 className="w-8 h-8 mb-3 text-primary" />
                  <h3 className="text-base font-semibold mb-2">Advance Global Preparedness</h3>
                  <p className="text-sm text-muted-foreground">
                    Support rapid response systems that detect and contain outbreaks before they escalate
                  </p>
                </div>

                <div className="rounded-lg border bg-card p-5 shadow-sm hover:shadow-md transition-all group">
                  <TrendingUp className="w-8 h-8 mb-3 text-primary" />
                  <h3 className="text-base font-semibold mb-2">Cutting-Edge Technology</h3>
                  <p className="text-sm text-muted-foreground">
                    Support digital epidemiology and AI-driven surveillance innovation
                  </p>
                </div>

                <div className="rounded-lg border bg-card p-5 shadow-sm hover:shadow-md transition-all group">
                  <Shield className="w-8 h-8 mb-3 text-primary" />
                  <h3 className="text-base font-semibold mb-2">Strengthen Health Systems</h3>
                  <p className="text-sm text-muted-foreground">
                    Help vulnerable and underserved regions access critical surveillance tools
                  </p>
                </div>

                <div className="rounded-lg border bg-card p-5 shadow-sm hover:shadow-md transition-all group">
                  <Lightbulb className="w-8 h-8 mb-3 text-primary" />
                  <h3 className="text-base font-semibold mb-2">Drive Innovation</h3>
                  <p className="text-sm text-muted-foreground">
                    Contribute to research, innovation, and scientific advancement
                  </p>
                </div>

                <div className="rounded-lg border bg-card p-5 shadow-sm hover:shadow-md transition-all group">
                  <Users className="w-8 h-8 mb-3 text-primary" />
                  <h3 className="text-base font-semibold mb-2">Protect Populations</h3>
                  <p className="text-sm text-muted-foreground">
                    Shape a platform that safeguards communities and saves lives
                  </p>
                </div>

                <div className="rounded-lg border bg-card p-5 shadow-sm hover:shadow-md transition-all group">
                  <Zap className="w-8 h-8 mb-3 text-primary" />
                  <h3 className="text-base font-semibold mb-2">Prevent Pandemics</h3>
                  <p className="text-sm text-muted-foreground">
                    Join the movement to stop outbreaks faster and prevent the next pandemic
                  </p>
                </div>
              </div>

              <div className="mt-8 text-center p-6 rounded-lg bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border border-primary/20">
                <p className="text-base md:text-lg font-semibold mb-1 text-foreground/90">
                  OutbreakNow is more than a tool—
                </p>
                <p className="text-lg md:text-xl font-bold text-primary">
                  It's a global movement to stop outbreaks faster and prevent the next pandemic.
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
                  🤝 Let's Partner Together
                </h2>
                <p className="text-base text-muted-foreground">
                  Join us in building a safer, more resilient world. Together, we can make outbreaks visible before they become emergencies.
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
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Dr. Jane Doe" {...field} />
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
                            <FormLabel>Organization</FormLabel>
                            <FormControl>
                              <Input placeholder="Your institution" {...field} />
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
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="contact@organization.org" {...field} />
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
                          <FormLabel>Partnership Inquiry</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Tell us about your organization and how you'd like to collaborate..."
                              rows={5}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" size="lg" className="w-full">
                      Submit Partnership Inquiry
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
