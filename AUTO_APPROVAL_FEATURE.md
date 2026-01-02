# Auto-Approval Feature for Alert Submissions

## Overview
This feature automatically approves alert submissions when 2 reports match for the same outbreak and location, eliminating the need for admin approval in these cases.

## How It Works

### 1. Submission Process
- User submits an alert via the `AddAlertDialog` component
- The submission is inserted into the `user_alert_submissions` table with status `pending_review`

### 2. Auto-Approval Trigger
- A database trigger (`trigger_auto_approve_matching_submissions`) runs **before insert**
- It checks if there's already at least 1 other pending submission from a **different user** that matches:
  - **Different user**: The matching submission must be from a different `user_id` (prevents self-approval)
  - **Same disease**: Either same `disease_id` OR same `disease_name` (case-insensitive)
  - **Same location**: One of the following:
    - Same `country_id` OR
    - Same `country_name` (case-insensitive) OR
    - Coordinates within 0.1 degrees (~11km radius)

### 3. Auto-Approval Logic
- If a match is found (making 2 total matching submissions):
  - The new submission is automatically set to `status = 'approved'`
  - All matching pending submissions are also auto-approved
  - Both are marked with `admin_notes = 'Auto-approved: 2 matching reports for same outbreak and location'`

### 4. Processing Auto-Approved Submissions
Auto-approved submissions need to be processed to create outbreak signals, which requires:
- Creating news articles and sources
- Creating/updating diseases and countries
- Creating outbreak signals

This is handled in two ways:

#### a) Immediate Processing (Frontend)
- After submission, the frontend checks if the submission was auto-approved
- If yes, it calls the `process-auto-approved-alerts` Edge Function immediately
- User sees a success message indicating auto-approval

#### b) Background Processing (Cron Job)
- A cron job runs every 5 minutes to process any auto-approved submissions
- This serves as a backup in case the frontend call fails
- Ensures all auto-approved submissions are eventually processed

## Files Created/Modified

### Database Migrations
1. **`20250128000001_auto_approve_matching_submissions.sql`**
   - Creates indexes for efficient matching queries
   - Creates `check_and_auto_approve_matching_submissions()` function
   - Creates trigger `trigger_auto_approve_matching_submissions`
   - Creates notification function for auto-approved submissions

2. **`20250128000002_setup_auto_approved_alerts_cron.sql`**
   - Creates cron job to process auto-approved submissions every 5 minutes
   - Creates `trigger_process_auto_approved_alerts()` function

### Edge Function
- **`supabase/functions/process-auto-approved-alerts/index.ts`**
  - Processes auto-approved submissions
  - Creates news articles, sources, diseases, countries, and outbreak signals
  - Sends notifications to users

### Frontend Changes
- **`src/components/AddAlertDialog.tsx`**
  - Updated to check for auto-approval after submission
  - Calls Edge Function if auto-approved
  - Shows appropriate success messages

## Matching Criteria

Submissions are considered matching if they meet **all three** conditions:

1. **Different Users**: 
   - The submissions must be from different `user_id` values
   - This prevents users from auto-approving their own duplicate submissions

2. **Disease Match**: 
   - Both have the same `disease_id`, OR
   - Both have the same `disease_name` (case-insensitive, trimmed)

3. **Location Match** (at least one of):
   - Both have the same `country_id`, OR
   - Both have the same `country_name` (case-insensitive, trimmed), OR
   - Coordinates are within 0.1 degrees (~11km) of each other

## Edge Cases Handled

- **Same user submissions**: Auto-approval only occurs when submissions are from different users (prevents self-approval)
- Missing location coordinates: Skip auto-approval if coordinates are missing
- Missing disease info: Skip if both `disease_id` and `disease_name` are null
- Multiple matches: All matching pending submissions from different users are auto-approved together
- Already processed: Only processes submissions that haven't been processed yet (`outbreak_signal_id IS NULL`)
- Anonymous users: If `user_id` is NULL, only matches with other NULL user_ids (rare case)

## Testing

To test the feature:

1. **Submit first report**: Submit an alert for a disease (e.g., "COVID-19") in a location (e.g., "New York, USA")
   - Status should be `pending_review`
   - Should not be auto-approved (no match yet)

2. **Submit matching report from different user**: Have a different user submit another alert for the same disease in the same location
   - Both submissions should be auto-approved immediately
   - Success message should indicate auto-approval
   - Outbreak signals should be created within 5 minutes (or immediately if frontend call succeeds)

3. **Try same user duplicate**: Submit the same alert twice from the same user
   - Second submission should NOT be auto-approved (remains pending_review)
   - This prevents users from gaming the system by submitting duplicates

3. **Verify results**:
   - Check `user_alert_submissions` table - both should have `status = 'approved'`
   - Check `outbreak_signals` table - signals should be created for both
   - Check map - alerts should appear on the map

## Configuration

### Cron Job Schedule
The cron job runs every 5 minutes: `*/5 * * * *`

To change the schedule, edit the migration file and update the cron expression in:
```sql
SELECT cron.schedule(
  'process-auto-approved-alerts-auto',
  '*/5 * * * *',  -- Change this cron expression
  $$SELECT trigger_process_auto_approved_alerts();$$
);
```

### Location Matching Threshold
The distance threshold for coordinate matching is set to 0.1 degrees (~11km) in the trigger function:
```sql
distance_threshold DECIMAL := 0.1; -- ~11km radius for location matching
```

To change this, edit the `check_and_auto_approve_matching_submissions()` function in the migration file.

## Admin Notes

When submissions are auto-approved, they are marked with:
```
admin_notes = 'Auto-approved: 2 matching reports for same outbreak and location'
```

Admins can see this in the admin review panel to understand why submissions were auto-approved.

## Notifications

Users receive notifications when their submissions are auto-approved:
- Type: `alert_approved`
- Title: "Alert Auto-Approved! ✓"
- Message: Explains that the alert matches another report and was auto-approved

