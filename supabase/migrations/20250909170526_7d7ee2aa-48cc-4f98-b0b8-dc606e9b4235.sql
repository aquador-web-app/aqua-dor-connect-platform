-- Drop the existing insecure view
DROP VIEW IF EXISTS public.v_monthly_revenue;

-- Create a secure function instead that only allows admin access
CREATE OR REPLACE FUNCTION public.get_monthly_revenue_view()
RETURNS TABLE(
  month timestamp with time zone,
  year double precision,
  month_num double precision,
  month_name text,
  total_revenue numeric,
  payment_count bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  -- Only allow admins to access revenue data
  SELECT 
    date_trunc('month', approved_at) AS month,
    EXTRACT(year FROM date_trunc('month', approved_at)) AS year,
    EXTRACT(month FROM date_trunc('month', approved_at)) AS month_num,
    to_char(date_trunc('month', approved_at), 'Mon YYYY') AS month_name,
    sum(amount) AS total_revenue,
    count(*) AS payment_count
  FROM payments_normalized
  WHERE (status = 'approved' AND approved_at IS NOT NULL)
    AND (
      has_role(auth.uid(), 'admin') OR 
      has_role(auth.uid(), 'co_admin')
    )
  GROUP BY date_trunc('month', approved_at)
  ORDER BY date_trunc('month', approved_at) DESC;
$$;