-- ============================================================================
-- Add 'admin_broadcast' notification type for admin-sent notifications
-- ============================================================================

ALTER TABLE notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add new constraint with admin_broadcast and alert notification types
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
  'alert_approved',
  'alert_rejected',
  'admin_broadcast'  -- Admin-sent notifications
));

-- Add comment
COMMENT ON COLUMN notifications.type IS 'Notification type. admin_broadcast is for admin-sent notifications to users.';

