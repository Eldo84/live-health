import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Bell } from 'lucide-react';
import { Button } from './ui/button';
import { useNotifications } from '@/lib/useNotifications';
import { NotificationDropdown } from './NotificationDropdown';
import { cn } from '@/lib/utils';

export const NotificationBell: React.FC = () => {
  const { unreadCount } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; right: number } | null>(null);

  useEffect(() => {
    if (isOpen && bellRef.current) {
      const rect = bellRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    } else {
      setDropdownPosition(null);
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={bellRef}>
      <Button
        variant="ghost"
        size="icon"
        className="relative h-auto px-3 py-2 rounded-lg hover:bg-white/10"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-white" />
        {unreadCount > 0 && (
          <span
            className={cn(
              "absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center",
              unreadCount > 9 && "px-1 text-[10px]"
            )}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>
      
      {isOpen && dropdownPosition && typeof window !== 'undefined' && createPortal(
        <>
          <div
            className="fixed inset-0 z-[999998] bg-black/10"
            onClick={() => setIsOpen(false)}
          />
          <NotificationDropdown 
            onClose={() => setIsOpen(false)}
            position={dropdownPosition}
          />
        </>,
        document.body
      )}
    </div>
  );
};

