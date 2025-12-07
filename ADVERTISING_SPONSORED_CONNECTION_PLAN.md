# Advertising Form to Sponsored Section Connection Plan

## Overview
Connect the "Advertise with Us" form on the home page to the "Sponsored" section on the map page, creating a complete workflow from advertising inquiry to displaying approved sponsored content.

---

## Current State Analysis

### 1. AdvertiseForm Component (`src/screens/mainpage/ui/AdvertiseForm.tsx`)
- **Location**: Home page, "Advertise" tab
- **Current Behavior**: 
  - Collects form data (company, contact, email, plan, description, document)
  - Only logs to console on submit
  - Shows success toast
  - No database persistence
- **Form Fields**:
  - Company Name (required)
  - Contact Name (required)
  - Email (required)
  - Phone (optional)
  - Website (optional)
  - Description (optional)
  - Selected Plan (required): basic, professional, enterprise
  - Document upload (optional): PDF, DOC, DOCX, JPG, PNG (max 10MB)

### 2. SponsoredSection Component (`src/screens/HomePageMap/sections/SponsoredSection/SponsoredSection.tsx`)
- **Location**: Map page, right sidebar (desktop) / bottom section (mobile)
- **Current Behavior**:
  - Displays hardcoded sponsored cards
  - Static data: image, location, time, playIcon
  - No database connection
- **Display Format**:
  - Card with image background
  - Gradient overlay
  - Location text (bottom left)
  - Time text (bottom right)
  - Play icon overlay (center)

---

## Database Schema Design

### Table 1: `advertising_submissions`
Stores advertising inquiry submissions from the form.

```sql
CREATE TABLE advertising_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User Account Link (if authenticated)
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Contact Information
  company_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text,
  website text,
  
  -- Submission Details
  description text,
  selected_plan text NOT NULL CHECK (selected_plan IN ('basic', 'professional', 'enterprise')),
  document_url text, -- URL to uploaded file in Supabase Storage
  
  -- Payment & Subscription
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE SET NULL,
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
  
  -- Status Tracking
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'approved', 'rejected', 'active', 'expired')),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  admin_notes text,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Indexes**:
- `idx_advertising_submissions_status` on `status`
- `idx_advertising_submissions_created_at` on `created_at`
- `idx_advertising_submissions_email` on `email`
- `idx_advertising_submissions_user_id` on `user_id`
- `idx_advertising_submissions_payment_status` on `payment_status`

**RLS Policies**:
- Public can INSERT (anyone can submit)
- Authenticated users can SELECT their own submissions (WHERE user_id = auth.uid())
- Admin role can SELECT/UPDATE all submissions

---

### Table 2: `sponsored_content`
Stores approved sponsored content that appears on the map.

```sql
CREATE TABLE sponsored_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to submission
  submission_id uuid REFERENCES advertising_submissions(id) ON DELETE SET NULL,
  
  -- Plan Information (inherited from submission)
  plan_type text NOT NULL CHECK (plan_type IN ('basic', 'professional', 'enterprise')),
  
  -- Content Details
  title text NOT NULL,
  description text,
  image_url text NOT NULL, -- Main image for the card
  play_icon_url text, -- Optional play icon overlay
  location text DEFAULT 'Global', -- Display location text
  click_url text, -- URL to navigate when clicked
  
  -- Display Settings (Plan-based)
  display_order integer DEFAULT 0, -- Order in the list (lower = first, plan-based priority)
  is_active boolean DEFAULT true,
  start_date date, -- When to start showing
  end_date date, -- When to stop showing (plan-based duration)
  
  -- Plan-based Features
  is_featured boolean DEFAULT false, -- Professional/Enterprise: Featured placement
  is_pinned boolean DEFAULT false, -- Enterprise: Pinned to top
  max_duration_days integer, -- Plan-based: Basic=30, Professional=60, Enterprise=90
  display_locations text[], -- Where to show: ['map', 'homepage', 'newsletter']
  
  -- Analytics
  click_count integer DEFAULT 0,
  view_count integer DEFAULT 0,
  analytics_level text DEFAULT 'basic' CHECK (analytics_level IN ('basic', 'advanced', 'custom')),
  
  -- Metadata
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Indexes**:
- `idx_sponsored_content_is_active` on `is_active`
- `idx_sponsored_content_display_order` on `display_order`
- `idx_sponsored_content_dates` on `start_date, end_date`
- `idx_sponsored_content_submission_id` on `submission_id`
- `idx_sponsored_content_plan_type` on `plan_type`
- `idx_sponsored_content_is_pinned` on `is_pinned`

**RLS Policies**:
- Public can SELECT where `is_active = true` and dates are valid
- Admin role can SELECT/INSERT/UPDATE/DELETE all

---

### Table 3: `subscriptions`
Stores subscription/payment information for advertising plans.

```sql
CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User Account
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  submission_id uuid REFERENCES advertising_submissions(id) ON DELETE SET NULL,
  
  -- Plan Information
  plan_type text NOT NULL CHECK (plan_type IN ('basic', 'professional', 'enterprise')),
  plan_price decimal(10,2) NOT NULL, -- Monthly price in USD
  
  -- Payment Provider (Stripe)
  stripe_customer_id text, -- Stripe customer ID
  stripe_subscription_id text, -- Stripe subscription ID
  stripe_payment_method_id text, -- Default payment method
  
  -- Subscription Status
  status text DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'unpaid', 'trialing')),
  current_period_start date NOT NULL,
  current_period_end date NOT NULL,
  cancel_at_period_end boolean DEFAULT false,
  cancelled_at timestamptz,
  
  -- Billing
  billing_cycle text DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  next_billing_date date,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Indexes**:
- `idx_subscriptions_user_id` on `user_id`
- `idx_subscriptions_status` on `status`
- `idx_subscriptions_stripe_subscription_id` on `stripe_subscription_id`
- `idx_subscriptions_current_period_end` on `current_period_end`

**RLS Policies**:
- Users can SELECT their own subscriptions (WHERE user_id = auth.uid())
- Admin role can SELECT/UPDATE all subscriptions

---

### Table 4: `payments`
Stores payment transaction history.

```sql
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User & Subscription
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE SET NULL,
  
  -- Payment Details
  amount decimal(10,2) NOT NULL, -- Amount in USD
  currency text DEFAULT 'usd',
  plan_type text NOT NULL CHECK (plan_type IN ('basic', 'professional', 'enterprise')),
  
  -- Stripe Integration
  stripe_payment_intent_id text UNIQUE, -- Stripe payment intent ID
  stripe_charge_id text, -- Stripe charge ID
  stripe_invoice_id text, -- Stripe invoice ID
  
  -- Payment Status
  status text NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded', 'partially_refunded')),
  
  -- Payment Method
  payment_method text, -- 'card', 'bank_transfer', etc.
  payment_method_last4 text, -- Last 4 digits of card
  
  -- Metadata
  description text,
  receipt_url text, -- URL to receipt/invoice
  paid_at timestamptz,
  refunded_at timestamptz,
  refund_amount decimal(10,2),
  
  created_at timestamptz DEFAULT now()
);
```

**Indexes**:
- `idx_payments_user_id` on `user_id`
- `idx_payments_subscription_id` on `subscription_id`
- `idx_payments_status` on `status`
- `idx_payments_stripe_payment_intent_id` on `stripe_payment_intent_id`
- `idx_payments_created_at` on `created_at`

**RLS Policies**:
- Users can SELECT their own payments (WHERE user_id = auth.uid())
- Admin role can SELECT all payments

---

### Table 5: `advertising_analytics`
Stores detailed analytics data for sponsored content.

```sql
CREATE TABLE advertising_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Content Reference
  sponsored_content_id uuid REFERENCES sponsored_content(id) ON DELETE CASCADE NOT NULL,
  submission_id uuid REFERENCES advertising_submissions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Event Type
  event_type text NOT NULL CHECK (event_type IN ('view', 'click', 'impression', 'engagement')),
  
  -- Event Details
  event_data jsonb, -- Additional event data (device, browser, location, etc.)
  referrer text, -- Where the user came from
  user_agent text, -- Browser/device info
  ip_address inet, -- IP address (for analytics, anonymized)
  
  -- Location Data (if available)
  country text,
  city text,
  latitude decimal(10,8),
  longitude decimal(11,8),
  
  -- Timestamp
  occurred_at timestamptz DEFAULT now()
);
```

**Indexes**:
- `idx_advertising_analytics_sponsored_content_id` on `sponsored_content_id`
- `idx_advertising_analytics_user_id` on `user_id`
- `idx_advertising_analytics_event_type` on `event_type`
- `idx_advertising_analytics_occurred_at` on `occurred_at`
- `idx_advertising_analytics_submission_id` on `submission_id`

**RLS Policies**:
- Users can SELECT analytics for their own content (via submission_id → user_id)
- Admin role can SELECT all analytics
- Public can INSERT (for tracking events)

---

### Table 6: `user_roles`
Manages user roles and permissions (for admin access).

```sql
CREATE TABLE user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  role text NOT NULL CHECK (role IN ('user', 'admin', 'moderator')),
  permissions jsonb DEFAULT '{}'::jsonb, -- Additional permissions
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Indexes**:
- `idx_user_roles_user_id` on `user_id`
- `idx_user_roles_role` on `role`

**RLS Policies**:
- Users can SELECT their own role
- Admin role can SELECT/UPDATE all roles

---

### Supabase Storage Bucket: `advertising-documents`
Store uploaded advertisement documents.

**Bucket Configuration**:
- Public: `false` (private bucket)
- File size limit: 10MB
- Allowed MIME types: `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `image/jpeg`, `image/png`

**Storage Policies**:
- Public can UPLOAD (anyone can upload)
- Authenticated users can READ their own uploads
- Admin role can READ/DELETE all uploads

### Supabase Storage Bucket: `sponsored-images`
Store sponsored content images.

**Bucket Configuration**:
- Public: `true` (public bucket for images)
- File size limit: 5MB
- Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`

**Storage Policies**:
- Admin role can UPLOAD/DELETE
- Public can READ (for displaying images)

---

## Advertisement Plans & Feature Mapping

### Plan Features Overview

Each advertisement plan determines what features are available in the sponsored section:

#### **Basic Plan** ($50/month)
- **Sponsored Section Features**:
  - ✅ Appears in map sponsored section
  - ✅ Standard display order (after Professional/Enterprise)
  - ✅ 30-day display duration
  - ✅ Basic analytics (view count, click count)
  - ✅ Single location: Map page only
  - ❌ No featured/pinned placement
  - ❌ No homepage integration
  - ❌ No newsletter mentions

- **Display Priority**: 3 (lowest)
- **Max Duration**: 30 days
- **Analytics Level**: `basic`

#### **Professional Plan** ($150/month)
- **Sponsored Section Features**:
  - ✅ Appears in map sponsored section
  - ✅ Featured placement (higher display order)
  - ✅ 60-day display duration
  - ✅ Advanced analytics (detailed metrics, engagement tracking)
  - ✅ Multiple locations: Map page + Homepage banner
  - ✅ Newsletter mentions
  - ✅ Social media promotion
  - ❌ No pinned placement

- **Display Priority**: 2 (medium)
- **Max Duration**: 60 days
- **Analytics Level**: `advanced`
- **Featured Badge**: Yes

#### **Enterprise Plan** ($300/month)
- **Sponsored Section Features**:
  - ✅ Appears in map sponsored section
  - ✅ Pinned to top (highest priority)
  - ✅ 90-day display duration
  - ✅ Custom analytics (full reporting, custom metrics)
  - ✅ All locations: Map page + Homepage + Newsletter
  - ✅ Custom content creation
  - ✅ Dedicated account manager
  - ✅ Priority support
  - ✅ Custom reporting

- **Display Priority**: 1 (highest)
- **Max Duration**: 90 days
- **Analytics Level**: `custom`
- **Pinned**: Yes (always at top)
- **Featured Badge**: Yes

### Plan-Based Display Logic

The `SponsoredSection` component will:

1. **Sort by Priority**:
   ```typescript
   // Display order logic:
   // 1. Enterprise (pinned) - display_order: 0-99
   // 2. Professional (featured) - display_order: 100-199
   // 3. Basic - display_order: 200+
   ```

2. **Filter by Plan Features**:
   - Basic: Only map sponsored section
   - Professional: Map + homepage (if applicable)
   - Enterprise: All locations

3. **Duration Enforcement**:
   - Automatically deactivate after plan duration expires
   - Show expiration warnings in admin panel

4. **Analytics Access**:
   - Basic: View count, click count only
   - Professional: Detailed metrics, engagement rates
   - Enterprise: Full custom reporting dashboard

### Plan Selection Impact on Database

When a submission is approved and converted to `sponsored_content`:

```typescript
// Example: Basic Plan
{
  plan_type: 'basic',
  display_order: 250, // Lower priority
  max_duration_days: 30,
  is_featured: false,
  is_pinned: false,
  display_locations: ['map'],
  analytics_level: 'basic',
  end_date: start_date + 30 days
}

// Example: Professional Plan
{
  plan_type: 'professional',
  display_order: 150, // Medium priority
  max_duration_days: 60,
  is_featured: true,
  is_pinned: false,
  display_locations: ['map', 'homepage'],
  analytics_level: 'advanced',
  end_date: start_date + 60 days
}

// Example: Enterprise Plan
{
  plan_type: 'enterprise',
  display_order: 50, // Highest priority
  max_duration_days: 90,
  is_featured: true,
  is_pinned: true,
  display_locations: ['map', 'homepage', 'newsletter'],
  analytics_level: 'custom',
  end_date: start_date + 90 days
}
```

### Query Logic for SponsoredSection

```sql
-- Fetch sponsored content ordered by plan priority
SELECT * FROM sponsored_content
WHERE is_active = true
  AND (start_date IS NULL OR start_date <= CURRENT_DATE)
  AND (end_date IS NULL OR end_date >= CURRENT_DATE)
  AND 'map' = ANY(display_locations) -- Filter by location
ORDER BY 
  is_pinned DESC, -- Enterprise pinned first
  CASE plan_type
    WHEN 'enterprise' THEN 1
    WHEN 'professional' THEN 2
    WHEN 'basic' THEN 3
  END,
  display_order ASC,
  created_at DESC
LIMIT 10; -- Show top 10
```

---

## Data Flow

### Phase 1: Form Submission & Payment
1. User fills out AdvertiseForm
2. If document is uploaded:
   - Upload to Supabase Storage bucket `advertising-documents`
   - Get public URL
3. Insert record into `advertising_submissions` table with status='pending'
4. **Payment Flow**:
   - If user is authenticated: Redirect to payment page
   - If user is not authenticated: Prompt to sign up/login, then redirect to payment
   - Create Stripe Checkout Session or Payment Intent
   - User completes payment via Stripe
   - Webhook receives payment confirmation
   - Update `advertising_submissions.payment_status` to 'paid'
   - Create `subscriptions` record
   - Create `payments` record
5. Show success message to user
6. Send email notification to admin for review
7. Send confirmation email to user

### Phase 2: Admin Review (Manual Process)
1. Admin reviews submission in admin panel (`/admin/advertising`)
2. Admin can:
   - **View Submission Details**:
     - Company info, plan selection, uploaded documents
     - Payment status and history
     - Current subscription status
   - **Approve** → Create entry in `sponsored_content` with plan-based defaults:
     - Set `plan_type` from `selected_plan`
     - Set `display_order` based on plan (Enterprise: 0-99, Professional: 100-199, Basic: 200+)
     - Set `max_duration_days` (Enterprise: 90, Professional: 60, Basic: 30)
     - Set `is_featured` (Professional/Enterprise: true)
     - Set `is_pinned` (Enterprise only: true)
     - Set `display_locations` based on plan
     - Set `analytics_level` based on plan
     - Calculate `end_date` from `start_date + max_duration_days`
     - Update `advertising_submissions.status` to 'approved'
   - **Reject** → Update status to 'rejected', send notification to user
   - **Request Changes** → Update status and add notes, notify user
   - **Upgrade/Downgrade Plan** → Update plan_type, adjust subscription, recalculate features
   - **Manage Content** → Edit sponsored content details, images, URLs
   - **View Analytics** → See performance metrics for the ad

### Phase 3: Display on Map
1. SponsoredSection queries `sponsored_content` table
2. Filters: 
   - `is_active = true`
   - Dates valid (between start_date and end_date)
   - Location includes 'map'
   - Payment status is 'paid' (via submission_id)
   - Subscription status is 'active' (via submission_id)
   - Ordered by plan priority (pinned → featured → basic) then `display_order`
3. Displays cards with:
   - Image from `image_url`
   - Location from `location` field
   - Time from `created_at` or custom time
   - Play icon from `play_icon_url` (if provided)
   - Visual indicator for plan type (badge/icon for Professional/Enterprise)
4. On click:
   - Navigates to `click_url` (if provided)
   - Records analytics event in `advertising_analytics` (event_type='click')
   - Increments `click_count` in `sponsored_content`
5. On view:
   - Records analytics event in `advertising_analytics` (event_type='view')
   - Increments `view_count` in `sponsored_content`

### Phase 4: User Dashboard
1. User accesses `/dashboard/advertising` (authenticated users only)
2. User can:
   - **View Submissions**: See all their advertising submissions
   - **View Active Ads**: See currently active sponsored content
   - **View Analytics**: 
     - Basic Plan: View count, click count, basic charts
     - Professional Plan: Advanced metrics, engagement rates, geographic data
     - Enterprise Plan: Custom reports, detailed breakdowns, export data
   - **Manage Subscription**:
     - View current plan and billing cycle
     - Upgrade/downgrade plan
     - Update payment method
     - View billing history
     - Cancel subscription
   - **Edit Content**: Update ad images, URLs, descriptions (if approved)
   - **View Payments**: See payment history and download receipts

### Phase 5: Admin Panel
1. Admin accesses `/admin/advertising` (admin role required)
2. Admin can:
   - **Review Submissions**: 
     - Filter by status, plan, payment status
     - Approve/reject submissions
     - Add notes and comments
   - **Manage All Ads**:
     - View all active/inactive sponsored content
     - Edit any ad details
     - Activate/deactivate ads
     - Adjust display order
   - **Analytics Dashboard**:
     - Overall platform analytics
     - Per-ad performance metrics
     - Revenue tracking
     - User engagement statistics
   - **User Management**:
     - View all advertisers
     - Manage user roles
     - Handle disputes/refunds
   - **Payment Management**:
     - View all payments
     - Process refunds
     - Handle failed payments
     - Export financial reports

---

## Implementation Steps

### Step 1: Database Migration
- [ ] Create migration file: `20250201000000_create_advertising_and_sponsored_content.sql`
- [ ] Create `advertising_submissions` table
- [ ] Create `sponsored_content` table
- [ ] Create indexes
- [ ] Set up RLS policies
- [ ] Create Supabase Storage bucket `advertising-documents`
- [ ] Set up storage policies

### Step 2: Update AdvertiseForm Component
- [ ] Import Supabase client
- [ ] Add loading state
- [ ] Implement file upload to Supabase Storage
- [ ] Update `handleSubmit` to:
  - Upload document (if provided)
  - Insert into `advertising_submissions` table
  - Handle errors gracefully
  - Show appropriate toast messages
- [ ] Add form validation improvements
- [ ] Reset form after successful submission

### Step 3: Update SponsoredSection Component
- [ ] Create custom hook: `useSponsoredContent.ts`
- [ ] Query `sponsored_content` table with plan-based sorting
- [ ] Filter active content with valid dates and location='map'
- [ ] Replace hardcoded cards with database data
- [ ] Add plan-based visual indicators (badges for Professional/Enterprise)
- [ ] Add loading state
- [ ] Add error handling
- [ ] Handle click navigation
- [ ] Add analytics tracking (increment view_count on mount, click_count on click)
- [ ] Show plan-based features (pinned items at top, featured items highlighted)

### Step 4: Create Custom Hook
- [ ] Create `src/lib/useSponsoredContent.ts`
- [ ] Implement Supabase query
- [ ] Handle real-time updates (optional)
- [ ] Add caching/optimization

### Step 5: Payment Integration
- [ ] Set up Stripe account and API keys
- [ ] Create Stripe webhook endpoint (Edge Function)
- [ ] Install Stripe SDK (`@stripe/stripe-js`)
- [ ] Create payment page component (`/payment/:submissionId`)
- [ ] Implement Stripe Checkout Session creation
- [ ] Handle payment success/failure callbacks
- [ ] Create webhook handler for payment events
- [ ] Update subscription status on payment
- [ ] Handle subscription renewals
- [ ] Handle failed payments and retries

### Step 6: User Dashboard
- [ ] Create route: `/dashboard/advertising`
- [ ] Create `UserAdvertisingDashboard.tsx` component
- [ ] Implement submission list view
- [ ] Implement active ads view
- [ ] Implement analytics dashboard:
  - [ ] Basic analytics (view/click counts, charts)
  - [ ] Advanced analytics (Professional/Enterprise)
  - [ ] Custom reports (Enterprise)
- [ ] Implement subscription management:
  - [ ] View current plan
  - [ ] Upgrade/downgrade functionality
  - [ ] Payment method management
  - [ ] Billing history
  - [ ] Cancel subscription
- [ ] Implement content editing (for approved ads)
- [ ] Add export functionality for analytics

### Step 7: Admin Panel
- [ ] Create route: `/admin/advertising` (protected by admin role)
- [ ] Create `AdminAdvertisingPanel.tsx` component
- [ ] Implement submission review interface:
  - [ ] Filter and search submissions
  - [ ] Approve/reject workflow
  - [ ] Add admin notes
- [ ] Implement ad management:
  - [ ] View all ads (active/inactive)
  - [ ] Edit ad details
  - [ ] Activate/deactivate ads
  - [ ] Adjust display order
- [ ] Implement analytics dashboard:
  - [ ] Platform-wide metrics
  - [ ] Per-ad performance
  - [ ] Revenue tracking
- [ ] Implement user management:
  - [ ] View all advertisers
  - [ ] Manage user roles
- [ ] Implement payment management:
  - [ ] View all payments
  - [ ] Process refunds
  - [ ] Handle failed payments
  - [ ] Export financial reports

### Step 8: Analytics System
- [ ] Create analytics tracking hook
- [ ] Implement view tracking (on component mount)
- [ ] Implement click tracking (on card click)
- [ ] Record events to `advertising_analytics` table
- [ ] Create analytics aggregation functions
- [ ] Implement real-time analytics updates
- [ ] Add geographic analytics (country/city)
- [ ] Add device/browser analytics

### Step 9: Plan Management Features
- [ ] Admin dashboard for reviewing submissions with plan filter
- [ ] Plan upgrade/downgrade functionality
- [ ] Automatic expiration handling (deactivate after max_duration_days)
- [ ] Plan-based analytics dashboard
- [ ] Email notifications for plan expiration
- [ ] Plan comparison view in admin panel
- [ ] Subscription renewal automation

### Step 10: Optional Enhancements
- [ ] Add email notifications (using Supabase Edge Functions or external service)
- [ ] Add image optimization/compression
- [ ] Add preview mode for admins
- [ ] Add A/B testing for different plan displays
- [ ] Add plan-based homepage banner integration
- [ ] Add export to PDF/CSV for reports
- [ ] Add scheduled email reports
- [ ] Add mobile app notifications

---

## UI/UX Considerations

### AdvertiseForm
- Show upload progress indicator
- Validate file size before upload
- Show file preview (for images)
- Disable submit button during upload
- Clear error messages

### SponsoredSection
- Show loading skeleton while fetching
- Handle empty state (no sponsored content)
- Smooth transitions when content updates
- Maintain current card styling
- Responsive image loading
- **Plan-based visual indicators**:
  - Enterprise: Pinned badge + featured badge + special border
  - Professional: Featured badge
  - Basic: Standard styling
- **Priority display**: Enterprise at top, then Professional, then Basic

### Error Handling
- Network errors: Retry mechanism
- Upload failures: Clear error message
- Database errors: Log and show user-friendly message
- Invalid data: Form validation before submission

---

## Security Considerations

1. **File Upload Security**:
   - Validate file types server-side
   - Scan for malware (future enhancement)
   - Limit file size
   - Sanitize file names

2. **Database Security**:
   - RLS policies prevent unauthorized access
   - Admin-only write access to `sponsored_content`
   - Public read access only to active content

3. **Data Privacy**:
   - Don't expose email addresses publicly
   - Store sensitive data securely
   - Comply with GDPR/privacy regulations

---

## Testing Checklist

- [ ] Form submission with all fields
- [ ] Form submission with minimal fields
- [ ] File upload (various formats)
- [ ] File upload size limit enforcement
- [ ] Database insertion success
- [ ] Error handling (network, validation, etc.)
- [ ] SponsoredSection displays data correctly
- [ ] Empty state handling
- [ ] Date filtering (start_date/end_date)
- [ ] Click tracking
- [ ] RLS policy enforcement
- [ ] Storage bucket access
- [ ] Plan-based display priority (Enterprise → Professional → Basic)
- [ ] Plan-based duration enforcement (30/60/90 days)
- [ ] Plan-based visual indicators (badges, pins)
- [ ] Plan-based analytics access levels

---

## Future Enhancements

1. **Admin Dashboard**:
   - Review submissions interface
   - Approve/reject workflow
   - Bulk operations
   - Analytics dashboard

2. **Automated Workflow**:
   - Auto-approve based on criteria
   - Email notifications
   - Payment integration

3. **Advanced Features**:
   - A/B testing for sponsored content
   - Geographic targeting
   - Time-based scheduling
   - Performance analytics

4. **Content Management**:
   - Rich text editor for descriptions
   - Image editor/cropper
   - Video support
   - Multiple images per campaign

---

## Migration Strategy

1. **Backward Compatibility**: Keep hardcoded cards as fallback
2. **Gradual Rollout**: Feature flag for database-driven content
3. **Data Migration**: Convert existing hardcoded content to database entries
4. **Monitoring**: Track errors and performance

---

## Implementation Components

### Frontend Components to Create

1. **Payment Components**:
   - `PaymentPage.tsx` - Stripe checkout page
   - `PaymentSuccess.tsx` - Payment success confirmation
   - `PaymentFailed.tsx` - Payment failure handling
   - `SubscriptionManagement.tsx` - Manage subscription

2. **User Dashboard Components**:
   - `UserAdvertisingDashboard.tsx` - Main dashboard
   - `MySubmissions.tsx` - List of user submissions
   - `MyAds.tsx` - Active ads management
   - `AdAnalytics.tsx` - Analytics dashboard (plan-based)
   - `BillingHistory.tsx` - Payment history
   - `EditAdContent.tsx` - Edit ad content

3. **Admin Panel Components**:
   - `AdminAdvertisingPanel.tsx` - Main admin panel
   - `SubmissionReview.tsx` - Review submissions
   - `AdManagement.tsx` - Manage all ads
   - `AdminAnalytics.tsx` - Platform analytics
   - `UserManagement.tsx` - Manage advertisers
   - `PaymentManagement.tsx` - Payment operations

4. **Shared Components**:
   - `AnalyticsChart.tsx` - Reusable chart component
   - `PlanBadge.tsx` - Plan type badge
   - `StatusBadge.tsx` - Status indicator
   - `PaymentMethodForm.tsx` - Payment method input

### Backend/Edge Functions to Create

1. **Stripe Integration**:
   - `create-checkout-session` - Create Stripe checkout
   - `stripe-webhook` - Handle Stripe webhooks
   - `update-subscription` - Update subscription
   - `cancel-subscription` - Cancel subscription

2. **Analytics**:
   - `track-ad-event` - Record analytics events
   - `get-analytics` - Fetch analytics data
   - `export-analytics` - Export analytics to CSV/PDF

3. **Email Notifications**:
   - `send-notification` - Send email notifications
   - `send-payment-receipt` - Send payment receipts

## Estimated Implementation Time

### Phase 1: Core Features (Week 1)
- Database migration: 2 hours (includes all tables)
- AdvertiseForm updates: 2 hours
- SponsoredSection updates: 2 hours
- Custom hooks: 1 hour
- **Subtotal: 7 hours**

### Phase 2: Payment Integration (Week 2)
- Stripe setup & configuration: 2 hours
- Payment page components: 3 hours
- Webhook handler: 2 hours
- Subscription management: 2 hours
- **Subtotal: 9 hours**

### Phase 3: User Dashboard (Week 3)
- Dashboard layout: 2 hours
- Submissions view: 2 hours
- Active ads view: 2 hours
- Basic analytics: 3 hours
- Subscription management UI: 2 hours
- **Subtotal: 11 hours**

### Phase 4: Admin Panel (Week 4)
- Admin panel layout: 2 hours
- Submission review: 3 hours
- Ad management: 3 hours
- Admin analytics: 3 hours
- User management: 2 hours
- Payment management: 2 hours
- **Subtotal: 13 hours**

### Phase 5: Analytics & Polish (Week 5)
- Analytics tracking: 2 hours
- Advanced analytics: 3 hours
- Email notifications: 2 hours
- Testing & debugging: 4 hours
- Documentation: 2 hours
- **Subtotal: 13 hours**

**Total Estimated Time: 53 hours (~6-7 weeks for one developer)**

---

## Payment Integration Details

### Stripe Setup

1. **Stripe Account**:
   - Create Stripe account (stripe.com)
   - Get API keys (publishable key + secret key)
   - Set up webhook endpoint
   - Configure products and prices for each plan

2. **Environment Variables**:
   ```
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

3. **Stripe Products**:
   - Basic Plan: $50/month
   - Professional Plan: $150/month
   - Enterprise Plan: $300/month

4. **Webhook Events to Handle**:
   - `checkout.session.completed` - Payment succeeded
   - `payment_intent.succeeded` - Payment confirmed
   - `payment_intent.payment_failed` - Payment failed
   - `customer.subscription.updated` - Subscription changed
   - `customer.subscription.deleted` - Subscription cancelled
   - `invoice.payment_succeeded` - Recurring payment succeeded
   - `invoice.payment_failed` - Recurring payment failed

### Payment Flow

1. User submits form → Creates `advertising_submissions` record
2. Redirect to payment page → Create Stripe Checkout Session
3. User completes payment → Stripe processes payment
4. Webhook receives event → Update database:
   - `advertising_submissions.payment_status` = 'paid'
   - Create `subscriptions` record
   - Create `payments` record
5. Notify admin → Email notification for review
6. Admin approves → Create `sponsored_content` record

## User Dashboard Features

### Dashboard Sections

1. **Overview**:
   - Active ads count
   - Total views/clicks
   - Current plan
   - Next billing date
   - Quick stats cards

2. **My Submissions**:
   - List of all submissions
   - Status indicators
   - Payment status
   - Actions (view, edit if pending)

3. **Active Ads**:
   - List of active sponsored content
   - Performance metrics
   - Edit content button
   - Deactivate option

4. **Analytics** (Plan-based):
   - **Basic**: View count, click count, simple charts
   - **Professional**: 
     - Detailed metrics
     - Engagement rates
     - Geographic breakdown
     - Time-series charts
   - **Enterprise**:
     - All Professional features
     - Custom date ranges
     - Export to CSV/PDF
     - Advanced filtering
     - Custom reports

5. **Subscription**:
   - Current plan details
   - Billing cycle
   - Payment method
   - Upgrade/downgrade options
   - Cancel subscription

6. **Billing**:
   - Payment history
   - Download receipts
   - Invoice management

## Admin Panel Features

### Admin Dashboard Sections

1. **Submissions Review**:
   - Filter by: status, plan, payment status, date
   - Bulk actions (approve/reject multiple)
   - Search functionality
   - Detailed view with all submission data

2. **Ad Management**:
   - View all ads (active/inactive)
   - Edit any ad
   - Activate/deactivate
   - Adjust display order
   - Bulk operations

3. **Analytics Dashboard**:
   - Platform-wide metrics:
     - Total revenue
     - Active subscriptions
     - Total views/clicks
     - Top performing ads
   - Per-ad analytics
   - Revenue charts
   - User engagement trends

4. **User Management**:
   - List all advertisers
   - View user details
   - Manage roles (user/admin)
   - View user's ads and payments

5. **Payment Management**:
   - View all payments
   - Filter by status, date, plan
   - Process refunds
   - Handle failed payments
   - Export financial reports

## Security Considerations

1. **Payment Security**:
   - Never store credit card details
   - Use Stripe for all payment processing
   - Validate webhook signatures
   - Use HTTPS for all payment pages

2. **Access Control**:
   - Admin routes protected by role check
   - RLS policies enforce data access
   - User can only see their own data
   - Admin can see all data

3. **Data Privacy**:
   - Anonymize IP addresses in analytics
   - Comply with GDPR
   - Secure file uploads
   - Encrypt sensitive data

## Notes

- Consider using Supabase Realtime for live analytics updates
- Image optimization should be handled client-side or via edge function
- Consider rate limiting for form submissions and API calls
- Add CAPTCHA for spam prevention (future)
- Use Stripe Test Mode during development
- Set up proper error logging and monitoring
- Consider adding a support/help system for users
- Plan for scalability (caching, database optimization)

