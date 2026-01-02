import React from 'react';
import { useNotifications, Notification } from '@/lib/useNotifications';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { CheckCircle2, Circle, AlertCircle, Info, Bell, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Simple date formatting function
const formatTimeAgo = (date: string) => {
  const now = new Date();
  const then = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return then.toLocaleDateString();
};

interface NotificationDropdownProps {
  onClose: () => void;
  position?: { top: number; right: number };
}

const getNotificationIcon = (type: Notification['type'], priority: Notification['priority']) => {
  if (priority === 'urgent') {
    return <AlertCircle className="h-4 w-4 text-red-500" />;
  }

  switch (type) {
    case 'submission_approved':
    case 'payment_received':
    case 'ad_live':
    case 'alert_approved':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'submission_rejected':
    case 'alert_rejected':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case 'admin_broadcast':
      return <Bell className="h-4 w-4 text-blue-500" />;
    case 'weekly_top_diseases':
      return <BarChart3 className="h-4 w-4 text-purple-500" />;
    default:
      return <Info className="h-4 w-4 text-blue-500" />;
  }
};

const getPriorityColor = (priority: Notification['priority']) => {
  switch (priority) {
    case 'urgent':
      return 'bg-red-500/20 border-red-500/50';
    case 'high':
      return 'bg-orange-500/20 border-orange-500/50';
    case 'normal':
      return 'bg-blue-500/20 border-blue-500/50';
    case 'low':
      return 'bg-gray-500/20 border-gray-500/50';
  }
};

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ onClose, position }) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, handleNotificationClick } = useNotifications();

  const unreadNotifications = notifications.filter(n => !n.read);
  const recentNotifications = notifications.slice(0, 10);

  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
  const isNarrow = viewportWidth < 520;

  const topOffset = position ? Math.max(position.top + 8, 12) : 0;
  const dropdownMaxHeight = position
    ? Math.max(240, viewportHeight - topOffset - 16)
    : 600;

  const dropdownStyle = position
    ? {
        position: 'fixed' as const,
        top: `${topOffset}px`,
        right: isNarrow ? '12px' : `${Math.max(position.right, 16)}px`,
        left: isNarrow ? '12px' : 'auto',
        zIndex: 999999, // Very high z-index to ensure it's above all content
        maxHeight: `${dropdownMaxHeight}px`,
        width: isNarrow ? 'calc(100vw - 24px)' : '384px',
      }
    : {
        position: 'absolute' as const,
        right: 0,
        top: '100%',
        marginTop: '8px',
        zIndex: 999999,
      };

  const scrollMaxHeight = position
    ? Math.max(200, viewportHeight - topOffset - 140)
    : 500;

  return (
    <div 
      className="w-full max-w-[384px] bg-background border border-border rounded-lg shadow-2xl flex flex-col overflow-hidden mt-2"
      style={dropdownStyle}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-6 pb-4 border-b border-border bg-card/90">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-lg text-foreground leading-tight">
            Notifications
          </h3>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="h-5 px-2 text-xs">
              {unreadCount} new
            </Badge>
          )}
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-7 px-2 text-xs"
            >
              Clear all
            </Button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <ScrollArea className="flex-1" style={{ maxHeight: `${scrollMaxHeight}px` }}>
        {recentNotifications.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recentNotifications.map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  "p-4 hover:bg-muted/50 transition-colors cursor-pointer relative",
                  !notification.read && "bg-primary/5",
                  getPriorityColor(notification.priority)
                )}
                onClick={() => {
                  handleNotificationClick(notification);
                  onClose();
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex-shrink-0">
                    {getNotificationIcon(notification.type, notification.priority)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className={cn(
                        "font-medium text-sm",
                        !notification.read && "font-semibold"
                      )}>
                        {notification.title}
                      </h4>
                      {!notification.read && (
                        <Circle className="h-2 w-2 text-primary flex-shrink-0 mt-1.5 fill-current" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {notification.message}
                    </p>
                    <div className="flex items-center justify-between mt-2 gap-2">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatTimeAgo(notification.created_at)}
                      </span>
                      {notification.action_label && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNotificationClick(notification);
                            onClose();
                          }}
                        >
                          {notification.action_label}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      {notifications.length > 10 && (
        <div className="p-3 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => {
              // Navigate to full notifications page
              window.location.href = '/dashboard/advertising?tab=notifications';
              onClose();
            }}
          >
            View all notifications
          </Button>
        </div>
      )}
    </div>
  );
};

