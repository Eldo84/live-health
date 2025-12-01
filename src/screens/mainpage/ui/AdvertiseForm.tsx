import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, DollarSign, Target, Zap, Users, Globe2, TrendingUp, BarChart3, Eye, MousePointerClick, Award } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const advertisingPlans = [
  {
    id: 'basic',
    name: 'Basic Plan',
    price: '$50/month',
    features: ['Banner ads on homepage', 'Newsletter mentions', 'Basic analytics'],
    icon: Target
  },
  {
    id: 'professional',
    name: 'Professional Plan',
    price: '$150/month',
    features: ['Premium banner placement', 'Featured partner spotlight', 'Advanced analytics', 'Social media promotion'],
    icon: DollarSign
  },
  {
    id: 'enterprise',
    name: 'Enterprise Plan',
    price: '$300/month',
    features: ['Full homepage integration', 'Custom content creation', 'Dedicated account manager', 'Priority support', 'Custom reporting'],
    icon: Zap
  }
];

const AdvertiseForm = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    website: '',
    description: '',
    selectedPlan: '',
    document: null as File | null
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setFormData(prev => ({ ...prev, document: file }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!formData.companyName || !formData.contactName || !formData.email || !formData.selectedPlan) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    console.log('Advertising form submitted:', formData);
    
    toast({
      title: "Application Submitted!",
      description: "We'll review your advertising application and get back to you within 24 hours.",
    });

    setFormData({
      companyName: '',
      contactName: '',
      email: '',
      phone: '',
      website: '',
      description: '',
      selectedPlan: '',
      document: null
    });
  };

  return (
    <>
      {/* Hero Section */}
      <section className="section pt-20 bg-gradient-to-b from-primary/5 to-background">
        <div className="container-prose">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
              Advertise with OutbreakNow
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8">
              Reach thousands of healthcare professionals, policymakers, researchers, and global health enthusiasts. 
              Advertise your products, services, or initiatives on our platform and make a meaningful impact in global health surveillance.
            </p>
          </div>
        </div>
      </section>

      {/* Why Advertise */}
      <section className="section">
        <div className="container-prose">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-8 text-center">
              Why Advertise with OutbreakNow?
            </h2>

            <div className="grid md:grid-cols-2 gap-6 mb-10">
              <div className="rounded-xl border bg-card p-6 shadow-elegant hover-scale">
                <Users className="w-10 h-10 mb-4 text-primary" />
                <h3 className="text-xl font-semibold mb-2">Targeted Audience</h3>
                <p className="text-sm text-muted-foreground">
                  Connect with 50,000+ active users including public health officials, epidemiologists, healthcare providers, and decision-makers
                </p>
              </div>

              <div className="rounded-xl border bg-card p-6 shadow-elegant hover-scale">
                <Globe2 className="w-10 h-10 mb-4 text-primary" />
                <h3 className="text-xl font-semibold mb-2">Global Reach</h3>
                <p className="text-sm text-muted-foreground">
                  Your message reaches professionals across 200+ countries and territories worldwide
                </p>
              </div>

              <div className="rounded-xl border bg-card p-6 shadow-elegant hover-scale">
                <TrendingUp className="w-10 h-10 mb-4 text-primary" />
                <h3 className="text-xl font-semibold mb-2">High Engagement</h3>
                <p className="text-sm text-muted-foreground">
                  Our platform sees daily engagement from users actively seeking outbreak intelligence and health solutions
                </p>
              </div>

              <div className="rounded-xl border bg-card p-6 shadow-elegant hover-scale">
                <Award className="w-10 h-10 mb-4 text-primary" />
                <h3 className="text-xl font-semibold mb-2">Trusted Platform</h3>
                <p className="text-sm text-muted-foreground">
                  Associate your brand with a credible source of real-time outbreak intelligence trusted globally
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Audience Demographics */}
      <section className="section bg-muted/30">
        <div className="container-prose">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-8 text-center">
              Our Audience
            </h2>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center p-6 rounded-xl border bg-card shadow-elegant hover-scale">
                <div className="text-3xl font-bold text-primary mb-2">40%</div>
                <div className="text-sm text-muted-foreground">Public Health Officials</div>
              </div>

              <div className="text-center p-6 rounded-xl border bg-card shadow-elegant hover-scale">
                <div className="text-3xl font-bold text-primary mb-2">30%</div>
                <div className="text-sm text-muted-foreground">Healthcare Providers</div>
              </div>

              <div className="text-center p-6 rounded-xl border bg-card shadow-elegant hover-scale">
                <div className="text-3xl font-bold text-primary mb-2">20%</div>
                <div className="text-sm text-muted-foreground">Researchers & Academics</div>
              </div>

              <div className="text-center p-6 rounded-xl border bg-card shadow-elegant hover-scale">
                <div className="text-3xl font-bold text-primary mb-2">10%</div>
                <div className="text-sm text-muted-foreground">Policy Makers & NGOs</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Advertising Opportunities */}
      <section className="section">
        <div className="container-prose">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-8 text-center">
              Advertising Opportunities
            </h2>

            <div className="space-y-6">
              <div className="rounded-xl border bg-card p-6 shadow-elegant">
                <div className="flex items-start gap-4">
                  <Eye className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Banner Advertisements</h3>
                    <p className="text-sm text-muted-foreground">
                      High-visibility banner placements on our homepage, outbreak map, and key landing pages. Choose from multiple sizes and positions to maximize your reach.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border bg-card p-6 shadow-elegant">
                <div className="flex items-start gap-4">
                  <MousePointerClick className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Sponsored Content</h3>
                    <p className="text-sm text-muted-foreground">
                      Feature your organization through sponsored articles, case studies, or outbreak reports that align with our mission and provide value to our audience.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border bg-card p-6 shadow-elegant">
                <div className="flex items-start gap-4">
                  <BarChart3 className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Newsletter Sponsorships</h3>
                    <p className="text-sm text-muted-foreground">
                      Reach our engaged subscriber base through dedicated newsletter features and mentions in our weekly outbreak intelligence updates.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border bg-card p-6 shadow-elegant">
                <div className="flex items-start gap-4">
                  <Award className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Partner Spotlight</h3>
                    <p className="text-sm text-muted-foreground">
                      Featured partner placement showcasing your organization's contribution to global health, with dedicated profile pages and social media promotion.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Advertising Plans */}
      <section className="section bg-primary/5">
        <div className="container-prose">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-8 text-center">
              Advertising Plans
            </h2>

            <div className="grid gap-6 lg:grid-cols-3 mb-12">
              {advertisingPlans.map((plan) => {
                const IconComponent = plan.icon;
                return (
                  <Card 
                    key={plan.id} 
                    className={`hover-scale ${plan.id === 'professional' ? 'border-primary border-2' : ''}`}
                  >
                    <CardHeader>
                      {plan.id === 'professional' && (
                        <div className="text-xs font-semibold text-primary mb-2">MOST POPULAR</div>
                      )}
                      <div className="flex items-center gap-3 mb-2">
                        <IconComponent className="h-8 w-8 text-primary" />
                        <CardTitle>{plan.name}</CardTitle>
                      </div>
                      <CardDescription className="text-2xl font-bold text-primary">{plan.price}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <span className="text-primary mt-0.5">✓</span>
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="text-center mb-8">
              <p className="text-sm text-muted-foreground mb-6">
                All plans include detailed analytics, monthly performance reports, and dedicated support.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Application Form */}
      <section className="section">
        <div className="container-prose">
          <div className="mx-auto max-w-3xl">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                Start Advertising Today
              </h2>
              <p className="text-muted-foreground">
                Fill out the form below and our advertising team will contact you within 24 hours to discuss your campaign goals and create a customized strategy.
              </p>
            </div>

            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle>Advertising Application</CardTitle>
                <CardDescription>Tell us about your organization and advertising goals</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name *</Label>
                    <Input
                      id="companyName"
                      placeholder="Your Company Name"
                      value={formData.companyName}
                      onChange={(e) => handleInputChange('companyName', e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactName">Contact Person *</Label>
                    <Input
                      id="contactName"
                      placeholder="Full Name"
                      value={formData.contactName}
                      onChange={(e) => handleInputChange('contactName', e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="contact@company.com"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+1 (555) 000-0000"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website">Website URL</Label>
                    <Input
                      id="website"
                      type="url"
                      placeholder="https://yourcompany.com"
                      value={formData.website}
                      onChange={(e) => handleInputChange('website', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Advertising Goals & Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Tell us about your products/services and what you hope to achieve through advertising on OutbreakNow..."
                      rows={5}
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>Select Advertising Plan *</Label>
                    <RadioGroup
                      value={formData.selectedPlan}
                      onValueChange={(value) => handleInputChange('selectedPlan', value)}
                    >
                      {advertisingPlans.map((plan) => (
                        <div key={plan.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                          <RadioGroupItem value={plan.id} id={plan.id} />
                          <Label htmlFor={plan.id} className="flex-1 cursor-pointer">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{plan.name}</span>
                              <span className="text-primary font-bold">{plan.price}</span>
                            </div>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="document">Upload Advertisement Document</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        id="document"
                        type="file"
                        onChange={handleFileUpload}
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                      />
                      <Upload className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Accepted formats: PDF, DOC, DOCX, JPG, PNG (Max 10MB)
                    </p>
                    {formData.document && (
                      <p className="text-sm text-primary">
                        Selected: {formData.document.name}
                      </p>
                    )}
                  </div>

                  <Button type="submit" size="lg" className="w-full hover-scale">
                    Submit Advertising Application
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </>
  );
};

export default AdvertiseForm;
