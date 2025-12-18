import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Loader2, ArrowLeft, Bell, Send, Users, Search, CheckCircle2, XCircle, Mail, MessageSquare
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
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/admin')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <Bell className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  Send Notification
                </h1>
                <p className="text-sm font-medium text-foreground/70 mt-1">
                  Send notifications to users (in-app and email)
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Create Notification</CardTitle>
            <CardDescription>
              Send a notification to users. They will receive it both in-app and via email.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Enter notification title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isSending}
              />
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                placeholder="Enter notification message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={isSending}
                rows={6}
              />
            </div>

            {/* Target Selection */}
            <div className="space-y-4">
              <Label>Send To *</Label>
              <RadioGroup value={target} onValueChange={(value) => setTarget(value as 'all' | 'selected')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="all" disabled={isSending} />
                  <Label htmlFor="all" className="font-normal cursor-pointer">
                    All Users
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="selected" id="selected" disabled={isSending} />
                  <Label htmlFor="selected" className="font-normal cursor-pointer">
                    Select Users
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* User Selection */}
            {target === 'selected' && (
              <div className="space-y-4 border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <Label>Select Users</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                    disabled={isLoadingUsers || isSending}
                  >
                    {selectedUserIds.length === filteredUsers.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>

                {isLoadingUsers ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search users by email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                        disabled={isSending}
                      />
                    </div>

                    {/* User List */}
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {filteredUsers.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          {searchTerm ? 'No users found' : 'No users available'}
                        </p>
                      ) : (
                        filteredUsers.map((user) => (
                          <div
                            key={user.id}
                            className="flex items-center space-x-2 p-2 hover:bg-muted rounded"
                          >
                            <Checkbox
                              id={user.id}
                              checked={selectedUserIds.includes(user.id)}
                              onCheckedChange={() => handleUserToggle(user.id)}
                              disabled={isSending}
                            />
                            <Label
                              htmlFor={user.id}
                              className="font-normal cursor-pointer flex-1"
                            >
                              {user.email}
                            </Label>
                          </div>
                        ))
                      )}
                    </div>

                    {selectedUserIds.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        {selectedUserIds.length} user{selectedUserIds.length !== 1 ? 's' : ''} selected
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Send Button */}
            <div className="flex items-center gap-4 pt-4">
              <Button
                onClick={handleSend}
                disabled={isSending || !title.trim() || !message.trim() || (target === 'selected' && selectedUserIds.length === 0)}
                className="flex items-center gap-2"
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
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/admin')}
                disabled={isSending}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/20">
                <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
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
            <div className="space-y-3 py-4">
              <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {successDetails.notificationsCreated} in-app notification{successDetails.notificationsCreated !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Users will see this in their notification bell
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                <Mail className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {successDetails.emailsSent} email{successDetails.emailsSent !== 1 ? 's' : ''} sent
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Email notifications delivered via Resend
                  </p>
                </div>
              </div>

              {successDetails.errors.length > 0 && (
                <div className="flex items-center gap-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3">
                  <XCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      {successDetails.errors.length} email{successDetails.errors.length !== 1 ? 's' : ''} failed
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      Check console logs for details
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowSuccessDialog(false)} className="w-full">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

