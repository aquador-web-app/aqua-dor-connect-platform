import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const resend = new Resend(resendApiKey);

interface NotificationData {
  booking_id?: string;
  class_name?: string;
  session_date?: string;
  instructor_name?: string;
  user_name?: string;
  referral_code?: string;
  commission_amount?: number;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Send notifications function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Fetch pending notifications
    const { data: notifications, error: fetchError } = await supabase
      .from("notification_queue")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_for", new Date().toISOString())
      .lt("attempts", 3)
      .order("created_at", { ascending: true })
      .limit(50);

    if (fetchError) {
      console.error("Error fetching notifications:", fetchError);
      throw fetchError;
    }

    console.log(`Processing ${notifications?.length || 0} notifications`);

    const results = [];

    for (const notification of notifications || []) {
      try {
        console.log(`Processing notification ${notification.id} of type ${notification.notification_type}`);

        // Mark as processing
        await supabase
          .from("notification_queue")
          .update({ 
            status: "processing",
            attempts: notification.attempts + 1
          })
          .eq("id", notification.id);

        const emailContent = generateEmailContent(notification.notification_type, notification.data);
        
        const emailResponse = await resend.emails.send({
          from: "A'qua D'or <noreply@aquador.com>",
          to: [notification.email],
          subject: emailContent.subject,
          html: emailContent.html,
        });

        console.log(`Email sent successfully for notification ${notification.id}:`, emailResponse);

        // Mark as sent
        await supabase
          .from("notification_queue")
          .update({ 
            status: "sent",
            sent_at: new Date().toISOString()
          })
          .eq("id", notification.id);

        // Log email
        await supabase
          .from("email_logs")
          .insert({
            user_id: notification.user_id,
            recipient_email: notification.email,
            subject: emailContent.subject,
            template_type: notification.notification_type,
            status: "sent",
            sent_at: new Date().toISOString()
          });

        results.push({ 
          notification_id: notification.id, 
          status: "success",
          email_id: emailResponse.data?.id
        });

      } catch (error) {
        console.error(`Error processing notification ${notification.id}:`, error);

        // Mark as failed if max attempts reached
        const newStatus = notification.attempts >= 2 ? "failed" : "pending";
        
        await supabase
          .from("notification_queue")
          .update({ 
            status: newStatus,
            attempts: notification.attempts + 1
          })
          .eq("id", notification.id);

        // Log failed email
        await supabase
          .from("email_logs")
          .insert({
            user_id: notification.user_id,
            recipient_email: notification.email,
            subject: `Failed: ${notification.notification_type}`,
            template_type: notification.notification_type,
            status: "failed",
            error_message: error.message
          });

        results.push({ 
          notification_id: notification.id, 
          status: "error", 
          error: error.message 
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        processed: results.length,
        results 
      }),
      {
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders 
        },
      }
    );

  } catch (error: any) {
    console.error("Error in send-notifications function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

function generateEmailContent(type: string, data: NotificationData) {
  switch (type) {
    case "booking_confirmation":
      return {
        subject: "Confirmation de réservation - A'qua D'or",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0066cc;">Confirmation de Réservation</h2>
            <p>Bonjour,</p>
            <p>Votre réservation pour le cours <strong>${data.class_name}</strong> a été confirmée.</p>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Détails du cours:</h3>
              <p><strong>Cours:</strong> ${data.class_name}</p>
              <p><strong>Date:</strong> ${new Date(data.session_date!).toLocaleDateString('fr-FR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</p>
              <p><strong>Instructeur:</strong> ${data.instructor_name}</p>
            </div>
            <p>Nous avons hâte de vous voir!</p>
            <p><strong>L'équipe A'qua D'or</strong></p>
          </div>
        `
      };

    case "class_reminder":
      return {
        subject: "Rappel de cours - A'qua D'or",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0066cc;">Rappel de Cours</h2>
            <p>Bonjour,</p>
            <p>N'oubliez pas votre cours de natation demain!</p>
            <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
              <h3>Votre cours:</h3>
              <p><strong>Cours:</strong> ${data.class_name}</p>
              <p><strong>Date:</strong> ${new Date(data.session_date!).toLocaleDateString('fr-FR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</p>
              <p><strong>Instructeur:</strong> ${data.instructor_name}</p>
            </div>
            <p>Pensez à apporter votre maillot de bain et une serviette!</p>
            <p><strong>L'équipe A'qua D'or</strong></p>
          </div>
        `
      };

    case "user_registration":
      return {
        subject: "Bienvenue chez A'qua D'or!",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0066cc;">Bienvenue chez A'qua D'or!</h2>
            <p>Bonjour ${data.user_name},</p>
            <p>Félicitations! Votre compte a été créé avec succès.</p>
            <div style="background: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
              <h3>Prochaines étapes:</h3>
              <ul>
                <li>Explorez nos cours de natation</li>
                <li>Réservez votre première session</li>
                <li>Rencontrez nos instructeurs expérimentés</li>
              </ul>
            </div>
            <p>Nous sommes ravis de vous accompagner dans votre parcours aquatique!</p>
            <p><strong>L'équipe A'qua D'or</strong></p>
          </div>
        `
      };

    case "schedule_change":
      return {
        subject: "Modification d'horaire - A'qua D'or",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc3545;">Modification d'Horaire</h2>
            <p>Bonjour,</p>
            <p>Nous vous informons qu'il y a eu une modification concernant votre cours.</p>
            <div style="background: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
              <h3>Détails:</h3>
              <p><strong>Cours:</strong> ${data.class_name}</p>
              <p><strong>Nouvelle date:</strong> ${new Date(data.session_date!).toLocaleDateString('fr-FR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</p>
            </div>
            <p>Merci de votre compréhension.</p>
            <p><strong>L'équipe A'qua D'or</strong></p>
          </div>
        `
      };

    case "referral_success":
      return {
        subject: "Félicitations! Parrainage réussi - A'qua D'or",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #28a745;">Parrainage Réussi!</h2>
            <p>Bonjour,</p>
            <p>Félicitations! Votre parrainage a été un succès.</p>
            <div style="background: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
              <h3>Récompense de parrainage:</h3>
              <p><strong>Code de parrainage:</strong> ${data.referral_code}</p>
              <p><strong>Commission gagnée:</strong> ${data.commission_amount} HTG</p>
            </div>
            <p>Merci de faire grandir notre communauté!</p>
            <p><strong>L'équipe A'qua D'or</strong></p>
          </div>
        `
      };

    default:
      return {
        subject: "Notification - A'qua D'or",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0066cc;">Notification</h2>
            <p>Vous avez une nouvelle notification de A'qua D'or.</p>
            <p><strong>L'équipe A'qua D'or</strong></p>
          </div>
        `
      };
  }
}

serve(handler);