# Authenticated Advertising System - Complete Plan

## 🎯 Updated Requirements

**Key Changes:**
1. ✅ **Authentication Required** - Only logged-in users can submit
2. ✅ **In-App Real-Time Notifications** - No email system needed
3. ✅ **User Dashboard** - Track all submissions in one place
4. ✅ **Spam Prevention** - Simplified (users are authenticated)

---

## 📋 System Overview

### Core Flow:
```
User Logs In
  ↓
Submits Advertising Form
  ↓
Submission Created (status: 'pending_review')
  ↓
Real-Time Notification Sent to User
  ↓
Admin Reviews Submission
  ↓
Real-Time Notification: Status Updated
  ↓
If Approved → Payment Link in Notification
  ↓
User Pays → Ad Goes Live
  ↓
Real-Time Notification: Payment Confirmed
```

---

## 🔔 Part 1: Real-Time Notification System

### Database Schema:

```sql
-- Notifications table
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Notification details
  type text NOT NULL CHECK (type IN (
    'submission_created',
    'submission_approved',
    'submission_rejected',
    'payment_required',
    'payment_received',
    'ad_live',
    'ad_expiring',
    'ad_expired'
  )),
  
  title text NOT NULL,
  message text NOT NULL,
  action_url text, -- Link to relevant page (e.g., payment page, dashboard)
  action_label text, -- Button text (e.g., "Pay Now", "View Details")
  
  -- Related entities
  submission_id uuid REFERENCES advertising_submissions(id) ON DELETE CASCADE,
  payment_id uuid REFERENCES payments(id) ON DELETE SET NULL,
  
  -- Status
  read boolean DEFAULT false,
  read_at timestamptz,
  
  -- Priority (for sorting)
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- Metadata
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_submission_id ON notifications(submission_id);

-- RLS Policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- System can insert notifications (via service role or triggers)
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true); -- Will be restricted by triggers/functions
```

### Real-Time Subscription (Frontend):

```typescript
// Subscribe to user's notifications
const channel = supabase
  .channel('user_notifications')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${user.id}`
    },
    (payload) => {
      // New notification received!
      showNotification(payload.new);
      updateNotificationCount();
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
      // Notification updated
      updateNotification(payload.new);
    }
  )
  .subscribe();
```

### Notification Types & Messages:

1. **submission_created**
   - Title: "Application Submitted"
   - Message: "Your advertising application for {company_name} has been received. We'll review it within 24-48 hours."
   - Action: "View Submission" → `/dashboard/advertising/submissions/{id}`

2. **submission_approved**
   - Title: "Application Approved! 🎉"
   - Message: "Your advertising application has been approved. Complete payment to activate your ad."
   - Action: "Pay Now" → `/advertising/payment/{submission_id}`
   - Priority: `high`

3. **submission_rejected**
   - Title: "Application Update"
   - Message: "Your application was not approved. Reason: {rejection_reason}"
   - Action: "View Details" → `/dashboard/advertising/submissions/{id}`
   - Priority: `normal`

4. **payment_required**
   - Title: "Payment Required"
   - Message: "Your approved application is waiting for payment. Complete payment within 7 days."
   - Action: "Pay Now" → `/advertising/payment/{submission_id}`
   - Priority: `urgent`

5. **payment_received**
   - Title: "Payment Confirmed ✅"
   - Message: "Your payment has been received. Your ad will go live shortly!"
   - Action: "View Ad" → `/dashboard/advertising/ads/{id}`
   - Priority: `high`

6. **ad_live**
   - Title: "Your Ad is Now Live! 🚀"
   - Message: "Your advertisement for {company_name} is now active on OutbreakNow."
   - Action: "View Analytics" → `/dashboard/advertising/analytics/{id}`
   - Priority: `high`

7. **ad_expiring**
   - Title: "Ad Expiring Soon"
   - Message: "Your ad will expire in {days} days. Renew to continue advertising."
   - Action: "Renew Ad" → `/dashboard/advertising/ads/{id}/renew`
   - Priority: `normal`

8. **ad_expired**
   - Title: "Ad Expired"
   - Message: "Your advertisement has expired. Submit a new application to continue."
   - Action: "Create New Ad" → `/advertising`
   - Priority: `normal`

---

## 🛡️ Part 2: Spam Prevention (Simplified)

Since users are authenticated, spam prevention is simpler:

### 1. Rate Limiting (Per User)
```sql
-- Track user submissions
CREATE TABLE user_submission_stats (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  total_submissions integer DEFAULT 0,
  approved_submissions integer DEFAULT 0,
  rejected_submissions integer DEFAULT 0,
  last_submission_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Rate limit rules:
-- - Max 5 submissions per user per 30 days
-- - Max 2 pending submissions at once
-- - Auto-flag if >3 rejections in 30 days
```

### 2. Content Validation
- Check for spam keywords in description
- Validate company name (not just random text)
- Check website URL validity
- Minimum description length (e.g., 50 characters)

### 3. User Reputation System
```sql
-- Add to user_submission_stats
ALTER TABLE user_submission_stats
ADD COLUMN reputation_score integer DEFAULT 100, -- 0-100
ADD COLUMN is_flagged boolean DEFAULT false,
ADD COLUMN flag_reason text;

-- Reputation rules:
-- - Start at 100
-- - -10 for each rejection
-- - +5 for each approval
-- - Flag if reputation < 50
-- - Auto-approve if reputation > 90 (optional)
```

### 4. Database Functions
```sql
-- Check if user can submit
CREATE FUNCTION can_user_submit(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_stats user_submission_stats%ROWTYPE;
  v_pending_count integer;
BEGIN
  -- Get user stats
  SELECT * INTO v_stats
  FROM user_submission_stats
  WHERE user_id = p_user_id;
  
  -- Check pending submissions
  SELECT COUNT(*) INTO v_pending_count
  FROM advertising_submissions
  WHERE user_id = p_user_id
    AND status IN ('pending_review', 'approved_pending_payment');
  
  -- Check rate limits
  IF v_stats.total_submissions >= 5 AND 
     v_stats.last_submission_at > NOW() - INTERVAL '30 days' THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Maximum 5 submissions per 30 days'
    );
  END IF;
  
  IF v_pending_count >= 2 THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'You have 2 pending submissions. Please wait for review.'
    );
  END IF;
  
  IF v_stats.is_flagged THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Your account is flagged: ' || COALESCE(v_stats.flag_reason, 'Multiple rejections')
    );
  END IF;
  
  RETURN jsonb_build_object('allowed', true);
END;
$$;
```

---

## 📊 Part 3: User Dashboard Enhancements

### Dashboard Sections:

1. **My Submissions Tab**
   - List all submissions with status badges
   - Filter by status (pending, approved, rejected, active)
   - Sort by date
   - Quick actions: View, Edit (if pending), Pay (if approved)

2. **Active Ads Tab**
   - List all live advertisements
   - Show analytics (views, clicks)
   - Expiration countdown
   - Renew button

3. **Notifications Tab**
   - Real-time notification list
   - Mark as read/unread
   - Filter by type
   - Badge count for unread
   - Click to navigate to action

4. **Analytics Tab**
   - View/click charts
   - Performance metrics
   - Export data

---

## 🔄 Complete User Journey

### Authenticated User Flow:

1. **Login Required**
   - User must be logged in to access form
   - Redirect to login if not authenticated

2. **Submit Form**
   - Fill out advertising form
   - System checks rate limits
   - If allowed → Create submission
   - Send notification: "Application Submitted"
   - Update user stats

3. **Wait for Review**
   - User sees submission in dashboard
   - Real-time notification when admin reviews
   - Can check status anytime in dashboard

4. **Receive Decision**
   - **If Approved:**
     - Notification: "Application Approved! Pay Now"
     - Payment link in notification
     - User clicks → Stripe checkout
     - After payment → Notification: "Payment Confirmed"
     - Ad goes live → Notification: "Ad is Live!"
   
   - **If Rejected:**
     - Notification: "Application Not Approved"
     - Reason shown in dashboard
     - Can submit new application (if not rate limited)

5. **Track & Manage**
   - All submissions visible in dashboard
   - Real-time status updates
   - Analytics for active ads
   - Renew expired ads

---

## 🛠️ Implementation Components

### 1. Database Migrations
- Create `notifications` table
- Create `user_submission_stats` table
- Create notification trigger functions
- Create rate limiting functions
- Update `advertising_submissions` (remove anonymous fields)

### 2. Database Triggers
```sql
-- Auto-create notification when submission created
CREATE FUNCTION notify_submission_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (
    user_id, type, title, message, action_url, action_label, submission_id, priority
  ) VALUES (
    NEW.user_id,
    'submission_created',
    'Application Submitted',
    'Your advertising application for ' || NEW.company_name || ' has been received.',
    '/dashboard/advertising/submissions/' || NEW.id,
    'View Submission',
    NEW.id,
    'normal'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_submission_created
  AFTER INSERT ON advertising_submissions
  FOR EACH ROW
  EXECUTE FUNCTION notify_submission_created();

-- Auto-create notification when status changes
CREATE FUNCTION notify_submission_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status != OLD.status THEN
    CASE NEW.status
      WHEN 'approved_pending_payment' THEN
        INSERT INTO notifications (
          user_id, type, title, message, action_url, action_label, submission_id, priority
        ) VALUES (
          NEW.user_id,
          'submission_approved',
          'Application Approved! 🎉',
          'Your advertising application has been approved. Complete payment to activate your ad.',
          '/advertising/payment/' || NEW.id,
          'Pay Now',
          NEW.id,
          'high'
        );
      
      WHEN 'rejected' THEN
        INSERT INTO notifications (
          user_id, type, title, message, action_url, action_label, submission_id, priority
        ) VALUES (
          NEW.user_id,
          'submission_rejected',
          'Application Update',
          'Your application was not approved. ' || COALESCE(NEW.rejection_reason, 'Please review our guidelines.'),
          '/dashboard/advertising/submissions/' || NEW.id,
          'View Details',
          NEW.id,
          'normal'
        );
      
      WHEN 'active' THEN
        INSERT INTO notifications (
          user_id, type, title, message, action_url, action_label, submission_id, priority
        ) VALUES (
          NEW.user_id,
          'ad_live',
          'Your Ad is Now Live! 🚀',
          'Your advertisement for ' || NEW.company_name || ' is now active on OutbreakNow.',
          '/dashboard/advertising/ads/' || (SELECT id FROM sponsored_content WHERE submission_id = NEW.id LIMIT 1),
          'View Analytics',
          NEW.id,
          'high'
        );
    END CASE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_submission_status_change
  AFTER UPDATE ON advertising_submissions
  FOR EACH ROW
  WHEN (NEW.status != OLD.status)
  EXECUTE FUNCTION notify_submission_status_change();
```

### 3. Frontend Components
- `NotificationBell.tsx` - Notification icon with badge count
- `NotificationDropdown.tsx` - Dropdown with recent notifications
- `NotificationList.tsx` - Full notification list page
- `NotificationItem.tsx` - Individual notification component
- Update `AdvertiseForm.tsx` - Require authentication
- Update `UserAdvertisingDashboard.tsx` - Add notifications tab

### 4. Real-Time Hook
```typescript
// useNotifications.ts
export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    // Subscribe to real-time updates
    const channel = supabase
      .channel('user_notifications')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        // Handle real-time updates
        if (payload.eventType === 'INSERT') {
          setNotifications(prev => [payload.new, ...prev]);
          setUnreadCount(prev => prev + 1);
          // Show toast notification
          toast({
            title: payload.new.title,
            description: payload.new.message,
            action: payload.new.action_url ? (
              <Button onClick={() => navigate(payload.new.action_url)}>
                {payload.new.action_label}
              </Button>
            ) : undefined
          });
        }
      })
      .subscribe();

    // Fetch initial notifications
    fetchNotifications();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { notifications, unreadCount, markAsRead };
};
```

---

## 🎨 UI/UX Features

### Notification Bell (Header)
- Bell icon with red badge showing unread count
- Click to open dropdown
- Dropdown shows last 5 notifications
- "View All" link to full notifications page

### Notification Dropdown
- Real-time updates (new notifications appear instantly)
- Mark as read on click
- Action buttons (Pay Now, View Details, etc.)
- Timestamp (e.g., "2 minutes ago")
- Priority indicators (urgent = red, high = orange)

### Notification Page
- Full list of all notifications
- Filter by type, read/unread
- Mark all as read
- Clear old notifications
- Search functionality

---

## 📈 Admin Features

### Admin Dashboard Additions:
1. **User Stats View**
   - See user submission history
   - View reputation scores
   - Flag/unflag users
   - View rate limit status

2. **Notification Management**
   - View all notifications sent
   - Resend notifications
   - Bulk notifications

3. **Spam Detection**
   - Flag suspicious submissions
   - Auto-flag users with low reputation
   - Review flagged submissions first

---

## 🔐 Security & Privacy

1. **Authentication Required**
   - All submissions linked to user account
   - Can't submit without login
   - User identity verified

2. **Rate Limiting**
   - Per-user limits (not IP-based)
   - Prevents abuse
   - Fair for all users

3. **Data Privacy**
   - Users only see their own notifications
   - RLS policies enforce access control
   - GDPR compliant

---

## 📝 Implementation Priority

### Phase 1: Core System (MVP)
1. ✅ Require authentication for form
2. ✅ Create notifications table
3. ✅ Create notification triggers
4. ✅ Real-time notification subscription
5. ✅ Notification bell component
6. ✅ User dashboard with notifications

### Phase 2: Rate Limiting
1. ✅ User submission stats table
2. ✅ Rate limiting function
3. ✅ Check before submission
4. ✅ Update stats on submission/approval/rejection

### Phase 3: Enhanced Features
1. ⏳ Reputation system
2. ⏳ Content validation
3. ⏳ Notification preferences
4. ⏳ Notification history/archiving

---

## 🎯 Success Metrics

- **Submission Rate:** Track submissions per user
- **Approval Rate:** % of submissions approved
- **Payment Conversion:** % of approved submissions paid
- **Notification Engagement:** % of notifications clicked
- **User Retention:** % of users who submit multiple times

---

## ✅ Benefits of This Approach

1. **Simpler System**
   - No email service needed
   - No tracking tokens
   - No email verification
   - Everything in-app

2. **Better User Experience**
   - Real-time updates
   - All info in one place
   - No email spam
   - Instant notifications

3. **Better Spam Prevention**
   - Authenticated users only
   - User reputation system
   - Rate limiting per user
   - Can ban problematic users

4. **Easier to Maintain**
   - No email templates
   - No email service integration
   - Simpler codebase
   - Real-time is built into Supabase

---

## 🚀 Next Steps

1. **Review this plan** - Confirm approach
2. **Create database schema** - Notifications & stats tables
3. **Create triggers** - Auto-notifications
4. **Build notification components** - Bell, dropdown, list
5. **Add real-time subscription** - Frontend hook
6. **Update form** - Require authentication
7. **Add rate limiting** - Check before submission
8. **Test end-to-end** - Full user journey
9. **Deploy** - Go live!

---

**Ready to implement?** This is much simpler than the email-based system!

