import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import {
  Loader2, MessageSquare, ArrowLeft,
  Search, User, Calendar, Edit, FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface FeedbackSubmission {
  id: string;
  user_id: string | null;
  user_email: string;
  feedback_type: 'bug' | 'feature' | 'suggestion' | 'general';
  message: string;
  status: 'new' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed';
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

const statusConfig: Record<string, { label: string; color: string; chip: string }> = {
  new: { label: 'New', color: 'var(--ln-info, #6ab7ff)', chip: 'ln-chip is-info' },
  acknowledged: { label: 'Acknowledged', color: '#c79cff', chip: 'ln-chip' },
  in_progress: { label: 'In Progress', color: 'var(--ln-warn)', chip: 'ln-chip is-warn' },
  resolved: { label: 'Resolved', color: 'var(--ln-brand)', chip: 'ln-chip is-ok' },
  closed: { label: 'Closed', color: 'var(--ln-ink-3)', chip: 'ln-chip' },
};

const feedbackTypeConfig: Record<string, { label: string; icon: string }> = {
  bug: { label: 'Bug Report', icon: '🐛' },
  feature: { label: 'Feature Request', icon: '✨' },
  suggestion: { label: 'Suggestion', icon: '💡' },
  general: { label: 'General Feedback', icon: '📝' },
};

export const AdminFeedbackPanel: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [submissions, setSubmissions] = useState<FeedbackSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('new');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Review dialog state
  const [reviewingSubmission, setReviewingSubmission] = useState<FeedbackSubmission | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [adminNotes, setAdminNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

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
      setIsAdmin(true);
      fetchData();
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_feedback')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);

    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load feedback submissions. The table may not exist yet.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!reviewingSubmission) return;

    setIsProcessing(true);

    try {
      const { error } = await supabase
        .from('user_feedback')
        .update({
          status: selectedStatus as FeedbackSubmission['status'],
          admin_notes: adminNotes || null,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', reviewingSubmission.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Feedback status updated successfully",
      });

      fetchData();
      closeReviewDialog();

    } catch (error: any) {
      console.error('Error updating feedback:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update feedback",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const openReviewDialog = (submission: FeedbackSubmission) => {
    setReviewingSubmission(submission);
    setSelectedStatus(submission.status);
    setAdminNotes(submission.admin_notes || '');
  };

  const closeReviewDialog = () => {
    setReviewingSubmission(null);
    setSelectedStatus('');
    setAdminNotes('');
  };

  // Filter submissions based on tab and search
  const filteredSubmissions = submissions.filter(s => {
    const matchesSearch = searchTerm === '' || 
      s.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      feedbackTypeConfig[s.feedback_type]?.label.toLowerCase().includes(searchTerm.toLowerCase());

    if (activeTab === 'all') return matchesSearch;
    return s.status === activeTab && matchesSearch;
  });

  // Stats
  const newCount = submissions.filter(s => s.status === 'new').length;
  const acknowledgedCount = submissions.filter(s => s.status === 'acknowledged').length;
  const inProgressCount = submissions.filter(s => s.status === 'in_progress').length;
  const resolvedCount = submissions.filter(s => s.status === 'resolved').length;
  const closedCount = submissions.filter(s => s.status === 'closed').length;
  const totalCount = submissions.length;

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

  const feedbackStats: { label: string; value: number; color: string }[] = [
    { label: 'New', value: newCount, color: statusConfig.new.color },
    { label: 'Acknowledged', value: acknowledgedCount, color: statusConfig.acknowledged.color },
    { label: 'In Progress', value: inProgressCount, color: statusConfig.in_progress.color },
    { label: 'Resolved', value: resolvedCount, color: statusConfig.resolved.color },
    { label: 'Closed', value: closedCount, color: statusConfig.closed.color },
  ];

  const feedbackTabs: { id: string; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: totalCount },
    { id: 'new', label: 'New', count: newCount },
    { id: 'acknowledged', label: 'Acknowledged', count: acknowledgedCount },
    { id: 'in_progress', label: 'In Progress', count: inProgressCount },
    { id: 'resolved', label: 'Resolved', count: resolvedCount },
    { id: 'closed', label: 'Closed', count: closedCount },
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
            <span className="ln-eyebrow">Inbox</span>
            <h1 className="ln-display" style={{ fontSize: 26, margin: '4px 0 0', letterSpacing: '-0.02em' }}>
              Feedback management
            </h1>
            <p style={{ fontSize: 12.5, color: 'var(--ln-ink-3)', margin: '4px 0 0' }}>
              View and manage user feedback submissions
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
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 14,
            marginBottom: 22,
          }}
        >
          {feedbackStats.map((s) => (
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
              <div className="ln-num" style={{ fontSize: 24, color: s.color, marginTop: 6, fontWeight: 500 }}>
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
            <span className="ln-display" style={{ fontSize: 18, letterSpacing: '-0.01em' }}>
              Feedback submissions{' '}
              <span className="ln-num" style={{ fontSize: 14, color: 'var(--ln-ink-3)' }}>({totalCount})</span>
            </span>
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
                placeholder="Search feedback..."
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
            {feedbackTabs.map((t) => {
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
                  {t.label}{' '}
                  <span className="ln-num" style={{ color: 'var(--ln-ink-4)' }}>({t.count})</span>
                </button>
              );
            })}
          </div>

          <div style={{ padding: 18 }}>
            {filteredSubmissions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--ln-ink-3)', fontSize: 13 }}>
                No feedback found
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {filteredSubmissions.map((submission) => (
                  <div
                    key={submission.id}
                    style={{ border: '1px solid var(--ln-line)', background: 'var(--ln-surface-2)', padding: 16 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontSize: 22 }}>
                            {feedbackTypeConfig[submission.feedback_type]?.icon || '📝'}
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                              <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: 'var(--ln-ink)' }}>
                                {feedbackTypeConfig[submission.feedback_type]?.label || submission.feedback_type}
                              </h3>
                              <span className={statusConfig[submission.status].chip}>
                                {statusConfig[submission.status].label}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 4, fontSize: 12.5, color: 'var(--ln-ink-3)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <User className="w-4 h-4" />
                                <span>{submission.user_email}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Calendar className="w-4 h-4" />
                                <span>{new Date(submission.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div style={{ background: 'var(--ln-surface-3)', border: '1px solid var(--ln-line-2)', padding: 14 }}>
                          <p style={{ fontSize: 12.5, whiteSpace: 'pre-wrap', margin: 0, color: 'var(--ln-ink-2)' }}>
                            {submission.message}
                          </p>
                        </div>

                        {submission.admin_notes && (
                          <div
                            style={{
                              background: 'color-mix(in oklab, var(--ln-info, #6ab7ff) 8%, transparent)',
                              border: '1px solid color-mix(in oklab, var(--ln-info, #6ab7ff) 30%, transparent)',
                              padding: 12,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                              <FileText className="w-4 h-4" style={{ color: 'var(--ln-info, #6ab7ff)' }} />
                              <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ln-info, #6ab7ff)' }}>Admin Notes</span>
                            </div>
                            <p style={{ fontSize: 12.5, color: 'var(--ln-ink-3)', whiteSpace: 'pre-wrap', margin: 0 }}>
                              {submission.admin_notes}
                            </p>
                            {submission.reviewed_at && (
                              <p style={{ fontSize: 11, color: 'var(--ln-ink-4)', marginTop: 8, fontFamily: 'var(--ln-font-mono)' }}>
                                Updated {new Date(submission.reviewed_at).toLocaleString()}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      <button className="ln-btn" style={{ flex: '0 0 auto' }} onClick={() => openReviewDialog(submission)}>
                        <Edit className="w-4 h-4" />
                        Update
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Review Dialog */}
      <Dialog open={!!reviewingSubmission} onOpenChange={(open) => !open && closeReviewDialog()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Update Feedback Status</DialogTitle>
            <DialogDescription>
              Update the status and add notes for this feedback submission
            </DialogDescription>
          </DialogHeader>

          {reviewingSubmission && (
            <div className="space-y-4">
              {/* Feedback Details */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">
                    {feedbackTypeConfig[reviewingSubmission.feedback_type]?.icon || '📝'}
                  </span>
                  <span className="font-semibold">
                    {feedbackTypeConfig[reviewingSubmission.feedback_type]?.label || reviewingSubmission.feedback_type}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  From: {reviewingSubmission.user_email}
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-sm whitespace-pre-wrap">{reviewingSubmission.message}</p>
                </div>
              </div>

              {/* Status Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <option className="bg-background text-foreground" value="new">New</option>
                  <option className="bg-background text-foreground" value="acknowledged">Acknowledged</option>
                  <option className="bg-background text-foreground" value="in_progress">In Progress</option>
                  <option className="bg-background text-foreground" value="resolved">Resolved</option>
                  <option className="bg-background text-foreground" value="closed">Closed</option>
                </select>
              </div>

              {/* Admin Notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Admin Notes</label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this feedback (e.g., planned actions, resolution details)..."
                  rows={6}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <button className="ln-btn" onClick={closeReviewDialog} disabled={isProcessing}>
              Cancel
            </button>
            <button className="ln-btn is-primary" onClick={handleUpdateStatus} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Status'
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};































