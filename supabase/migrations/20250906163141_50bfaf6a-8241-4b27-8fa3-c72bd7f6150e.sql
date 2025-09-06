-- Drop the existing view and recreate it as a secure function instead
DROP VIEW IF EXISTS public.v_monthly_revenue;

-- Create a secure function to replace the view
CREATE OR REPLACE FUNCTION public.get_monthly_revenue()
RETURNS TABLE(
  month timestamp with time zone,
  month_key text,
  month_name text,
  revenue numeric,
  payment_count bigint
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $function$
  -- Only allow admins to access revenue data
  SELECT 
    date_trunc('month', COALESCE(p.approved_at, p.paid_at, p.created_at)) AS month,
    to_char(date_trunc('month', COALESCE(p.approved_at, p.paid_at, p.created_at)), 'YYYY-MM') AS month_key,
    to_char(date_trunc('month', COALESCE(p.approved_at, p.paid_at, p.created_at)), 'Mon YYYY') AS month_name,
    sum(COALESCE(p.amount_usd, p.amount, 0::numeric)) AS revenue,
    count(*) AS payment_count
  FROM payments p
  WHERE (p.status = ANY (ARRAY['approved'::text, 'paid'::text]))
    AND (
      has_role(auth.uid(), 'admin') OR 
      has_role(auth.uid(), 'co_admin')
    )
  GROUP BY date_trunc('month', COALESCE(p.approved_at, p.paid_at, p.created_at))
  ORDER BY date_trunc('month', COALESCE(p.approved_at, p.paid_at, p.created_at)) DESC;
$function$;