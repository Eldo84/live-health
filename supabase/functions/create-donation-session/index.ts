import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno&no-check";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    // Parse request body
    const { amount, donor_name, donor_email, is_anonymous } = await req.json();

    // Validate amount
    if (!amount || typeof amount !== "number" || amount < 1) {
      throw new Error("Invalid donation amount. Minimum is $1.00");
    }

    // Convert amount to cents
    const amountInCents = Math.round(amount * 100);

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2024-04-10",
    });

    // Get origin for success/cancel URLs
    const origin = req.headers.get("origin") || "http://localhost:5173";
    const successUrl = `${origin}/donate/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/donate/cancelled`;

    // Create Stripe Checkout Session (guest checkout - no customer required)
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Donation to OutbreakNow",
              description: "Supporting global health surveillance and disease monitoring",
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        donation_type: "one_time",
        is_anonymous: is_anonymous ? "true" : "false",
        ...(donor_name && !is_anonymous ? { donor_name } : {}),
        ...(donor_email && !is_anonymous ? { donor_email } : {}),
      },
      // Collect email if provided, otherwise let Stripe collect it
      customer_email: donor_email && !is_anonymous ? donor_email : undefined,
    });

    // Create pending donation record in database
    const { error: donationError } = await supabase
      .from("donations")
      .insert({
        amount: amount,
        currency: "usd",
        donor_name: is_anonymous ? null : donor_name || null,
        donor_email: is_anonymous ? null : donor_email || null,
        is_anonymous: is_anonymous || false,
        stripe_checkout_session_id: session.id,
        status: "pending",
      });

    if (donationError) {
      console.error("Error creating donation record:", donationError);
      throw new Error("Failed to create donation record");
    }

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
    console.error("Error creating donation session:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to create donation session" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});

