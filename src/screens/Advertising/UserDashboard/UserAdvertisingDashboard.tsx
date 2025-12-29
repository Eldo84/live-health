import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, Plus, Eye, MousePointerClick, Clock, CreditCard, 
  BarChart3, FileText, CheckCircle, XCircle, AlertCircle, 
  ExternalLink, ArrowLeft, RefreshCcw, Bell, Edit, Trash2, Upload, MapPin, X
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

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending_review: { label: 'Pending Review', color: 'bg-yellow-500', icon: <Clock className="w-3 h-3" /> },
  approved_pending_payment: { label: 'Awaiting Payment', color: 'bg-blue-500', icon: <CreditCard className="w-3 h-3" /> },
  changes_requested: { label: 'Changes Requested', color: 'bg-orange-500', icon: <AlertCircle className="w-3 h-3" /> },
  rejected: { label: 'Rejected', color: 'bg-red-500', icon: <XCircle className="w-3 h-3" /> },
  active: { label: 'Active', color: 'bg-green-500', icon: <CheckCircle className="w-3 h-3" /> },
  expired: { label: 'Expired', color: 'bg-gray-500', icon: <Clock className="w-3 h-3" /> },
  cancelled: { label: 'Cancelled', color: 'bg-gray-500', icon: <XCircle className="w-3 h-3" /> },
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/map">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Map
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Advertising Dashboard</h1>
                <p className="text-muted-foreground">Manage your ads and view analytics</p>
              </div>
            </div>
            <Button asChild>
              <Link to="/?tab=advertise">
                <Plus className="w-4 h-4 mr-2" />
                New Ad
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="notifications">
              Notifications
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 px-1.5 text-xs">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="submissions">Submissions ({submissions.length})</TabsTrigger>
            <TabsTrigger value="active-ads">Active Ads ({activeCount})</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            {/* Stats Cards */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <Eye className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Views</p>
                      <p className="text-2xl font-bold">{totalViews.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-100 rounded-lg">
                      <MousePointerClick className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Clicks</p>
                      <p className="text-2xl font-bold">{totalClicks.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <BarChart3 className="w-6 h-6 text-purple-600" />
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
            </div>

            {/* Quick Actions - Only show if user has their own submissions waiting for payment */}
            {user && submissions.some(s => s.status === 'approved_pending_payment' && s.user_id === user.id) && (
              <Card className="mb-8 border-blue-200 bg-blue-50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <CreditCard className="w-8 h-8 text-blue-600" />
                      <div>
                        <p className="font-semibold">Payment Required</p>
                        <p className="text-sm text-muted-foreground">
                          You have approved submissions waiting for payment
                        </p>
                      </div>
                    </div>
                    <Button asChild>
                      <Link to={`/advertising/payment/${submissions.find(s => s.status === 'approved_pending_payment' && s.user_id === user.id)?.id}`}>
                        Complete Payment
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Submissions</CardTitle>
              </CardHeader>
              <CardContent>
                {submissions.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">No submissions yet</p>
                    <Button asChild>
                      <Link to="/?tab=advertise">Create Your First Ad</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {submissions.slice(0, 5).map((submission) => {
                      const status = statusConfig[submission.status] || statusConfig.pending_review;
                      return (
                        <div key={submission.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-4">
                            <Badge className={`${status.color} text-white`}>
                              {status.icon}
                              <span className="ml-1">{status.label}</span>
                            </Badge>
                            <div>
                              <p className="font-medium">{submission.company_name}</p>
                              <p className="text-sm text-muted-foreground capitalize">
                                {submission.selected_plan} Plan
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {submission.status === 'approved_pending_payment' && user && submission.user_id === user.id && (
                              <Button size="sm" asChild>
                                <Link to={`/advertising/payment/${submission.id}`}>
                                  Pay Now
                                </Link>
                              </Button>
                            )}
                            <span className="text-sm text-muted-foreground">
                              {new Date(submission.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Notifications</CardTitle>
                    <CardDescription>Real-time updates about your advertising applications</CardDescription>
                  </div>
                  {unreadCount > 0 && (
                    <Button variant="outline" size="sm" onClick={markAllAsRead}>
                      Mark all as read
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {notifications.length === 0 ? (
                  <div className="text-center py-8">
                    <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No notifications yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {notifications.map((notification) => {
                      const isUnread = !notification.read;
                      return (
                        <div
                          key={notification.id}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            isUnread ? 'bg-primary/5 border-primary/20' : 'hover:bg-muted/50'
                          }`}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5">
                              {isUnread ? (
                                <div className="w-2 h-2 bg-primary rounded-full" />
                              ) : (
                                <div className="w-2 h-2 bg-transparent" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className={`font-medium ${isUnread ? 'font-semibold' : ''}`}>
                                  {notification.title}
                                </h4>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {new Date(notification.created_at).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {notification.message}
                              </p>
                              {notification.action_label && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="mt-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleNotificationClick(notification);
                                  }}
                                >
                                  {notification.action_label}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Submissions Tab */}
          <TabsContent value="submissions">
            <Card>
              <CardHeader>
                <CardTitle>All Submissions</CardTitle>
                <CardDescription>Track the status of your advertising applications</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {submissions.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No submissions found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {submissions.map((submission) => {
                      const status = statusConfig[submission.status] || statusConfig.pending_review;
                      return (
                        <div key={submission.id} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-semibold">{submission.company_name}</h3>
                              {submission.ad_title && (
                                <p className="text-sm text-muted-foreground">{submission.ad_title}</p>
                              )}
                            </div>
                            <Badge className={`${status.color} text-white`}>
                              {status.icon}
                              <span className="ml-1">{status.label}</span>
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="capitalize">{submission.selected_plan} Plan</span>
                            <span>•</span>
                            <span>{new Date(submission.created_at).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-3">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setViewingSubmission(submission)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </Button>
                            {submission.status === 'approved_pending_payment' && user && submission.user_id === user.id && (
                              <Button size="sm" asChild>
                                <Link to={`/advertising/payment/${submission.id}`}>
                                  <CreditCard className="w-4 h-4 mr-2" />
                                  Complete Payment
                                </Link>
                              </Button>
                            )}
                            {canEditOrDelete(submission) && (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleEdit(submission)}
                                >
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="destructive"
                                  onClick={() => setDeletingSubmission(submission)}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Active Ads Tab */}
          <TabsContent value="active-ads">
            <Card>
              <CardHeader>
                <CardTitle>Active Advertisements</CardTitle>
                <CardDescription>Your currently running ads and their performance</CardDescription>
              </CardHeader>
              <CardContent>
                {activeAds.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No active ads</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {activeAds.map((ad) => (
                      <div key={ad.id} className="p-4 border rounded-lg">
                        <div className="flex items-start gap-4">
                          <img 
                            src={ad.image_url || '/image.png'} 
                            alt={ad.title}
                            className="w-20 h-14 object-cover rounded"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-semibold">{ad.title}</h3>
                              <Badge variant={ad.is_active ? "default" : "secondary"}>
                                {ad.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                              <span className="capitalize">{ad.plan_type} Plan</span>
                              <span>•</span>
                              <span>Ends: {new Date(ad.end_date).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-6">
                              <div className="flex items-center gap-2">
                                <Eye className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm font-medium">
                                  {adAnalytics[ad.id]?.views ?? ad.view_count} views
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MousePointerClick className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm font-medium">
                                  {adAnalytics[ad.id]?.clicks ?? ad.click_count} clicks
                                </span>
                              </div>
                              {((adAnalytics[ad.id]?.views ?? ad.view_count) > 0) && (
                                <span className="text-sm text-muted-foreground">
                                  CTR: {(((adAnalytics[ad.id]?.clicks ?? ad.click_count) / (adAnalytics[ad.id]?.views ?? ad.view_count)) * 100).toFixed(2)}%
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>Your payment transactions</CardDescription>
              </CardHeader>
              <CardContent>
                {payments.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No payments yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {payments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium capitalize">{payment.plan_type} Plan</p>
                          <p className="text-sm text-muted-foreground">
                            {payment.paid_at 
                              ? new Date(payment.paid_at).toLocaleDateString() 
                              : new Date(payment.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">${payment.amount.toFixed(2)}</p>
                          <Badge variant={payment.status === 'succeeded' ? 'default' : 'secondary'}>
                            {payment.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
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
            <DialogDescription>Full information for your ad submission</DialogDescription>
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
            <Button variant="outline" onClick={() => setViewingSubmission(null)}>
              Close
            </Button>
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
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : (
                  <Upload className="h-4 w-4 text-muted-foreground" />
                )}
              </div>

              {/* New Media Preview */}
              {editPreviewUrl && editMediaFile && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-primary">
                      New Media: {editMediaFile.name}
                      {editMediaType && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({(editMediaType === 'video' ? 'Video' : editMediaType === 'gif' ? 'GIF' : editMediaType === 'animation' ? 'Animation' : 'Image')})
                        </span>
                      )}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (editPreviewUrl.startsWith('blob:')) {
                          URL.revokeObjectURL(editPreviewUrl);
                        }
                        setEditMediaFile(null);
                        setEditMediaType(null);
                        setEditPreviewUrl(null);
                      }}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
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
            <Button variant="outline" onClick={() => setEditingSubmission(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving || isUploading}>
              {isSaving || isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isUploading ? 'Uploading...' : 'Saving...'}
                </>
              ) : (
                'Save Changes'
              )}
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
            <Button variant="outline" onClick={() => setDeletingSubmission(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
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

export default UserAdvertisingDashboard;

