-- Enable Row Level Security on the v_monthly_revenue view
ALTER VIEW public.v_monthly_revenue SET (security_barrier = true);

-- Create RLS policy to restrict access to admins only
CREATE POLICY "Only admins can view revenue data" 
ON public.v_monthly_revenue 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'co_admin')
);