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
  Loader2, Eye, MousePointerClick, Clock, CreditCard, 
  BarChart3, CheckCircle, XCircle, AlertCircle, ArrowLeft,
  Search, Filter, DollarSign, Users, FileText, Shield, Trash2
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

const statusConfig: Record<string, { label: string; color: string }> = {
  pending_review: { label: 'Pending Review', color: 'bg-yellow-500' },
  approved_pending_payment: { label: 'Awaiting Payment', color: 'bg-blue-500' },
  changes_requested: { label: 'Changes Requested', color: 'bg-orange-500' },
  rejected: { label: 'Rejected', color: 'bg-red-500' },
  active: { label: 'Active', color: 'bg-green-500' },
  expired: { label: 'Expired', color: 'bg-gray-500' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-500' },
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
      const prices = { basic: 50, professional: 150, enterprise: 300 };
      return sum + (prices[s.selected_plan as keyof typeof prices] || 0);
    }, 0);

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
                  <h1 className="text-2xl font-bold">Admin Panel</h1>
                  <p className="text-muted-foreground">Manage advertising submissions</p>
                </div>
              </div>
            </div>
            <Badge variant="outline" className="text-primary border-primary">
              Admin Access
            </Badge>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending Review</p>
                  <p className="text-2xl font-bold">{pendingCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Ads</p>
                  <p className="text-2xl font-bold">{activeCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Submissions</p>
                  <p className="text-2xl font-bold">{submissions.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold">${totalRevenue}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by company or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="pending">
              Pending ({pendingCount})
            </TabsTrigger>
            <TabsTrigger value="approved">
              Awaiting Payment
            </TabsTrigger>
            <TabsTrigger value="active">
              Active
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Rejected
            </TabsTrigger>
            <TabsTrigger value="all">
              All ({submissions.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            <Card>
              <CardHeader>
                <CardTitle>Submissions</CardTitle>
                <CardDescription>
                  {activeTab === 'pending' && 'Review and approve or reject submissions'}
                  {activeTab === 'approved' && 'Submissions waiting for payment'}
                  {activeTab === 'active' && 'Currently active advertisements'}
                  {activeTab === 'rejected' && 'Rejected submissions'}
                  {activeTab === 'all' && 'All submissions'}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {filteredSubmissions.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No submissions found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredSubmissions.map((submission) => {
                      const status = statusConfig[submission.status] || statusConfig.pending_review;
                      return (
                        <div key={submission.id} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-semibold">{submission.company_name}</h3>
                              <p className="text-sm text-muted-foreground">{submission.email}</p>
                            </div>
                            <Badge className={`${status.color} text-white`}>
                              {status.label}
                            </Badge>
                          </div>
                          
                          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm mb-4">
                            <div>
                              <span className="text-muted-foreground">Contact:</span>
                              <p className="font-medium">{submission.contact_name}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Plan:</span>
                              <p className="font-medium capitalize">{submission.selected_plan}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Payment:</span>
                              <p className="font-medium capitalize">{submission.payment_status.replace('_', ' ')}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Date:</span>
                              <p className="font-medium">{new Date(submission.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>

                          {submission.description && (
                            <div className="text-sm mb-4">
                              <span className="text-muted-foreground">Description:</span>
                              <p className="mt-1">{submission.description}</p>
                            </div>
                          )}

                          {submission.admin_notes && (
                            <div className="text-sm mb-4 bg-muted p-3 rounded">
                              <span className="text-muted-foreground">Admin Notes:</span>
                              <p className="mt-1">{submission.admin_notes}</p>
                            </div>
                          )}

                          <div className="flex gap-2 mt-4">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setViewingSubmission(submission)}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View
                            </Button>
                            {submission.status === 'pending_review' && (
                              <>
                                <Button 
                                  size="sm" 
                                  onClick={() => {
                                    setReviewingSubmission(submission);
                                    setReviewAction('approve');
                                  }}
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Approve
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => {
                                    setReviewingSubmission(submission);
                                    setReviewAction('changes');
                                  }}
                                >
                                  <AlertCircle className="w-4 h-4 mr-2" />
                                  Request Changes
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="destructive"
                                  onClick={() => {
                                    setReviewingSubmission(submission);
                                    setReviewAction('reject');
                                  }}
                                >
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Reject
                                </Button>
                              </>
                            )}
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => setDeletingSubmission(submission)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
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
              {viewingSubmission.ad_image_url && (
                <div className="rounded-lg overflow-hidden border bg-muted">
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
                <Badge className={`${(statusConfig[viewingSubmission.status] || statusConfig.pending_review).color} text-white`}>
                  {(statusConfig[viewingSubmission.status] || statusConfig.pending_review).label}
                </Badge>
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

              {(viewingSubmission.ad_title || viewingSubmission.ad_click_url) && (
                <div className="space-y-1 text-sm">
                  <p className="text-muted-foreground">Ad</p>
                  {viewingSubmission.ad_title && <p className="font-medium">Title: {viewingSubmission.ad_title}</p>}
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
            <Button variant="outline" onClick={closeReviewDialog}>
              Cancel
            </Button>
            <Button 
              onClick={handleReview}
              disabled={isProcessing || (reviewAction === 'reject' && !rejectionReason)}
              variant={reviewAction === 'reject' ? 'destructive' : 'default'}
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {reviewAction === 'approve' && 'Approve & Send Payment Link'}
              {reviewAction === 'reject' && 'Reject Submission'}
              {reviewAction === 'changes' && 'Request Changes'}
            </Button>
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
            <Button variant="outline" onClick={() => setDeletingSubmission(null)}>
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

export default AdminAdvertisingPanel;

