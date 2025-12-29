import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno&no-check";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// Plan configuration
const PLAN_CONFIG = {
  basic: {
    price: 30.00,
    duration_days: 30,
    display_order: 200,
    is_featured: false,
    is_pinned: false,
    display_locations: ["map"],
    analytics_level: "basic",
  },
  professional: {
    price: 75.00,
    duration_days: 60,
    display_order: 100,
    is_featured: true,
    is_pinned: false,
    display_locations: ["map", "homepage"],
    analytics_level: "advanced",
  },
  enterprise: {
    price: 150.00,
    duration_days: 90,
    display_order: 50,
    is_featured: true,
    is_pinned: true,
    display_locations: ["map", "homepage", "newsletter"],
    analytics_level: "custom",
  },
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey) {
      throw new Error("Stripe secret key not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2024-04-10",
    });

    // Get request body and signature
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    let event: Stripe.Event;

    // Verify webhook signature if secret is configured
    if (webhookSecret && signature) {
      try {
        event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
      } catch (err: any) {
        console.error("Webhook signature verification failed:", err.message);
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      // For testing without signature verification
      event = JSON.parse(body);
      console.warn("Webhook signature not verified - webhook secret not configured");
    }

    console.log("Received Stripe event:", event.type);

    // Handle different event types
    // Wrap each handler in try-catch to prevent unhandled promise rejections
    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          await handleCheckoutComplete(supabase, stripe, session);
          break;
        }

        case "payment_intent.succeeded": {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          console.log("Payment intent succeeded:", paymentIntent.id);
          // Most logic handled in checkout.session.completed
          break;
        }

        case "payment_intent.payment_failed": {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          await handlePaymentFailed(supabase, paymentIntent);
          break;
        }

        case "charge.refunded": {
          const charge = event.data.object as Stripe.Charge;
          await handleRefund(supabase, charge);
          break;
        }

        default:
          console.log("Unhandled event type:", event.type);
      }
    } catch (handlerError: any) {
      // Log handler errors but don't fail the webhook response
      console.error("Error in event handler:", handlerError);
      // Continue to return success so Stripe doesn't retry
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

async function handleCheckoutComplete(
  supabase: any,
  stripe: Stripe,
  session: Stripe.Checkout.Session
) {
  console.log("Processing checkout session:", session.id);

  // Check if this is a donation (has donation_type in metadata or no submission_id)
  const isDonation = session.metadata?.donation_type === "one_time" || 
                     (!session.metadata?.submission_id && !session.client_reference_id);

  if (isDonation) {
    await handleDonationComplete(supabase, stripe, session);
    return;
  }

  // Otherwise, handle as advertising payment
  const submissionId = session.metadata?.submission_id || session.client_reference_id;
  const userId = session.metadata?.user_id;
  const plan = session.metadata?.plan as keyof typeof PLAN_CONFIG;

  if (!submissionId) {
    console.error("No submission_id in session metadata");
    return;
  }

  const planConfig = PLAN_CONFIG[plan];
  if (!planConfig) {
    console.error("Invalid plan:", plan);
    return;
  }

  // Get the payment intent for more details
  let paymentMethodLast4 = "";
  let paymentMethod = "card";
  
  if (session.payment_intent) {
    const paymentIntent = await stripe.paymentIntents.retrieve(
      session.payment_intent as string
    );
    
    if (paymentIntent.payment_method) {
      const pm = await stripe.paymentMethods.retrieve(
        paymentIntent.payment_method as string
      );
      paymentMethodLast4 = pm.card?.last4 || "";
      paymentMethod = pm.type;
    }
  }

  // Update payment record
  const { error: paymentError } = await supabase
    .from("payments")
    .update({
      status: "succeeded",
      stripe_payment_intent_id: session.payment_intent,
      stripe_charge_id: session.payment_intent, // Usually same for one-time payments
      payment_method: paymentMethod,
      payment_method_last4: paymentMethodLast4,
      paid_at: new Date().toISOString(),
      receipt_url: session.receipt_url || null,
    })
    .eq("stripe_checkout_session_id", session.id);

  if (paymentError) {
    console.error("Error updating payment:", paymentError);
  }

  // Update submission status
  const { error: submissionError } = await supabase
    .from("advertising_submissions")
    .update({
      status: "active",
      payment_status: "paid",
      updated_at: new Date().toISOString(),
    })
    .eq("id", submissionId);

  if (submissionError) {
    console.error("Error updating submission:", submissionError);
    return;
  }

  // Get submission details for sponsored content
  const { data: submission, error: fetchError } = await supabase
    .from("advertising_submissions")
    .select("*")
    .eq("id", submissionId)
    .single();

  if (fetchError || !submission) {
    console.error("Error fetching submission:", fetchError);
    return;
  }

  // Create subscription record
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + planConfig.duration_days);

  const { data: subscriptionData, error: subscriptionError } = await supabase
    .from("subscriptions")
    .insert({
      user_id: userId || submission.user_id,
      submission_id: submissionId,
      plan_type: plan,
      plan_price: planConfig.price,
      stripe_customer_id: session.customer,
      status: "active",
      current_period_start: startDate.toISOString().split("T")[0],
      current_period_end: endDate.toISOString().split("T")[0],
      billing_cycle: "monthly",
      next_billing_date: null, // One-time payment, no recurring
    })
    .select()
    .single();

  if (subscriptionError) {
    console.error("Error creating subscription:", subscriptionError);
  }

  // Check if sponsored_content already exists to prevent duplicates
  const { data: existingContent } = await supabase
    .from("sponsored_content")
    .select("id")
    .eq("submission_id", submissionId)
    .maybeSingle();

  // Create sponsored content only if it doesn't already exist
  if (!existingContent) {
    const { error: contentError } = await supabase.from("sponsored_content").insert({
      submission_id: submissionId,
      subscription_id: subscriptionData?.id || null,
      user_id: userId || submission.user_id,
      plan_type: plan,
      title: submission.ad_title || `${submission.company_name} Advertisement`,
      description: submission.description,
      image_url: submission.ad_image_url || null, // No fallback image - show title/description instead
      play_icon_url: "/group-1420.png",
      location: submission.ad_location || "Global",
      click_url: submission.ad_click_url || submission.website,
      display_order: planConfig.display_order,
      is_active: true,
      start_date: startDate.toISOString().split("T")[0],
      end_date: endDate.toISOString().split("T")[0],
      is_featured: planConfig.is_featured,
      is_pinned: planConfig.is_pinned,
      max_duration_days: planConfig.duration_days,
      display_locations: planConfig.display_locations,
      analytics_level: planConfig.analytics_level,
      created_by: userId || submission.user_id,
    });

    if (contentError) {
      console.error("Error creating sponsored content:", contentError);
    } else {
      console.log("Successfully created sponsored content for submission:", submissionId);
    }
  } else {
    console.log("Sponsored content already exists for submission:", submissionId, "Skipping creation to prevent duplicate.");
  }

  // Update submission with subscription_id
  if (subscriptionData) {
    await supabase
      .from("advertising_submissions")
      .update({ subscription_id: subscriptionData.id })
      .eq("id", submissionId);
  }
}

async function handlePaymentFailed(supabase: any, paymentIntent: Stripe.PaymentIntent) {
  console.log("Payment failed:", paymentIntent.id);

  // Update payment record if exists
  const { error } = await supabase
    .from("payments")
    .update({
      status: "failed",
    })
    .eq("stripe_payment_intent_id", paymentIntent.id);

  if (error) {
    console.error("Error updating failed payment:", error);
  }

  // Update submission if we can find it
  if (paymentIntent.metadata?.submission_id) {
    await supabase
      .from("advertising_submissions")
      .update({
        payment_status: "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", paymentIntent.metadata.submission_id);
  }
}

async function handleDonationComplete(
  supabase: any,
  stripe: Stripe,
  session: Stripe.Checkout.Session
) {
  console.log("Processing donation checkout session:", session.id);

  // ✅ B. Validate the payment (Step 2B from strict flow)
  // Check payment status
  if (session.payment_status !== "paid") {
    console.error(`Payment not paid. Status: ${session.payment_status}`);
    return;
  }

  if (session.status !== "complete") {
    console.error(`Session not complete. Status: ${session.status}`);
    return;
  }

  // Get donation record first for idempotency check
  const { data: donation, error: fetchError } = await supabase
    .from("donations")
    .select("*")
    .eq("stripe_checkout_session_id", session.id)
    .single();

  if (fetchError) {
    console.error("Error fetching donation:", fetchError);
    return;
  }

  if (!donation) {
    console.error("Donation record not found for session:", session.id);
    return;
  }

  // ✅ B. Idempotency check - prevent duplicate processing
  if (donation.status === "succeeded") {
    console.log("Donation already processed (idempotency check):", session.id);
    // Still send email if not sent yet (check if email exists but donation is already succeeded)
    const emailToUse = session.customer_email || donation.donor_email;
    const isAnonymous = donation.is_anonymous || session.metadata?.is_anonymous === "true";
    
    if (emailToUse && !isAnonymous) {
      // Check if we should resend email (optional - you might want to skip this)
      // For now, we'll skip to avoid duplicate emails
    }
    return;
  }

  // ✅ B. Validate amount matches
  const expectedAmount = parseFloat(donation.amount.toString());
  const actualAmount = session.amount_total ? session.amount_total / 100 : 0;
  
  if (Math.abs(expectedAmount - actualAmount) > 0.01) {
    console.error(`Amount mismatch. Expected: ${expectedAmount}, Actual: ${actualAmount}`);
    return;
  }

  // ✅ B. Validate currency
  if (session.currency?.toLowerCase() !== "usd" && donation.currency?.toLowerCase() !== "usd") {
    console.error(`Currency mismatch. Expected: usd, Actual: ${session.currency}`);
    return;
  }

  // Get payment intent for receipt URL
  let receiptUrl = session.receipt_url || null;
  let paymentIntentId = session.payment_intent as string | null;

  if (session.payment_intent) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(
        session.payment_intent as string
      );
      paymentIntentId = paymentIntent.id;
      // Get receipt URL from payment intent if not in session
      if (!receiptUrl && paymentIntent.charges?.data?.[0]?.receipt_url) {
        receiptUrl = paymentIntent.charges.data[0].receipt_url;
      }
    } catch (err) {
      console.error("Error retrieving payment intent:", err);
    }
  }

  // ✅ C. Write to Supabase Database (Step 2C from strict flow)
  // This is the FIRST and ONLY time we mark the donation as succeeded
  const { error: donationError } = await supabase
    .from("donations")
    .update({
      status: "succeeded",
      stripe_payment_intent_id: paymentIntentId,
      receipt_url: receiptUrl,
      paid_at: new Date().toISOString(),
    })
    .eq("stripe_checkout_session_id", session.id);

  if (donationError) {
    console.error("Error updating donation:", donationError);
    return;
  }

  console.log("Successfully updated donation:", session.id);

  // Determine email address to use for receipt
  // Priority: 1) Stripe session email (always collected), 2) Donation record email
  const emailToUse = session.customer_email || (donation?.donor_email);
  const isAnonymous = donation?.is_anonymous || session.metadata?.is_anonymous === "true";
  
  // Update donation record with email from Stripe if it wasn't stored initially
  if (session.customer_email && donation && !donation.donor_email && !isAnonymous) {
    await supabase
      .from("donations")
      .update({
        donor_email: session.customer_email,
      })
      .eq("stripe_checkout_session_id", session.id);
  }

  // Send email receipt if we have an email and donation is not anonymous
  if (emailToUse && !isAnonymous && donation) {
    try {
      const donorName = donation.donor_name || 
                       session.metadata?.donor_name || 
                       "Valued Supporter";
      const amount = donation.amount ? parseFloat(donation.amount.toString()) : 
                     (session.amount_total ? session.amount_total / 100 : 0);
      
      // Send email and ensure it completes before returning
      await sendDonationReceiptEmail({
        to: emailToUse,
        donorName: donorName,
        amount: amount,
        receiptUrl: receiptUrl,
        donationId: donation.id,
      });
      console.log("Donation receipt email sent to:", emailToUse);
    } catch (emailError: any) {
      console.error("Error sending donation receipt email:", emailError?.message || emailError);
      // Don't fail the webhook if email fails
    }
  } else {
    console.log("Skipping email receipt:", {
      hasEmail: !!emailToUse,
      isAnonymous: isAnonymous,
      hasDonation: !!donation,
      sessionEmail: session.customer_email,
      donationEmail: donation?.donor_email
    });
  }
}

/**
 * Send donation receipt email via Resend API
 */
async function sendDonationReceiptEmail({
  to,
  donorName,
  amount,
  receiptUrl,
  donationId,
}: {
  to: string;
  donorName: string;
  amount: number;
  receiptUrl: string | null;
  donationId: string;
}): Promise<void> {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not configured, skipping email send");
    return;
  }

  // Use verified domain email if set in Supabase secrets as RESEND_FROM_EMAIL
  // Example: "OutbreakNow <notifications@outbreaknow.org>"
  // Falls back to Resend test domain for development/testing (only works for account owner's email)
  const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "OutbreakNow <onboarding@resend.dev>";
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f5f5f5;
        }
        .container {
          background-color: #ffffff;
          border-radius: 8px;
          padding: 40px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          color: #67DBE2;
          margin-bottom: 10px;
        }
        .title {
          font-size: 28px;
          font-weight: bold;
          color: #2a4149;
          margin-bottom: 10px;
        }
        .subtitle {
          font-size: 16px;
          color: #666666;
        }
        .content {
          margin: 30px 0;
        }
        .greeting {
          font-size: 16px;
          margin-bottom: 20px;
        }
        .message {
          font-size: 16px;
          color: #333333;
          margin-bottom: 30px;
          line-height: 1.8;
        }
        .donation-details {
          background-color: #f9f9f9;
          border-radius: 6px;
          padding: 20px;
          margin: 30px 0;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid #e0e0e0;
        }
        .detail-row:last-child {
          border-bottom: none;
        }
        .detail-label {
          font-weight: 600;
          color: #666666;
        }
        .detail-value {
          font-weight: bold;
          color: #2a4149;
        }
        .amount {
          font-size: 32px;
          color: #67DBE2;
          font-weight: bold;
        }
        .impact-section {
          background-color: #f0f9fa;
          border-left: 4px solid #67DBE2;
          padding: 20px;
          margin: 30px 0;
          border-radius: 4px;
        }
        .impact-title {
          font-size: 18px;
          font-weight: bold;
          color: #2a4149;
          margin-bottom: 15px;
        }
        .impact-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .impact-list li {
          padding: 8px 0;
          color: #333333;
        }
        .impact-list li:before {
          content: "✓ ";
          color: #67DBE2;
          font-weight: bold;
          margin-right: 8px;
        }
        .receipt-link {
          text-align: center;
          margin: 30px 0;
        }
        .button {
          display: inline-block;
          background-color: #67DBE2;
          color: #ffffff;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 16px;
        }
        .footer {
          text-align: center;
          padding-top: 30px;
          margin-top: 30px;
          border-top: 1px solid #e0e0e0;
          color: #666666;
          font-size: 14px;
        }
        .footer a {
          color: #67DBE2;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">OutbreakNow</div>
          <div class="title">Thank You for Your Donation! 🎉</div>
          <div class="subtitle">Your contribution makes a difference</div>
        </div>
        
        <div class="content">
          <div class="greeting">
            Dear ${donorName},
          </div>
          
          <div class="message">
            Thank you for your generous donation to OutbreakNow. Your support helps us expand global health surveillance, improve predictive models, and make life-saving information accessible to communities worldwide.
          </div>
          
          <div class="donation-details">
            <div class="detail-row">
              <span class="detail-label">Donation Amount:</span>
              <span class="detail-value amount">${formattedAmount}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Date:</span>
              <span class="detail-value">${new Date().toLocaleDateString("en-US", { 
                year: "numeric", 
                month: "long", 
                day: "numeric" 
              })}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Transaction ID:</span>
              <span class="detail-value" style="font-family: monospace; font-size: 12px;">${donationId.substring(0, 8)}...</span>
            </div>
          </div>
          
          ${receiptUrl ? `
          <div class="receipt-link">
            <a href="${receiptUrl}" class="button">View Full Receipt</a>
          </div>
          ` : ''}
          
          <div class="impact-section">
            <div class="impact-title">Your Impact</div>
            <ul class="impact-list">
              <li>Supporting global data coverage to underserved regions</li>
              <li>Enhancing AI prediction accuracy and early warning systems</li>
              <li>Maintaining real-time infrastructure and data processing</li>
              <li>Providing free access to public health organizations</li>
              <li>Research and development of new monitoring technologies</li>
            </ul>
          </div>
          
          <div class="message">
            Your donation is tax-deductible to the extent allowed by law. Please keep this email as your receipt for tax purposes.
          </div>
        </div>
        
        <div class="footer">
          <p>With gratitude,<br><strong>The OutbreakNow Team</strong></p>
          <p style="margin-top: 20px;">
            <a href="https://outbreaknow.org">Visit OutbreakNow</a> | 
            <a href="mailto:support@outbreaknow.org">Contact Support</a>
          </p>
          <p style="margin-top: 10px; font-size: 12px; color: #999999;">
            This is an automated receipt. Please do not reply to this email.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [to],
      subject: `Donation Receipt - ${formattedAmount} | OutbreakNow`,
      html: emailHtml,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend API error: ${response.status} ${errorText}`);
  }

  // Fully consume the response
  const result = await response.json();
  console.log(`Donation receipt email sent to ${to}:`, result.id);
}

async function handleRefund(supabase: any, charge: Stripe.Charge) {
  console.log("Refund processed:", charge.id);

  const refundAmount = charge.amount_refunded / 100; // Convert cents to dollars

  // Check if this is a donation refund
  const isDonation = charge.metadata?.donation_type === "one_time";

  if (isDonation) {
    // Update donation record
    const { error } = await supabase
      .from("donations")
      .update({
        status: charge.refunded ? "refunded" : "succeeded", // Donations table only has 'refunded' status
        paid_at: charge.refunded ? null : undefined, // Clear paid_at if fully refunded
      })
      .eq("stripe_payment_intent_id", charge.payment_intent);

    if (error) {
      console.error("Error updating refunded donation:", error);
    }
    return;
  }

  // Otherwise, handle as advertising payment refund
  const { error } = await supabase
    .from("payments")
    .update({
      status: charge.refunded ? "refunded" : "partially_refunded",
      refunded_at: new Date().toISOString(),
      refund_amount: refundAmount,
    })
    .eq("stripe_charge_id", charge.id);

  if (error) {
    console.error("Error updating refunded payment:", error);
  }

  // If fully refunded, deactivate sponsored content
  if (charge.refunded && charge.metadata?.submission_id) {
    await supabase
      .from("sponsored_content")
      .update({ is_active: false })
      .eq("submission_id", charge.metadata.submission_id);

    await supabase
      .from("advertising_submissions")
      .update({
        status: "cancelled",
        payment_status: "refunded",
      })
      .eq("id", charge.metadata.submission_id);
  }
}

