# Webhook Setup - Next Steps

## ✅ What You've Done
- Created Stripe webhook endpoint
- Copied the signing secret (whsec_...)

## 🔧 What's Next

### Step 1: Add Secrets to Supabase Edge Functions

1. **Go to Supabase Dashboard**
   - Navigate to: **Edge Functions** → **Settings** (or click on the `stripe-webhook` function)

2. **Add Environment Secrets**
   - Click **"Secrets"** or **"Environment Variables"**
   - Add these two secrets:

   #### Secret 1: `STRIPE_SECRET_KEY`
   - **Name:** `STRIPE_SECRET_KEY`
   - **Value:** Your Stripe Secret Key (starts with `sk_test_...` or `sk_live_...`)
   - **Where to find:** Stripe Dashboard → Developers → API keys → Secret key

   #### Secret 2: `STRIPE_WEBHOOK_SECRET`
   - **Name:** `STRIPE_WEBHOOK_SECRET`
   - **Value:** The signing secret you just copied (starts with `whsec_...`)
   - **This is:** The webhook signing secret from Stripe

3. **Save the secrets**

---

### Step 2: Verify Your Webhook Endpoint URL

Make sure your Stripe webhook is pointing to:
```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook
```

**To find your project ref:**
- Supabase Dashboard → Settings → API
- Look for "Project URL" or "Reference ID"

---

### Step 3: Test the Webhook

1. **In Stripe Dashboard → Webhooks**
   - Find your webhook endpoint
   - Click on it
   - Click **"Send test webhook"** or **"Send test event"**
   - Select: `checkout.session.completed`

2. **Check Supabase Logs**
   - Go to: Supabase Dashboard → Edge Functions → `stripe-webhook` → Logs
   - You should see the test event received
   - Look for: "Received Stripe event: checkout.session.completed"

3. **If you see errors:**
   - Check that secrets are set correctly
   - Verify the webhook URL is correct
   - Check that the edge function is deployed

---

### Step 4: Test the Full Flow

1. **Submit an advertising form** (as a user)
   - Go to `/` → Advertise tab
   - Fill out and submit

2. **Approve as admin**
   - Go to `/admin/advertising`
   - Approve the submission

3. **Complete payment**
   - User goes to `/dashboard/advertising`
   - Clicks "Pay Now"
   - Completes Stripe checkout (use test card: `4242 4242 4242 4242`)

4. **Verify webhook processed**
   - Check Supabase logs for webhook event
   - Check `sponsored_content` table - should have new record
   - Check `/map` - ad should appear in Sponsored Section

---

## 🧪 Test Cards (Stripe Test Mode)

Use these in Stripe test mode:

- **Success:** `4242 4242 4242 4242`
- **Decline:** `4000 0000 0000 0002`
- **Requires 3D Secure:** `4000 0025 0000 3155`

Any future date for expiry, any 3 digits for CVC.

---

## ✅ Verification Checklist

- [ ] `STRIPE_SECRET_KEY` added to Supabase Edge Function secrets
- [ ] `STRIPE_WEBHOOK_SECRET` added to Supabase Edge Function secrets
- [ ] Webhook endpoint URL is correct in Stripe
- [ ] Test webhook sent successfully
- [ ] Webhook logs show events received
- [ ] Full payment flow tested

---

## 🐛 Troubleshooting

### Webhook not receiving events?
- Check webhook URL is correct
- Verify secrets are set
- Check Edge Function is deployed and active
- Look at Edge Function logs for errors

### Payment succeeds but ad doesn't appear?
- Check webhook logs - did it process?
- Check `sponsored_content` table - was record created?
- Check `advertising_submissions` - is status 'active'?
- Verify RLS policies allow public read

### Webhook signature verification fails?
- Make sure `STRIPE_WEBHOOK_SECRET` is the correct signing secret
- Secret should start with `whsec_`
- Make sure it's from the correct webhook endpoint

---

**You're almost done!** Just add those two secrets and test the flow.

