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
  Loader2, MessageSquare, CheckCircle, XCircle, ArrowLeft,
  Search, Shield, User, Calendar, Edit, FileText
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

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  new: { label: 'New', color: 'text-blue-600', bgColor: 'bg-blue-500' },
  acknowledged: { label: 'Acknowledged', color: 'text-purple-600', bgColor: 'bg-purple-500' },
  in_progress: { label: 'In Progress', color: 'text-yellow-600', bgColor: 'bg-yellow-500' },
  resolved: { label: 'Resolved', color: 'text-green-600', bgColor: 'bg-green-500' },
  closed: { label: 'Closed', color: 'text-gray-600', bgColor: 'bg-gray-500' },
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
                <MessageSquare className="w-6 h-6 text-primary" />
                <div>
                  <h1 className="text-2xl font-bold">Feedback Management</h1>
                  <p className="text-muted-foreground">View and manage user feedback submissions</p>
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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>New</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{newCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Acknowledged</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{acknowledgedCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>In Progress</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{inProgressCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Resolved</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{resolvedCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Closed</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">{closedCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Feedback Submissions ({totalCount})</CardTitle>
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search feedback..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="all">All ({totalCount})</TabsTrigger>
                <TabsTrigger value="new">New ({newCount})</TabsTrigger>
                <TabsTrigger value="acknowledged">Acknowledged ({acknowledgedCount})</TabsTrigger>
                <TabsTrigger value="in_progress">In Progress ({inProgressCount})</TabsTrigger>
                <TabsTrigger value="resolved">Resolved ({resolvedCount})</TabsTrigger>
                <TabsTrigger value="closed">Closed ({closedCount})</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-4">
                {filteredSubmissions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No feedback found
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredSubmissions.map((submission) => (
                      <Card key={submission.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 space-y-3">
                              <div className="flex items-center gap-3">
                                <span className="text-2xl">
                                  {feedbackTypeConfig[submission.feedback_type]?.icon || '📝'}
                                </span>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-lg">
                                      {feedbackTypeConfig[submission.feedback_type]?.label || submission.feedback_type}
                                    </h3>
                                    <Badge className={statusConfig[submission.status].bgColor}>
                                      {statusConfig[submission.status].label}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                      <User className="w-4 h-4" />
                                      <span>{submission.user_email}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Calendar className="w-4 h-4" />
                                      <span>{new Date(submission.created_at).toLocaleDateString()}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="bg-muted/50 rounded-lg p-4">
                                <p className="text-sm whitespace-pre-wrap">{submission.message}</p>
                              </div>

                              {submission.admin_notes && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                                  <div className="flex items-center gap-2 mb-1">
                                    <FileText className="w-4 h-4 text-blue-600" />
                                    <span className="text-sm font-semibold text-blue-600">Admin Notes</span>
                                  </div>
                                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                    {submission.admin_notes}
                                  </p>
                                  {submission.reviewed_at && (
                                    <p className="text-xs text-muted-foreground mt-2">
                                      Updated {new Date(submission.reviewed_at).toLocaleString()}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openReviewDialog(submission)}
                              className="ml-4"
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Update
                            </Button>
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
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="new">New</option>
                  <option value="acknowledged">Acknowledged</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
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
            <Button variant="outline" onClick={closeReviewDialog} disabled={isProcessing}>
              Cancel
            </Button>
            <Button onClick={handleUpdateStatus} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Status'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};



























