import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TopBar } from '../../../livehealth/screens/SurveillanceMap';
import {
  Loader2, Plus, Eye, MousePointerClick, Clock, CreditCard,
  FileText, CheckCircle, XCircle, AlertCircle,
  ArrowLeft, Bell, Edit, Trash2, Upload, MapPin, X
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications, Notification } from '@/lib/useNotifications';

interface Submission {
  id: string;
  user_id: string | null;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  website: string | null;
  description: string | null;
  selected_plan: string;
  status: string;
  payment_status: string;
  created_at: string;
  ad_title: string | null;
  ad_image_url: string | null;
  ad_click_url: string | null;
  ad_location: string | null;
}

interface SponsoredContent {
  id: string;
  title: string;
  plan_type: string;
  is_active: boolean;
  view_count: number;
  click_count: number;
  start_date: string;
  end_date: string;
  image_url: string;
}

interface AdAnalytics {
  ad_id: string;
  views: number;
  clicks: number;
}

interface Payment {
  id: string;
  amount: number;
  plan_type: string;
  status: string;
  paid_at: string | null;
  created_at: string;
}

const statusConfig: Record<string, { label: string; chip: string; icon: React.ReactNode }> = {
  pending_review: { label: 'Pending Review', chip: 'ln-chip is-warn', icon: <Clock className="w-3 h-3" /> },
  approved_pending_payment: { label: 'Awaiting Payment', chip: 'ln-chip is-warn', icon: <CreditCard className="w-3 h-3" /> },
  changes_requested: { label: 'Changes Requested', chip: 'ln-chip is-warn', icon: <AlertCircle className="w-3 h-3" /> },
  rejected: { label: 'Rejected', chip: 'ln-chip is-crit', icon: <XCircle className="w-3 h-3" /> },
  active: { label: 'Active', chip: 'ln-chip is-ok', icon: <CheckCircle className="w-3 h-3" /> },
  expired: { label: 'Expired', chip: 'ln-chip', icon: <Clock className="w-3 h-3" /> },
  cancelled: { label: 'Cancelled', chip: 'ln-chip is-crit', icon: <XCircle className="w-3 h-3" /> },
};

export const UserAdvertisingDashboard: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { notifications, unreadCount, markAsRead, markAllAsRead, handleNotificationClick } = useNotifications();

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [activeAds, setActiveAds] = useState<SponsoredContent[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [adAnalytics, setAdAnalytics] = useState<Record<string, AdAnalytics>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Edit dialog state
  const [editingSubmission, setEditingSubmission] = useState<Submission | null>(null);
  const [editFormData, setEditFormData] = useState({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    website: '',
    description: '',
    ad_title: '',
    ad_click_url: '',
    ad_location: 'Global',
    ad_image_url: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editMediaFile, setEditMediaFile] = useState<File | null>(null);
  const [editMediaType, setEditMediaType] = useState<'image' | 'video' | 'gif' | 'animation' | null>(null);
  const [editPreviewUrl, setEditPreviewUrl] = useState<string | null>(null);

  // Delete dialog state
  const [deletingSubmission, setDeletingSubmission] = useState<Submission | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewingSubmission, setViewingSubmission] = useState<Submission | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate('/');
      return;
    }

    fetchData();
  }, [user, authLoading]);

  const fetchData = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Fetch submissions - ONLY for the current user
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('advertising_submissions')
        .select('*')
        .eq('user_id', user.id) // Only fetch user's own submissions
        .order('created_at', { ascending: false });

      if (submissionsError) throw submissionsError;
      setSubmissions(submissionsData || []);

      // Fetch active ads - ONLY for the current user
      const { data: adsData, error: adsError } = await supabase
        .from('sponsored_content')
        .select('*')
        .eq('user_id', user.id) // Only fetch user's own ads
        .order('created_at', { ascending: false });

      if (adsError) throw adsError;
      setActiveAds(adsData || []);

      // Fetch analytics for each ad individually from advertising_analytics table
      if (adsData && adsData.length > 0) {
        const analyticsMap: Record<string, AdAnalytics> = {};
        const adIds = adsData.map(ad => ad.id);

        try {
          // Fetch all analytics for user's ads in one query
          const { data: allAnalytics, error: analyticsError } = await supabase
            .from('advertising_analytics')
            .select('sponsored_content_id, event_type')
            .in('sponsored_content_id', adIds)
            .in('event_type', ['view', 'click']);

          if (!analyticsError && allAnalytics) {
            // Initialize all ads with 0 analytics
            adIds.forEach(adId => {
              analyticsMap[adId] = {
                ad_id: adId,
                views: 0,
                clicks: 0,
              };
            });

            // Count views and clicks per ad
            allAnalytics.forEach(analytics => {
              const adId = analytics.sponsored_content_id;
              if (analyticsMap[adId]) {
                if (analytics.event_type === 'view') {
                  analyticsMap[adId].views += 1;
                } else if (analytics.event_type === 'click') {
                  analyticsMap[adId].clicks += 1;
                }
              }
            });
          } else {
            // If error, initialize all with 0
            adIds.forEach(adId => {
              analyticsMap[adId] = {
                ad_id: adId,
                views: 0,
                clicks: 0,
              };
            });
          }
        } catch (error) {
          console.error('Error fetching analytics:', error);
          // Initialize all with 0 on error
          adIds.forEach(adId => {
            analyticsMap[adId] = {
              ad_id: adId,
              views: 0,
              clicks: 0,
            };
          });
        }

        setAdAnalytics(analyticsMap);
      }

      // Fetch payments - ONLY for the current user
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user.id) // Only fetch user's own payments
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;
      setPayments(paymentsData || []);

    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Check if submission can be edited/deleted
  const canEditOrDelete = (submission: Submission) => {
    return ['pending_review', 'changes_requested', 'cancelled', 'rejected'].includes(submission.status);
  };

  // Get media type from file
  const getMediaType = (file: File): 'image' | 'video' | 'gif' | 'animation' | null => {
    const type = file.type.toLowerCase();
    if (type.startsWith('image/')) {
      if (type === 'image/gif') return 'gif';
      if (type === 'image/webp' || type === 'image/apng') return 'animation';
      return 'image';
    }
    if (type.startsWith('video/')) return 'video';
    return null;
  };

  // Handle media upload in edit form
  const handleEditMediaUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;

    if (!file) return;

    const detectedType = getMediaType(file);
    if (!detectedType) {
      toast({
        title: "Invalid file type",
        description: "Please select an image (JPG, PNG, WebP), GIF, or short video (MP4, WebM, MOV).",
        variant: "destructive"
      });
      return;
    }

    const maxSize = detectedType === 'video' ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    const maxSizeMB = detectedType === 'video' ? 50 : 10;

    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: `Please select a file smaller than ${maxSizeMB}MB.`,
        variant: "destructive"
      });
      return;
    }

    setEditMediaType(detectedType);
    setEditMediaFile(file);
    setEditPreviewUrl(URL.createObjectURL(file));
  };

  // Upload media for edit
  const uploadEditMedia = async (file: File): Promise<string | null> => {
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `ad-${user?.id || 'anonymous'}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      let bucket: string;
      if (editMediaType === 'video') {
        bucket = 'sponsored-videos';
      } else {
        bucket = 'sponsored-images';
      }

      let filePath = fileName;
      let uploadError: any = null;

      const { error: primaryError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: editMediaType === 'video' ? '86400' : '3600',
          upsert: false,
          contentType: file.type
        });

      uploadError = primaryError;

      if (uploadError) {
        if (uploadError.message.includes('Bucket not found') || uploadError.message.includes('not found')) {
          if (editMediaType === 'video') {
            bucket = 'advertising-documents';
            const { error: fallbackError } = await supabase.storage
              .from(bucket)
              .upload(filePath, file, {
                cacheControl: '86400',
                upsert: false,
                contentType: file.type
              });
            if (fallbackError) uploadError = fallbackError;
            else uploadError = null;
          } else {
            bucket = 'advertising-documents';
            const { error: fallbackError } = await supabase.storage
              .from(bucket)
              .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false,
                contentType: file.type
              });
            if (fallbackError) uploadError = fallbackError;
            else uploadError = null;
          }
        }
      }

      if (uploadError) {
        console.error('Media upload error:', uploadError);
        toast({
          title: "Upload Failed",
          description: "Media upload failed. Your other changes will still be saved.",
          variant: "destructive"
        });
        return null;
      }

      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      return publicUrlData.publicUrl;
    } catch (error: any) {
      console.error('Error uploading media:', error);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  // Handle edit
  const handleEdit = (submission: Submission) => {
    if (!canEditOrDelete(submission)) {
      toast({
        title: "Cannot Edit",
        description: "You can only edit submissions that are pending review, have changes requested, or are cancelled/rejected.",
        variant: "destructive",
      });
      return;
    }
    setEditingSubmission(submission);
    setEditFormData({
      company_name: submission.company_name,
      contact_name: submission.contact_name,
      email: submission.email,
      phone: submission.phone || '',
      website: submission.website || '',
      description: submission.description || '',
      ad_title: submission.ad_title || '',
      ad_click_url: submission.ad_click_url || '',
      ad_location: submission.ad_location || 'Global',
      ad_image_url: submission.ad_image_url || '',
    });
    // Reset media upload state
    setEditMediaFile(null);
    setEditMediaType(null);
    setEditPreviewUrl(null);
  };

  // Handle save edit
  const handleSaveEdit = async () => {
    if (!editingSubmission) return;

    setIsSaving(true);
    try {
      // Upload new media if a file was selected
      let imageUrl = editFormData.ad_image_url; // Keep existing URL by default
      if (editMediaFile) {
        const uploadedUrl = await uploadEditMedia(editMediaFile);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        }
        // Clean up preview URL
        if (editPreviewUrl && editPreviewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(editPreviewUrl);
        }
      }

      const { error } = await supabase
        .from('advertising_submissions')
        .update({
          company_name: editFormData.company_name,
          contact_name: editFormData.contact_name,
          email: editFormData.email,
          phone: editFormData.phone || null,
          website: editFormData.website || null,
          description: editFormData.description || null,
          ad_title: editFormData.ad_title || null,
          ad_click_url: editFormData.ad_click_url || null,
          ad_location: editFormData.ad_location || 'Global',
          ad_image_url: imageUrl || null,
          updated_at: new Date().toISOString(),
          // Reset status to pending_review if it was changes_requested
          ...(editingSubmission.status === 'changes_requested' ? { status: 'pending_review' } : {}),
        })
        .eq('id', editingSubmission.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Submission updated successfully",
      });

      fetchData();
      setEditingSubmission(null);
      // Reset media state
      setEditMediaFile(null);
      setEditMediaType(null);
      setEditPreviewUrl(null);
    } catch (error: any) {
      console.error('Error updating submission:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update submission",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deletingSubmission) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('advertising_submissions')
        .delete()
        .eq('id', deletingSubmission.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Submission deleted successfully",
      });

      fetchData();
      setDeletingSubmission(null);
    } catch (error: any) {
      console.error('Error deleting submission:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete submission. You may only delete submissions that are pending, cancelled, or rejected.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Calculate stats
  const totalViews = activeAds.reduce((sum, ad) => sum + ad.view_count, 0);
  const totalClicks = activeAds.reduce((sum, ad) => sum + ad.click_count, 0);
  const activeCount = activeAds.filter(ad => ad.is_active).length;
  const pendingCount = submissions.filter(s => s.status === 'pending_review').length;

  if (authLoading || isLoading) {
    return (
      <div
        className="ln-app"
        style={{
          width: '100%',
          height: '100vh',
          background: 'var(--ln-bg)',
          color: 'var(--ln-ink)',
          display: 'grid',
          gridTemplateRows: '52px 1fr',
          overflow: 'hidden',
        }}
      >
        <TopBar active="none" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--ln-brand)' }} />
        </div>
      </div>
    );
  }

  const dashboardTabs: { id: string; label: string; count?: number; badge?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'notifications', label: 'Notifications', badge: unreadCount },
    { id: 'submissions', label: 'Submissions', count: submissions.length },
    { id: 'active-ads', label: 'Active Ads', count: activeCount },
    { id: 'payments', label: 'Payments' },
  ];

  const overviewStats: { label: string; value: string; sub: string; color: string }[] = [
    { label: 'Total Views', value: totalViews.toLocaleString(), sub: 'across all ads', color: 'var(--ln-brand)' },
    { label: 'Total Clicks', value: totalClicks.toLocaleString(), sub: 'engagements logged', color: '#4ee0c4' },
    { label: 'Active Ads', value: String(activeCount), sub: 'currently running', color: 'var(--ln-info, #6ab7ff)' },
    { label: 'Pending Review', value: String(pendingCount), sub: 'submissions awaiting review', color: 'var(--ln-warn)' },
  ];

  return (
    <div
      className="ln-app"
      style={{
        width: '100%',
        height: '100vh',
        background: 'var(--ln-bg)',
        color: 'var(--ln-ink)',
        display: 'grid',
        gridTemplateRows: '52px 1fr',
        overflow: 'hidden',
      }}
    >
      <TopBar active="none" />
      <div className="ln-pane" style={{ overflowY: 'auto', paddingBottom: 80 }}>
      {/* Header */}
      <div
        style={{
          padding: '22px 28px',
          borderBottom: '1px solid var(--ln-line)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link to="/map" className="ln-btn">
            <ArrowLeft className="w-4 h-4" />
            Back to Map
          </Link>
          <div>
            <span className="ln-eyebrow">Advertiser console</span>
            <h1 className="ln-display" style={{ fontSize: 26, margin: '4px 0 0', letterSpacing: '-0.02em' }}>
              My ads
            </h1>
            <p style={{ fontSize: 12.5, color: 'var(--ln-ink-3)', margin: '4px 0 0' }}>
              Manage your ads and view analytics
            </p>
          </div>
        </div>
        <Link to="/advertise" className="ln-btn is-primary">
          <Plus className="w-4 h-4" />
          New Ad
        </Link>
      </div>

      <div style={{ padding: '22px 28px 40px' }}>
        {/* Tab nav */}
        <div
          style={{
            display: 'flex',
            gap: 4,
            marginBottom: 24,
            borderBottom: '1px solid var(--ln-line)',
            flexWrap: 'wrap',
          }}
        >
          {dashboardTabs.map((t) => {
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{
                  padding: '8px 12px',
                  fontSize: 12.5,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: active ? 'var(--ln-ink)' : 'var(--ln-ink-3)',
                  borderBottom: active ? '1.5px solid var(--ln-brand)' : '1.5px solid transparent',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {t.label}
                {typeof t.count === 'number' && (
                  <span className="ln-num" style={{ color: 'var(--ln-ink-4)' }}>({t.count})</span>
                )}
                {typeof t.badge === 'number' && t.badge > 0 && (
                  <span className="ln-chip is-crit" style={{ marginLeft: 2 }}>{t.badge}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div>
            {/* Stats Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 14,
                marginBottom: 28,
              }}
            >
              {overviewStats.map((s) => (
                <div
                  key={s.label}
                  style={{
                    border: '1px solid var(--ln-line)',
                    background: 'var(--ln-surface)',
                    padding: '16px 18px',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: s.color }} />
                  <div className="ln-eyebrow">{s.label}</div>
                  <div className="ln-num" style={{ fontSize: 32, color: s.color, margin: '8px 0 4px', fontWeight: 500 }}>
                    {s.value}
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--ln-ink-3)', margin: 0 }}>{s.sub}</p>
                </div>
              ))}
            </div>

            {/* Quick Actions - Only show if user has their own submissions waiting for payment */}
            {user && submissions.some(s => s.status === 'approved_pending_payment' && s.user_id === user.id) && (
              <div
                style={{
                  marginBottom: 28,
                  border: '1px solid color-mix(in oklab, var(--ln-warn) 35%, transparent)',
                  background: 'color-mix(in oklab, var(--ln-warn) 10%, transparent)',
                  padding: 18,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <CreditCard className="w-7 h-7" style={{ color: 'var(--ln-warn)' }} />
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: 'var(--ln-ink)' }}>Payment Required</p>
                    <p style={{ fontSize: 12.5, color: 'var(--ln-ink-3)', margin: '4px 0 0' }}>
                      You have approved submissions waiting for payment
                    </p>
                  </div>
                </div>
                <Link
                  to={`/advertising/payment/${submissions.find(s => s.status === 'approved_pending_payment' && s.user_id === user.id)?.id}`}
                  className="ln-btn is-primary"
                >
                  Complete Payment
                </Link>
              </div>
            )}

            {/* Recent Activity */}
            <div style={{ border: '1px solid var(--ln-line)', background: 'var(--ln-surface)' }}>
              <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--ln-line)' }}>
                <span className="ln-display" style={{ fontSize: 18, letterSpacing: '-0.01em' }}>Recent submissions</span>
              </div>
              <div style={{ padding: 18 }}>
                {submissions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 0' }}>
                    <FileText className="w-12 h-12" style={{ color: 'var(--ln-ink-4)', margin: '0 auto 16px' }} />
                    <p style={{ color: 'var(--ln-ink-3)', fontSize: 13, marginBottom: 16 }}>No submissions yet</p>
                    <Link to="/advertise" className="ln-btn is-primary" style={{ display: 'inline-flex' }}>
                      Create Your First Ad
                    </Link>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {submissions.slice(0, 5).map((submission) => {
                      const status = statusConfig[submission.status] || statusConfig.pending_review;
                      return (
                        <div
                          key={submission.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 12,
                            padding: 16,
                            border: '1px solid var(--ln-line)',
                            background: 'var(--ln-surface-2)',
                            flexWrap: 'wrap',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <span className={status.chip}>
                              {status.icon}
                              <span style={{ marginLeft: 4 }}>{status.label}</span>
                            </span>
                            <div>
                              <p style={{ fontSize: 14, fontWeight: 500, margin: 0, color: 'var(--ln-ink)' }}>{submission.company_name}</p>
                              <p style={{ fontSize: 12.5, color: 'var(--ln-ink-3)', margin: '2px 0 0', textTransform: 'capitalize' }}>
                                {submission.selected_plan} Plan
                              </p>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            {submission.status === 'approved_pending_payment' && user && submission.user_id === user.id && (
                              <Link to={`/advertising/payment/${submission.id}`} className="ln-btn is-primary">
                                Pay Now
                              </Link>
                            )}
                            <span className="ln-num" style={{ fontSize: 12, color: 'var(--ln-ink-4)' }}>
                              {new Date(submission.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div style={{ border: '1px solid var(--ln-line)', background: 'var(--ln-surface)' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '16px 18px',
                borderBottom: '1px solid var(--ln-line)',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <span className="ln-display" style={{ fontSize: 18, letterSpacing: '-0.01em' }}>Notifications</span>
                <p style={{ fontSize: 12.5, color: 'var(--ln-ink-3)', margin: '4px 0 0' }}>
                  Real-time updates about your advertising applications
                </p>
              </div>
              {unreadCount > 0 && (
                <button className="ln-btn" onClick={markAllAsRead}>
                  Mark all as read
                </button>
              )}
            </div>
            <div style={{ padding: 18 }}>
              {notifications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <Bell className="w-12 h-12" style={{ color: 'var(--ln-ink-4)', margin: '0 auto 16px' }} />
                  <p style={{ color: 'var(--ln-ink-3)', fontSize: 13 }}>No notifications yet</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {notifications.map((notification) => {
                    const isUnread = !notification.read;
                    return (
                      <div
                        key={notification.id}
                        style={{
                          padding: 16,
                          border: isUnread
                            ? '1px solid color-mix(in oklab, var(--ln-brand) 35%, transparent)'
                            : '1px solid var(--ln-line)',
                          background: isUnread
                            ? 'color-mix(in oklab, var(--ln-brand) 8%, transparent)'
                            : 'var(--ln-surface-2)',
                          cursor: 'pointer',
                        }}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                          <div style={{ marginTop: 6 }}>
                            <div
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                background: isUnread ? 'var(--ln-brand)' : 'transparent',
                              }}
                            />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                              <h4
                                style={{
                                  fontSize: 14,
                                  fontWeight: isUnread ? 600 : 500,
                                  margin: 0,
                                  color: 'var(--ln-ink)',
                                }}
                              >
                                {notification.title}
                              </h4>
                              <span className="ln-num" style={{ fontSize: 11, color: 'var(--ln-ink-4)', whiteSpace: 'nowrap' }}>
                                {new Date(notification.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <p style={{ fontSize: 12.5, color: 'var(--ln-ink-3)', margin: '4px 0 0' }}>
                              {notification.message}
                            </p>
                            {notification.action_label && (
                              <button
                                className="ln-btn"
                                style={{ marginTop: 10 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleNotificationClick(notification);
                                }}
                              >
                                {notification.action_label}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Submissions Tab */}
        {activeTab === 'submissions' && (
          <div style={{ border: '1px solid var(--ln-line)', background: 'var(--ln-surface)' }}>
            <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--ln-line)' }}>
              <span className="ln-display" style={{ fontSize: 18, letterSpacing: '-0.01em' }}>All submissions</span>
              <p style={{ fontSize: 12.5, color: 'var(--ln-ink-3)', margin: '4px 0 0' }}>
                Track the status of your advertising applications
              </p>
            </div>
            <div style={{ padding: 18 }}>
              {submissions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--ln-ink-3)', fontSize: 13 }}>
                  No submissions found
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {submissions.map((submission) => {
                    const status = statusConfig[submission.status] || statusConfig.pending_review;
                    return (
                      <div
                        key={submission.id}
                        style={{ border: '1px solid var(--ln-line)', background: 'var(--ln-surface-2)', padding: 16 }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                          <div>
                            <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: 'var(--ln-ink)' }}>{submission.company_name}</h3>
                            {submission.ad_title && (
                              <p style={{ fontSize: 12.5, color: 'var(--ln-ink-3)', margin: '4px 0 0' }}>{submission.ad_title}</p>
                            )}
                          </div>
                          <span className={status.chip}>
                            {status.icon}
                            <span style={{ marginLeft: 4 }}>{status.label}</span>
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, color: 'var(--ln-ink-3)' }}>
                          <span style={{ textTransform: 'capitalize' }}>{submission.selected_plan} Plan</span>
                          <span>•</span>
                          <span className="ln-num">{new Date(submission.created_at).toLocaleDateString()}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                          <button className="ln-btn" onClick={() => setViewingSubmission(submission)}>
                            <Eye className="w-4 h-4" />
                            View
                          </button>
                          {submission.status === 'approved_pending_payment' && user && submission.user_id === user.id && (
                            <Link to={`/advertising/payment/${submission.id}`} className="ln-btn is-primary">
                              <CreditCard className="w-4 h-4" />
                              Complete Payment
                            </Link>
                          )}
                          {canEditOrDelete(submission) && (
                            <>
                              <button className="ln-btn" onClick={() => handleEdit(submission)}>
                                <Edit className="w-4 h-4" />
                                Edit
                              </button>
                              <button
                                className="ln-btn"
                                style={{ color: 'var(--ln-crit)', borderColor: 'color-mix(in oklab, var(--ln-crit) 35%, transparent)' }}
                                onClick={() => setDeletingSubmission(submission)}
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Active Ads Tab */}
        {activeTab === 'active-ads' && (
          <div style={{ border: '1px solid var(--ln-line)', background: 'var(--ln-surface)' }}>
            <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--ln-line)' }}>
              <span className="ln-display" style={{ fontSize: 18, letterSpacing: '-0.01em' }}>Active advertisements</span>
              <p style={{ fontSize: 12.5, color: 'var(--ln-ink-3)', margin: '4px 0 0' }}>
                Your currently running ads and their performance
              </p>
            </div>
            <div style={{ padding: 18 }}>
              {activeAds.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--ln-ink-3)', fontSize: 13 }}>
                  No active ads
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {activeAds.map((ad) => (
                    <div
                      key={ad.id}
                      style={{ border: '1px solid var(--ln-line)', background: 'var(--ln-surface-2)', padding: 16 }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                        <img
                          src={ad.image_url || '/image.png'}
                          alt={ad.title}
                          style={{ width: 80, height: 56, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--ln-line)', flex: '0 0 auto' }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                            <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: 'var(--ln-ink)' }}>{ad.title}</h3>
                            <span className={ad.is_active ? 'ln-chip is-ok' : 'ln-chip'}>
                              {ad.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, color: 'var(--ln-ink-3)', marginBottom: 10, flexWrap: 'wrap' }}>
                            <span style={{ textTransform: 'capitalize' }}>{ad.plan_type} Plan</span>
                            <span>•</span>
                            <span>Ends: <span className="ln-num">{new Date(ad.end_date).toLocaleDateString()}</span></span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <Eye className="w-4 h-4" style={{ color: 'var(--ln-ink-4)' }} />
                              <span style={{ fontSize: 12.5, color: 'var(--ln-ink-2)' }}>
                                <span className="ln-num">{adAnalytics[ad.id]?.views ?? ad.view_count}</span> views
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <MousePointerClick className="w-4 h-4" style={{ color: 'var(--ln-ink-4)' }} />
                              <span style={{ fontSize: 12.5, color: 'var(--ln-ink-2)' }}>
                                <span className="ln-num">{adAnalytics[ad.id]?.clicks ?? ad.click_count}</span> clicks
                              </span>
                            </div>
                            {((adAnalytics[ad.id]?.views ?? ad.view_count) > 0) && (
                              <span style={{ fontSize: 12.5, color: 'var(--ln-ink-3)' }}>
                                CTR: <span className="ln-num">{(((adAnalytics[ad.id]?.clicks ?? ad.click_count) / (adAnalytics[ad.id]?.views ?? ad.view_count)) * 100).toFixed(2)}%</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <div style={{ border: '1px solid var(--ln-line)', background: 'var(--ln-surface)' }}>
            <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--ln-line)' }}>
              <span className="ln-display" style={{ fontSize: 18, letterSpacing: '-0.01em' }}>Payment history</span>
              <p style={{ fontSize: 12.5, color: 'var(--ln-ink-3)', margin: '4px 0 0' }}>
                Your payment transactions
              </p>
            </div>
            <div style={{ padding: 18 }}>
              {payments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--ln-ink-3)', fontSize: 13 }}>
                  No payments yet
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {payments.map((payment) => (
                    <div
                      key={payment.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        padding: '14px 4px',
                        borderBottom: '1px solid var(--ln-line)',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 500, margin: 0, color: 'var(--ln-ink)', textTransform: 'capitalize' }}>{payment.plan_type} Plan</p>
                        <p className="ln-num" style={{ fontSize: 12, color: 'var(--ln-ink-4)', margin: '4px 0 0' }}>
                          {payment.paid_at
                            ? new Date(payment.paid_at).toLocaleDateString()
                            : new Date(payment.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                        <p className="ln-num" style={{ fontSize: 16, fontWeight: 600, margin: 0, color: 'var(--ln-ink)' }}>${payment.amount.toFixed(2)}</p>
                        <span className={payment.status === 'succeeded' ? 'ln-chip is-ok' : 'ln-chip is-warn'}>
                          {payment.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* View Details Dialog */}
      <Dialog open={!!viewingSubmission} onOpenChange={() => setViewingSubmission(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto px-6">
          <DialogHeader>
            <DialogTitle>Submission Details</DialogTitle>
            <DialogDescription>Full information for your ad submission</DialogDescription>
          </DialogHeader>
          {viewingSubmission && (
            <div className="space-y-4">
              {viewingSubmission.ad_image_url && (
                <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--ln-line)', background: 'var(--ln-surface-2)' }}>
                  <img
                    src={viewingSubmission.ad_image_url}
                    alt={viewingSubmission.ad_title || 'Ad image'}
                    className="w-full h-52 object-cover"
                    loading="lazy"
                  />
                </div>
              )}

              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Company</p>
                  <p className="text-lg font-semibold">{viewingSubmission.company_name}</p>
                </div>
                <span className={(statusConfig[viewingSubmission.status] || statusConfig.pending_review).chip}>
                  {(statusConfig[viewingSubmission.status] || statusConfig.pending_review).label}
                </span>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Contact Name</p>
                  <p className="font-medium">{viewingSubmission.contact_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{viewingSubmission.email}</p>
                </div>
                {viewingSubmission.phone && (
                  <div>
                    <p className="text-muted-foreground">Phone</p>
                    <p className="font-medium">{viewingSubmission.phone}</p>
                  </div>
                )}
                {viewingSubmission.website && (
                  <div>
                    <p className="text-muted-foreground">Website</p>
                    <a
                      href={viewingSubmission.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-primary hover:underline"
                    >
                      {viewingSubmission.website}
                    </a>
                  </div>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Plan</p>
                  <p className="font-medium capitalize">{viewingSubmission.selected_plan}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Payment Status</p>
                  <p className="font-medium capitalize">{viewingSubmission.payment_status.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Submitted</p>
                  <p className="font-medium">{new Date(viewingSubmission.created_at).toLocaleString()}</p>
                </div>
              </div>

              {(viewingSubmission.ad_title || viewingSubmission.ad_click_url || viewingSubmission.ad_location) && (
                <div className="space-y-2 text-sm">
                  <p className="text-muted-foreground">Ad Details</p>
                  {viewingSubmission.ad_title && <p className="font-medium">Title: {viewingSubmission.ad_title}</p>}
                  {viewingSubmission.ad_location && <p className="font-medium">Location: {viewingSubmission.ad_location}</p>}
                  {viewingSubmission.ad_click_url && (
                    <p className="font-medium">
                      Click URL:{' '}
                      <a
                        href={viewingSubmission.ad_click_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline break-all"
                      >
                        {viewingSubmission.ad_click_url}
                      </a>
                    </p>
                  )}
                </div>
              )}

              {viewingSubmission.description && (
                <div className="text-sm space-y-1">
                  <p className="text-muted-foreground">Description</p>
                  <p>{viewingSubmission.description}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <button className="ln-btn" onClick={() => setViewingSubmission(null)}>
              Close
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingSubmission} onOpenChange={(open) => {
        if (!open) {
          // Cleanup preview URL when closing
          if (editPreviewUrl && editPreviewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(editPreviewUrl);
          }
          setEditingSubmission(null);
          setEditMediaFile(null);
          setEditMediaType(null);
          setEditPreviewUrl(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto px-6">
          <DialogHeader>
            <DialogTitle>Edit Submission</DialogTitle>
            <DialogDescription>
              Update your advertising submission details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company_name">Company Name *</Label>
                <Input
                  id="company_name"
                  value={editFormData.company_name}
                  onChange={(e) => setEditFormData({ ...editFormData, company_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_name">Contact Name *</Label>
                <Input
                  id="contact_name"
                  value={editFormData.contact_name}
                  onChange={(e) => setEditFormData({ ...editFormData, contact_name: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={editFormData.website}
                onChange={(e) => setEditFormData({ ...editFormData, website: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ad_title">Ad Title</Label>
              <Input
                id="ad_title"
                value={editFormData.ad_title}
                onChange={(e) => setEditFormData({ ...editFormData, ad_title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ad_click_url">Ad Click URL</Label>
              <Input
                id="ad_click_url"
                value={editFormData.ad_click_url}
                onChange={(e) => setEditFormData({ ...editFormData, ad_click_url: e.target.value })}
                placeholder="https://example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ad_location" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Ad Location
              </Label>
              <Input
                id="ad_location"
                value={editFormData.ad_location}
                onChange={(e) => setEditFormData({ ...editFormData, ad_location: e.target.value })}
                placeholder="Global"
              />
            </div>

            {/* Media Upload Section */}
            <div className="space-y-2 border-t pt-4">
              <Label htmlFor="edit_media" className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Ad Media (Optional)
              </Label>
              <p className="text-xs text-muted-foreground">
                Upload a new image, GIF, or video to replace the current media. Leave empty to keep existing media.
              </p>

              {/* Current Media Preview */}
              {editFormData.ad_image_url && !editPreviewUrl && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground mb-2">Current Media:</p>
                  <div className="relative w-full border rounded-lg overflow-hidden bg-muted" style={{ maxHeight: '200px' }}>
                    {editFormData.ad_image_url.toLowerCase().includes('.mp4') ||
                     editFormData.ad_image_url.toLowerCase().includes('.webm') ||
                     editFormData.ad_image_url.toLowerCase().includes('.mov') ? (
                      <video
                        src={editFormData.ad_image_url}
                        controls
                        className="w-full h-full object-contain"
                        style={{ maxHeight: '200px' }}
                      />
                    ) : (
                      <img
                        src={editFormData.ad_image_url}
                        alt="Current ad media"
                        className="w-full h-full object-contain"
                        style={{ maxHeight: '200px' }}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* New Media Upload */}
              <div className="flex items-center gap-3 mt-2">
                <Input
                  id="edit_media"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/apng,video/mp4,video/webm,video/quicktime,video/x-msvideo"
                  onChange={handleEditMediaUpload}
                  className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  disabled={isSaving || isUploading}
                />
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--ln-brand)' }} />
                ) : (
                  <Upload className="h-4 w-4" style={{ color: 'var(--ln-ink-4)' }} />
                )}
              </div>

              {/* New Media Preview */}
              {editPreviewUrl && editMediaFile && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm" style={{ color: 'var(--ln-brand)' }}>
                      New Media: {editMediaFile.name}
                      {editMediaType && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({(editMediaType === 'video' ? 'Video' : editMediaType === 'gif' ? 'GIF' : editMediaType === 'animation' ? 'Animation' : 'Image')})
                        </span>
                      )}
                    </p>
                    <button
                      type="button"
                      className="ln-btn"
                      style={{ height: 28, width: 28, padding: 0, justifyContent: 'center' }}
                      onClick={() => {
                        if (editPreviewUrl.startsWith('blob:')) {
                          URL.revokeObjectURL(editPreviewUrl);
                        }
                        setEditMediaFile(null);
                        setEditMediaType(null);
                        setEditPreviewUrl(null);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="relative w-full border rounded-lg overflow-hidden bg-muted" style={{ maxHeight: '200px' }}>
                    {editMediaType === 'video' ? (
                      <video
                        src={editPreviewUrl}
                        controls
                        className="w-full h-full object-contain"
                        style={{ maxHeight: '200px' }}
                      />
                    ) : (
                      <img
                        src={editPreviewUrl}
                        alt="Preview"
                        className="w-full h-full object-contain"
                        style={{ maxHeight: '200px' }}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Media URL Input (Alternative) */}
              <div className="mt-2">
                <p className="text-xs text-muted-foreground mb-2">Or enter media URL:</p>
                <Input
                  placeholder="https://example.com/media.jpg or .mp4"
                  value={editFormData.ad_image_url}
                  onChange={(e) => setEditFormData({ ...editFormData, ad_image_url: e.target.value })}
                  disabled={isSaving || !!editMediaFile}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <button className="ln-btn" onClick={() => setEditingSubmission(null)}>
              Cancel
            </button>
            <button className="ln-btn is-primary" onClick={handleSaveEdit} disabled={isSaving || isUploading}>
              {isSaving || isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isUploading ? 'Uploading...' : 'Saving...'}
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingSubmission} onOpenChange={() => setDeletingSubmission(null)}>
        <DialogContent className="px-6">
          <DialogHeader>
            <DialogTitle>Delete Submission</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this submission? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deletingSubmission && (
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                <strong>Company:</strong> {deletingSubmission.company_name}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                <strong>Plan:</strong> {deletingSubmission.selected_plan}
              </p>
            </div>
          )}
          <DialogFooter>
            <button className="ln-btn" onClick={() => setDeletingSubmission(null)}>
              Cancel
            </button>
            <button
              className="ln-btn"
              style={{ color: 'var(--ln-crit)', borderColor: 'color-mix(in oklab, var(--ln-crit) 35%, transparent)' }}
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Delete
                </>
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
};

export default UserAdvertisingDashboard;
