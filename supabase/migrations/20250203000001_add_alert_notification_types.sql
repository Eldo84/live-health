-- Add alert notification types to notifications table

-- Drop the existing constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add new constraint with alert notification types
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
  CHECK (type IN (
    'submission_created',
    'submission_approved',
    'submission_rejected',
    'payment_required',
    'payment_received',
    'ad_live',
    'ad_expiring',
    'ad_expired',
    'alert_approved',
    'alert_rejected'
  ));

-- Add a reference to user_alert_submissions if needed (optional, for better data integrity)
-- Note: We'll use a generic approach since the submission_id might reference different tables
-- The existing submission_id column can be used for both advertising_submissions and user_alert_submissions

