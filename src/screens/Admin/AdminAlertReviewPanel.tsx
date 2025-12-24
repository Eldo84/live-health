import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle 
} from '@/components/ui/dialog';
import { 
  Loader2, Eye, CheckCircle, XCircle, AlertCircle, ArrowLeft,
  Search, Shield, MapPin, Calendar, Link as LinkIcon, User, Trash2
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

const statusConfig: Record<string, { label: string; color: string }> = {
  pending_review: { label: 'Pending Review', color: 'bg-yellow-500' },
  approved: { label: 'Approved', color: 'bg-green-500' },
  rejected: { label: 'Rejected', color: 'bg-red-500' },
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Admin Dashboard
              </Button>
              <div className="flex items-center gap-2">
                <Shield className="w-6 h-6 text-primary" />
                <div>
                  <h1 className="text-2xl font-bold">Alert Review Panel</h1>
                  <p className="text-muted-foreground">Review and approve user-submitted alerts</p>
                </div>
              </div>
            </div>
            <Badge variant="outline" className="text-primary border-primary">
              Admin Access
            </Badge>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pending Review</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Approved</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{approvedCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Rejected</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{rejectedCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Alert Submissions</CardTitle>
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search alerts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="pending">
                  Pending ({pendingCount})
                </TabsTrigger>
                <TabsTrigger value="approved">
                  Approved ({approvedCount})
                </TabsTrigger>
                <TabsTrigger value="rejected">
                  Rejected ({rejectedCount})
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-4">
                {filteredSubmissions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No alerts found
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredSubmissions.map((submission) => (
                      <Card key={submission.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-lg">{submission.headline}</h3>
                                <Badge className={statusConfig[submission.status].color}>
                                  {statusConfig[submission.status].label}
                                </Badge>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4" />
                                  <span>{submission.user_email}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4" />
                                  <span>{submission.location}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4" />
                                  <span>{new Date(submission.date).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <AlertCircle className="w-4 h-4" />
                                  <span>{submission.disease_name}</span>
                                </div>
                              </div>

                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {submission.description}
                              </p>

                              {submission.url && (
                                <a
                                  href={submission.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                                >
                                  <LinkIcon className="w-4 h-4" />
                                  View Source
                                </a>
                              )}

                              {submission.admin_notes && (
                                <div className="mt-2 p-2 bg-muted rounded text-sm">
                                  <strong>Admin Notes:</strong> {submission.admin_notes}
                                </div>
                              )}

                              {submission.rejection_reason && (
                                <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm text-red-600 dark:text-red-400">
                                  <strong>Rejection Reason:</strong> {submission.rejection_reason}
                                </div>
                              )}

                              <div className="text-xs text-muted-foreground">
                                Submitted: {new Date(submission.created_at).toLocaleString()}
                                {submission.reviewed_at && (
                                  <> • Reviewed: {new Date(submission.reviewed_at).toLocaleString()}</>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-2 ml-4">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setViewingSubmission(submission)}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                              {submission.status === 'pending_review' && (
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => {
                                      setReviewingSubmission(submission);
                                      setReviewAction('approve');
                                    }}
                                  >
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => {
                                      setReviewingSubmission(submission);
                                      setReviewAction('reject');
                                    }}
                                  >
                                    <XCircle className="w-4 h-4 mr-1" />
                                    Reject
                                  </Button>
                                </div>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive"
                                onClick={() => setDeletingSubmission(submission)}
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
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
                <Badge className={statusConfig[viewingSubmission.status].color}>
                  {statusConfig[viewingSubmission.status].label}
                </Badge>
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
            <Button variant="outline" onClick={() => setViewingSubmission(null)}>
              Close
            </Button>
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
            <Button variant="outline" onClick={closeReviewDialog} disabled={isProcessing}>
              Cancel
            </Button>
            <Button
              onClick={handleReview}
              disabled={isProcessing || (reviewAction === 'reject' && !rejectionReason.trim())}
              variant={reviewAction === 'approve' ? 'default' : 'destructive'}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {reviewAction === 'approve' ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </>
                  )}
                </>
              )}
            </Button>
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
            <Button variant="outline" onClick={() => setDeletingSubmission(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteSubmission} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

