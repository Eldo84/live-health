import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2, AlertCircle, Megaphone,
  FileText, ArrowRight, Bell, MessageSquare
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { T } from "../../livehealth/components/T";
import { useT } from "../../livehealth/lib/useT";

interface AdminStats {
  pendingAlerts: number;
  approvedAlerts: number;
  rejectedAlerts: number;
  pendingAds: number;
  activeAds: number;
  totalUsers: number;
  newFeedback: number;
  totalFeedback: number;
}

export const AdminDashboard: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const tAccessDenied = useT("Access Denied");
  const tNoAdminPrivileges = useT("You don't have admin privileges.");

  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats>({
    pendingAlerts: 0,
    approvedAlerts: 0,
    rejectedAlerts: 0,
    pendingAds: 0,
    activeAds: 0,
    totalUsers: 0,
    newFeedback: 0,
    totalFeedback: 0,
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
          title: tAccessDenied,
          description: tNoAdminPrivileges,
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

      // Fetch feedback stats
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('user_feedback')
        .select('status');

      if (!feedbackError && feedbackData) {
        setStats(prev => ({
          ...prev,
          newFeedback: feedbackData.filter(f => f.status === 'new').length,
          totalFeedback: feedbackData.length,
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
      accent: 'var(--ln-brand)',
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
      accent: 'var(--ln-info, #6ab7ff)',
      stats: {
        label: 'Pending Submissions',
        value: stats.pendingAds,
      },
    },
    {
      id: 'feedback',
      title: 'Feedback Management',
      description: 'View and manage user feedback, bug reports, and suggestions',
      icon: MessageSquare,
      path: '/admin/feedback',
      accent: 'var(--ln-warn)',
      stats: {
        label: 'New Feedback',
        value: stats.newFeedback,
      },
    },
    {
      id: 'notifications',
      title: 'Send Notifications',
      description: 'Send notifications to users (in-app and email)',
      icon: Bell,
      path: '/admin/notifications',
      accent: 'var(--ln-brand)',
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

  const quickStats: { label: string; value: number; sub: string; color: string }[] = [
    {
      label: 'Pending Alert Reviews',
      value: stats.pendingAlerts,
      sub: `${stats.pendingAlerts === 1 ? 'alert' : 'alerts'} awaiting review`,
      color: 'var(--ln-warn)',
    },
    { label: 'Approved Alerts', value: stats.approvedAlerts, sub: 'alerts on the map', color: 'var(--ln-brand)' },
    { label: 'Pending Ad Reviews', value: stats.pendingAds, sub: 'advertising submissions', color: 'var(--ln-info, #6ab7ff)' },
    { label: 'Active Ads', value: stats.activeAds, sub: 'sponsored content active', color: 'var(--ln-brand)' },
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
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <span className="ln-eyebrow"><T>Control center</T></span>
          <h1 className="ln-display" style={{ fontSize: 30, margin: '6px 0 0', letterSpacing: '-0.02em' }}>
            <T>Admin</T>{' '}
            <span style={{ fontStyle: 'italic', color: 'var(--ln-ink-3)' }}><T>overview.</T></span>
          </h1>
          <p style={{ fontSize: 12.5, color: 'var(--ln-ink-3)', margin: '6px 0 0' }}><T>Manage your platform</T></p>
        </div>
        <span className="ln-chip is-ok"><T>Admin access</T></span>
      </div>

      <div style={{ padding: '22px 28px 40px' }}>
        {/* Quick Stats */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 14,
            marginBottom: 28,
          }}
        >
          {quickStats.map((s) => (
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
              <div className="ln-eyebrow"><T>{s.label}</T></div>
              <div className="ln-num" style={{ fontSize: 34, color: s.color, margin: '8px 0 4px', fontWeight: 500 }}>
                {s.value}
              </div>
              <p style={{ fontSize: 12, color: 'var(--ln-ink-3)', margin: 0 }}>{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Admin Sections */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 16,
          }}
        >
          {adminSections.map((section) => {
            const Icon = section.icon;
            return (
              <div
                key={section.id}
                onClick={() => navigate(section.path)}
                style={{
                  border: '1px solid var(--ln-line)',
                  background: 'var(--ln-surface)',
                  padding: 18,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid var(--ln-line-2)',
                      background: 'var(--ln-surface-2)',
                      color: section.accent,
                    }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <ArrowRight className="w-5 h-5" style={{ color: 'var(--ln-ink-4)' }} />
                </div>
                <div className="ln-display" style={{ fontSize: 18, letterSpacing: '-0.01em' }}>
                  <T>{section.title}</T>
                </div>
                <p style={{ fontSize: 12.5, color: 'var(--ln-ink-3)', margin: '8px 0 0', lineHeight: 1.5, flex: 1 }}>
                  <T>{section.description}</T>
                </p>
                {section.stats && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: 16,
                      paddingTop: 14,
                      borderTop: '1px solid var(--ln-line)',
                    }}
                  >
                    <span className="ln-eyebrow"><T>{section.stats.label}</T></span>
                    <span className="ln-num" style={{ fontSize: 20, color: section.accent, fontWeight: 500 }}>
                      {section.stats.value}
                    </span>
                  </div>
                )}
                {!section.stats && (
                  <button
                    className="ln-btn"
                    style={{ marginTop: 16, justifyContent: 'center', width: '100%' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(section.path);
                    }}
                  >
                    <T>Open Section</T> <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div
          style={{
            marginTop: 28,
            border: '1px solid var(--ln-line)',
            background: 'var(--ln-surface)',
            padding: 18,
          }}
        >
          <span className="ln-eyebrow"><T>Quick actions</T></span>
          <p style={{ fontSize: 12.5, color: 'var(--ln-ink-3)', margin: '6px 0 14px' }}>
            <T>Common administrative tasks</T>
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <button className="ln-btn" onClick={() => navigate('/admin/alerts')}>
              <AlertCircle className="w-4 h-4" />
              <T>Review Pending Alerts</T>
              {stats.pendingAlerts > 0 && (
                <span className="ln-chip is-crit" style={{ marginLeft: 4 }}>{stats.pendingAlerts}</span>
              )}
            </button>
            <button className="ln-btn" onClick={() => navigate('/admin/advertising')}>
              <Megaphone className="w-4 h-4" />
              <T>Review Advertising Submissions</T>
              {stats.pendingAds > 0 && (
                <span className="ln-chip is-crit" style={{ marginLeft: 4 }}>{stats.pendingAds}</span>
              )}
            </button>
            <button className="ln-btn" onClick={() => navigate('/map')}>
              <FileText className="w-4 h-4" />
              <T>View Map</T>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

