import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendNotificationRequest {
  title: string;
  message: string;
  target: "all" | "selected";
  userIds?: string[];
}

/**
 * Send email via Resend API
 */
async function sendEmailViaResend({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
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

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [to],
      subject: subject,
      html: html,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend API error: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  console.log(`Email sent to ${to}:`, result.id);
}

/**
 * Convert plain text to simple HTML
 */
function textToHtml(text: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 5px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="content">
        ${text.replace(/\n/g, "<br>")}
      </div>
      <div class="footer">
        <p>You received this notification from OutbreakNow.</p>
      </div>
    </body>
    </html>
  `;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify admin role
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleError || roleData?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Unauthorized - Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body: SendNotificationRequest = await req.json();
    const { title, message, target, userIds } = body;

    // Validate input
    if (!title || !message) {
      return new Response(
        JSON.stringify({ error: "Title and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (target === "selected" && (!userIds || userIds.length === 0)) {
      return new Response(
        JSON.stringify({ error: "User IDs are required when target is 'selected'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get target user IDs
    let targetUserIds: string[] = [];

    if (target === "all") {
      // Fetch all users from auth.users
      const { data: allUsers, error: usersError } = await supabase.auth.admin.listUsers();
      if (usersError) {
        throw new Error(`Failed to fetch users: ${usersError.message}`);
      }
      targetUserIds = allUsers.users.map((u) => u.id);
    } else {
      // Use provided user IDs
      targetUserIds = userIds || [];
    }

    if (targetUserIds.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          notificationsCreated: 0,
          emailsSent: 0,
          errors: ["No users to notify"],
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create in-app notifications
    const notifications = targetUserIds.map((userId) => ({
      user_id: userId,
      type: "admin_broadcast",
      title: title,
      message: message,
      priority: "normal",
      read: false,
    }));

    const { error: insertError } = await supabase
      .from("notifications")
      .insert(notifications);

    if (insertError) {
      throw new Error(`Failed to create notifications: ${insertError.message}`);
    }

    // Send emails via Resend
    const emailErrors: string[] = [];
    let emailsSent = 0;

    for (const userId of targetUserIds) {
      try {
        // Get user email from auth.users
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
        
        if (userError || !userData?.user?.email) {
          emailErrors.push(`User ${userId}: No email found`);
          continue;
        }

        const userEmail = userData.user.email;

        // Send email
        await sendEmailViaResend({
          to: userEmail,
          subject: title,
          html: textToHtml(message),
        });

        emailsSent++;
      } catch (error: any) {
        emailErrors.push(`User ${userId}: ${error.message}`);
        console.error(`Failed to send email to user ${userId}:`, error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        notificationsCreated: notifications.length,
        emailsSent: emailsSent,
        errors: emailErrors.length > 0 ? emailErrors : undefined,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error sending admin notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

