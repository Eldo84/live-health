import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// Plan configuration
const PLAN_CONFIG = {
  basic: {
    price: 50.00,
    duration_days: 30,
    display_order: 200,
    is_featured: false,
    is_pinned: false,
    display_locations: ["map"],
    analytics_level: "basic",
  },
  professional: {
    price: 150.00,
    duration_days: 60,
    display_order: 100,
    is_featured: true,
    is_pinned: false,
    display_locations: ["map", "homepage"],
    analytics_level: "advanced",
  },
  enterprise: {
    price: 300.00,
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
      apiVersion: "2023-10-16",
    });

    // Get request body and signature
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    let event: Stripe.Event;

    // Verify webhook signature if secret is configured
    if (webhookSecret && signature) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
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

async function handleRefund(supabase: any, charge: Stripe.Charge) {
  console.log("Refund processed:", charge.id);

  const refundAmount = charge.amount_refunded / 100; // Convert cents to dollars

  // Update payment record
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

