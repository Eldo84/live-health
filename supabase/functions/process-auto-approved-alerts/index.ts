import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AlertSubmission {
  id: string;
  user_id: string | null;
  user_email: string;
  url: string;
  headline: string;
  location: string;
  date: string;
  disease_id: string | null;
  disease_name: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  country_name: string | null;
  country_id: string | null;
  status: string;
  reviewed_at: string | null;
  admin_notes: string | null;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role for admin operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all auto-approved submissions that haven't been processed yet
    const { data: autoApprovedSubmissions, error: fetchError } = await supabase
      .from("user_alert_submissions")
      .select("*")
      .eq("status", "approved")
      .not("reviewed_at", "is", null)
      .like("admin_notes", "Auto-approved:%")
      .is("outbreak_signal_id", null)
      .limit(50);

    if (fetchError) {
      console.error("Error fetching auto-approved submissions:", fetchError);
      throw new Error(`Failed to fetch submissions: ${fetchError.message}`);
    }

    if (!autoApprovedSubmissions || autoApprovedSubmissions.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No auto-approved submissions to process",
          processed: 0,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Processing ${autoApprovedSubmissions.length} auto-approved submissions`);

    let processed = 0;
    let errors = 0;

    // Process each submission
    for (const submission of autoApprovedSubmissions as AlertSubmission[]) {
      try {
        await processSubmission(supabase, submission);
        processed++;
      } catch (error: any) {
        console.error(`Error processing submission ${submission.id}:`, error);
        errors++;
        
        // Update submission with error note
        await supabase
          .from("user_alert_submissions")
          .update({
            admin_notes: `Auto-approved but processing failed: ${error.message}`,
          })
          .eq("id", submission.id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${processed} submissions, ${errors} errors`,
        processed,
        errors,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in process-auto-approved-alerts:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function processSubmission(
  supabase: ReturnType<typeof createClient>,
  submission: AlertSubmission
) {
  if (!submission.latitude || !submission.longitude) {
    throw new Error("Missing location coordinates");
  }

  // Get or create news source
  let sourceId: string;
  const { data: existingSource } = await supabase
    .from("news_sources")
    .select("id")
    .eq("name", "User Submitted")
    .maybeSingle();

  if (existingSource) {
    sourceId = existingSource.id;
  } else {
    const { data: newSource, error: sourceError } = await supabase
      .from("news_sources")
      .insert({
        name: "User Submitted",
        url: null,
        type: "user_submission",
        reliability_score: 0.7,
        is_active: true,
      })
      .select("id")
      .single();

    if (sourceError || !newSource) {
      throw new Error("Failed to create news source");
    }
    sourceId = newSource.id;
  }

  // Get or create news article
  const publishedDate = new Date(submission.date);
  const { data: existingArticle } = await supabase
    .from("news_articles")
    .select("id")
    .eq("url", submission.url)
    .maybeSingle();

  let articleId: string;
  if (existingArticle) {
    articleId = existingArticle.id;
  } else {
    const locationData = {
      country: submission.country_name || submission.location,
      lat: submission.latitude,
      lng: submission.longitude,
    };

    const { data: newArticle, error: articleError } = await supabase
      .from("news_articles")
      .insert({
        source_id: sourceId,
        title: submission.headline,
        content: submission.description,
        url: submission.url,
        published_at: publishedDate.toISOString(),
        location_extracted: locationData,
        diseases_mentioned: [submission.disease_name.toLowerCase()],
        sentiment_score: -0.5,
        is_verified: true, // Auto-approved, so verified
      })
      .select("id")
      .single();

    if (articleError || !newArticle) {
      throw new Error("Failed to create news article: " + (articleError?.message || "Unknown error"));
    }
    articleId = newArticle.id;
  }

  // Get or create disease
  let diseaseId: string;
  if (submission.disease_id) {
    diseaseId = submission.disease_id;
  } else {
    // Check if disease exists
    const { data: existingDisease } = await supabase
      .from("diseases")
      .select("id")
      .eq("name", submission.disease_name)
      .maybeSingle();

    if (existingDisease) {
      diseaseId = existingDisease.id;
    } else {
      const { data: newDisease, error: diseaseError } = await supabase
        .from("diseases")
        .insert({
          name: submission.disease_name,
          severity_level: "medium",
          color_code: "#66dbe1",
          description: submission.description,
        })
        .select("id")
        .single();

      if (diseaseError || !newDisease) {
        throw new Error("Failed to create disease: " + (diseaseError?.message || "Unknown error"));
      }
      diseaseId = newDisease.id;
    }
  }

  // Get or create country
  let countryId: string | null = submission.country_id;
  if (!countryId && submission.country_name) {
    const { data: existingCountry } = await supabase
      .from("countries")
      .select("id")
      .ilike("name", submission.country_name)
      .maybeSingle();

    if (existingCountry) {
      countryId = existingCountry.id;
    } else {
      const { data: newCountry, error: countryError } = await supabase
        .from("countries")
        .insert({
          name: submission.country_name,
          code: submission.country_name.substring(0, 2).toUpperCase(),
          continent: "Unknown",
          population: 0,
        })
        .select("id")
        .single();

      if (!countryError && newCountry) {
        countryId = newCountry.id;
      }
    }
  }

  // Create outbreak signal
  const { data: signalData, error: signalError } = await supabase
    .from("outbreak_signals")
    .insert({
      article_id: articleId,
      disease_id: diseaseId,
      country_id: countryId,
      latitude: submission.latitude,
      longitude: submission.longitude,
      confidence_score: 0.8,
      case_count_mentioned: 0,
      severity_assessment: "medium",
      is_new_outbreak: true,
      detected_at: publishedDate.toISOString(),
    })
    .select("id")
    .single();

  if (signalError || !signalData) {
    throw new Error("Failed to create outbreak signal: " + (signalError?.message || "Unknown error"));
  }

  // Update submission with related IDs
  const { error: updateError } = await supabase
    .from("user_alert_submissions")
    .update({
      article_id: articleId,
      source_id: sourceId,
      outbreak_signal_id: signalData.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", submission.id);

  if (updateError) {
    throw new Error("Failed to update submission: " + updateError.message);
  }

  // Create notification for user
  if (submission.user_id) {
    try {
      await supabase.from("notifications").insert({
        user_id: submission.user_id,
        type: "alert_approved",
        title: "Alert Auto-Approved! ✓",
        message:
          "Your alert about " +
          submission.disease_name +
          " in " +
          submission.location +
          " has been automatically approved and is now visible on the map.",
        action_url: "/dashboard",
        action_label: "View Dashboard",
        priority: "normal",
      });
    } catch (notifError) {
      // Don't fail the whole process if notification fails
      console.warn("Failed to create notification:", notifError);
    }
  }

  console.log(`Successfully processed submission ${submission.id}`);
}

