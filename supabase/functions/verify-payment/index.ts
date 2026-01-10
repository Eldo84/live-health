import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno&no-check";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Plan configuration (must match webhook handler)
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
    if (!stripeKey) {
      throw new Error("Stripe secret key not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Parse request body
    const { session_id, submission_id } = await req.json();
    if (!session_id || !submission_id) {
      throw new Error("Missing session_id or submission_id");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2024-04-10",
    });

    // Retrieve the Stripe checkout session
    const session = await stripe.checkout.sessions.retrieve(session_id);

    // Check if payment was successful
    if (session.payment_status === "paid" && session.status === "complete") {
      // Check current database status
      const { data: submission, error: fetchError } = await supabase
        .from("advertising_submissions")
        .select("status, payment_status")
        .eq("id", submission_id)
        .single();

      if (fetchError) {
        throw new Error("Submission not found");
      }

      // If already updated, return success
      if (submission.payment_status === "paid" || submission.status === "active") {
        return new Response(
          JSON.stringify({ verified: true, already_processed: true }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }

      // Get full submission details
      const { data: fullSubmission, error: fetchFullError } = await supabase
        .from("advertising_submissions")
        .select("*")
        .eq("id", submission_id)
        .single();

      if (fetchFullError || !fullSubmission) {
        throw new Error("Failed to fetch submission details");
      }

      const plan = fullSubmission.selected_plan as keyof typeof PLAN_CONFIG;
      const planConfig = PLAN_CONFIG[plan];
      if (!planConfig) {
        throw new Error("Invalid plan type");
      }

      // Payment is successful in Stripe but not in database - update it
      // This handles the case where webhook is delayed or hasn't fired yet
      // NOTE: We do NOT create sponsored_content here - the webhook is the single source of truth
      // to prevent race conditions and duplicates
      const { error: updateError } = await supabase
        .from("advertising_submissions")
        .update({
          status: "active",
          payment_status: "paid",
          updated_at: new Date().toISOString(),
        })
        .eq("id", submission_id);

      if (updateError) {
        console.error("Error updating submission:", updateError);
        throw new Error("Failed to update submission");
      }

      // Also update/create payment record
      const { data: existingPayment } = await supabase
        .from("payments")
        .select("id")
        .eq("stripe_checkout_session_id", session_id)
        .maybeSingle();

      if (!existingPayment) {
        // Create payment record if it doesn't exist
        await supabase.from("payments").insert({
          user_id: user.id,
          submission_id: submission_id,
          amount: session.amount_total ? session.amount_total / 100 : 0,
          currency: session.currency || "usd",
          status: "succeeded",
          stripe_checkout_session_id: session_id,
          stripe_payment_intent_id: session.payment_intent as string,
          paid_at: new Date().toISOString(),
        });
      }

      // Check if subscription already exists
      const { data: existingSubscription } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("submission_id", submission_id)
        .maybeSingle();

      let subscriptionId = existingSubscription?.id;

      // Create subscription if it doesn't exist
      if (!subscriptionId) {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + planConfig.duration_days);

        const { data: subscriptionData, error: subscriptionError } = await supabase
          .from("subscriptions")
          .insert({
            user_id: user.id,
            submission_id: submission_id,
            plan_type: plan,
            plan_price: planConfig.price,
            stripe_customer_id: session.customer as string,
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
        } else {
          subscriptionId = subscriptionData.id;
        }
      }

      // NOTE: We do NOT create sponsored_content here to avoid race conditions with the webhook.
      // The Stripe webhook (stripe-webhook function) is the single source of truth for creating
      // sponsored_content. This function only verifies payment and updates submission status.
      // If the webhook fails, sponsored_content can be created manually via admin panel or
      // by retrying the webhook event in Stripe dashboard.
      
      // Check if sponsored_content exists (for logging/info purposes only)
      const { data: existingContent } = await supabase
        .from("sponsored_content")
        .select("id")
        .eq("submission_id", submission_id)
        .maybeSingle();

      if (existingContent) {
        console.log("Sponsored content already exists (created by webhook):", submission_id);
      } else {
        console.log("Sponsored content will be created by webhook for submission:", submission_id);
      }

      // Update submission with subscription_id if we created one
      if (subscriptionId && !fullSubmission.subscription_id) {
        await supabase
          .from("advertising_submissions")
          .update({ subscription_id: subscriptionId })
          .eq("id", submission_id);
      }

      return new Response(
        JSON.stringify({ 
          verified: true, 
          updated: true, 
          content_exists: !!existingContent,
          note: "Sponsored content is created by webhook, not this verification function"
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } else {
      // Payment not completed yet
      return new Response(
        JSON.stringify({ verified: false, payment_status: session.payment_status }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }
  } catch (error: any) {
    console.error("Verification error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

