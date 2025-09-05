-- Create subscription plans table
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL,
  frequency_per_week INTEGER NOT NULL DEFAULT 1,
  price NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create student subscription assignments table
CREATE TABLE public.student_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id),
  subscription_plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  assigned_by UUID NOT NULL REFERENCES profiles(id),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create product categories table
CREATE TABLE public.product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  category_id UUID REFERENCES product_categories(id),
  image_url TEXT,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create shopping cart table
CREATE TABLE public.shopping_cart (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Create orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  order_number TEXT UNIQUE NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  payment_method TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  order_status TEXT NOT NULL DEFAULT 'pending',
  shipping_address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create order items table
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_cart ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscription_plans
CREATE POLICY "Admins can manage subscription plans" ON subscription_plans
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'co_admin'));

-- RLS Policies for student_subscriptions
CREATE POLICY "Admins can manage student subscriptions" ON student_subscriptions
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'co_admin'));

CREATE POLICY "Students can view their own subscriptions" ON student_subscriptions
  FOR SELECT USING (student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- RLS Policies for product_categories
CREATE POLICY "Everyone can view active categories" ON product_categories
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage categories" ON product_categories
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'co_admin'));

-- RLS Policies for products
CREATE POLICY "Everyone can view active products" ON products
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage products" ON products
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'co_admin'));

-- RLS Policies for shopping_cart
CREATE POLICY "Users can manage their own cart" ON shopping_cart
  FOR ALL USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- RLS Policies for orders
CREATE POLICY "Users can view their own orders" ON orders
  FOR SELECT USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can create their own orders" ON orders
  FOR INSERT WITH CHECK (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all orders" ON orders
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'co_admin'));

-- RLS Policies for order_items
CREATE POLICY "Users can view their own order items" ON order_items
  FOR SELECT USING (order_id IN (SELECT id FROM orders WHERE user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())));

CREATE POLICY "Users can create order items for their orders" ON order_items
  FOR INSERT WITH CHECK (order_id IN (SELECT id FROM orders WHERE user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())));

CREATE POLICY "Admins can manage all order items" ON order_items
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'co_admin'));

-- Create function to generate order numbers
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_num TEXT;
  exists_check INTEGER;
  current_month TEXT;
BEGIN
  current_month := TO_CHAR(CURRENT_DATE, 'YYYY-MM');
  
  LOOP
    order_num := 'ORD-' || current_month || '-' || LPAD(FLOOR(RANDOM() * 999999 + 1)::TEXT, 6, '0');
    SELECT COUNT(*) INTO exists_check FROM orders WHERE order_number = order_num;
    EXIT WHEN exists_check = 0;
  END LOOP;
  
  RETURN order_num;
END;
$$;

-- Create trigger to auto-generate order numbers
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := generate_order_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_order_number_trigger
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_order_number();

-- Insert some default product categories
INSERT INTO public.product_categories (name, description) VALUES
  ('Swimming Gear', 'Essential swimming equipment and accessories'),
  ('Pool Care', 'Products for pool maintenance and care'),
  ('Apparel', 'Swimming apparel and clothing'),
  ('Health & Safety', 'Safety equipment and health products');

-- Insert some sample products
INSERT INTO public.products (name, description, price, category_id, stock_quantity) VALUES
  ('Professional Swimming Goggles', 'Anti-fog swimming goggles with UV protection', 25.00, (SELECT id FROM product_categories WHERE name = 'Swimming Gear'), 50),
  ('Silicone Swimming Cap', 'Durable silicone swimming cap in various colors', 12.00, (SELECT id FROM product_categories WHERE name = 'Swimming Gear'), 30),
  ('Waterproof Sunscreen SPF 50', 'Water-resistant sunscreen for swimmers', 18.00, (SELECT id FROM product_categories WHERE name = 'Health & Safety'), 25),
  ('Pool Kickboard', 'Training kickboard for swimming practice', 22.00, (SELECT id FROM product_categories WHERE name = 'Swimming Gear'), 20),
  ('Swimming Fins', 'Training fins for improved technique', 35.00, (SELECT id FROM product_categories WHERE name = 'Swimming Gear'), 15);

-- Update triggers for updated_at columns
CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_subscriptions_updated_at
  BEFORE UPDATE ON student_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shopping_cart_updated_at
  BEFORE UPDATE ON shopping_cart
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();