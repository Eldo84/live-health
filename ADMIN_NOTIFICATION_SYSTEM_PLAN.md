# Admin Notification System - Implementation Plan

## 🎯 Overview

Simple but working feature that allows admins to:
1. Type a notification with **title** and **content**
2. Select **all users** or **select specific users**
3. Send notification - both **in-app** and **via email** (Resend)

---

## 📋 System Architecture

### Flow Diagram
```
Admin Opens Notification Panel
  ↓
Fills Title + Content
  ↓
Selects: "All Users" OR "Select Users" (multi-select)
  ↓
Clicks "Send Notification"
  ↓
Frontend calls Edge Function
  ↓
Edge Function:
  1. Creates in-app notifications in database (for selected users)
  2. Sends emails via Resend (for users with emails)
  ↓
Users receive:
  - In-app notification (real-time via Supabase subscription)
  - Email notification (via Resend)
```

---

## 🗄️ Database Changes

### 1. Update `notifications` table type constraint

**Migration:** `supabase/migrations/[timestamp]_add_admin_notification_type.sql`

```sql
-- Add new notification type for admin broadcasts
ALTER TABLE notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
  'submission_created',
  'submission_approved',
  'submission_rejected',
  'payment_required',
  'payment_received',
  'ad_live',
  'ad_expiring',
  'ad_expired',
  'admin_broadcast'  -- NEW: Admin-sent notifications
));
```

**Why:** The current `notifications` table has a CHECK constraint that only allows specific types. We need to add `'admin_broadcast'` to allow admin-sent notifications.

---

## 🎨 Frontend Components

### 1. Admin Notification Panel Component

**File:** `src/screens/Admin/AdminNotificationPanel.tsx`

**Features:**
- Form with:
  - **Title** input (required)
  - **Content/Message** textarea (required)
  - **Target Selection:**
    - Radio button: "All Users" or "Select Users"
    - If "Select Users": Multi-select dropdown with user list
  - **Send** button

**User Selection:**
- Fetch users from `auth.users` (via edge function or RPC)
- Display: `email` or `id` (whichever is available)
- Multi-select with search/filter capability

**UI Structure:**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Send Notification</CardTitle>
  </CardHeader>
  <CardContent>
    <Form>
      <Input label="Title" />
      <Textarea label="Message" />
      <RadioGroup>
        <Radio value="all">All Users</Radio>
        <Radio value="selected">Select Users</Radio>
      </RadioGroup>
      {selected === "selected" && (
        <MultiSelect users={users} />
      )}
      <Button onClick={handleSend}>Send Notification</Button>
    </Form>
  </CardContent>
</Card>
```

### 2. Add to Admin Dashboard

**File:** `src/screens/Admin/AdminDashboard.tsx`

Add new section card:
```tsx
{
  id: 'notifications',
  title: 'Send Notifications',
  description: 'Send notifications to users',
  icon: Bell,
  path: '/admin/notifications',
  color: 'text-green-600',
  bgColor: 'bg-green-50 dark:bg-green-900/20',
  borderColor: 'border-green-200 dark:border-green-800',
}
```

### 3. Add Route

**File:** `src/index.tsx`

```tsx
<Route path="/admin" element={<AppLayout />}>
  <Route index element={<AdminDashboard />} />
  <Route path="advertising" element={<AdminAdvertisingPanel />} />
  <Route path="alerts" element={<AdminAlertReviewPanel />} />
  <Route path="notifications" element={<AdminNotificationPanel />} /> {/* NEW */}
</Route>
```

---

## ⚙️ Backend: Edge Function

### Edge Function: `send-admin-notification`

**File:** `supabase/functions/send-admin-notification/index.ts`

**Purpose:**
1. Verify admin authentication
2. Create in-app notifications in database
3. Send emails via Resend

**Input:**
```typescript
{
  title: string;
  message: string;
  target: 'all' | 'selected';
  userIds?: string[]; // Only if target === 'selected'
}
```

**Process:**
1. **Verify Admin:**
   ```typescript
   const { data: { user } } = await supabase.auth.getUser(token);
   // Check if user is admin via user_roles table
   ```

2. **Get Target Users:**
   - If `target === 'all'`: Fetch all users from `auth.users`
   - If `target === 'selected'`: Use provided `userIds`

3. **Create In-App Notifications:**
   ```typescript
   const notifications = userIds.map(userId => ({
     user_id: userId,
     type: 'admin_broadcast',
     title: title,
     message: message,
     priority: 'normal',
     read: false
   }));
   
   await supabase.from('notifications').insert(notifications);
   ```

4. **Send Emails via Resend:**
   ```typescript
   // For each user, get email from auth.users
   // Send email via Resend API
   for (const userId of userIds) {
     const { data: userData } = await supabase.auth.admin.getUserById(userId);
     if (userData?.user?.email) {
       await sendEmailViaResend({
         to: userData.user.email,
         subject: title,
         html: message
       });
     }
   }
   ```

**Resend Integration:**
```typescript
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

async function sendEmailViaResend({ to, subject, html }: {
  to: string;
  subject: string;
  html: string;
}) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "OutbreakNow <notifications@outbreaknow.com>", // Update with your domain
      to: [to],
      subject: subject,
      html: html,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Resend API error: ${response.statusText}`);
  }
  
  return response.json();
}
```

**Response:**
```typescript
{
  success: true,
  notificationsCreated: number,
  emailsSent: number,
  errors?: string[]
}
```

---

## 🔐 Security & Permissions

### 1. Admin Verification

**In Edge Function:**
```typescript
// Check if user is admin
const { data: roleData } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', user.id)
  .single();

if (roleData?.role !== 'admin') {
  return new Response(
    JSON.stringify({ error: 'Unauthorized' }),
    { status: 403, headers: corsHeaders }
  );
}
```

### 2. RLS Policy for Notifications

**Already exists:** The current RLS policy allows inserts, so admin can create notifications via edge function (which uses service role key).

**Optional:** Add admin-specific policy for viewing all notifications:
```sql
-- Admins can view all notifications (for analytics)
CREATE POLICY "Admins can view all notifications"
  ON notifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
```

---

## 📧 Email Template (Resend)

### Simple HTML Template

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #007bff; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9f9f9; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>OutbreakNow</h1>
    </div>
    <div class="content">
      <h2>{{title}}</h2>
      <p>{{message}}</p>
    </div>
    <div class="footer">
      <p>You received this notification from OutbreakNow.</p>
    </div>
  </div>
</body>
</html>
```

**Note:** For simplicity, we can use plain text or simple HTML. Resend supports both.

---

## 🚀 Implementation Steps

### Step 1: Database Migration
1. Create migration file to add `'admin_broadcast'` to notification types
2. Apply migration

### Step 2: Edge Function
1. Create `supabase/functions/send-admin-notification/index.ts`
2. Implement admin verification
3. Implement notification creation
4. Implement Resend email sending
5. Deploy edge function
6. Set `RESEND_API_KEY` secret in Supabase Dashboard

### Step 3: Frontend Component
1. Create `AdminNotificationPanel.tsx`
2. Add user fetching logic (via edge function or RPC)
3. Add form with title, message, target selection
4. Add multi-select for user selection
5. Add API call to edge function
6. Add success/error handling

### Step 4: Integration
1. Add route in `src/index.tsx`
2. Add card in `AdminDashboard.tsx`
3. Test with admin account

### Step 5: Testing
1. Test sending to all users
2. Test sending to specific users
3. Verify in-app notifications appear
4. Verify emails are sent
5. Test error handling

---

## 🔧 Configuration

### Environment Variables

**Supabase Edge Function Secrets:**
- `RESEND_API_KEY` - Your Resend API key
- `SUPABASE_URL` - Auto-set
- `SUPABASE_SERVICE_ROLE_KEY` - Auto-set

**How to get Resend API Key:**
1. Sign up at https://resend.com
2. Go to API Keys section
3. Create new API key
4. Copy and add to Supabase Edge Function secrets

### Resend Domain Setup
- You'll need to verify a domain in Resend (or use their test domain)
- Update `from` email in edge function to match your verified domain

---

## 📝 API Contract

### Request (Frontend → Edge Function)

**Endpoint:** `POST /functions/v1/send-admin-notification`

**Headers:**
```
Authorization: Bearer [user_jwt_token]
Content-Type: application/json
```

**Body:**
```json
{
  "title": "Important Update",
  "message": "This is a test notification from admin.",
  "target": "all" | "selected",
  "userIds": ["uuid1", "uuid2"] // Only if target === "selected"
}
```

### Response

**Success (200):**
```json
{
  "success": true,
  "notificationsCreated": 150,
  "emailsSent": 150,
  "errors": []
}
```

**Error (403):**
```json
{
  "error": "Unauthorized - Admin access required"
}
```

**Error (400):**
```json
{
  "error": "Invalid request: title and message are required"
}
```

---

## 🎨 UI/UX Considerations

### User Selection UI

**Option 1: Simple Multi-Select Dropdown**
- Dropdown with checkboxes
- Search/filter capability
- Shows user email or ID

**Option 2: User List with Checkboxes**
- Scrollable list
- Search bar at top
- "Select All" checkbox

**Recommendation:** Start with Option 1 (simpler), can enhance later.

### Loading States
- Show loading spinner when sending
- Disable form during send
- Show progress if sending to many users

### Success/Error Feedback
- Toast notification on success
- Show count: "Sent to 150 users"
- Show errors if any emails failed

---

## 🧪 Testing Checklist

- [ ] Admin can access notification panel
- [ ] Non-admin cannot access (403)
- [ ] Form validation works (title/message required)
- [ ] "All Users" option works
- [ ] "Select Users" option works
- [ ] Multi-select displays users correctly
- [ ] In-app notifications created in database
- [ ] In-app notifications appear in user's notification bell
- [ ] Emails sent via Resend
- [ ] Email content matches notification
- [ ] Error handling works (invalid API key, network errors)
- [ ] Loading states work correctly
- [ ] Success message shows correct counts

---

## 🚨 Error Handling

### Edge Cases to Handle

1. **No users found:**
   - Return success with 0 counts
   - Show message: "No users to notify"

2. **Some emails fail:**
   - Continue sending to other users
   - Return errors array with failed emails
   - Show partial success message

3. **Resend API key missing:**
   - Return error: "Email service not configured"
   - Still create in-app notifications

4. **Invalid user IDs:**
   - Skip invalid IDs
   - Continue with valid ones
   - Return errors for invalid IDs

5. **Database insert fails:**
   - Rollback if possible
   - Return error with details

---

## 📊 Future Enhancements (Not in MVP)

- [ ] Notification templates
- [ ] Scheduled notifications
- [ ] Notification history/analytics
- [ ] Rich text editor for message
- [ ] Email template customization
- [ ] Notification preview
- [ ] Batch sending with progress bar
- [ ] User groups/segments
- [ ] Notification preferences per user

---

## ✅ Summary

**Simple but Working Feature:**

1. **Database:** Add `'admin_broadcast'` notification type
2. **Edge Function:** `send-admin-notification` - creates notifications + sends emails
3. **Frontend:** `AdminNotificationPanel` - form with title, message, user selection
4. **Integration:** Add to admin dashboard and routing

**Key Files to Create/Modify:**
- `supabase/migrations/[timestamp]_add_admin_notification_type.sql`
- `supabase/functions/send-admin-notification/index.ts`
- `src/screens/Admin/AdminNotificationPanel.tsx`
- `src/screens/Admin/AdminDashboard.tsx` (add card)
- `src/index.tsx` (add route)

**Estimated Time:** 2-3 hours for full implementation

---

## 🎯 Next Steps

1. Review this plan
2. Confirm approach
3. Start with database migration
4. Build edge function
5. Build frontend component
6. Test end-to-end
7. Deploy

