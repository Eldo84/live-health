import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, Plus, Eye, MousePointerClick, Clock, CreditCard, 
  BarChart3, FileText, CheckCircle, XCircle, AlertCircle, 
  ExternalLink, ArrowLeft, RefreshCcw, Bell
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications, Notification } from '@/lib/useNotifications';

interface Submission {
  id: string;
  company_name: string;
  selected_plan: string;
  status: string;
  payment_status: string;
  created_at: string;
  ad_title: string | null;
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
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

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
              <CardContent>
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
                          {submission.status === 'approved_pending_payment' && user && submission.user_id === user.id && (
                            <Button size="sm" className="mt-3" asChild>
                              <Link to={`/advertising/payment/${submission.id}`}>
                                <CreditCard className="w-4 h-4 mr-2" />
                                Complete Payment
                              </Link>
                            </Button>
                          )}
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
                                <span className="text-sm font-medium">{ad.view_count} views</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MousePointerClick className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm font-medium">{ad.click_count} clicks</span>
                              </div>
                              {ad.view_count > 0 && (
                                <span className="text-sm text-muted-foreground">
                                  CTR: {((ad.click_count / ad.view_count) * 100).toFixed(2)}%
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
    </div>
  );
};

export default UserAdvertisingDashboard;

