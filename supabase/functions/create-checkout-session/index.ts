import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Plan configuration
const PLAN_CONFIG = {
  basic: {
    price: 5000, // $50.00 in cents
    name: "Basic Plan",
    duration_days: 30,
  },
  professional: {
    price: 15000, // $150.00 in cents
    name: "Professional Plan",
    duration_days: 60,
  },
  enterprise: {
    price: 30000, // $300.00 in cents
    name: "Enterprise Plan",
    duration_days: 90,
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
    const { submission_id } = await req.json();
    if (!submission_id) {
      throw new Error("Missing submission_id");
    }

    // Get submission
    const { data: submission, error: submissionError } = await supabase
      .from("advertising_submissions")
      .select("*")
      .eq("id", submission_id)
      .single();

    if (submissionError || !submission) {
      throw new Error("Submission not found");
    }

    // Verify submission belongs to user (admins cannot pay for other users' submissions)
    if (submission.user_id !== user.id && submission.email !== user.email) {
      throw new Error("Unauthorized: submission does not belong to user");
    }

    if (submission.status !== "approved_pending_payment") {
      throw new Error(`Invalid submission status: ${submission.status}. Must be 'approved_pending_payment'`);
    }

    if (submission.payment_status === "paid") {
      throw new Error("Submission already paid");
    }

    // Get plan config
    const planConfig = PLAN_CONFIG[submission.selected_plan as keyof typeof PLAN_CONFIG];
    if (!planConfig) {
      throw new Error("Invalid plan");
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    // Get or create Stripe customer
    let customerId: string;
    
    // Check if user already has a Stripe customer ID
    const { data: existingSubscription } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .not("stripe_customer_id", "is", null)
      .limit(1)
      .maybeSingle();

    if (existingSubscription?.stripe_customer_id) {
      customerId = existingSubscription.stripe_customer_id;
    } else {
      // Create new customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id,
          submission_id: submission_id,
        },
      });
      customerId = customer.id;
    }

    // Get success/cancel URLs from request or use defaults
    const origin = req.headers.get("origin") || "http://localhost:5173";
    const successUrl = `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}&submission_id=${submission_id}`;
    const cancelUrl = `${origin}/payment/cancelled?submission_id=${submission_id}`;

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `OutbreakNow ${planConfig.name}`,
              description: `${planConfig.duration_days}-day advertising placement`,
              metadata: {
                plan: submission.selected_plan,
                submission_id: submission_id,
              },
            },
            unit_amount: planConfig.price,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        user_id: user.id,
        submission_id: submission_id,
        plan: submission.selected_plan,
      },
      client_reference_id: submission_id,
    });

    // Update submission with pending payment status
    await supabase
      .from("advertising_submissions")
      .update({
        payment_status: "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", submission_id);

    // Create pending payment record
    await supabase.from("payments").insert({
      user_id: user.id,
      submission_id: submission_id,
      amount: planConfig.price / 100, // Convert cents to dollars
      currency: "usd",
      plan_type: submission.selected_plan,
      stripe_checkout_session_id: session.id,
      status: "pending",
      description: `${planConfig.name} - ${planConfig.duration_days} days`,
    });

    return new Response(
      JSON.stringify({
        url: session.url,
        session_id: session.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error creating checkout session:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});

