-- Update the get_monthly_revenue function to include approved payments
CREATE OR REPLACE FUNCTION public.get_monthly_revenue()
 RETURNS TABLE(month timestamp with time zone, month_key text, month_name text, revenue numeric, payment_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  -- Only allow admins to access revenue data
  SELECT 
    date_trunc('month', COALESCE(p.approved_at, p.paid_at, p.created_at)) AS month,
    to_char(date_trunc('month', COALESCE(p.approved_at, p.paid_at, p.created_at)), 'YYYY-MM') AS month_key,
    to_char(date_trunc('month', COALESCE(p.approved_at, p.paid_at, p.created_at)), 'Mon YYYY') AS month_name,
    sum(COALESCE(p.amount_usd, p.amount, 0::numeric)) AS revenue,
    count(*) AS payment_count
  FROM payments p
  WHERE (p.status = ANY (ARRAY['approved'::text, 'paid'::text, 'completed'::text]))
    AND (
      has_role(auth.uid(), 'admin') OR 
      has_role(auth.uid(), 'co_admin')
    )
  GROUP BY date_trunc('month', COALESCE(p.approved_at, p.paid_at, p.created_at))
  ORDER BY date_trunc('month', COALESCE(p.approved_at, p.paid_at, p.created_at)) DESC;
$function$;