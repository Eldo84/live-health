import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import {
  Loader2, Eye, CheckCircle, XCircle, AlertCircle, ArrowLeft,
  Search, Trash2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

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
  admin_notes: string | null;
  rejection_reason: string | null;
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
}

const statusConfig: Record<string, { label: string; chip: string }> = {
  pending_review: { label: 'Pending Review', chip: 'ln-chip is-warn' },
  approved_pending_payment: { label: 'Awaiting Payment', chip: 'ln-chip is-warn' },
  changes_requested: { label: 'Changes Requested', chip: 'ln-chip is-warn' },
  rejected: { label: 'Rejected', chip: 'ln-chip is-crit' },
  active: { label: 'Active', chip: 'ln-chip is-ok' },
  expired: { label: 'Expired', chip: 'ln-chip is-crit' },
  cancelled: { label: 'Cancelled', chip: 'ln-chip is-crit' },
};

export const AdminAdvertisingPanel: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [ads, setAds] = useState<SponsoredContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Review dialog state
  const [reviewingSubmission, setReviewingSubmission] = useState<Submission | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | 'changes' | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
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

    checkAdminRole();
  }, [user, authLoading]);

  const checkAdminRole = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user?.id)
        .single();

      if (error || data?.role !== 'admin') {
        toast({
          title: "Access Denied",
          description: "You don't have admin privileges.",
          variant: "destructive",
        });
        navigate('/dashboard/advertising');
        return;
      }

      setIsAdmin(true);
      fetchData();
    } catch (error) {
      console.error('Error checking admin role:', error);
      // For demo purposes, allow access if table doesn't exist
      setIsAdmin(true);
      fetchData();
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch all submissions (admin can see all)
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('advertising_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (submissionsError) throw submissionsError;
      setSubmissions(submissionsData || []);

      // Fetch all ads
      const { data: adsData, error: adsError } = await supabase
        .from('sponsored_content')
        .select('*')
        .order('created_at', { ascending: false });

      if (adsError) throw adsError;
      setAds(adsData || []);

    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load data. Some tables may not exist yet.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReview = async () => {
    if (!reviewingSubmission || !reviewAction) return;

    setIsProcessing(true);

    try {
      let updateData: any = {
        admin_notes: adminNotes || null,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      switch (reviewAction) {
        case 'approve':
          updateData.status = 'approved_pending_payment';
          updateData.payment_status = 'pending';
          break;
        case 'reject':
          updateData.status = 'rejected';
          updateData.rejection_reason = rejectionReason;
          break;
        case 'changes':
          updateData.status = 'changes_requested';
          break;
      }

      const { error } = await supabase
        .from('advertising_submissions')
        .update(updateData)
        .eq('id', reviewingSubmission.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Submission ${reviewAction === 'approve' ? 'approved' : reviewAction === 'reject' ? 'rejected' : 'updated'}`,
      });

      // Refresh data
      fetchData();
      closeReviewDialog();

    } catch (error: any) {
      console.error('Error updating submission:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update submission",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const closeReviewDialog = () => {
    setReviewingSubmission(null);
    setReviewAction(null);
    setAdminNotes('');
    setRejectionReason('');
  };

  const toggleAdStatus = async (adId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('sponsored_content')
        .update({ is_active: !currentStatus })
        .eq('id', adId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Ad ${!currentStatus ? 'activated' : 'deactivated'}`,
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteSubmission = async () => {
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
        description: error.message || "Failed to delete submission",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter submissions based on tab and search
  const filteredSubmissions = submissions.filter(s => {
    const matchesSearch = searchTerm === '' || 
      s.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase());

    if (activeTab === 'pending') return s.status === 'pending_review' && matchesSearch;
    if (activeTab === 'approved') return s.status === 'approved_pending_payment' && matchesSearch;
    if (activeTab === 'active') return s.status === 'active' && matchesSearch;
    if (activeTab === 'rejected') return s.status === 'rejected' && matchesSearch;
    return matchesSearch;
  });

  // Stats
  const pendingCount = submissions.filter(s => s.status === 'pending_review').length;
  const activeCount = submissions.filter(s => s.status === 'active').length;
  const totalRevenue = submissions
    .filter(s => s.payment_status === 'paid')
    .reduce((sum, s) => {
      const prices = { basic: 30, professional: 75, enterprise: 150 };
      return sum + (prices[s.selected_plan as keyof typeof prices] || 0);
    }, 0);

  if (authLoading || isLoading) {
    return (
      <div
        style={{
          minHeight: 'calc(100vh - 140px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--ln-bg)',
        }}
      >
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--ln-brand)' }} />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const reviewTabs: { id: string; label: string; count: number | null }[] = [
    { id: 'pending', label: 'Pending', count: pendingCount },
    { id: 'approved', label: 'Awaiting Payment', count: null },
    { id: 'active', label: 'Active', count: null },
    { id: 'rejected', label: 'Rejected', count: null },
    { id: 'all', label: 'All', count: submissions.length },
  ];

  const reviewStats: { label: string; value: string | number; color: string }[] = [
    { label: 'Pending Review', value: pendingCount, color: 'var(--ln-warn)' },
    { label: 'Active Ads', value: activeCount, color: 'var(--ln-brand)' },
    { label: 'Total Submissions', value: submissions.length, color: 'var(--ln-info, #6ab7ff)' },
    { label: 'Total Revenue', value: `$${totalRevenue}`, color: 'var(--ln-brand)' },
  ];

  return (
    <div style={{ background: 'var(--ln-bg)', color: 'var(--ln-ink)', minHeight: 'calc(100vh - 140px)' }}>
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
          <button className="ln-btn" onClick={() => navigate('/admin')}>
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div>
            <span className="ln-eyebrow">Advertising</span>
            <h1 className="ln-display" style={{ fontSize: 26, margin: '4px 0 0', letterSpacing: '-0.02em' }}>
              Advertising panel
            </h1>
            <p style={{ fontSize: 12.5, color: 'var(--ln-ink-3)', margin: '4px 0 0' }}>
              Manage advertising submissions
            </p>
          </div>
        </div>
        <span className="ln-chip is-ok">Admin access</span>
      </div>

      <div style={{ padding: '22px 28px 40px' }}>
        {/* Stats Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 14,
            marginBottom: 22,
          }}
        >
          {reviewStats.map((s) => (
            <div
              key={s.label}
              style={{
                border: '1px solid var(--ln-line)',
                background: 'var(--ln-surface)',
                padding: '14px 16px',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: s.color }} />
              <div className="ln-eyebrow">{s.label}</div>
              <div className="ln-num" style={{ fontSize: 26, color: s.color, marginTop: 6, fontWeight: 500 }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* List */}
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
            <span className="ln-display" style={{ fontSize: 18, letterSpacing: '-0.01em' }}>Submissions</span>
            <div style={{ position: 'relative', width: 260, maxWidth: '100%' }}>
              <span
                style={{
                  position: 'absolute',
                  left: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--ln-ink-4)',
                  display: 'inline-flex',
                }}
              >
                <Search className="w-4 h-4" />
              </span>
              <input
                className="ln-input"
                style={{ paddingLeft: 32 }}
                placeholder="Search by company or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Tab nav */}
          <div
            style={{
              display: 'flex',
              gap: 4,
              padding: '10px 18px 0',
              borderBottom: '1px solid var(--ln-line)',
              overflowX: 'auto',
            }}
          >
            {reviewTabs.map((t) => {
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
                    whiteSpace: 'nowrap',
                    color: active ? 'var(--ln-ink)' : 'var(--ln-ink-3)',
                    borderBottom: active ? '1.5px solid var(--ln-brand)' : '1.5px solid transparent',
                  }}
                >
                  {t.label}
                  {t.count !== null && (
                    <>
                      {' '}
                      <span className="ln-num" style={{ color: 'var(--ln-ink-4)' }}>({t.count})</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>

          <div style={{ padding: 18 }}>
            {filteredSubmissions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--ln-ink-3)', fontSize: 13 }}>
                No submissions found
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {filteredSubmissions.map((submission) => {
                  const status = statusConfig[submission.status] || statusConfig.pending_review;
                  return (
                    <div
                      key={submission.id}
                      style={{ border: '1px solid var(--ln-line)', background: 'var(--ln-surface-2)', padding: 16 }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                        <div style={{ minWidth: 0 }}>
                          <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: 'var(--ln-ink)' }}>
                            {submission.company_name}
                          </h3>
                          <p style={{ fontSize: 12.5, color: 'var(--ln-ink-3)', margin: '4px 0 0' }}>{submission.email}</p>
                        </div>
                        <span className={status.chip}>{status.label}</span>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                          gap: 12,
                          fontSize: 12.5,
                          marginBottom: 12,
                        }}
                      >
                        <div>
                          <span style={{ color: 'var(--ln-ink-4)' }}>Contact</span>
                          <p style={{ margin: '2px 0 0', fontWeight: 500, color: 'var(--ln-ink)' }}>{submission.contact_name}</p>
                        </div>
                        <div>
                          <span style={{ color: 'var(--ln-ink-4)' }}>Plan</span>
                          <p style={{ margin: '2px 0 0', fontWeight: 500, color: 'var(--ln-ink)', textTransform: 'capitalize' }}>{submission.selected_plan}</p>
                        </div>
                        <div>
                          <span style={{ color: 'var(--ln-ink-4)' }}>Payment</span>
                          <p style={{ margin: '2px 0 0', fontWeight: 500, color: 'var(--ln-ink)', textTransform: 'capitalize' }}>{submission.payment_status.replace('_', ' ')}</p>
                        </div>
                        <div>
                          <span style={{ color: 'var(--ln-ink-4)' }}>Date</span>
                          <p
                            className="ln-num"
                            style={{ margin: '2px 0 0', fontWeight: 500, color: 'var(--ln-ink)' }}
                          >
                            {new Date(submission.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {submission.description && (
                        <div style={{ fontSize: 12.5, marginBottom: 12 }}>
                          <span style={{ color: 'var(--ln-ink-4)' }}>Description</span>
                          <p style={{ margin: '4px 0 0', color: 'var(--ln-ink-2)' }}>{submission.description}</p>
                        </div>
                      )}

                      {submission.admin_notes && (
                        <div
                          style={{
                            padding: 10,
                            background: 'var(--ln-surface-3)',
                            border: '1px solid var(--ln-line-2)',
                            fontSize: 12.5,
                            color: 'var(--ln-ink-2)',
                            marginBottom: 12,
                          }}
                        >
                          <strong>Admin Notes:</strong> {submission.admin_notes}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                        <button className="ln-btn" onClick={() => setViewingSubmission(submission)}>
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                        {submission.status === 'pending_review' && (
                          <>
                            <button
                              className="ln-btn is-primary"
                              onClick={() => {
                                setReviewingSubmission(submission);
                                setReviewAction('approve');
                              }}
                            >
                              <CheckCircle className="w-4 h-4" />
                              Approve
                            </button>
                            <button
                              className="ln-btn"
                              onClick={() => {
                                setReviewingSubmission(submission);
                                setReviewAction('changes');
                              }}
                            >
                              <AlertCircle className="w-4 h-4" />
                              Request Changes
                            </button>
                            <button
                              className="ln-btn"
                              style={{ color: 'var(--ln-crit)', borderColor: 'color-mix(in oklab, var(--ln-crit) 35%, transparent)' }}
                              onClick={() => {
                                setReviewingSubmission(submission);
                                setReviewAction('reject');
                              }}
                            >
                              <XCircle className="w-4 h-4" />
                              Reject
                            </button>
                          </>
                        )}
                        <button
                          className="ln-btn"
                          style={{ color: 'var(--ln-crit)', borderColor: 'color-mix(in oklab, var(--ln-crit) 35%, transparent)' }}
                          onClick={() => setDeletingSubmission(submission)}
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* View Details Dialog */}
      <Dialog open={!!viewingSubmission} onOpenChange={() => setViewingSubmission(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto px-6">
          <DialogHeader>
            <DialogTitle>Submission Details</DialogTitle>
            <DialogDescription>Full submission information for review</DialogDescription>
          </DialogHeader>
          {viewingSubmission && (
            <div className="space-y-4">
              {/* Ad Media Preview */}
              {viewingSubmission.ad_image_url ? (() => {
                const mediaUrl = viewingSubmission.ad_image_url;
                const urlLower = mediaUrl.toLowerCase();
                const isVideo = urlLower.includes('.mp4') || urlLower.includes('.webm') || urlLower.includes('.mov') || urlLower.includes('.avi') || urlLower.includes('video/');
                const isGif = urlLower.includes('.gif') || urlLower.includes('image/gif');
                
                return (
                  <div className="rounded-lg overflow-hidden border-2 border-primary/20 bg-muted">
                    <div className="p-2 bg-primary/10 border-b">
                      <p className="text-sm font-semibold text-primary">Ad Media Preview</p>
                    </div>
                    <div className="relative w-full bg-black/5" style={{ minHeight: '200px', maxHeight: '500px' }}>
                      {isVideo ? (
                        <video
                          src={mediaUrl}
                          controls
                          className="w-full h-full object-contain"
                          style={{ maxHeight: '500px', minHeight: '200px' }}
                          onError={(e) => {
                            console.error('Video failed to load:', mediaUrl);
                            const target = e.target as HTMLVideoElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent && !parent.querySelector('.error-message')) {
                              const errorDiv = document.createElement('div');
                              errorDiv.className = 'error-message p-4 text-center text-red-500 bg-red-50 rounded';
                              errorDiv.innerHTML = `<p class="font-semibold">Failed to load video</p><p class="text-xs mt-1 break-all">${mediaUrl}</p>`;
                              parent.appendChild(errorDiv);
                            }
                          }}
                        >
                          Your browser does not support the video tag.
                        </video>
                      ) : (
                        <img
                          src={mediaUrl}
                          alt={viewingSubmission.ad_title || 'Ad media'}
                          className="w-full h-full object-contain"
                          style={{ maxHeight: '500px', minHeight: '200px' }}
                          loading="lazy"
                          onError={(e) => {
                            console.error('Image failed to load:', mediaUrl);
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent && !parent.querySelector('.error-message')) {
                              const errorDiv = document.createElement('div');
                              errorDiv.className = 'error-message p-4 text-center text-red-500 bg-red-50 rounded';
                              errorDiv.innerHTML = `<p class="font-semibold">Failed to load image</p><p class="text-xs mt-1 break-all">${mediaUrl}</p><p class="text-xs mt-2">Please check if the URL is accessible.</p>`;
                              parent.appendChild(errorDiv);
                            }
                          }}
                        />
                      )}
                      {(isVideo || isGif) && (
                        <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                          {isVideo ? '▶ Video' : '🎬 GIF'}
                        </div>
                      )}
                    </div>
                    <div className="p-3 bg-muted/50 border-t">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Media URL:</p>
                      <p className="text-xs text-muted-foreground break-all font-mono bg-background p-2 rounded border">
                        {mediaUrl}
                      </p>
                      <a
                        href={mediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline mt-2 inline-block"
                      >
                        Open in new tab →
                      </a>
                    </div>
                  </div>
                );
              })() : (
                <div className="rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/30 p-8 text-center">
                  <Eye className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium text-muted-foreground">No Media Provided</p>
                  <p className="text-xs text-muted-foreground mt-1">The advertiser did not upload any image, video, or GIF for this ad.</p>
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
                  <p className="text-muted-foreground">Contact</p>
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

              {/* Ad Details Section */}
              <div className="space-y-2 text-sm border-t pt-4">
                <p className="text-muted-foreground font-semibold">Ad Details</p>
                {viewingSubmission.ad_title && (
                  <div>
                    <span className="text-muted-foreground">Title: </span>
                    <span className="font-medium">{viewingSubmission.ad_title}</span>
                  </div>
                )}
                {viewingSubmission.ad_click_url && (
                  <div>
                    <span className="text-muted-foreground">Click URL: </span>
                    <a 
                      href={viewingSubmission.ad_click_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline break-all font-medium"
                    >
                      {viewingSubmission.ad_click_url}
                    </a>
                  </div>
                )}
                {viewingSubmission.ad_location && (
                  <div>
                    <span className="text-muted-foreground">Location: </span>
                    <span className="font-medium">{viewingSubmission.ad_location}</span>
                  </div>
                )}
                {!viewingSubmission.ad_title && !viewingSubmission.ad_click_url && !viewingSubmission.ad_location && (
                  <p className="text-muted-foreground italic">No ad details provided</p>
                )}
              </div>

              {viewingSubmission.description && (
                <div className="text-sm space-y-1">
                  <p className="text-muted-foreground">Description</p>
                  <p>{viewingSubmission.description}</p>
                </div>
              )}

              {viewingSubmission.admin_notes && (
                <div className="text-sm space-y-1">
                  <p className="text-muted-foreground">Admin Notes</p>
                  <p>{viewingSubmission.admin_notes}</p>
                </div>
              )}

              {viewingSubmission.rejection_reason && (
                <div className="text-sm space-y-1">
                  <p className="text-muted-foreground">Rejection Reason</p>
                  <p>{viewingSubmission.rejection_reason}</p>
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

      {/* Review Dialog */}
      <Dialog open={!!reviewingSubmission} onOpenChange={() => closeReviewDialog()}>
        <DialogContent className="px-6">
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'approve' && 'Approve Submission'}
              {reviewAction === 'reject' && 'Reject Submission'}
              {reviewAction === 'changes' && 'Request Changes'}
            </DialogTitle>
            <DialogDescription>
              {reviewAction === 'approve' && 'The advertiser will receive a payment link after approval.'}
              {reviewAction === 'reject' && 'Please provide a reason for rejection.'}
              {reviewAction === 'changes' && 'Specify what changes are needed.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {reviewAction === 'reject' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Rejection Reason *</label>
                <Textarea
                  placeholder="Explain why this submission is being rejected..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Admin Notes {reviewAction !== 'reject' && '(optional)'}</label>
              <Textarea
                placeholder="Add any notes for this submission..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <button className="ln-btn" onClick={closeReviewDialog}>
              Cancel
            </button>
            <button
              className={reviewAction === 'reject' ? 'ln-btn' : 'ln-btn is-primary'}
              style={reviewAction === 'reject' ? { color: 'var(--ln-crit)', borderColor: 'color-mix(in oklab, var(--ln-crit) 35%, transparent)' } : undefined}
              onClick={handleReview}
              disabled={isProcessing || (reviewAction === 'reject' && !rejectionReason)}
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : null}
              {reviewAction === 'approve' && 'Approve & Send Payment Link'}
              {reviewAction === 'reject' && 'Reject Submission'}
              {reviewAction === 'changes' && 'Request Changes'}
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
              Are you sure you want to delete this submission? This action cannot be undone and will also delete any associated sponsored content.
            </DialogDescription>
          </DialogHeader>
          {deletingSubmission && (
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                <strong>Company:</strong> {deletingSubmission.company_name}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                <strong>Email:</strong> {deletingSubmission.email}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                <strong>Plan:</strong> {deletingSubmission.selected_plan}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                <strong>Status:</strong> {deletingSubmission.status}
              </p>
            </div>
          )}
          <DialogFooter>
            <button className="ln-btn" onClick={() => setDeletingSubmission(null)} disabled={isDeleting}>
              Cancel
            </button>
            <button
              className="ln-btn"
              style={{ color: 'var(--ln-crit)', borderColor: 'color-mix(in oklab, var(--ln-crit) 35%, transparent)' }}
              onClick={handleDeleteSubmission}
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
  );
};

export default AdminAdvertisingPanel;

