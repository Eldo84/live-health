# Engagement Notifications Plan

## Overview
This document outlines notification types that can be sent to users to remind them about the app and encourage engagement. These notifications are designed to be valuable, timely, and personalized.

---

## 📱 Notification Categories

### 1. **Outbreak Proximity Notifications** 🚨
**Purpose**: Alert users when outbreaks are detected near their location

#### Types:
- `outbreak_nearby_new` - New outbreak detected within user's preferred radius
  - **Trigger**: New outbreak signal created within X km of user's location
  - **Message**: "New [Disease] outbreak detected in [Location], [X] km away"
  - **Priority**: `high` or `urgent` (based on severity)
  - **Action**: `/app/map?outbreak=[id]`

- `outbreak_nearby_escalated` - Existing nearby outbreak has escalated
  - **Trigger**: Outbreak severity increased or case count significantly increased
  - **Message**: "[Disease] outbreak in [Location] has escalated - [X] new cases reported"
  - **Priority**: `high`
  - **Action**: `/app/map?outbreak=[id]`

- `outbreak_nearby_multiple` - Multiple outbreaks detected in area
  - **Trigger**: 3+ outbreaks detected within radius in 24 hours
  - **Message**: "Multiple outbreaks detected in your area - [X] active outbreaks within [Y] km"
  - **Priority**: `high`
  - **Action**: `/app/map?filter=nearby`

---

### 2. **Weekly/Monthly Summary Notifications** 📊
**Purpose**: Provide regular updates to keep users informed

#### Types:
- `weekly_summary` - Weekly outbreak summary for user's region
  - **Trigger**: Weekly cron job (e.g., every Monday)
  - **Message**: "Your weekly health update: [X] new outbreaks, [Y] resolved, [Z] active in your region"
  - **Priority**: `normal`
  - **Action**: `/app/dashboard`

- `monthly_trends` - Monthly health trends and insights
  - **Trigger**: Monthly cron job (1st of month)
  - **Message**: "Monthly health trends: [Top 3 diseases] showing [increase/decrease] in your region"
  - **Priority**: `normal`
  - **Action**: `/app/dashboard?tab=trends`

- `regional_update` - Updates for user's country/region
  - **Trigger**: Significant changes in user's country (new outbreaks, resolved outbreaks)
  - **Message**: "Health update for [Country]: [Summary of changes]"
  - **Priority**: `normal`
  - **Action**: `/app/map?country=[code]`

---

### 3. **AI Prediction Notifications** 🤖
**Purpose**: Share AI-generated insights and predictions

#### Types:
- `ai_risk_alert` - High-risk prediction for user's area
  - **Trigger**: AI model predicts high outbreak risk in user's region
  - **Message**: "AI Alert: High outbreak risk predicted for [Location] in next [X] days"
  - **Priority**: `high`
  - **Action**: `/app/dashboard?tab=predictions`

- `ai_prediction_update` - New prediction available
  - **Trigger**: New AI prediction generated for diseases user follows
  - **Message**: "New prediction: [Disease] forecast updated for [Region]"
  - **Priority**: `normal`
  - **Action**: `/app/dashboard?tab=predictions`

---

### 4. **Disease-Specific Notifications** 🦠
**Purpose**: Notify users about diseases they're tracking

#### Types:
- `disease_update` - Update on tracked disease
  - **Trigger**: Significant update for disease user follows
  - **Message**: "[Disease] update: [X] new cases reported globally"
  - **Priority**: `normal`
  - **Action**: `/app/map?disease=[id]`

- `disease_trending` - Disease is trending in user's region
  - **Trigger**: Disease shows significant increase in mentions/searches
  - **Message**: "[Disease] is trending in [Region] - [X]% increase in reports"
  - **Priority**: `normal`
  - **Action**: `/app/dashboard?tab=trends`

---

### 5. **News & Updates** 📰
**Purpose**: Share relevant health news

#### Types:
- `breaking_news` - Breaking health news in user's area
  - **Trigger**: High-priority news article detected for user's location
  - **Message**: "Breaking: [Headline] in [Location]"
  - **Priority**: `high`
  - **Action**: `/app/map?tab=news&article=[id]`

- `news_digest` - Daily/weekly news digest
  - **Trigger**: Daily/weekly cron job
  - **Message**: "Health news digest: [X] articles about outbreaks in your region"
  - **Priority**: `low`
  - **Action**: `/app/map?tab=news`

---

### 6. **App Engagement Reminders** 🔔
**Purpose**: Re-engage inactive users

#### Types:
- `welcome_back` - Welcome back after inactivity
  - **Trigger**: User hasn't logged in for 7+ days
  - **Message**: "Welcome back! [X] new outbreaks detected since your last visit"
  - **Priority**: `normal`
  - **Action**: `/app/map`

- `new_features` - New features available
  - **Trigger**: New feature released
  - **Message**: "New feature: [Feature name] - [Brief description]"
  - **Priority**: `low`
  - **Action**: `/app/dashboard` or feature-specific URL

- `data_refresh` - Data has been updated
  - **Trigger**: Major data refresh completed
  - **Message**: "Data updated: Latest outbreak information now available"
  - **Priority**: `low`
  - **Action**: `/app/map`

---

### 7. **Personalized Recommendations** 💡
**Purpose**: Provide personalized health insights

#### Types:
- `health_tip` - Health tip based on user's location/season
  - **Trigger**: Seasonal health tips or location-specific recommendations
  - **Message**: "Health tip: [Seasonal/location-specific advice]"
  - **Priority**: `low`
  - **Action**: `/app/dashboard`

- `prevention_reminder` - Prevention reminders
  - **Trigger**: Active outbreaks in area warrant prevention reminders
  - **Message**: "Prevention reminder: [Disease] active in [Area] - [Prevention tips]"
  - **Priority**: `normal`
  - **Action**: `/app/map?outbreak=[id]`

---

### 8. **User Activity Notifications** 👤
**Purpose**: Acknowledge user contributions

#### Types:
- `alert_approved` - User's alert submission approved (already exists)
- `alert_rejected` - User's alert submission rejected (already exists)
- `contribution_thanks` - Thank user for contributing
  - **Trigger**: User submits alert that gets approved
  - **Message**: "Thank you for contributing! Your alert helped [X] users stay informed"
  - **Priority**: `low`
  - **Action**: `/app/map`

---

## 🎯 Implementation Priority

### Phase 1 (High Priority - Immediate Value)
1. ✅ `outbreak_nearby_new` - Most valuable for users
2. ✅ `weekly_summary` - Regular engagement
3. ✅ `breaking_news` - Time-sensitive value

### Phase 2 (Medium Priority - Enhanced Engagement)
4. `outbreak_nearby_escalated` - Important updates
5. `ai_risk_alert` - Unique value proposition
6. `welcome_back` - Re-engagement

### Phase 3 (Lower Priority - Nice to Have)
7. `monthly_trends` - Periodic insights
8. `disease_update` - For power users
9. `news_digest` - Regular updates
10. `health_tip` - Educational value

---

## ⚙️ Technical Requirements

### Database Changes Needed

1. **Update notifications table** - Add new notification types
2. **User preferences table** - Store user notification preferences:
   - `notification_radius_km` - Distance for proximity alerts
   - `notification_frequency` - Daily/Weekly/Monthly
   - `enabled_notification_types` - Array of enabled types
   - `tracked_diseases` - Array of disease IDs user follows
   - `tracked_countries` - Array of country codes user follows
   - `last_active_at` - For inactivity detection

3. **Cron jobs/Edge functions** - For scheduled notifications:
   - Weekly summary job
   - Monthly trends job
   - Daily news digest job
   - Inactivity detection job

4. **Real-time triggers** - For immediate notifications:
   - New outbreak signal created
   - Outbreak severity changed
   - AI prediction generated

---

## 📋 Notification Preferences

Users should be able to:
- ✅ Enable/disable specific notification types
- ✅ Set notification radius (default: 500km)
- ✅ Choose frequency (real-time, daily digest, weekly)
- ✅ Select diseases to track
- ✅ Select countries/regions to monitor
- ✅ Set quiet hours (no notifications during sleep)

---

## 🔔 Notification Delivery

### In-App Notifications
- ✅ Real-time via Supabase subscriptions (already implemented)
- ✅ Notification bell with unread count
- ✅ Toast notifications for urgent alerts

### Future Enhancements
- 📧 Email notifications (optional)
- 📱 Push notifications (mobile app)
- 🔔 Browser push notifications (web)

---

## 📊 Metrics to Track

- Notification open rate
- Click-through rate to app
- User engagement after notification
- Notification preference adoption
- Most valuable notification types

---

## 🚀 Next Steps

1. **Create migration** - Add new notification types to database
2. **Create user preferences table** - Store notification settings
3. **Implement Phase 1 notifications** - Start with high-priority types
4. **Create notification preferences UI** - Let users customize
5. **Set up cron jobs** - For scheduled notifications
6. **Add real-time triggers** - For immediate notifications
7. **Test and iterate** - Monitor engagement and adjust


