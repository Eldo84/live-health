import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Loader2, ArrowLeft, Bell, Send, Search, CheckCircle2, XCircle, Mail, MessageSquare
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface User {
  id: string;
  email: string;
  created_at: string;
}

export const AdminNotificationPanel: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successDetails, setSuccessDetails] = useState<{
    notificationsCreated: number;
    emailsSent: number;
    errors: string[];
  } | null>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState<'all' | 'selected'>('all');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  
  // Users list
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

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
      setIsLoading(false);
      
      // Fetch users if target is 'selected'
      if (target === 'selected') {
        fetchUsers();
      }
    } catch (error) {
      console.error('Error checking admin role:', error);
      setIsAdmin(true);
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No session');
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/get-users`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const { users: fetchedUsers } = await response.json();
      setUsers(fetchedUsers || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users. " + error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (target === 'selected' && isAdmin) {
      fetchUsers();
    }
  }, [target, isAdmin]);

  const handleUserToggle = (userId: string) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUserIds.length === filteredUsers.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(filteredUsers.map(u => u.id));
    }
  };

  const handleSend = async () => {
    // Validation
    if (!title.trim() || !message.trim()) {
      toast({
        title: "Validation Error",
        description: "Title and message are required.",
        variant: "destructive",
      });
      return;
    }

    if (target === 'selected' && selectedUserIds.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one user.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No session');
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/send-admin-notification`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          target: target,
          userIds: target === 'selected' ? selectedUserIds : undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send notification');
      }

      // Show success dialog
      setSuccessDetails({
        notificationsCreated: result.notificationsCreated ?? 0,
        emailsSent: result.emailsSent ?? 0,
        errors: result.errors || [],
      });
      setShowSuccessDialog(true);

      toast({
        title: "Notification sent",
        description: `Created ${result.notificationsCreated ?? 0} notifications, sent ${result.emailsSent ?? 0} emails.`,
      });

      if (result.errors && result.errors.length > 0) {
        // Show a second toast with a short summary so admin knows some emails failed
        toast({
          title: "Partial delivery",
          description: "Some emails could not be sent. Check logs for details.",
          variant: "destructive",
        });
        console.warn('Some errors occurred:', result.errors);
      }

      // Reset form
      setTitle('');
      setMessage('');
      setTarget('all');
      setSelectedUserIds([]);
    } catch (error: any) {
      console.error('Error sending notification:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send notification.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--ln-ink-2)',
    marginBottom: 6,
  };

  return (
    <div style={{ background: 'var(--ln-bg)', color: 'var(--ln-ink)', minHeight: 'calc(100vh - 140px)' }}>
      {/* Header */}
      <div
        style={{
          padding: '22px 28px',
          borderBottom: '1px solid var(--ln-line)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <button className="ln-btn" style={{ padding: 8 }} onClick={() => navigate('/admin')} aria-label="Back">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Bell className="w-6 h-6" style={{ color: 'var(--ln-brand)' }} />
          <div>
            <span className="ln-eyebrow">Outreach</span>
            <h1 className="ln-display" style={{ fontSize: 26, margin: '4px 0 0', letterSpacing: '-0.02em' }}>
              Send notification
            </h1>
            <p style={{ fontSize: 12.5, color: 'var(--ln-ink-3)', margin: '4px 0 0' }}>
              Send notifications to users (in-app and email)
            </p>
          </div>
        </div>
      </div>

      <div style={{ padding: '22px 28px 40px', maxWidth: 860, margin: '0 auto' }}>
        <div style={{ border: '1px solid var(--ln-line)', background: 'var(--ln-surface)', padding: 22 }}>
          <span className="ln-eyebrow">Compose</span>
          <h2 className="ln-display" style={{ fontSize: 20, margin: '6px 0 4px', letterSpacing: '-0.01em' }}>
            Create notification
          </h2>
          <p style={{ fontSize: 12.5, color: 'var(--ln-ink-3)', margin: '0 0 20px' }}>
            Send a notification to users. They will receive it both in-app and via email.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Title */}
            <div>
              <label htmlFor="title" style={labelStyle}>Title *</label>
              <input
                id="title"
                className="ln-input"
                placeholder="Enter notification title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isSending}
              />
            </div>

            {/* Message */}
            <div>
              <label htmlFor="message" style={labelStyle}>Message *</label>
              <textarea
                id="message"
                className="ln-input"
                placeholder="Enter notification message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={isSending}
                rows={6}
                style={{ resize: 'vertical', minHeight: 120, fontFamily: 'var(--ln-font-sans)' }}
              />
            </div>

            {/* Target Selection */}
            <div>
              <span style={labelStyle}>Send To *</span>
              <RadioGroup value={target} onValueChange={(value) => setTarget(value as 'all' | 'selected')}>
                <div className="flex items-center space-x-2" style={{ marginBottom: 8 }}>
                  <RadioGroupItem value="all" id="all" disabled={isSending} />
                  <label htmlFor="all" style={{ fontSize: 13, color: 'var(--ln-ink)', cursor: 'pointer' }}>
                    All Users
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="selected" id="selected" disabled={isSending} />
                  <label htmlFor="selected" style={{ fontSize: 13, color: 'var(--ln-ink)', cursor: 'pointer' }}>
                    Select Users
                  </label>
                </div>
              </RadioGroup>
            </div>

            {/* User Selection */}
            {target === 'selected' && (
              <div style={{ border: '1px solid var(--ln-line-2)', background: 'var(--ln-surface-2)', padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span className="ln-eyebrow">Select users</span>
                  <button
                    className="ln-btn"
                    style={{ padding: '5px 10px', fontSize: 11 }}
                    onClick={handleSelectAll}
                    disabled={isLoadingUsers || isSending}
                  >
                    {selectedUserIds.length === filteredUsers.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                {isLoadingUsers ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 0' }}>
                    <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--ln-brand)' }} />
                  </div>
                ) : (
                  <>
                    {/* Search */}
                    <div style={{ position: 'relative', marginBottom: 12 }}>
                      <span
                        style={{
                          position: 'absolute',
                          left: 10,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: 'var(--ln-ink-4)',
                          display: 'inline-flex',
                        }}
                      >
                        <Search className="w-4 h-4" />
                      </span>
                      <input
                        className="ln-input"
                        style={{ paddingLeft: 32 }}
                        placeholder="Search users by email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        disabled={isSending}
                      />
                    </div>

                    {/* User List */}
                    <div style={{ maxHeight: 256, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {filteredUsers.length === 0 ? (
                        <p style={{ fontSize: 12.5, color: 'var(--ln-ink-3)', textAlign: 'center', padding: '16px 0' }}>
                          {searchTerm ? 'No users found' : 'No users available'}
                        </p>
                      ) : (
                        filteredUsers.map((user) => (
                          <label
                            key={user.id}
                            htmlFor={user.id}
                            className="flex items-center space-x-2"
                            style={{ padding: '8px', cursor: 'pointer', borderRadius: 4 }}
                          >
                            <Checkbox
                              id={user.id}
                              checked={selectedUserIds.includes(user.id)}
                              onCheckedChange={() => handleUserToggle(user.id)}
                              disabled={isSending}
                            />
                            <span style={{ fontSize: 13, color: 'var(--ln-ink)', flex: 1 }}>
                              {user.email}
                            </span>
                          </label>
                        ))
                      )}
                    </div>

                    {selectedUserIds.length > 0 && (
                      <p style={{ fontSize: 12, color: 'var(--ln-ink-3)', marginTop: 10 }}>
                        {selectedUserIds.length} user{selectedUserIds.length !== 1 ? 's' : ''} selected
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Send Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 4 }}>
              <button
                className="ln-btn is-primary"
                onClick={handleSend}
                disabled={isSending || !title.trim() || !message.trim() || (target === 'selected' && selectedUserIds.length === 0)}
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Notification
                  </>
                )}
              </button>
              <button className="ln-btn" onClick={() => navigate('/admin')} disabled={isSending}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full"
                style={{ background: 'rgba(78,224,196,0.12)' }}
              >
                <CheckCircle2 className="h-6 w-6" style={{ color: 'var(--ln-brand)' }} />
              </div>
              <div>
                <DialogTitle className="text-xl">
                  Notification Sent Successfully!
                </DialogTitle>
                <DialogDescription className="mt-1">
                  Successfully sent notification to {successDetails?.notificationsCreated ?? 0} user{(successDetails?.notificationsCreated ?? 0) !== 1 ? 's' : ''}. {successDetails?.emailsSent ?? 0} email{(successDetails?.emailsSent ?? 0) !== 1 ? 's' : ''} delivered.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {successDetails && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '16px 0' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  border: '1px solid var(--ln-line-2)',
                  background: 'var(--ln-surface-2)',
                  padding: 12,
                }}
              >
                <MessageSquare className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--ln-info, #6ab7ff)' }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: 'var(--ln-ink)' }}>
                    {successDetails.notificationsCreated} in-app notification{successDetails.notificationsCreated !== 1 ? 's' : ''}
                  </p>
                  <p style={{ fontSize: 11.5, color: 'var(--ln-ink-3)', margin: '2px 0 0' }}>
                    Users will see this in their notification bell
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  border: '1px solid var(--ln-line-2)',
                  background: 'var(--ln-surface-2)',
                  padding: 12,
                }}
              >
                <Mail className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--ln-brand)' }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: 'var(--ln-ink)' }}>
                    {successDetails.emailsSent} email{successDetails.emailsSent !== 1 ? 's' : ''} sent
                  </p>
                  <p style={{ fontSize: 11.5, color: 'var(--ln-ink-3)', margin: '2px 0 0' }}>
                    Email notifications delivered via Resend
                  </p>
                </div>
              </div>

              {successDetails.errors.length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    border: '1px solid color-mix(in oklab, var(--ln-warn) 40%, transparent)',
                    background: 'color-mix(in oklab, var(--ln-warn) 12%, transparent)',
                    padding: 12,
                  }}
                >
                  <XCircle className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--ln-warn)' }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: 'var(--ln-warn)' }}>
                      {successDetails.errors.length} email{successDetails.errors.length !== 1 ? 's' : ''} failed
                    </p>
                    <p style={{ fontSize: 11.5, color: 'var(--ln-ink-3)', margin: '2px 0 0' }}>
                      Check console logs for details
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <button className="ln-btn is-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setShowSuccessDialog(false)}>
              Done
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

