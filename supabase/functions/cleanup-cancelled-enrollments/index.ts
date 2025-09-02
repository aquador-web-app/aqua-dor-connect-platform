import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role for admin operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false
        }
      }
    );

    console.log('Starting cleanup of cancelled enrollments older than 24 hours...');

    // Calculate cutoff time (24 hours ago)
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Get cancelled enrollments older than 24 hours that are still visible
    const { data: expiredEnrollments, error: fetchError } = await supabaseClient
      .from('enrollments')
      .select('id, cancelled_at, classes(name)')
      .eq('status', 'cancelled')
      .not('cancelled_at', 'is', null)
      .lt('cancelled_at', cutoffTime.toISOString());

    if (fetchError) {
      throw new Error(`Failed to fetch expired enrollments: ${fetchError.message}`);
    }

    console.log(`Found ${expiredEnrollments?.length || 0} expired cancelled enrollments`);

    if (expiredEnrollments && expiredEnrollments.length > 0) {
      // Log the cleanup action
      for (const enrollment of expiredEnrollments) {
        const { error: logError } = await supabaseClient
          .from('reservation_events')
          .insert({
            enrollment_id: enrollment.id,
            type: 'cleanup',
            actor_id: null, // System action
            metadata: {
              cleanup_reason: 'expired_visibility_window',
              cancelled_at: enrollment.cancelled_at,
              cleaned_up_at: new Date().toISOString(),
              class_name: enrollment.classes?.name || 'Unknown'
            }
          });

        if (logError) {
          console.error(`Failed to log cleanup for enrollment ${enrollment.id}:`, logError);
        }
      }

      // Mark as cleaned up (we don't delete, just hide from UI by updating a flag)
      // In practice, the client-side filtering handles the 24-hour window,
      // but we log the cleanup events for audit purposes
      console.log(`Logged cleanup events for ${expiredEnrollments.length} enrollments`);
    }

    // Also cleanup old payment events and reservation events (keep last 90 days)
    const eventsCutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    
    const { error: cleanupPaymentEventsError } = await supabaseClient
      .from('payment_events')
      .delete()
      .lt('occurred_at', eventsCutoff.toISOString());

    if (cleanupPaymentEventsError) {
      console.error('Failed to cleanup old payment events:', cleanupPaymentEventsError);
    }

    const { error: cleanupReservationEventsError } = await supabaseClient
      .from('reservation_events')
      .delete()
      .lt('occurred_at', eventsCutoff.toISOString());

    if (cleanupReservationEventsError) {
      console.error('Failed to cleanup old reservation events:', cleanupReservationEventsError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        cleaned_enrollments: expiredEnrollments?.length || 0,
        timestamp: new Date().toISOString(),
        message: 'Cleanup completed successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Cleanup error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
