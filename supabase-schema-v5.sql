-- Supabase Schema v5
-- Adds user roles, enhanced profiles, and admin-level access policies.

-- Define a user_role type for clarity and consistency
CREATE TYPE public.user_role AS ENUM ('user', 'admin');

-- Create users table with roles and profile information
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    email TEXT UNIQUE,
    phone_number TEXT UNIQUE,
    avatar_url TEXT,
    bio TEXT,
    role public.user_role DEFAULT 'user' NOT NULL,
    provider TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create categories table
CREATE TABLE public.categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('income', 'expense')) NOT NULL,
    color TEXT,
    icon TEXT,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, user_id, type)
);

-- Create transactions table
CREATE TABLE public.transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    type TEXT CHECK (type IN ('income', 'expense')) NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    description TEXT,
    category TEXT NOT NULL,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to handle new user creation and insert default categories
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create the user profile in public.users
  INSERT INTO public.users (id, full_name, email, phone_number, provider)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email,
    NEW.phone,
    NEW.raw_app_meta_data->>'provider'
  );
  
  -- Insert default categories for the new user
  INSERT INTO public.categories (name, type, icon, user_id) VALUES
    ('Sales', 'income', '💰', NEW.id),
    ('Gifts', 'income', '🎁', NEW.id),
    ('Stock', 'expense', '📦', NEW.id),
    ('Transport', 'expense', '🚚', NEW.id),
    ('Rent', 'expense', '🏠', NEW.id),
    ('Utilities', 'expense', '💡', NEW.id),
    ('Food', 'expense', '🍔', NEW.id),
    ('Other', 'expense', '🤷‍♀️', NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- Indexes
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_date ON public.transactions(date);
CREATE INDEX idx_transactions_type ON public.transactions(type);
CREATE INDEX idx_categories_user_id ON public.categories(user_id);

-- RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Helper function to check for admin role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role FROM public.users WHERE id = auth.uid()
  ) = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- RLS Policies
CREATE POLICY "Admins can manage all data" ON public.users FOR ALL USING (public.is_admin());
CREATE POLICY "Users can manage own profile" ON public.users FOR ALL USING (auth.uid() = id);

CREATE POLICY "Admins can manage all data" ON public.categories FOR ALL USING (public.is_admin());
CREATE POLICY "Users can manage own categories" ON public.categories FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all data" ON public.transactions FOR ALL USING (public.is_admin());
CREATE POLICY "Users can manage own transactions" ON public.transactions FOR ALL USING (auth.uid() = user_id);


-- Timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
