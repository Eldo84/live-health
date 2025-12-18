import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, Shield, AlertCircle, Megaphone, 
  Users, Settings, BarChart3, FileText, ArrowRight, Bell
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface AdminStats {
  pendingAlerts: number;
  approvedAlerts: number;
  rejectedAlerts: number;
  pendingAds: number;
  activeAds: number;
  totalUsers: number;
}

export const AdminDashboard: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats>({
    pendingAlerts: 0,
    approvedAlerts: 0,
    rejectedAlerts: 0,
    pendingAds: 0,
    activeAds: 0,
    totalUsers: 0,
  });

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
      fetchStats();
    } catch (error) {
      console.error('Error checking admin role:', error);
      // For demo purposes, allow access if table doesn't exist
      setIsAdmin(true);
      fetchStats();
    }
  };

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      // Fetch alert stats
      const { data: alertData, error: alertError } = await supabase
        .from('user_alert_submissions')
        .select('status');

      if (!alertError && alertData) {
        setStats(prev => ({
          ...prev,
          pendingAlerts: alertData.filter(a => a.status === 'pending_review').length,
          approvedAlerts: alertData.filter(a => a.status === 'approved').length,
          rejectedAlerts: alertData.filter(a => a.status === 'rejected').length,
        }));
      }

      // Fetch advertising stats
      const { data: adData, error: adError } = await supabase
        .from('advertising_submissions')
        .select('status');

      if (!adError && adData) {
        setStats(prev => ({
          ...prev,
          pendingAds: adData.filter(a => a.status === 'pending_review').length,
          activeAds: adData.filter(a => a.status === 'active').length,
        }));
      }

      // Fetch active sponsored content count
      const { data: sponsoredData, error: sponsoredError } = await supabase
        .from('sponsored_content')
        .select('id')
        .eq('is_active', true);

      if (!sponsoredError && sponsoredData) {
        setStats(prev => ({
          ...prev,
          activeAds: sponsoredData.length,
        }));
      }

      // Fetch user count (approximate - count from user_roles)
      const { count: userCount, error: userError } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true });

      if (!userError && userCount !== null) {
        setStats(prev => ({
          ...prev,
          totalUsers: userCount,
        }));
      }

    } catch (error: any) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const adminSections = [
    {
      id: 'alerts',
      title: 'Alert Review',
      description: 'Review and approve user-submitted alerts',
      icon: AlertCircle,
      path: '/admin/alerts',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-800',
      stats: {
        label: 'Pending Reviews',
        value: stats.pendingAlerts,
      },
    },
    {
      id: 'advertising',
      title: 'Advertising Management',
      description: 'Manage advertising submissions and sponsored content',
      icon: Megaphone,
      path: '/admin/advertising',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      borderColor: 'border-purple-200 dark:border-purple-800',
      stats: {
        label: 'Pending Submissions',
        value: stats.pendingAds,
      },
    },
    {
      id: 'notifications',
      title: 'Send Notifications',
      description: 'Send notifications to users (in-app and email)',
      icon: Bell,
      path: '/admin/notifications',
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      borderColor: 'border-green-200 dark:border-green-800',
    },
    // TODO: Implement in future
    // {
    //   id: 'users',
    //   title: 'User Management',
    //   description: 'Manage users, roles, and permissions',
    //   icon: Users,
    //   path: '/admin/users',
    //   color: 'text-green-600',
    //   bgColor: 'bg-green-50 dark:bg-green-900/20',
    //   borderColor: 'border-green-200 dark:border-green-800',
    //   stats: {
    //     label: 'Total Users',
    //     value: stats.totalUsers,
    //   },
    // },
    // {
    //   id: 'analytics',
    //   title: 'Analytics & Reports',
    //   description: 'View platform analytics and generate reports',
    //   icon: BarChart3,
    //   path: '/admin/analytics',
    //   color: 'text-orange-600',
    //   bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    //   borderColor: 'border-orange-200 dark:border-orange-800',
    // },
    // {
    //   id: 'settings',
    //   title: 'System Settings',
    //   description: 'Configure system settings and preferences',
    //   icon: Settings,
    //   path: '/admin/settings',
    //   color: 'text-gray-600',
    //   bgColor: 'bg-gray-50 dark:bg-gray-900/20',
    //   borderColor: 'border-gray-200 dark:border-gray-800',
    // },
  ];

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
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-primary dark:text-primary" />
                <div>
                  <h1 className="text-3xl font-bold text-foreground dark:text-foreground">
                    Admin Dashboard
                  </h1>
                  <p className="text-sm font-medium text-foreground/70 dark:text-foreground/70 mt-1">
                    Manage your platform
                  </p>
                </div>
              </div>
            </div>
            <Badge variant="outline" className="text-primary border-primary text-base font-semibold px-4 py-2 bg-primary/10 dark:bg-primary/20">
              Admin Access
            </Badge>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-card">
            <CardHeader className="pb-3">
              <CardDescription className="text-sm font-medium text-foreground/80">
                Pending Alert Reviews
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-yellow-600 dark:text-yellow-500 mb-2">
                {stats.pendingAlerts}
              </div>
              <p className="text-sm font-medium text-foreground/70 dark:text-foreground/60">
                {stats.pendingAlerts === 1 ? 'alert' : 'alerts'} awaiting review
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardHeader className="pb-3">
              <CardDescription className="text-sm font-medium text-foreground/80">
                Approved Alerts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-green-600 dark:text-green-500 mb-2">
                {stats.approvedAlerts}
              </div>
              <p className="text-sm font-medium text-foreground/70 dark:text-foreground/60">
                alerts on the map
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardHeader className="pb-3">
              <CardDescription className="text-sm font-medium text-foreground/80">
                Pending Ad Reviews
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-blue-600 dark:text-blue-500 mb-2">
                {stats.pendingAds}
              </div>
              <p className="text-sm font-medium text-foreground/70 dark:text-foreground/60">
                advertising submissions
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardHeader className="pb-3">
              <CardDescription className="text-sm font-medium text-foreground/80">
                Active Ads
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-purple-600 dark:text-purple-500 mb-2">
                {stats.activeAds}
              </div>
              <p className="text-sm font-medium text-foreground/70 dark:text-foreground/60">
                sponsored content active
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Admin Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminSections.map((section) => {
            const Icon = section.icon;
            return (
              <Card
                key={section.id}
                className={`hover:shadow-lg transition-all cursor-pointer group ${section.borderColor} border-2 bg-card`}
                onClick={() => navigate(section.path)}
              >
                <CardHeader className="pb-4 bg-card">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-lg ${section.bgColor}`}>
                      <Icon className={`w-6 h-6 ${section.color} dark:text-opacity-90`} />
                    </div>
                    <ArrowRight className={`w-5 h-5 ${section.color} dark:text-opacity-90 opacity-0 group-hover:opacity-100 transition-opacity`} />
                  </div>
                  <CardTitle className="text-xl font-bold text-foreground dark:text-foreground">
                    {section.title}
                  </CardTitle>
                  <CardDescription className="text-sm text-foreground/80 dark:text-foreground/70 mt-2 leading-relaxed">
                    {section.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="bg-card">
                  {section.stats && (
                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <span className="text-sm font-medium text-foreground/80 dark:text-foreground/70">
                        {section.stats.label}
                      </span>
                      <span className={`text-xl font-bold ${section.color} dark:text-opacity-90`}>
                        {section.stats.value}
                      </span>
                    </div>
                  )}
                  {!section.stats && (
                    <Button
                      variant="outline"
                      className="w-full mt-3 font-medium"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(section.path);
                      }}
                    >
                      Open Section <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions */}
        <Card className="mt-8 bg-card">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-foreground">Quick Actions</CardTitle>
            <CardDescription className="text-sm text-foreground/80 dark:text-foreground/70">
              Common administrative tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={() => navigate('/admin/alerts')}
                className="flex items-center gap-2 font-medium"
              >
                <AlertCircle className="w-4 h-4" />
                Review Pending Alerts
                {stats.pendingAlerts > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {stats.pendingAlerts}
                  </Badge>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/admin/advertising')}
                className="flex items-center gap-2 font-medium"
              >
                <Megaphone className="w-4 h-4" />
                Review Advertising Submissions
                {stats.pendingAds > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {stats.pendingAds}
                  </Badge>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/map')}
                className="flex items-center gap-2 font-medium"
              >
                <FileText className="w-4 h-4" />
                View Map
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

