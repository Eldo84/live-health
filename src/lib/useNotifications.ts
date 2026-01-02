import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

export interface Notification {
  id: string;
  user_id: string;
  type:
    | 'submission_created'
    | 'submission_approved'
    | 'submission_rejected'
    | 'payment_required'
    | 'payment_received'
    | 'ad_live'
    | 'ad_expiring'
    | 'ad_expired'
    | 'alert_approved'
    | 'alert_rejected'
    | 'admin_broadcast'
    | 'weekly_top_diseases';
  title: string;
  message: string;
  action_url: string | null;
  action_label: string | null;
  submission_id: string | null;
  payment_id: string | null;
  read: boolean;
  read_at: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount((data || []).filter(n => !n.read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('id', notificationId);

      if (error) throw error;

      // Update local state
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, read: true, read_at: new Date().toISOString() } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;

      // Update local state
      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      markAsRead(notification.id);
    }

    // Navigate to action URL if exists
    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    let mounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    // Fetch initial notifications
    fetchNotifications();

    // Subscribe to real-time updates
    const setupSubscription = () => {
      // Remove existing channel if any
      if (channel) {
        supabase.removeChannel(channel);
      }

      channel = supabase
        .channel(`user_notifications_${user.id}`, {
          config: {
            broadcast: { self: true },
            presence: { key: user.id }
          }
        })
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            if (!mounted) return;
            
            const newNotification = payload.new as Notification;
            
            console.log('🔔 New notification received:', newNotification);
            
            // Check if notification already exists (avoid duplicates)
            setNotifications(prev => {
              const exists = prev.some(n => n.id === newNotification.id);
              if (exists) {
                console.log('Notification already exists, skipping duplicate');
                return prev;
              }
              
              // Add to notifications list
              const updated = [newNotification, ...prev];
              
              // Update unread count
              const unreadCount = updated.filter(n => !n.read).length;
              setUnreadCount(unreadCount);
              
              // Show toast notification
              toast({
                title: newNotification.title,
                description: newNotification.message,
              });
              
              return updated;
            });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            if (!mounted) return;
            
            const updatedNotification = payload.new as Notification;
            console.log('🔔 Notification updated:', updatedNotification);
            
            setNotifications(prev => {
              const next = prev.map(n =>
                n.id === updatedNotification.id ? updatedNotification : n
              );
              // Recalculate unread count so the bell badge stays in sync
              const nextUnread = next.filter(n => !n.read).length;
              setUnreadCount(nextUnread);
              return next;
            });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            if (!mounted) return;
            
            const deletedId = payload.old.id;
            console.log('🔔 Notification deleted:', deletedId);
            
            setNotifications(prev => {
              const filtered = prev.filter(n => n.id !== deletedId);
              const nextUnread = filtered.filter(n => !n.read).length;
              setUnreadCount(nextUnread);
              return filtered;
            });
          }
        )
        .subscribe((status) => {
          console.log('🔔 Subscription status:', status);
          
          if (status === 'SUBSCRIBED') {
            console.log('✅ Successfully subscribed to notifications');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Channel subscription error, retrying...');
            // Retry subscription after a short delay
            setTimeout(() => {
              if (mounted && user) {
                setupSubscription();
              }
            }, 1000);
          } else if (status === 'TIMED_OUT') {
            console.error('❌ Subscription timed out, retrying...');
            // Retry subscription after a short delay
            setTimeout(() => {
              if (mounted && user) {
                setupSubscription();
              }
            }, 2000);
          } else if (status === 'CLOSED') {
            console.warn('⚠️ Subscription closed, attempting to reconnect...');
            // Attempt to reconnect
            if (mounted && user) {
              setTimeout(() => {
                setupSubscription();
              }, 3000);
            }
          }
        });
    };

    // Initial subscription setup
    setupSubscription();

    // Fallback: Periodic polling every 30 seconds to ensure we don't miss notifications
    // This is a safety net in case real-time subscription fails or is slow
    const pollInterval = setInterval(() => {
      if (mounted && user) {
        fetchNotifications();
      }
    }, 30000); // Poll every 30 seconds

    return () => {
      mounted = false;
      clearInterval(pollInterval);
      if (channel) {
        console.log('🔔 Cleaning up notification subscription');
        supabase.removeChannel(channel);
      }
    };
  }, [user, toast, navigate, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    handleNotificationClick,
    refresh: fetchNotifications
  };
};

