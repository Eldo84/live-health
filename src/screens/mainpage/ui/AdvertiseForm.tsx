import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, DollarSign, Target, Zap, Users, Globe2, TrendingUp, BarChart3, Eye, MousePointerClick, Award, Loader2, CheckCircle, MapPin, Clock, LogIn, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { AuthDialog } from '@/components/AuthDialog';
import { useLanguage } from '@/contexts/LanguageContext';

const advertisingPlans = [
  {
    id: 'basic',
    priceValue: 50,
    featureKeys: [
      'advertise.plans.basic.feature1',
      'advertise.plans.basic.feature2',
      'advertise.plans.basic.feature3',
      'advertise.plans.basic.feature4'
    ],
    icon: Target
  },
  {
    id: 'professional',
    priceValue: 150,
    featureKeys: [
      'advertise.plans.professional.feature1',
      'advertise.plans.professional.feature2',
      'advertise.plans.professional.feature3',
      'advertise.plans.professional.feature4',
      'advertise.plans.professional.feature5',
      'advertise.plans.professional.feature6'
    ],
    icon: DollarSign
  },
  {
    id: 'enterprise',
    priceValue: 300,
    featureKeys: [
      'advertise.plans.enterprise.feature1',
      'advertise.plans.enterprise.feature2',
      'advertise.plans.enterprise.feature3',
      'advertise.plans.enterprise.feature4',
      'advertise.plans.enterprise.feature5',
      'advertise.plans.enterprise.feature6',
      'advertise.plans.enterprise.feature7'
    ],
    icon: Zap
  }
];

interface FormData {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  website: string;
  description: string;
  selectedPlan: string;
  document: File | null;
  adImage: File | null;
  adImageUrl: string;
  adTitle: string;
  adClickUrl: string;
  adLocation: string;
}

const AdvertiseForm = () => {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [rateLimitCheck, setRateLimitCheck] = useState<{ allowed: boolean; reason?: string } | null>(null);
  
  const [formData, setFormData] = useState<FormData>({
    companyName: '',
    contactName: '',
    email: user?.email || '',
    phone: '',
    website: '',
    description: '',
    selectedPlan: '',
    document: null,
    adImage: null,
    adImageUrl: '',
    adTitle: '',
    adClickUrl: '',
    adLocation: 'Global'
  });

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    
    // Validate file size (max 10MB)
    if (file && file.size > 10 * 1024 * 1024) {
      toast({
        title: t("advertise.errors.fileTooLargeTitle"),
        description: t("advertise.errors.fileTooLargeDesc"),
        variant: "destructive"
      });
      return;
    }
    
    setFormData(prev => ({ ...prev, document: file }));
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    
    // Validate file type (images only)
    if (file && !file.type.startsWith('image/')) {
      toast({
        title: t("advertise.errors.invalidFileTypeTitle"),
        description: t("advertise.errors.invalidFileTypeDesc"),
        variant: "destructive"
      });
      return;
    }
    
    // Validate file size (max 5MB for images)
    if (file && file.size > 5 * 1024 * 1024) {
      toast({
        title: t("advertise.errors.imageTooLargeTitle"),
        description: t("advertise.errors.imageTooLargeDesc"),
        variant: "destructive"
      });
      return;
    }
    
    setFormData(prev => ({ ...prev, adImage: file }));
  };

  const uploadDocument = async (file: File): Promise<string | null> => {
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id || 'anonymous'}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      // Upload to root of bucket, not a subfolder
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from('advertising-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        // If bucket doesn't exist or RLS blocks, still continue with submission
        if (uploadError.message.includes('Bucket not found') || 
            uploadError.message.includes('row-level security') ||
            uploadError.message.includes('permission')) {
          toast({
            title: t("advertise.note.title"),
            description: t("advertise.note.documentSkipped"),
            variant: "default"
          });
          return null;
        }
        throw uploadError;
      }

      // Get the public URL (even for private buckets, we can generate a signed URL if needed)
      const { data } = supabase.storage
        .from('advertising-documents')
        .getPublicUrl(filePath);

      // For private buckets, return the path (admin can access via service role)
      return data.publicUrl || filePath;
    } catch (error) {
      console.error('Error uploading document:', error);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const uploadAdImage = async (file: File): Promise<string | null> => {
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `ad-${user?.id || 'anonymous'}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      // Try sponsored-images bucket first (public), fallback to advertising-documents
      let bucket = 'sponsored-images';
      let filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      // If sponsored-images bucket doesn't exist, try advertising-documents
      if (uploadError && uploadError.message.includes('Bucket not found')) {
        bucket = 'advertising-documents';
        const { error: fallbackError } = await supabase.storage
          .from(bucket)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (fallbackError) {
          console.error('Image upload error:', fallbackError);
          toast({
            title: t("advertise.note.title"),
            description: t("advertise.note.imageStorageSkipped"),
            variant: "default"
          });
          return null;
        }
      } else if (uploadError) {
        console.error('Image upload error:', uploadError);
        if (uploadError.message.includes('row-level security') || uploadError.message.includes('permission')) {
          toast({
            title: t("advertise.note.title"),
            description: t("advertise.note.imageAccessSkipped"),
            variant: "default"
          });
          return null;
        }
        throw uploadError;
      }

      // Get the public URL
      const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  // Check authentication and rate limits on mount
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      // Not logged in - show login prompt
      return;
    }

    // Check rate limits
    const checkRateLimit = async () => {
      try {
        const { data, error } = await supabase.rpc('can_user_submit', {
          p_user_id: user.id
        });

        if (error) {
          console.error('Rate limit check error:', error);
          return;
        }

        setRateLimitCheck(data);
      } catch (error) {
        console.error('Error checking rate limit:', error);
      }
    };

    checkRateLimit();
  }, [user, authLoading]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    // Require authentication
    if (!user) {
      setAuthDialogOpen(true);
      toast({
        title: t("advertise.errors.loginRequiredTitle"),
        description: t("advertise.errors.loginRequiredDesc"),
        variant: "destructive"
      });
      return;
    }

    // Check rate limits
    if (rateLimitCheck && !rateLimitCheck.allowed) {
      toast({
        title: t("advertise.errors.limitReachedTitle"),
        description: rateLimitCheck.reason || t("advertise.errors.limitReachedDescFallback"),
        variant: "destructive"
      });
      return;
    }
    
    if (!formData.companyName || !formData.contactName || !formData.email || !formData.selectedPlan) {
      toast({
        title: t("advertise.errors.missingInfoTitle"),
        description: t("advertise.errors.missingInfoDesc"),
        variant: "destructive"
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: t("advertise.errors.invalidEmailTitle"),
        description: t("advertise.errors.invalidEmailDesc"),
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload document if provided
      let documentUrl = null;
      if (formData.document) {
        documentUrl = await uploadDocument(formData.document);
      }

      // Upload ad image if provided
      let imageUrl = formData.adImageUrl; // Use URL if provided directly
      if (formData.adImage) {
        const uploadedImageUrl = await uploadAdImage(formData.adImage);
        if (uploadedImageUrl) {
          imageUrl = uploadedImageUrl;
        }
      }

      // Insert submission into database (user_id is required now)
      const { data, error } = await supabase
        .from('advertising_submissions')
        .insert({
          user_id: user.id, // Required - user must be logged in
          company_name: formData.companyName,
          contact_name: formData.contactName,
          email: formData.email,
          phone: formData.phone || null,
          website: formData.website || null,
          description: formData.description || null,
          selected_plan: formData.selectedPlan,
          document_url: documentUrl,
          ad_title: formData.adTitle || null,
          ad_image_url: imageUrl || null,
          ad_click_url: formData.adClickUrl || null,
          ad_location: formData.adLocation || 'Global',
          status: 'pending_review',
          payment_status: 'not_required'
        })
        .select('id')
        .single();

      if (error) {
        console.error('Database error:', error);
        throw new Error(error.message);
      }

      setSubmissionId(data.id);
      setSubmissionSuccess(true);
    
      toast({
        title: t("advertise.success.title"),
        description: t("advertise.success.desc"),
      });

      // Reset form
    setFormData({
      companyName: '',
      contactName: '',
        email: user?.email || '',
      phone: '',
      website: '',
      description: '',
      selectedPlan: '',
        document: null,
        adImage: null,
        adImageUrl: '',
        adTitle: '',
        adClickUrl: '',
        adLocation: 'Global'
      });

    } catch (error: any) {
      console.error('Submission error:', error);
      toast({
        title: t("advertise.errors.submitFailedTitle"),
        description: error.message || t("advertise.errors.submitFailedDesc"),
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedPlanDetails = advertisingPlans.find(p => p.id === formData.selectedPlan);

  // Success state
  if (submissionSuccess) {
    return (
      <section className="section pt-20">
        <div className="container-prose">
          <div className="mx-auto max-w-2xl">
            <Card className="shadow-elegant border-green-200 bg-green-50/50">
              <CardContent className="pt-8 pb-8 text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
                <h2 className="text-2xl font-bold mb-4 text-gray-900">
                  {t("advertise.success.titleShort")}
                </h2>
                <p className="text-gray-700 mb-6">
                  {t("advertise.success.longDesc")}
                </p>
                
                <div className="bg-white rounded-lg p-4 mb-6 text-left">
                  <h3 className="font-semibold mb-4 text-gray-900">
                    {t("advertise.success.nextStepsTitle")}
                  </h3>
                  <ol className="space-y-3 text-sm">
                    <li className="flex items-start gap-3">
                      <span className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5">1</span>
                      <span className="text-gray-800">
                        <strong className="font-semibold text-gray-900">
                          {t("advertise.success.step1Title")}
                        </strong>{" "}
                        {t("advertise.success.step1Body")}
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5">2</span>
                      <span className="text-gray-800">
                        <strong className="font-semibold text-gray-900">
                          {t("advertise.success.step2Title")}
                        </strong>{" "}
                        {t("advertise.success.step2Body")}
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5">3</span>
                      <span className="text-gray-800">
                        <strong className="font-semibold text-gray-900">
                          {t("advertise.success.step3Title")}
                        </strong>{" "}
                        {t("advertise.success.step3Body")}
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5">4</span>
                      <span className="text-gray-800">
                        <strong className="font-semibold text-gray-900">
                          {t("advertise.success.step4Title")}
                        </strong>{" "}
                        {t("advertise.success.step4Body")}
                      </span>
                    </li>
                  </ol>
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-900">
                      {t("advertise.success.importantNote")}
                    </p>
                  </div>
                </div>

                {submissionId && (
                  <p className="text-xs text-gray-600 mb-4">
                    {t("advertise.success.referenceId", { id: submissionId })}
                  </p>
                )}
                
                <Button 
                  onClick={() => {
                    setSubmissionSuccess(false);
                    setSubmissionId(null);
                  }}
                  variant="outline"
                >
                  {t("advertise.success.submitAnother")}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      {/* Hero Section */}
      <section className="section pt-20 bg-gradient-to-b from-primary/5 to-background">
        <div className="container-prose">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
              {t("advertise.hero.title")}
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8">
              {t("advertise.hero.body")}
            </p>
          </div>
        </div>
      </section>

      {/* Why Advertise */}
      <section className="section">
        <div className="container-prose">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-8 text-center">
              {t("advertise.why.title")}
            </h2>

            <div className="grid md:grid-cols-2 gap-6 mb-10">
              <div className="rounded-xl border bg-card p-6 shadow-elegant hover-scale">
                <Users className="w-10 h-10 mb-4 text-primary" />
                <h3 className="text-xl font-semibold mb-2">
                  {t("advertise.why.targetedTitle")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("advertise.why.targetedBody")}
                </p>
              </div>

              <div className="rounded-xl border bg-card p-6 shadow-elegant hover-scale">
                <Globe2 className="w-10 h-10 mb-4 text-primary" />
                <h3 className="text-xl font-semibold mb-2">
                  {t("advertise.why.globalTitle")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("advertise.why.globalBody")}
                </p>
              </div>

              <div className="rounded-xl border bg-card p-6 shadow-elegant hover-scale">
                <TrendingUp className="w-10 h-10 mb-4 text-primary" />
                <h3 className="text-xl font-semibold mb-2">
                  {t("advertise.why.engagementTitle")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("advertise.why.engagementBody")}
                </p>
              </div>

              <div className="rounded-xl border bg-card p-6 shadow-elegant hover-scale">
                <Award className="w-10 h-10 mb-4 text-primary" />
                <h3 className="text-xl font-semibold mb-2">
                  {t("advertise.why.trustedTitle")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("advertise.why.trustedBody")}
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
              {t("advertise.audience.title")}
            </h2>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center p-6 rounded-xl border bg-card shadow-elegant hover-scale">
                <div className="text-3xl font-bold text-primary mb-2">40%</div>
                <div className="text-sm text-muted-foreground">
                  {t("advertise.audience.segmentPublicHealth")}
                </div>
              </div>

              <div className="text-center p-6 rounded-xl border bg-card shadow-elegant hover-scale">
                <div className="text-3xl font-bold text-primary mb-2">30%</div>
                <div className="text-sm text-muted-foreground">
                  {t("advertise.audience.segmentProviders")}
                </div>
              </div>

              <div className="text-center p-6 rounded-xl border bg-card shadow-elegant hover-scale">
                <div className="text-3xl font-bold text-primary mb-2">20%</div>
                <div className="text-sm text-muted-foreground">
                  {t("advertise.audience.segmentResearchers")}
                </div>
              </div>

              <div className="text-center p-6 rounded-xl border bg-card shadow-elegant hover-scale">
                <div className="text-3xl font-bold text-primary mb-2">10%</div>
                <div className="text-sm text-muted-foreground">
                  {t("advertise.audience.segmentPolicy")}
                </div>
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
              {t("advertise.opportunities.title")}
            </h2>

            <div className="space-y-6">
              <div className="rounded-xl border bg-card p-6 shadow-elegant">
                <div className="flex items-start gap-4">
                  <Eye className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold mb-2">
                      {t("advertise.opportunities.mapTitle")}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t("advertise.opportunities.mapBody")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border bg-card p-6 shadow-elegant">
                <div className="flex items-start gap-4">
                  <MousePointerClick className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold mb-2">
                      {t("advertise.opportunities.homepageTitle")}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t("advertise.opportunities.homepageBody")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border bg-card p-6 shadow-elegant">
                <div className="flex items-start gap-4">
                  <BarChart3 className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold mb-2">
                      {t("advertise.opportunities.newsletterTitle")}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t("advertise.opportunities.newsletterBody")}
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
              {t("advertise.plans.title")}
            </h2>

            <div className="grid gap-6 lg:grid-cols-3 mb-12">
              {advertisingPlans.map((plan) => {
                const IconComponent = plan.icon;
                const isSelected = formData.selectedPlan === plan.id;
                const name = t(`advertise.plans.${plan.id}.name`);
                const price = t(`advertise.plans.${plan.id}.price`);
                const duration = t(`advertise.plans.${plan.id}.duration`);
                return (
                  <Card 
                    key={plan.id} 
                    className={`hover-scale cursor-pointer transition-all ${
                      plan.id === 'professional' ? 'border-primary border-2' : ''
                    } ${isSelected ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                    onClick={() => handleInputChange('selectedPlan', plan.id)}
                  >
                    <CardHeader>
                      {plan.id === 'professional' && (
                        <div className="text-xs font-semibold text-primary mb-2">
                          {t("advertise.plans.mostPopularBadge")}
                        </div>
                      )}
                      <div className="flex items-center gap-3 mb-2">
                        <IconComponent className="h-8 w-8 text-primary" />
                        <CardTitle>{name}</CardTitle>
                      </div>
                      <CardDescription className="text-2xl font-bold text-primary">
                        {price}
                      </CardDescription>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <Clock className="w-4 h-4" />
                        <span>{duration}</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {plan.featureKeys.map((featureKey, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <span className="text-primary mt-0.5">✓</span>
                            <span>{t(featureKey)}</span>
                          </li>
                        ))}
                      </ul>
                      {isSelected && (
                        <div className="mt-4 p-2 bg-primary/10 rounded-lg text-center text-sm font-medium text-primary">
                          {t("advertise.form.selectedIndicator")}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="text-center mb-8">
              <p className="text-sm text-muted-foreground mb-6">
                {t("advertise.plans.notice")}
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
                {t("advertise.form.title")}
              </h2>
              <p className="text-muted-foreground">
                {t("advertise.form.subtitle")}
              </p>
            </div>

            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle>{t("advertise.form.cardTitle")}</CardTitle>
                <CardDescription>{t("advertise.form.cardDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Authentication Check */}
                {!user && !authLoading && (
                  <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <LogIn className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-yellow-900 mb-1">
                          {t("advertise.form.loginRequiredTitle")}
                        </h4>
                        <p className="text-sm text-yellow-800 mb-3">
                          {t("advertise.form.loginRequiredBody")}
                        </p>
                        <Button
                          onClick={() => setAuthDialogOpen(true)}
                          className="bg-yellow-600 hover:bg-yellow-700 text-white"
                        >
                          {t("advertise.form.loginButton")}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Rate Limit Warning */}
                {user && rateLimitCheck && !rateLimitCheck.allowed && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-red-900 mb-1">
                          {t("advertise.errors.limitReachedTitle")}
                        </h4>
                        <p className="text-sm text-red-800">
                          {rateLimitCheck.reason}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Company Info */}
                  <div className="space-y-2">
                    <Label htmlFor="companyName">
                      {t("advertise.form.companyNameLabel")}
                    </Label>
                    <Input
                      id="companyName"
                      placeholder={t("advertise.form.companyNamePlaceholder")}
                      value={formData.companyName}
                      onChange={(e) => handleInputChange('companyName', e.target.value)}
                      required
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactName">
                      {t("advertise.form.contactNameLabel")}
                    </Label>
                    <Input
                      id="contactName"
                      placeholder={t("advertise.form.contactNamePlaceholder")}
                      value={formData.contactName}
                      onChange={(e) => handleInputChange('contactName', e.target.value)}
                      required
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="email">
                        {t("advertise.form.emailLabel")}
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder={t("advertise.form.emailPlaceholder")}
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        required
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">
                        {t("advertise.form.phoneLabel")}
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder={t("advertise.form.phonePlaceholder")}
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website">
                      {t("advertise.form.websiteLabel")}
                    </Label>
                    <Input
                      id="website"
                      type="url"
                      placeholder={t("advertise.form.websitePlaceholder")}
                      value={formData.website}
                      onChange={(e) => handleInputChange('website', e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">
                      {t("advertise.form.descriptionLabel")}
                    </Label>
                    <Textarea
                      id="description"
                      placeholder={t("advertise.form.descriptionPlaceholder")}
                      rows={4}
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>

                  {/* Ad Content Preview (Optional) */}
                  <div className="border-t pt-5 mt-5">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Eye className="w-5 h-5 text-primary" />
                      {t("advertise.form.adContentTitle")}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {t("advertise.form.adContentBody")}
                    </p>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="adTitle">
                          {t("advertise.form.adTitleLabel")}
                        </Label>
                        <Input
                          id="adTitle"
                          placeholder={t("advertise.form.adTitlePlaceholder")}
                          value={formData.adTitle}
                          onChange={(e) => handleInputChange('adTitle', e.target.value)}
                          disabled={isSubmitting}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="adImage">
                          {t("advertise.form.adImageLabel")}
                        </Label>
                        <div className="flex items-center gap-3">
                          <Input
                            id="adImage"
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp"
                            onChange={handleImageUpload}
                            className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                            disabled={isSubmitting || isUploading}
                          />
                          {isUploading ? (
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          ) : (
                            <Upload className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {t("advertise.form.adImageHelp")}
                        </p>
                        {formData.adImage && (
                          <div className="mt-2">
                            <p className="text-sm text-primary mb-2">
                              {t("advertise.form.selectedFile", { name: formData.adImage.name })}
                            </p>
                            <div className="relative w-full h-32 border rounded-lg overflow-hidden">
                              <img
                                src={URL.createObjectURL(formData.adImage)}
                                alt="Preview"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </div>
                        )}
                        {formData.adImageUrl && !formData.adImage && (
                          <div className="mt-2">
                            <p className="text-xs text-muted-foreground mb-2">
                              {t("advertise.form.imageUrlLabel")}
                            </p>
                            <Input
                              placeholder="https://example.com/image.jpg"
                              value={formData.adImageUrl}
                              onChange={(e) => handleInputChange('adImageUrl', e.target.value)}
                              disabled={isSubmitting}
                            />
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="adClickUrl">
                          {t("advertise.form.clickUrlLabel")}
                        </Label>
                        <Input
                          id="adClickUrl"
                          type="url"
                          placeholder={t("advertise.form.clickUrlPlaceholder")}
                          value={formData.adClickUrl}
                          onChange={(e) => handleInputChange('adClickUrl', e.target.value)}
                          disabled={isSubmitting}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="adLocation" className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          {t("advertise.form.locationLabel")}
                        </Label>
                        <Input
                          id="adLocation"
                          placeholder={t("advertise.form.locationPlaceholder")}
                          value={formData.adLocation}
                          onChange={(e) => handleInputChange('adLocation', e.target.value)}
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Plan Selection */}
                  <div className="space-y-3 border-t pt-5">
                    <Label>{t("advertise.form.planLabel")}</Label>
                    <RadioGroup
                      value={formData.selectedPlan}
                      onValueChange={(value) => handleInputChange('selectedPlan', value)}
                      disabled={isSubmitting}
                    >
                      {advertisingPlans.map((plan) => (
                        <div 
                          key={plan.id} 
                          className={`flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors ${
                            formData.selectedPlan === plan.id ? 'border-primary bg-primary/5' : ''
                          }`}
                        >
                          <RadioGroupItem value={plan.id} id={`form-${plan.id}`} />
                          <Label htmlFor={`form-${plan.id}`} className="flex-1 cursor-pointer">
                            <div className="flex items-center justify-between">
                              <div>
                              <span className="font-medium">{plan.name}</span>
                                <span className="text-sm text-muted-foreground ml-2">({plan.duration})</span>
                              </div>
                              <span className="text-primary font-bold">{plan.price}</span>
                            </div>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                    
                    {selectedPlanDetails && (
                      <div className="bg-muted/50 rounded-lg p-4 mt-3">
                        <p className="text-sm font-medium mb-2">
                          {t("advertise.form.selectedPlanPrefix")}{" "}
                          {t(`advertise.plans.${selectedPlanDetails.id}.name`)}
                        </p>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {selectedPlanDetails.features.slice(0, 3).map((f, i) => (
                            <li key={i}>• {f}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Document Upload */}
                  <div className="space-y-2">
                    <Label htmlFor="document">
                      {t("advertise.form.documentLabel")}
                    </Label>
                    <div className="flex items-center gap-3">
                      <Input
                        id="document"
                        type="file"
                        onChange={handleFileUpload}
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                        disabled={isSubmitting || isUploading}
                      />
                      {isUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      ) : (
                      <Upload className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("advertise.form.documentHelp")}
                    </p>
                    {formData.document && (
                      <p className="text-sm text-primary">
                        {t("advertise.form.selectedFile", { name: formData.document.name })}
                      </p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <Button 
                    type="submit" 
                    size="lg" 
                    className="w-full hover-scale"
                    disabled={isSubmitting || isUploading || !formData.selectedPlan || !user || (rateLimitCheck?.allowed === false)}
                  >
                    {!user ? (
                      <>
                        <LogIn className="mr-2 h-4 w-4" />
                        {t("advertise.form.submitLogin")}
                      </>
                    ) : isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("advertise.form.submitting")}
                      </>
                    ) : (
                      t("advertise.form.submit")
                    )}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    {t("advertise.form.submitDisclaimer")}
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Auth Dialog */}
      <AuthDialog
        open={authDialogOpen}
        onOpenChange={(open) => setAuthDialogOpen(open)}
        mode="login"
      />
    </>
  );
};

export default AdvertiseForm;
