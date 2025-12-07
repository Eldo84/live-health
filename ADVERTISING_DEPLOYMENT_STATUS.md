# Advertising System Deployment Status

## ✅ Successfully Deployed

### Database Migration
**Status:** ✅ Applied Successfully

The migration `create_advertising_system` has been applied to your Supabase database. This created:

1. **6 Tables:**
   - `user_roles` - Admin access control
   - `advertising_submissions` - Form submissions
   - `subscriptions` - Stripe subscription data
   - `payments` - Payment transaction history
   - `sponsored_content` - Approved ads on map
   - `advertising_analytics` - View/click tracking

2. **Database Functions:**
   - `get_plan_defaults(plan)` - Returns plan configuration
   - `increment_sponsored_view(content_id)` - Increments view count
   - `increment_sponsored_click(content_id)` - Increments click count
   - `is_admin(user_id)` - Checks if user is admin
   - `get_active_sponsored_content(location)` - Fetches active ads

3. **Triggers:**
   - Auto-update `updated_at` timestamps on all tables

4. **RLS Policies:**
   - All tables have Row Level Security enabled
   - Users can only see their own data
   - Admins can see all data
   - Public can view active sponsored content

---

### Edge Functions
**Status:** ✅ Deployed and Active

#### 1. `create-checkout-session`
- **Status:** ACTIVE (Version 1)
- **Purpose:** Creates Stripe checkout sessions for approved submissions
- **Endpoint:** `/functions/v1/create-checkout-session`
- **Authentication:** Required (JWT verified)

#### 2. `stripe-webhook`
- **Status:** ACTIVE (Version 1)
- **Purpose:** Handles Stripe webhook events (payment success, failures, refunds)
- **Endpoint:** `/functions/v1/stripe-webhook`
- **Authentication:** Not required (webhook signature verification)

---

## 🔧 Next Steps Required

### 1. Set Stripe Environment Variables

In Supabase Dashboard → Edge Functions → Settings → Secrets, add:

```
STRIPE_SECRET_KEY=sk_test_... (or sk_live_... for production)
STRIPE_WEBHOOK_SECRET=whsec_... (from Stripe Dashboard → Webhooks)
```

**How to get these:**
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. **API Keys:** Settings → API keys → Copy Secret key
3. **Webhook Secret:** Developers → Webhooks → Create endpoint → Copy signing secret

---

### 2. Create Storage Buckets

In Supabase Dashboard → Storage, create:

#### Bucket: `advertising-documents`
- **Public:** No (private)
- **File size limit:** 10MB
- **Allowed MIME types:** 
  - `application/pdf`
  - `application/msword`
  - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
  - `image/jpeg`
  - `image/png`

**Storage Policies:**
- Public can UPLOAD
- Authenticated users can READ their own files
- Admins can READ/DELETE all files

#### Bucket: `sponsored-images`
- **Public:** Yes (public)
- **File size limit:** 5MB
- **Allowed MIME types:**
  - `image/jpeg`
  - `image/png`
  - `image/webp`

**Storage Policies:**
- Admins can UPLOAD/DELETE
- Public can READ

---

### 3. Set Up Admin User

Run this SQL in Supabase SQL Editor (replace with your user ID):

```sql
-- Get your user ID first
SELECT id, email FROM auth.users;

-- Then insert admin role (replace 'YOUR_USER_ID' with actual ID)
INSERT INTO user_roles (user_id, role) 
VALUES ('YOUR_USER_ID', 'admin')
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
```

**Or via Supabase Dashboard:**
1. Go to Authentication → Users
2. Find your user and copy the UUID
3. Go to Table Editor → `user_roles`
4. Insert new row:
   - `user_id`: Your UUID
   - `role`: `admin`

---

### 4. Configure Stripe Webhook

In Stripe Dashboard → Developers → Webhooks:

1. **Add endpoint:**
   - URL: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook`
   - Events to listen for:
     - `checkout.session.completed`
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `charge.refunded`

2. **Copy webhook signing secret** and add to Supabase Edge Function secrets as `STRIPE_WEBHOOK_SECRET`

---

## 🧪 Testing the Flow

### 1. Test Form Submission
1. Go to `/` → Advertise tab
2. Fill out the form
3. Submit
4. Check `advertising_submissions` table - should see new record with `status='pending_review'`

### 2. Test Admin Review
1. Go to `/admin/advertising` (must be logged in as admin)
2. See pending submission
3. Click "Approve"
4. Submission status should change to `approved_pending_payment`

### 3. Test Payment
1. User goes to `/dashboard/advertising`
2. Sees approved submission with "Pay Now" button
3. Clicks button → redirects to `/payment/:submissionId`
4. Completes Stripe checkout
5. Webhook processes payment → creates `sponsored_content` record

### 4. Test Display
1. Go to `/map`
2. Check Sponsored Section (right sidebar)
3. Should see the new ad displayed with plan-based priority

---

## 📋 Verification Checklist

- [x] Database migration applied
- [x] Edge functions deployed
- [ ] Stripe secrets configured
- [ ] Storage buckets created
- [ ] Admin user created
- [ ] Stripe webhook configured
- [ ] Test form submission
- [ ] Test admin approval
- [ ] Test payment flow
- [ ] Test ad display

---

## 🐛 Troubleshooting

### Edge Functions Not Working
- Check that Stripe secrets are set in Supabase Dashboard
- Check Edge Function logs in Supabase Dashboard → Edge Functions → Logs

### RLS Policy Errors
- Make sure you're logged in when accessing user dashboard
- Check that admin role is set correctly in `user_roles` table

### Payment Not Processing
- Verify Stripe webhook is configured correctly
- Check webhook logs in Stripe Dashboard
- Check Edge Function logs for errors

### Ads Not Showing
- Verify `sponsored_content` records exist
- Check `is_active = true` and dates are valid
- Verify RLS policies allow public read access

---

## 📚 Documentation

- **Migration File:** `supabase/migrations/20250201000000_create_advertising_system.sql`
- **Edge Functions:** 
  - `supabase/functions/create-checkout-session/index.ts`
  - `supabase/functions/stripe-webhook/index.ts`
- **Implementation Plan:** `ADVERTISING_IMPLEMENTATION_SUMMARY.md`

---

**System is ready!** Complete the setup steps above and you can start accepting advertising submissions.

