import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, DollarSign, Target, Zap, Users, Globe2, TrendingUp, BarChart3, Eye, MousePointerClick, Award, Loader2, CheckCircle, MapPin, Clock, LogIn, AlertCircle, Edit, ArrowLeft, ExternalLink, Star, Pin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { AuthDialog } from '@/components/AuthDialog';
import { useLanguage } from '@/contexts/LanguageContext';

interface FormData {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  website: string;
  description: string;
  selectedPlan: string;
  adImage: File | null;
  adImageUrl: string;
  adTitle: string;
  adClickUrl: string;
  adLocation: string;
}

type MediaType = 'image' | 'video' | 'gif' | 'animation';

const AdvertiseForm = () => {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const advertisingPlans = [
    {
      id: 'basic',
      name: t('advertise.plans.basic.name'),
      price: t('advertise.plans.basic.price'),
      priceValue: 30,
      duration: t('advertise.plans.basic.duration'),
      features: [
        t('advertise.plans.basic.feature1'),
        t('advertise.plans.basic.feature2'),
        t('advertise.plans.basic.feature3'),
        t('advertise.plans.basic.feature4')
      ],
      icon: Target
    },
    {
      id: 'professional',
      name: t('advertise.plans.professional.name'),
      price: t('advertise.plans.professional.price'),
      priceValue: 75,
      duration: t('advertise.plans.professional.duration'),
      features: [
        t('advertise.plans.professional.feature1'),
        t('advertise.plans.professional.feature2'),
        t('advertise.plans.professional.feature3'),
        t('advertise.plans.professional.feature4'),
        t('advertise.plans.professional.feature5'),
        t('advertise.plans.professional.feature6')
      ],
      icon: DollarSign
    },
    {
      id: 'enterprise',
      name: t('advertise.plans.enterprise.name'),
      price: t('advertise.plans.enterprise.price'),
      priceValue: 150,
      duration: t('advertise.plans.enterprise.duration'),
      features: [
        t('advertise.plans.enterprise.feature1'),
        t('advertise.plans.enterprise.feature2'),
        t('advertise.plans.enterprise.feature3'),
        t('advertise.plans.enterprise.feature4'),
        t('advertise.plans.enterprise.feature5'),
        t('advertise.plans.enterprise.feature6'),
        t('advertise.plans.enterprise.feature7')
      ],
      icon: Zap
    }
  ];
  const [isUploading, setIsUploading] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [rateLimitCheck, setRateLimitCheck] = useState<{ allowed: boolean; reason?: string } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<MediaType | null>(null);
  
  const [formData, setFormData] = useState<FormData>({
    companyName: '',
    contactName: '',
    email: user?.email || '',
    phone: '',
    website: '',
    description: '',
    selectedPlan: '',
    adImage: null,
    adImageUrl: '',
    adTitle: '',
    adClickUrl: '',
    adLocation: 'Global'
  });

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getMediaType = (file: File): MediaType | null => {
    const type = file.type.toLowerCase();
    if (type.startsWith('image/')) {
      // Check if it's a GIF (animated or static)
      if (type === 'image/gif') {
        return 'gif';
      }
      return 'image';
    }
    if (type.startsWith('video/')) {
      return 'video';
    }
    // Check for animation formats
    if (type === 'image/webp' || type === 'image/apng') {
      return 'animation';
    }
    return null;
  };

  const handleMediaUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    
    if (!file) return;
    
    // Validate file type
    const detectedType = getMediaType(file);
    if (!detectedType) {
      toast({
        title: t('advertise.errors.invalidFileTypeTitle'),
        description: t('advertise.errors.invalidFileTypeDesc'),
        variant: "destructive"
      });
      return;
    }
    
    // Validate file size based on type
    const maxSize = detectedType === 'video' ? 15 * 1024 * 1024 : 10 * 1024 * 1024; // 15MB for videos, 10MB for images/GIFs/animations
    const maxSizeMB = detectedType === 'video' ? 15 : 10;
    
    if (file.size > maxSize) {
      toast({
        title: t('advertise.errors.fileTooLargeTitle'),
        description: t('advertise.errors.fileTooLargeDesc', { maxSize: maxSizeMB }),
        variant: "destructive"
      });
      return;
    }
    
    // For videos, validate duration (optional - client-side check)
    if (detectedType === 'video') {
      const videoUrl = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        const duration = video.duration;
        window.URL.revokeObjectURL(videoUrl);
        if (duration > 60) { // 60 seconds max
          toast({
            title: t('advertise.errors.videoTooLongTitle'),
            description: t('advertise.errors.videoTooLongDesc'),
            variant: "destructive"
          });
          setFormData(prev => ({ ...prev, adImage: null }));
          setMediaType(null);
          return;
        }
      };
      video.onerror = () => {
        window.URL.revokeObjectURL(videoUrl);
      };
      video.src = videoUrl;
    }
    
    setMediaType(detectedType);
    setFormData(prev => ({ ...prev, adImage: file }));
  };

  const uploadAdMedia = async (file: File): Promise<string | null> => {
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `ad-${user?.id || 'anonymous'}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      // Choose bucket based on media type
      // Videos go to a separate bucket or advertising-documents (which allows larger files)
      // Images/GIFs go to sponsored-images (public bucket for faster loading)
      let bucket: string;
      if (mediaType === 'video') {
        // Try sponsored-videos bucket first (if it exists), then advertising-documents
        bucket = 'sponsored-videos';
      } else {
        // Images, GIFs, animations go to sponsored-images
        bucket = 'sponsored-images';
      }
      
      let filePath = fileName;
      let uploadError: any = null;

      // Try uploading to the primary bucket
      const { error: primaryError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: mediaType === 'video' ? '86400' : '3600', // Longer cache for videos
          upsert: false,
          contentType: file.type
        });

      uploadError = primaryError;

      // If primary bucket doesn't exist or fails, try fallback
      if (uploadError) {
        if (uploadError.message.includes('Bucket not found') || uploadError.message.includes('not found')) {
          // For videos, try advertising-documents as fallback (allows larger files)
          if (mediaType === 'video') {
            bucket = 'advertising-documents';
            const { error: fallbackError } = await supabase.storage
              .from(bucket)
              .upload(filePath, file, {
                cacheControl: '86400',
                upsert: false,
                contentType: file.type
              });

            if (fallbackError) {
              console.error('Video upload error (fallback):', fallbackError);
              uploadError = fallbackError;
            } else {
              uploadError = null; // Success with fallback
            }
          } else {
            // For images, try advertising-documents as fallback
            bucket = 'advertising-documents';
            const { error: fallbackError } = await supabase.storage
              .from(bucket)
              .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false,
                contentType: file.type
              });

            if (fallbackError) {
              console.error('Image upload error (fallback):', fallbackError);
              uploadError = fallbackError;
            } else {
              uploadError = null; // Success with fallback
            }
          }
        }
      }

      // Handle errors
      if (uploadError) {
        console.error('Media upload error:', uploadError);
        
        // Check for specific error types
        if (uploadError.message.includes('row-level security') || uploadError.message.includes('permission')) {
          toast({
            title: t('advertise.errors.uploadPermissionDeniedTitle'),
            description: t('advertise.errors.uploadPermissionDeniedDesc'),
            variant: "destructive"
          });
          return null;
        }
        
        if (uploadError.message.includes('File size') || uploadError.message.includes('too large')) {
          toast({
            title: t('advertise.errors.fileTooLargeTitle'),
            description: t('advertise.errors.fileTooLargeDesc', { maxSize: 10 }),
            variant: "destructive"
          });
          return null;
        }

        if (uploadError.message.includes('content type') || uploadError.message.includes('not allowed')) {
          toast({
            title: t('advertise.errors.invalidFileTypeTitle'),
            description: t('advertise.errors.invalidFileTypeDesc'),
            variant: "destructive"
          });
          return null;
        }

        // Generic error
        toast({
          title: t('advertise.errors.uploadFailedTitle'),
          description: t('advertise.errors.uploadFailedDesc', { error: uploadError.message }),
          variant: "destructive"
        });
        return null;
      }

      // Get the public URL
      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      const mediaUrl = publicUrlData.publicUrl;
      
      // Log upload success for debugging
      console.log('Media uploaded successfully:', {
        bucket,
        filePath,
        mediaType,
        fileSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
        url: mediaUrl
      });

      // If bucket is private (advertising-documents), warn user
      if (bucket === 'advertising-documents') {
        console.warn('Media uploaded to private bucket. Videos may not display properly. Consider creating sponsored-videos bucket.');
        toast({
          title: t('advertise.errors.uploadSuccessfulTitle'),
          description: t('advertise.errors.uploadSuccessfulDesc'),
          variant: "default"
        });
      }

      return mediaUrl;
    } catch (error: any) {
      console.error('Error uploading media:', error);
      toast({
        title: t('advertise.errors.uploadErrorTitle'),
        description: error.message || t('advertise.errors.uploadErrorDesc'),
        variant: "destructive"
      });
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

  // Cleanup preview media URL when component unmounts or preview is closed
  useEffect(() => {
    return () => {
      if (previewImageUrl && previewImageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewImageUrl);
      }
    };
  }, [previewImageUrl]);

  // Reset media type when file is cleared
  useEffect(() => {
    if (!formData.adImage) {
      setMediaType(null);
    }
  }, [formData.adImage]);

  // Handle form validation and show preview
  const handleReviewSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    // Require authentication
    if (!user) {
      setAuthDialogOpen(true);
      toast({
        title: t('advertise.errors.loginRequiredTitle'),
        description: t('advertise.errors.loginRequiredDesc'),
        variant: "destructive"
      });
      return;
    }

    // Check rate limits
    if (rateLimitCheck && !rateLimitCheck.allowed) {
      toast({
        title: t('advertise.errors.limitReachedTitle'),
        description: rateLimitCheck.reason || t('advertise.errors.limitReachedDescFallback'),
        variant: "destructive"
      });
      return;
    }
    
    if (!formData.companyName || !formData.contactName || !formData.email || !formData.selectedPlan) {
      toast({
        title: t('advertise.errors.missingInfoTitle'),
        description: t('advertise.errors.missingInfoDesc'),
        variant: "destructive"
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: t('advertise.errors.invalidEmailTitle'),
        description: t('advertise.errors.invalidEmailDesc'),
        variant: "destructive"
      });
      return;
    }

    // Generate preview media URL if media file is selected
    if (formData.adImage) {
      setPreviewImageUrl(URL.createObjectURL(formData.adImage));
      const detectedType = getMediaType(formData.adImage);
      setMediaType(detectedType);
    } else if (formData.adImageUrl) {
      setPreviewImageUrl(formData.adImageUrl);
      // Try to detect type from URL extension
      const urlLower = formData.adImageUrl.toLowerCase();
      if (urlLower.includes('.mp4') || urlLower.includes('.webm') || urlLower.includes('.mov')) {
        setMediaType('video');
      } else if (urlLower.includes('.gif')) {
        setMediaType('gif');
      } else if (urlLower.includes('.webp') || urlLower.includes('.apng')) {
        setMediaType('animation');
      } else {
        setMediaType('image');
      }
    } else {
      setPreviewImageUrl(null);
      setMediaType(null);
    }

    // Show preview
    setShowPreview(true);
    // Scroll to preview section
    setTimeout(() => {
      const previewElement = document.getElementById('ad-preview-section');
      if (previewElement) {
        previewElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  // Final submission after preview confirmation
  const handleFinalSubmit = async () => {
    if (!user) return;

    setIsSubmitting(true);

    try {
      // Upload ad media if provided
      let imageUrl = formData.adImageUrl; // Use URL if provided directly
      if (formData.adImage) {
        const uploadedMediaUrl = await uploadAdMedia(formData.adImage);
        if (uploadedMediaUrl) {
          imageUrl = uploadedMediaUrl;
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
          document_url: null,
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
        title: t('advertise.success.title'),
        description: t('advertise.success.desc'),
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
        adImage: null,
        adImageUrl: '',
        adTitle: '',
        adClickUrl: '',
        adLocation: 'Global'
      });

    } catch (error: any) {
      console.error('Submission error:', error);
      toast({
        title: t('advertise.errors.submitFailedTitle'),
        description: error.message || t('advertise.errors.submitFailedDesc'),
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
      if (previewImageUrl && previewImageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewImageUrl);
      }
      setShowPreview(false);
      setPreviewImageUrl(null);
    }
  };

  // Get plan badge info for preview
  const getPlanBadgeInfo = (planType: string) => {
    const plan = advertisingPlans.find(p => p.id === planType);
    if (plan) {
      const colorMap: Record<string, string> = {
        'enterprise': 'bg-amber-500',
        'professional': 'bg-blue-500',
        'basic': 'bg-gray-500'
      };
      return { label: plan.name, color: colorMap[planType] || 'bg-gray-500' };
    }
    return { label: t('advertise.plans.basic.name'), color: 'bg-gray-500' };
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
                <h2 className="text-2xl font-bold mb-4 text-gray-900">{t('advertise.success.titleShort')}</h2>
                <p className="text-gray-700 mb-6">
                  {t('advertise.success.longDesc')}
                </p>
                
                <div className="bg-white rounded-lg p-4 mb-6 text-left">
                  <h3 className="font-semibold mb-4 text-gray-900">{t('advertise.success.nextStepsTitle')}</h3>
                  <ol className="space-y-3 text-sm">
                    <li className="flex items-start gap-3">
                      <span className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5">1</span>
                      <span className="text-gray-800"><strong className="font-semibold text-gray-900">{t('advertise.success.step1Title')}</strong>{t('advertise.success.step1Body')}</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5">2</span>
                      <span className="text-gray-800"><strong className="font-semibold text-gray-900">{t('advertise.success.step2Title')}</strong>{t('advertise.success.step2Body')}</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5">3</span>
                      <span className="text-gray-800"><strong className="font-semibold text-gray-900">{t('advertise.success.step3Title')}</strong>{t('advertise.success.step3Body')}</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5">4</span>
                      <span className="text-gray-800"><strong className="font-semibold text-gray-900">{t('advertise.success.step4Title')}</strong>{t('advertise.success.step4Body')}</span>
                    </li>
                  </ol>
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-900">
                      {t('advertise.success.importantNote')}
                    </p>
                  </div>
                </div>

                {submissionId && (
                  <p className="text-xs text-gray-600 mb-4">
                    {t('advertise.success.referenceId', { id: submissionId })}
                  </p>
                )}
                
                <Button 
                  onClick={() => {
                    setSubmissionSuccess(false);
                    setSubmissionId(null);
                  }}
                  variant="outline"
                >
                  {t('advertise.success.submitAnother')}
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
              {t('advertise.hero.title')}
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8">
              {t('advertise.hero.body')}
            </p>
          </div>
        </div>
      </section>

      {/* Why Advertise */}
      <section className="section">
        <div className="container-prose">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-8 text-center">
              {t('advertise.why.title')}
            </h2>

            <div className="grid md:grid-cols-2 gap-6 mb-10">
              <div className="rounded-xl border bg-card p-6 shadow-elegant hover-scale">
                <Users className="w-10 h-10 mb-4 text-primary" />
                <h3 className="text-xl font-semibold mb-2">{t('advertise.why.targetedTitle')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('advertise.why.targetedBody')}
                </p>
              </div>

              <div className="rounded-xl border bg-card p-6 shadow-elegant hover-scale">
                <Globe2 className="w-10 h-10 mb-4 text-primary" />
                <h3 className="text-xl font-semibold mb-2">{t('advertise.why.globalTitle')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('advertise.why.globalBody')}
                </p>
              </div>

              <div className="rounded-xl border bg-card p-6 shadow-elegant hover-scale">
                <TrendingUp className="w-10 h-10 mb-4 text-primary" />
                <h3 className="text-xl font-semibold mb-2">{t('advertise.why.engagementTitle')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('advertise.why.engagementBody')}
                </p>
              </div>

              <div className="rounded-xl border bg-card p-6 shadow-elegant hover-scale">
                <Award className="w-10 h-10 mb-4 text-primary" />
                <h3 className="text-xl font-semibold mb-2">{t('advertise.why.trustedTitle')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('advertise.why.trustedBody')}
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
              {t('advertise.audience.title')}
            </h2>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center p-6 rounded-xl border bg-card shadow-elegant hover-scale">
                <div className="text-3xl font-bold text-primary mb-2">40%</div>
                <div className="text-sm text-muted-foreground">{t('advertise.audience.segmentPublicHealth')}</div>
              </div>

              <div className="text-center p-6 rounded-xl border bg-card shadow-elegant hover-scale">
                <div className="text-3xl font-bold text-primary mb-2">30%</div>
                <div className="text-sm text-muted-foreground">{t('advertise.audience.segmentProviders')}</div>
              </div>

              <div className="text-center p-6 rounded-xl border bg-card shadow-elegant hover-scale">
                <div className="text-3xl font-bold text-primary mb-2">20%</div>
                <div className="text-sm text-muted-foreground">{t('advertise.audience.segmentResearchers')}</div>
              </div>

              <div className="text-center p-6 rounded-xl border bg-card shadow-elegant hover-scale">
                <div className="text-3xl font-bold text-primary mb-2">10%</div>
                <div className="text-sm text-muted-foreground">{t('advertise.audience.segmentPolicy')}</div>
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
              {t('advertise.opportunities.title')}
            </h2>

            <div className="space-y-6">
              <div className="rounded-xl border bg-card p-6 shadow-elegant">
                <div className="flex items-start gap-4">
                  <Eye className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold mb-2">{t('advertise.opportunities.mapTitle')}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t('advertise.opportunities.mapBody')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border bg-card p-6 shadow-elegant">
                <div className="flex items-start gap-4">
                  <MousePointerClick className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold mb-2">{t('advertise.opportunities.homepageTitle')}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t('advertise.opportunities.homepageBody')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border bg-card p-6 shadow-elegant">
                <div className="flex items-start gap-4">
                  <BarChart3 className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold mb-2">{t('advertise.opportunities.newsletterTitle')}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t('advertise.opportunities.newsletterBody')}
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
              {t('advertise.plans.title')}
            </h2>

            <div className="grid gap-6 lg:grid-cols-3 mb-12">
              {advertisingPlans.map((plan) => {
                const IconComponent = plan.icon;
                const isSelected = formData.selectedPlan === plan.id;
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
                        <div className="text-xs font-semibold text-primary mb-2">{t('advertise.plans.mostPopularBadge')}</div>
                      )}
                      <div className="flex items-center gap-3 mb-2">
                        <IconComponent className="h-8 w-8 text-primary" />
                        <CardTitle>{plan.name}</CardTitle>
                      </div>
                      <CardDescription className="text-2xl font-bold text-primary">{plan.price}</CardDescription>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <Clock className="w-4 h-4" />
                        <span>{plan.duration}</span>
                      </div>
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
                      {isSelected && (
                        <div className="mt-4 p-2 bg-primary/10 rounded-lg text-center text-sm font-medium text-primary">
                          {t('advertise.form.selectedIndicator')}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="text-center mb-8">
              <p className="text-sm text-muted-foreground mb-6">
                {t('advertise.plans.notice')}
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
                {t('advertise.form.title')}
              </h2>
              <p className="text-muted-foreground">
                {t('advertise.form.subtitle')}
              </p>
            </div>

            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle>{t('advertise.form.cardTitle')}</CardTitle>
                <CardDescription>{t('advertise.form.cardDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Authentication Check */}
                {!user && !authLoading && (
                  <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <LogIn className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-yellow-900 mb-1">{t('advertise.form.loginRequiredTitle')}</h4>
                        <p className="text-sm text-yellow-800 mb-3">
                          {t('advertise.form.loginRequiredBody')}
                        </p>
                        <Button
                          onClick={() => setAuthDialogOpen(true)}
                          className="bg-yellow-600 hover:bg-yellow-700 text-white"
                        >
                          {t('advertise.form.loginButton')}
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
                        <h4 className="font-semibold text-red-900 mb-1">{t('advertise.errors.limitReachedTitle')}</h4>
                        <p className="text-sm text-red-800">
                          {rateLimitCheck.reason}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <form onSubmit={handleReviewSubmit} className="space-y-5">
                  {/* Company Info */}
                  <div className="space-y-2">
                    <Label htmlFor="companyName">{t('advertise.form.companyNameLabel')}</Label>
                    <Input
                      id="companyName"
                      placeholder={t('advertise.form.companyNamePlaceholder')}
                      value={formData.companyName}
                      onChange={(e) => handleInputChange('companyName', e.target.value)}
                      required
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactName">{t('advertise.form.contactNameLabel')}</Label>
                    <Input
                      id="contactName"
                      placeholder={t('advertise.form.contactNamePlaceholder')}
                      value={formData.contactName}
                      onChange={(e) => handleInputChange('contactName', e.target.value)}
                      required
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="email">{t('advertise.form.emailLabel')}</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder={t('advertise.form.emailPlaceholder')}
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        required
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">{t('advertise.form.phoneLabel')}</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder={t('advertise.form.phonePlaceholder')}
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website">{t('advertise.form.websiteLabel')}</Label>
                    <Input
                      id="website"
                      type="url"
                      placeholder={t('advertise.form.websitePlaceholder')}
                      value={formData.website}
                      onChange={(e) => handleInputChange('website', e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">{t('advertise.form.descriptionLabel')}</Label>
                    <Textarea
                      id="description"
                      placeholder={t('advertise.form.descriptionPlaceholder')}
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
                      {t('advertise.form.adContentTitle')}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {t('advertise.form.adContentBody')}
                    </p>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="adTitle">{t('advertise.form.adTitleLabel')}</Label>
                        <Input
                          id="adTitle"
                          placeholder={t('advertise.form.adTitlePlaceholder')}
                          value={formData.adTitle}
                          onChange={(e) => handleInputChange('adTitle', e.target.value)}
                          disabled={isSubmitting}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="adImage">{t('advertise.form.adImageLabel')}</Label>
                        <div className="flex items-center gap-3">
                          <Input
                            id="adImage"
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/apng,video/mp4,video/webm,video/quicktime,video/x-msvideo"
                            onChange={handleMediaUpload}
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
                          {t('advertise.form.adImageHelp')}
                        </p>
                        {formData.adImage && (
                          <div className="mt-2">
                            <p className="text-sm text-primary mb-2">
                              {t('advertise.form.selectedFile', { name: formData.adImage.name })} 
                              {mediaType && (
                                <span className="ml-2 text-xs text-muted-foreground">
                                  ({mediaType === 'video' ? t('advertise.form.mediaTypeVideo') : mediaType === 'gif' ? t('advertise.form.mediaTypeGif') : mediaType === 'animation' ? t('advertise.form.mediaTypeAnimation') : t('advertise.form.mediaTypeImage')})
                                </span>
                              )}
                            </p>
                            <div className="relative w-full h-32 border rounded-lg overflow-hidden bg-muted">
                              {mediaType === 'video' ? (
                                <video
                                  src={URL.createObjectURL(formData.adImage)}
                                  controls
                                  className="w-full h-full object-cover"
                                  muted
                                />
                              ) : (
                                <img
                                  src={URL.createObjectURL(formData.adImage)}
                                  alt="Preview"
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                          </div>
                        )}
                        {formData.adImageUrl && !formData.adImage && (
                          <div className="mt-2">
                            <p className="text-xs text-muted-foreground mb-2">{t('advertise.form.imageUrlLabel')}</p>
                            <Input
                              placeholder="https://example.com/media.jpg or .mp4"
                              value={formData.adImageUrl}
                              onChange={(e) => handleInputChange('adImageUrl', e.target.value)}
                              disabled={isSubmitting}
                            />
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="adClickUrl">{t('advertise.form.clickUrlLabel')}</Label>
                        <Input
                          id="adClickUrl"
                          type="url"
                          placeholder={t('advertise.form.clickUrlPlaceholder')}
                          value={formData.adClickUrl}
                          onChange={(e) => handleInputChange('adClickUrl', e.target.value)}
                          disabled={isSubmitting}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="adLocation" className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          {t('advertise.form.locationLabel')}
                        </Label>
                        <Input
                          id="adLocation"
                          placeholder={t('advertise.form.locationPlaceholder')}
                          value={formData.adLocation}
                          onChange={(e) => handleInputChange('adLocation', e.target.value)}
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Plan Selection */}
                  <div className="space-y-3 border-t pt-5">
                    <Label>{t('advertise.form.planLabel')}</Label>
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
                        <p className="text-sm font-medium mb-2">{t('advertise.form.selectedPlanPrefix')} {selectedPlanDetails.name}</p>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {selectedPlanDetails.features.slice(0, 3).map((f, i) => (
                            <li key={i}>• {f}</li>
                          ))}
                        </ul>
                      </div>
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
                        {t('advertise.form.submitLogin')}
                      </>
                    ) : isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('advertise.form.submitting')}
                      </>
                    ) : (
                      <>
                        <Eye className="mr-2 h-4 w-4" />
                        {t('advertise.form.reviewTitle')}
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    {t('advertise.form.submitDisclaimer')}
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Ad Preview Section */}
      {showPreview && (
        <section id="ad-preview-section" className="section bg-muted/30">
          <div className="container-prose">
            <div className="mx-auto max-w-4xl">
              <Card className="shadow-elegant border-primary/20">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Eye className="w-5 h-5 text-primary" />
                        {t('advertise.form.previewTitle')}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        {t('advertise.form.previewDescription')}
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (previewImageUrl && previewImageUrl.startsWith('blob:')) {
                          URL.revokeObjectURL(previewImageUrl);
                        }
                        setShowPreview(false);
                        setPreviewImageUrl(null);
                      }}
                      className="flex items-center gap-2"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      {t('advertise.form.backToEdit')}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Preview Display */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Star className="w-4 h-4 text-amber-400" />
                      <h3 className="font-semibold text-lg">{t('advertise.form.howAdWillLook')}</h3>
                    </div>

                    {/* Premium Ad Preview (for Enterprise plan) */}
                    {formData.selectedPlan === 'enterprise' && (
                      <div className="bg-[#2a4149] rounded-lg p-4">
                        <div className="relative w-full h-[120px] rounded-lg overflow-hidden cursor-pointer group transition-all duration-300 shadow-lg bg-gradient-to-br from-primary/20 to-primary/40">
                          {/* Background Media */}
                          {previewImageUrl && (
                            <>
                              {mediaType === 'video' ? (
                                <video
                                  className="absolute inset-0 w-full h-full object-cover"
                                  src={previewImageUrl}
                                  autoPlay
                                  loop
                                  muted
                                  playsInline
                                  onError={(e) => {
                                    (e.target as HTMLVideoElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <img
                                  className="absolute inset-0 w-full h-full object-cover"
                                  alt={formData.adTitle || formData.companyName}
                                  src={previewImageUrl}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              )}
                              <div className="absolute inset-0 bg-[linear-gradient(181deg,rgba(42,65,73,0)_0%,rgba(42,65,73,0.85)_100%)]" />
                            </>
                          )}

                          {/* Content Overlay */}
                          <div className="absolute inset-0 flex flex-col justify-between p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <h4 className="text-white font-semibold text-sm leading-tight mb-1 line-clamp-2">
                                  {formData.adTitle || formData.companyName}
                                </h4>
                                {formData.description && (
                                  <p className="text-white/80 text-xs leading-tight line-clamp-2">
                                    {formData.description}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                                {formData.adLocation && (
                                  <div className="flex items-center gap-1 bg-black/30 px-2 py-1 rounded text-[10px] text-white">
                                    <MapPin className="w-3 h-3" />
                                    <span>{formData.adLocation}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center gap-2">
                                <span className="bg-amber-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded">
                                  Enterprise
                                </span>
                                {formData.adClickUrl && (
                                  <ExternalLink className="w-3 h-3 text-white/60" />
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Sponsored Ad Preview (for Basic and Professional plans) */}
                    {(formData.selectedPlan === 'basic' || formData.selectedPlan === 'professional') && (
                      <div className="bg-[#2a4149] rounded-lg p-4">
                        <div className="relative w-full h-20 rounded-md overflow-hidden cursor-pointer group transition-all duration-200 shadow-sm bg-gradient-to-br from-primary/20 to-primary/40">
                          {/* Background Media */}
                          {previewImageUrl && (
                            <>
                              {mediaType === 'video' ? (
                                <video
                                  className="absolute inset-0 w-full h-full object-cover"
                                  src={previewImageUrl}
                                  autoPlay
                                  loop
                                  muted
                                  playsInline
                                  onError={(e) => {
                                    (e.target as HTMLVideoElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <img
                                  className="absolute inset-0 w-full h-full object-cover"
                                  alt={formData.adTitle || formData.companyName}
                                  src={previewImageUrl}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              )}
                              <div className="absolute inset-0 bg-[linear-gradient(181deg,rgba(42,65,73,0)_0%,rgba(42,65,73,1)_100%)]" />
                            </>
                          )}

                          {/* Text Content */}
                          {!previewImageUrl && (
                            <div className="absolute inset-0 flex flex-col justify-between p-2.5">
                              <div className="flex-1 flex flex-col justify-center">
                                <h4 className="text-white font-semibold text-xs leading-tight mb-1 line-clamp-2">
                                  {formData.adTitle || formData.companyName}
                                </h4>
                                {formData.description && (
                                  <p className="text-white/80 text-[10px] leading-tight line-clamp-2">
                                    {formData.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Content with Image */}
                          {previewImageUrl && (
                            <div className="absolute inset-0 flex flex-col justify-between p-2.5">
                              <div className="flex-1 flex flex-col justify-end">
                                <h4 className="text-white font-semibold text-xs leading-tight mb-1 line-clamp-2">
                                  {formData.adTitle || formData.companyName}
                                </h4>
                                {formData.description && (
                                  <p className="text-white/80 text-[10px] leading-tight line-clamp-1">
                                    {formData.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Plan Badge */}
                          <div className="absolute top-2 right-2">
                            <span className={`${getPlanBadgeInfo(formData.selectedPlan).color} text-white text-[10px] font-semibold px-2 py-0.5 rounded`}>
                              {getPlanBadgeInfo(formData.selectedPlan).label}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Ad Details Summary */}
                    <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                      <h4 className="font-semibold">{t('advertise.form.adDetails')}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">{t('advertise.form.adDetailsCompany')}</span>
                          <p className="font-medium">{formData.companyName}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{t('advertise.form.adDetailsPlan')}</span>
                          <p className="font-medium">{selectedPlanDetails?.name || t('advertise.form.notProvided')}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{t('advertise.form.adDetailsTitle')}</span>
                          <p className="font-medium">{formData.adTitle || formData.companyName || t('advertise.form.notProvided')}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{t('advertise.form.adDetailsLocation')}</span>
                          <p className="font-medium">{formData.adLocation || 'Global'}</p>
                        </div>
                        {formData.adClickUrl && (
                          <div className="md:col-span-2">
                            <span className="text-muted-foreground">{t('advertise.form.adDetailsClickUrl')}</span>
                            <p className="font-medium break-all">{formData.adClickUrl}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (previewImageUrl && previewImageUrl.startsWith('blob:')) {
                          URL.revokeObjectURL(previewImageUrl);
                        }
                        setShowPreview(false);
                        setPreviewImageUrl(null);
                      }}
                      className="flex-1"
                      disabled={isSubmitting}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      {t('advertise.form.editAd')}
                    </Button>
                    <Button
                      onClick={handleFinalSubmit}
                      size="lg"
                      className="flex-1"
                      disabled={isSubmitting || isUploading}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t('advertise.form.submitting')}
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          {t('advertise.form.confirmSubmit')}
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      )}

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
