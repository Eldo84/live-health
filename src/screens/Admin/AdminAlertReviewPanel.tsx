import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import {
  Loader2, Eye, CheckCircle, XCircle, AlertCircle, ArrowLeft,
  Search, MapPin, Calendar, Link as LinkIcon, User, Trash2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface AlertSubmission {
  id: string;
  user_id: string | null;
  user_email: string;
  url: string;
  headline: string;
  location: string;
  date: string;
  disease_id: string | null;
  disease_name: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  country_name: string | null;
  country_id: string | null;
  outbreak_signal_id?: string | null;
  status: 'pending_review' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  admin_notes: string | null;
  rejection_reason: string | null;
  created_at: string;
}

const statusConfig: Record<string, { label: string; chip: string }> = {
  pending_review: { label: 'Pending Review', chip: 'ln-chip is-warn' },
  approved: { label: 'Approved', chip: 'ln-chip is-ok' },
  rejected: { label: 'Rejected', chip: 'ln-chip is-crit' },
};

export const AdminAlertReviewPanel: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [submissions, setSubmissions] = useState<AlertSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Review dialog state
  const [reviewingSubmission, setReviewingSubmission] = useState<AlertSubmission | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [deletingSubmission, setDeletingSubmission] = useState<AlertSubmission | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewingSubmission, setViewingSubmission] = useState<AlertSubmission | null>(null);

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
        navigate('/map');
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
      const { data, error } = await supabase
        .from('user_alert_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);

    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load alert submissions. The table may not exist yet.",
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
      if (reviewAction === 'approve') {
        // Create outbreak signal and related data when approving
        await approveAndCreateAlert(reviewingSubmission);
      } else {
        // Just update status for rejection
        const { error } = await supabase
          .from('user_alert_submissions')
          .update({
            status: 'rejected',
            rejection_reason: rejectionReason || null,
            admin_notes: adminNotes || null,
            reviewed_by: user?.id,
            reviewed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', reviewingSubmission.id);

        if (error) throw error;

        // Create notification for user
        await createNotification(reviewingSubmission.user_id, 'alert_rejected', reviewingSubmission.id);
      }

      toast({
        title: "Success",
        description: `Alert ${reviewAction === 'approve' ? 'approved and added to map' : 'rejected'}`,
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

  const approveAndCreateAlert = async (submission: AlertSubmission) => {
    if (!submission.latitude || !submission.longitude) {
      throw new Error("Missing location coordinates");
    }

    // Get or create news source
    let sourceId: string;
    const { data: existingSource } = await supabase
      .from("news_sources")
      .select("id")
      .eq("name", "User Submitted")
      .maybeSingle();

    if (existingSource) {
      sourceId = existingSource.id;
    } else {
      const { data: newSource, error: sourceError } = await supabase
        .from("news_sources")
        .insert({
          name: "User Submitted",
          url: null,
          type: "user_submission",
          reliability_score: 0.7,
          is_active: true,
        })
        .select("id")
        .single();

      if (sourceError || !newSource) {
        throw new Error("Failed to create news source");
      }
      sourceId = newSource.id;
    }

    // Get or create news article
    const publishedDate = new Date(submission.date);
    const { data: existingArticle } = await supabase
      .from("news_articles")
      .select("id")
      .eq("url", submission.url)
      .maybeSingle();

    let articleId: string;
    if (existingArticle) {
      articleId = existingArticle.id;
    } else {
      const locationData = {
        country: submission.country_name || submission.location,
        lat: submission.latitude,
        lng: submission.longitude,
      };

      const { data: newArticle, error: articleError } = await supabase
        .from("news_articles")
        .insert({
          source_id: sourceId,
          title: submission.headline,
          content: submission.description,
          url: submission.url,
          published_at: publishedDate.toISOString(),
          location_extracted: locationData,
          diseases_mentioned: [submission.disease_name.toLowerCase()],
          sentiment_score: -0.5,
          is_verified: true, // Admin approved, so verified
        })
        .select("id")
        .single();

      if (articleError || !newArticle) {
        throw new Error("Failed to create news article: " + (articleError?.message || "Unknown error"));
      }
      articleId = newArticle.id;
    }

    // Get or create disease
    let diseaseId: string;
    if (submission.disease_id) {
      diseaseId = submission.disease_id;
    } else {
      // Check if disease exists
      const { data: existingDisease } = await supabase
        .from("diseases")
        .select("id")
        .eq("name", submission.disease_name)
        .maybeSingle();

      if (existingDisease) {
        diseaseId = existingDisease.id;
      } else {
        const { data: newDisease, error: diseaseError } = await supabase
          .from("diseases")
          .insert({
            name: submission.disease_name,
            severity_level: "medium",
            color_code: "#66dbe1",
            description: submission.description,
          })
          .select("id")
          .single();

        if (diseaseError || !newDisease) {
          throw new Error("Failed to create disease: " + (diseaseError?.message || "Unknown error"));
        }
        diseaseId = newDisease.id;
      }
    }

    // Get or create country
    let countryId: string | null = submission.country_id;
    if (!countryId && submission.country_name) {
      const { data: existingCountry } = await supabase
        .from("countries")
        .select("id")
        .ilike("name", submission.country_name)
        .maybeSingle();

      if (existingCountry) {
        countryId = existingCountry.id;
      } else {
        const { data: newCountry, error: countryError } = await supabase
          .from("countries")
          .insert({
            name: submission.country_name,
            code: submission.country_name.substring(0, 2).toUpperCase(),
            continent: "Unknown",
            population: 0,
          })
          .select("id")
          .single();

        if (!countryError && newCountry) {
          countryId = newCountry.id;
        }
      }
    }

    // Create outbreak signal
    const { data: signalData, error: signalError } = await supabase
      .from("outbreak_signals")
      .insert({
        article_id: articleId,
        disease_id: diseaseId,
        country_id: countryId,
        latitude: submission.latitude,
        longitude: submission.longitude,
        confidence_score: 0.8,
        case_count_mentioned: 0,
        severity_assessment: "medium",
        is_new_outbreak: true,
        detected_at: publishedDate.toISOString(),
      })
      .select("id")
      .single();

    if (signalError || !signalData) {
      throw new Error("Failed to create outbreak signal: " + (signalError?.message || "Unknown error"));
    }

    // Update submission with approval status and related IDs
    const { error: updateError } = await supabase
      .from('user_alert_submissions')
      .update({
        status: 'approved',
        admin_notes: adminNotes || null,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        article_id: articleId,
        source_id: sourceId,
        outbreak_signal_id: signalData.id,
      })
      .eq('id', submission.id);

    if (updateError) {
      throw new Error("Failed to update submission: " + updateError.message);
    }

    // Create notification for user
    await createNotification(submission.user_id, 'alert_approved', submission.id);
  };

  const createNotification = async (userId: string | null, type: string, submissionId: string) => {
    if (!userId) return;

    try {
      const notificationData: any = {
        user_id: userId,
        type: type,
        title: type === 'alert_approved' ? 'Alert Approved' : 'Alert Rejected',
        message: type === 'alert_approved' 
          ? 'Your alert has been approved and is now visible on the map.'
          : 'Your alert has been rejected. Please check the reason provided by the admin.',
        read: false,
        priority: 'normal',
      };

      // Try to add submission_id if notifications table has it
      const { error } = await supabase
        .from('notifications')
        .insert(notificationData);

      // Don't throw if notifications table doesn't exist
      if (error && !error.message.includes('does not exist')) {
        console.error('Error creating notification:', error);
      }
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  const closeReviewDialog = () => {
    setReviewingSubmission(null);
    setReviewAction(null);
    setAdminNotes('');
    setRejectionReason('');
  };

  const handleDeleteSubmission = async () => {
    if (!deletingSubmission) return;

    setIsDeleting(true);
    try {
      // Remove the map entry if it was already promoted to an outbreak signal
      const signalId = deletingSubmission.outbreak_signal_id;
      if (signalId) {
        const { error: signalError } = await supabase
          .from('outbreak_signals')
          .delete()
          .eq('id', signalId);

        if (signalError) throw signalError;
      }

      const { error } = await supabase
        .from('user_alert_submissions')
        .delete()
        .eq('id', deletingSubmission.id);

      if (error) throw error;

      toast({
        title: "Alert deleted",
        description: "The alert submission and its map entry have been removed.",
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
      s.headline.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.disease_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.user_email.toLowerCase().includes(searchTerm.toLowerCase());

    if (activeTab === 'pending') return s.status === 'pending_review' && matchesSearch;
    if (activeTab === 'approved') return s.status === 'approved' && matchesSearch;
    if (activeTab === 'rejected') return s.status === 'rejected' && matchesSearch;
    return matchesSearch;
  });

  // Stats
  const pendingCount = submissions.filter(s => s.status === 'pending_review').length;
  const approvedCount = submissions.filter(s => s.status === 'approved').length;
  const rejectedCount = submissions.filter(s => s.status === 'rejected').length;

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

  const reviewTabs: { id: string; label: string; count: number }[] = [
    { id: 'pending', label: 'Pending', count: pendingCount },
    { id: 'approved', label: 'Approved', count: approvedCount },
    { id: 'rejected', label: 'Rejected', count: rejectedCount },
  ];

  const reviewStats: { label: string; value: number; color: string }[] = [
    { label: 'Pending Review', value: pendingCount, color: 'var(--ln-warn)' },
    { label: 'Approved', value: approvedCount, color: 'var(--ln-brand)' },
    { label: 'Rejected', value: rejectedCount, color: 'var(--ln-crit)' },
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
            <span className="ln-eyebrow">Moderation</span>
            <h1 className="ln-display" style={{ fontSize: 26, margin: '4px 0 0', letterSpacing: '-0.02em' }}>
              Alert review panel
            </h1>
            <p style={{ fontSize: 12.5, color: 'var(--ln-ink-3)', margin: '4px 0 0' }}>
              Review and approve user-submitted alerts
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
            <span className="ln-display" style={{ fontSize: 18, letterSpacing: '-0.01em' }}>Alert submissions</span>
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
                placeholder="Search alerts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Tab nav */}
          <div style={{ display: 'flex', gap: 4, padding: '10px 18px 0', borderBottom: '1px solid var(--ln-line)' }}>
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
                    color: active ? 'var(--ln-ink)' : 'var(--ln-ink-3)',
                    borderBottom: active ? '1.5px solid var(--ln-brand)' : '1.5px solid transparent',
                  }}
                >
                  {t.label}{' '}
                  <span className="ln-num" style={{ color: 'var(--ln-ink-4)' }}>({t.count})</span>
                </button>
              );
            })}
          </div>

          <div style={{ padding: 18 }}>
            {filteredSubmissions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--ln-ink-3)', fontSize: 13 }}>
                No alerts found
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {filteredSubmissions.map((submission) => (
                  <div
                    key={submission.id}
                    style={{ border: '1px solid var(--ln-line)', background: 'var(--ln-surface-2)', padding: 16 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: 'var(--ln-ink)' }}>
                            {submission.headline}
                          </h3>
                          <span className={statusConfig[submission.status].chip}>
                            {statusConfig[submission.status].label}
                          </span>
                        </div>

                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: 8,
                            fontSize: 12.5,
                            color: 'var(--ln-ink-3)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <User className="w-4 h-4" />
                            <span>{submission.user_email}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <MapPin className="w-4 h-4" />
                            <span>{submission.location}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(submission.date).toLocaleDateString()}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <AlertCircle className="w-4 h-4" />
                            <span>{submission.disease_name}</span>
                          </div>
                        </div>

                        <p
                          style={{
                            fontSize: 12.5,
                            color: 'var(--ln-ink-3)',
                            margin: 0,
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                          }}
                        >
                          {submission.description}
                        </p>

                        {submission.url && (
                          <a
                            href={submission.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 8,
                              fontSize: 12.5,
                              color: 'var(--ln-brand)',
                              textDecoration: 'none',
                            }}
                          >
                            <LinkIcon className="w-4 h-4" />
                            View Source
                          </a>
                        )}

                        {submission.admin_notes && (
                          <div
                            style={{
                              padding: 10,
                              background: 'var(--ln-surface-3)',
                              border: '1px solid var(--ln-line-2)',
                              fontSize: 12.5,
                              color: 'var(--ln-ink-2)',
                            }}
                          >
                            <strong>Admin Notes:</strong> {submission.admin_notes}
                          </div>
                        )}

                        {submission.rejection_reason && (
                          <div
                            style={{
                              padding: 10,
                              background: 'color-mix(in oklab, var(--ln-crit) 10%, transparent)',
                              border: '1px solid color-mix(in oklab, var(--ln-crit) 35%, transparent)',
                              fontSize: 12.5,
                              color: 'var(--ln-crit)',
                            }}
                          >
                            <strong>Rejection Reason:</strong> {submission.rejection_reason}
                          </div>
                        )}

                        <div style={{ fontSize: 11, color: 'var(--ln-ink-4)', fontFamily: 'var(--ln-font-mono)' }}>
                          Submitted: {new Date(submission.created_at).toLocaleString()}
                          {submission.reviewed_at && (
                            <> • Reviewed: {new Date(submission.reviewed_at).toLocaleString()}</>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flex: '0 0 auto' }}>
                        <button className="ln-btn" onClick={() => setViewingSubmission(submission)}>
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                        {submission.status === 'pending_review' && (
                          <div style={{ display: 'flex', gap: 8 }}>
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
                              style={{ color: 'var(--ln-crit)', borderColor: 'color-mix(in oklab, var(--ln-crit) 35%, transparent)' }}
                              onClick={() => {
                                setReviewingSubmission(submission);
                                setReviewAction('reject');
                              }}
                            >
                              <XCircle className="w-4 h-4" />
                              Reject
                            </button>
                          </div>
                        )}
                        <button
                          className="ln-btn"
                          style={{ color: 'var(--ln-crit)' }}
                          onClick={() => setDeletingSubmission(submission)}
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* View Details Dialog */}
      <Dialog open={!!viewingSubmission} onOpenChange={(open) => !open && setViewingSubmission(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto px-6">
          <DialogHeader>
            <DialogTitle>Alert Details</DialogTitle>
            <DialogDescription>Full submission information</DialogDescription>
          </DialogHeader>

          {viewingSubmission && (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Headline</p>
                  <p className="text-lg font-semibold">{viewingSubmission.headline}</p>
                </div>
                <span className={statusConfig[viewingSubmission.status].chip}>
                  {statusConfig[viewingSubmission.status].label}
                </span>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Submitter</p>
                  <p className="font-medium">{viewingSubmission.user_email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Disease</p>
                  <p className="font-medium">{viewingSubmission.disease_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Location</p>
                  <p className="font-medium">{viewingSubmission.location}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p className="font-medium">{new Date(viewingSubmission.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Submitted</p>
                  <p className="font-medium">{new Date(viewingSubmission.created_at).toLocaleString()}</p>
                </div>
              </div>

              {viewingSubmission.url && (
                <div className="text-sm">
                  <p className="text-muted-foreground">Source</p>
                  <a
                    href={viewingSubmission.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline break-all font-medium"
                  >
                    {viewingSubmission.url}
                  </a>
                </div>
              )}

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
      <Dialog open={!!reviewingSubmission} onOpenChange={(open) => !open && closeReviewDialog()}>
        <DialogContent className="sm:max-w-lg px-6">
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'approve' ? 'Approve Alert' : 'Reject Alert'}
            </DialogTitle>
            <DialogDescription>
              {reviewAction === 'approve' 
                ? 'This alert will be added to the map after approval.'
                : 'Please provide a reason for rejection.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {reviewingSubmission && (
              <div className="space-y-2 text-sm">
                <div><strong>Headline:</strong> {reviewingSubmission.headline}</div>
                <div><strong>Location:</strong> {reviewingSubmission.location}</div>
                <div><strong>Disease:</strong> {reviewingSubmission.disease_name}</div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">Admin Notes (optional)</label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add any notes about this alert..."
                className="mt-1"
              />
            </div>

            {reviewAction === 'reject' && (
              <div>
                <label className="text-sm font-medium">Rejection Reason *</label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please provide a reason for rejection..."
                  className="mt-1"
                  required
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <button className="ln-btn" onClick={closeReviewDialog} disabled={isProcessing}>
              Cancel
            </button>
            <button
              className={reviewAction === 'approve' ? 'ln-btn is-primary' : 'ln-btn'}
              style={reviewAction === 'reject' ? { color: 'var(--ln-crit)', borderColor: 'color-mix(in oklab, var(--ln-crit) 35%, transparent)' } : undefined}
              onClick={handleReview}
              disabled={isProcessing || (reviewAction === 'reject' && !rejectionReason.trim())}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {reviewAction === 'approve' ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4" />
                      Reject
                    </>
                  )}
                </>
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingSubmission} onOpenChange={(open) => !open && setDeletingSubmission(null)}>
        <DialogContent className="px-6">
          <DialogHeader>
            <DialogTitle>Delete Alert Submission</DialogTitle>
            <DialogDescription>
              Deleting will remove this alert submission. Approved alerts will no longer be linked to the submitter.
            </DialogDescription>
          </DialogHeader>
          {deletingSubmission && (
            <div className="py-4 space-y-2 text-sm text-muted-foreground">
              <div><strong>Headline:</strong> {deletingSubmission.headline}</div>
              <div><strong>User:</strong> {deletingSubmission.user_email}</div>
              <div><strong>Status:</strong> {statusConfig[deletingSubmission.status].label}</div>
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

