-- ===================================
-- User Profile Management (v2 - Definitive)
-- ===================================

-- Drop existing objects to ensure a clean slate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TABLE IF EXISTS public.user_profiles;

-- Create user_profiles table
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Grant permissions for the table to the authenticated role
ALTER TABLE public.user_profiles OWNER TO postgres;
GRANT ALL ON TABLE public.user_profiles TO authenticated;
GRANT ALL ON TABLE public.user_profiles TO postgres;


-- Function to create a user profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, first_name, last_name, phone, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.phone,
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to execute the function on new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- Row Level Security for User Profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
  
DROP POLICY IF EXISTS "Authenticated users can view other profiles" ON user_profiles;
CREATE POLICY "Authenticated users can view other profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (true);


-- ============================
-- Group Banking Schema Starts Here
-- ============================

-- Create ENUMs for the loan module (with error handling)
DO $$ BEGIN
    CREATE TYPE group_role AS ENUM ('admin', 'treasurer', 'member');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE contribution_type AS ENUM ('merry_go_round', 'investment', 'penalty');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE loan_status AS ENUM ('pending', 'approved', 'rejected', 'active', 'completed', 'defaulted');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'late', 'defaulted');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE merry_go_round_status AS ENUM ('active', 'completed', 'paused');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Groups table
CREATE TABLE IF NOT EXISTS groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    treasurer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    contribution_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    contribution_frequency VARCHAR(20) NOT NULL DEFAULT 'weekly', -- weekly, monthly
    interest_rate DECIMAL(5,2) NOT NULL DEFAULT 0, -- percentage per group
    max_members INTEGER DEFAULT 20,
    is_private BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Group members table
CREATE TABLE IF NOT EXISTS group_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role group_role DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(group_id, user_id)
);

-- Contributions table
CREATE TABLE IF NOT EXISTS contributions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    contribution_type contribution_type NOT NULL,
    merry_go_round_amount DECIMAL(10,2) DEFAULT 0,
    investment_amount DECIMAL(10,2) DEFAULT 0,
    penalty_amount DECIMAL(10,2) DEFAULT 0,
    penalty_reason TEXT,
    contribution_date DATE NOT NULL,
    due_date DATE,
    payment_status payment_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Merry go rounds table
CREATE TABLE IF NOT EXISTS merry_go_rounds (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    winner_id UUID REFERENCES auth.users(id),
    winner_selection_method VARCHAR(50) DEFAULT 'raffle', -- raffle, request, vote
    winner_request_reason TEXT,
    selection_date DATE,
    status merry_go_round_status DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Loans table
CREATE TABLE IF NOT EXISTS loans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    borrower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    interest_rate DECIMAL(5,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL, -- amount + interest
    purpose TEXT,
    status loan_status DEFAULT 'pending',
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    disbursement_date DATE,
    due_date DATE,
    repayment_schedule VARCHAR(20) DEFAULT 'monthly', -- weekly, monthly, lump_sum
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Loan payments table
CREATE TABLE IF NOT EXISTS loan_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    loan_id UUID REFERENCES loans(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    due_date DATE NOT NULL,
    paid_date DATE,
    payment_status payment_status DEFAULT 'pending',
    penalty_amount DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Group notifications table
CREATE TABLE IF NOT EXISTS group_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50) NOT NULL, -- contribution_reminder, loan_due, meeting, general
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance (with error handling)
DO $$ BEGIN
    -- Basic indexes for common lookups
    CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
    CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_contributions_group_id ON contributions(group_id);
    CREATE INDEX IF NOT EXISTS idx_contributions_user_id ON contributions(user_id);
    CREATE INDEX IF NOT EXISTS idx_contributions_date ON contributions(contribution_date);
    CREATE INDEX IF NOT EXISTS idx_loans_group_id ON loans(group_id);
    CREATE INDEX IF NOT EXISTS idx_loans_borrower_id ON loans(borrower_id);
    CREATE INDEX IF NOT EXISTS idx_loan_payments_loan_id ON loan_payments(loan_id);
    CREATE INDEX IF NOT EXISTS idx_loan_payments_due_date ON loan_payments(due_date);
    CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON group_notifications(user_id);
    
    -- Additional optimized indexes for high-scale operations
    CREATE INDEX IF NOT EXISTS idx_group_members_user_active ON group_members(user_id, is_active) WHERE is_active = true;
    CREATE INDEX IF NOT EXISTS idx_contributions_group_date ON contributions(group_id, contribution_date DESC);
    CREATE INDEX IF NOT EXISTS idx_loans_group_status ON loans(group_id, status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_loan_payments_due_status ON loan_payments(due_date, payment_status) WHERE payment_status = 'pending';
    CREATE INDEX IF NOT EXISTS idx_groups_admin ON groups(admin_id) WHERE admin_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_merry_go_rounds_group_status ON merry_go_rounds(group_id, status, round_number DESC);
EXCEPTION
    WHEN OTHERS THEN null;
END $$;

-- ============================
-- Row Level Security (RLS) Policies (v6 - Definitive Final)
-- ============================

-- First, create the helper functions so they exist for the policies
CREATE OR REPLACE FUNCTION is_group_member(p_user_id UUID, p_group_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM group_members
        WHERE user_id = p_user_id
        AND group_id = p_group_id
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_group_admin(p_user_id UUID, p_group_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM group_members
        WHERE user_id = p_user_id
        AND group_id = p_group_id
        AND role = 'admin'
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Then, drop all existing policies on all tables to ensure a clean slate.
DO $$ DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public') LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON ' || r.tablename;
  END LOOP;
END $$;


-- Re-enable RLS on all tables that need it
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE merry_go_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_notifications ENABLE ROW LEVEL SECURITY;


-- === User Profiles Policies (Corrected) ===
CREATE POLICY "Allow users to insert their own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow users to view their own profile"
  ON user_profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Allow users to update their own profile"
  ON user_profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow authenticated users to view all profiles"
  ON user_profiles FOR SELECT TO authenticated USING (true);


-- === Groups Policies ===
CREATE POLICY "Allow authenticated users to create groups"
  ON groups FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = admin_id);

CREATE POLICY "Allow members to view their own groups"
  ON groups FOR SELECT USING (is_group_member(auth.uid(), id));

CREATE POLICY "Allow admins to update their groups"
  ON groups FOR UPDATE USING (is_group_admin(auth.uid(), id));

CREATE POLICY "Allow admins to delete their groups"
  ON groups FOR DELETE USING (is_group_admin(auth.uid(), id));


-- === Group Members Policies (Corrected Logic) ===
CREATE POLICY "Allow admins to add members"
  ON group_members FOR INSERT WITH CHECK (
    auth.uid() = (SELECT admin_id FROM groups WHERE id = group_id)
  );

CREATE POLICY "Allow members to see other members in their groups"
  ON group_members FOR SELECT USING (is_group_member(auth.uid(), group_id));

CREATE POLICY "Allow admins to update member information"
  ON group_members FOR UPDATE USING (is_group_admin(auth.uid(), group_id));

CREATE POLICY "Allow admins to remove members"
  ON group_members FOR DELETE USING (is_group_admin(auth.uid(), group_id));


-- === Contributions & Other Policies ===
CREATE POLICY "Allow members to create their own contributions"
  ON contributions FOR INSERT WITH CHECK (is_group_member(auth.uid(), group_id) AND auth.uid() = user_id);

CREATE POLICY "Allow members to view group contributions"
  ON contributions FOR SELECT USING (is_group_member(auth.uid(), group_id));
  
-- ... (other policies can be added here)

-- Functions for business logic

-- Function to calculate loan total with interest
CREATE OR REPLACE FUNCTION calculate_loan_total(
    loan_amount DECIMAL,
    interest_rate DECIMAL,
    duration_months INTEGER DEFAULT 1
) RETURNS DECIMAL AS $$
BEGIN
    RETURN loan_amount + (loan_amount * interest_rate / 100 * duration_months);
END;
$$ LANGUAGE plpgsql;

-- Function to create default loan payment schedule
CREATE OR REPLACE FUNCTION create_loan_payment_schedule(
    p_loan_id UUID,
    p_total_amount DECIMAL,
    p_due_date DATE,
    p_schedule VARCHAR
) RETURNS VOID AS $$
DECLARE
    payment_amount DECIMAL;
    payment_date DATE;
    i INTEGER;
BEGIN
    IF p_schedule = 'lump_sum' THEN
        INSERT INTO loan_payments (loan_id, amount, due_date)
        VALUES (p_loan_id, p_total_amount, p_due_date);
    ELSIF p_schedule = 'monthly' THEN
        payment_amount := p_total_amount / 3; -- Default 3 months
        FOR i IN 1..3 LOOP
            payment_date := p_due_date + INTERVAL '1 month' * i;
            INSERT INTO loan_payments (loan_id, amount, due_date)
            VALUES (p_loan_id, payment_amount, payment_date);
        END LOOP;
    ELSIF p_schedule = 'weekly' THEN
        payment_amount := p_total_amount / 12; -- Default 12 weeks
        FOR i IN 1..12 LOOP
            payment_date := p_due_date + INTERVAL '1 week' * i;
            INSERT INTO loan_payments (loan_id, amount, due_date)
            VALUES (p_loan_id, payment_amount, payment_date);
        END LOOP;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user can contribute to merry go round
CREATE OR REPLACE FUNCTION can_contribute_merry_go_round(
    p_group_id UUID,
    p_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    has_won BOOLEAN;
    current_round INTEGER;
BEGIN
    -- Check if user has already won in current round
    SELECT EXISTS(
        SELECT 1 FROM merry_go_rounds 
        WHERE group_id = p_group_id 
        AND winner_id = p_user_id 
        AND status = 'active'
    ) INTO has_won;
    
    RETURN NOT has_won;
END;
$$ LANGUAGE plpgsql;

-- Function to get group financial summary
CREATE OR REPLACE FUNCTION get_group_financial_summary(p_group_id UUID)
RETURNS TABLE (
    total_contributions DECIMAL,
    total_merry_go_round DECIMAL,
    total_investments DECIMAL,
    total_penalties DECIMAL,
    active_loans DECIMAL,
    total_loan_payments DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(c.amount), 0) as total_contributions,
        COALESCE(SUM(c.merry_go_round_amount), 0) as total_merry_go_round,
        COALESCE(SUM(c.investment_amount), 0) as total_investments,
        COALESCE(SUM(c.penalty_amount), 0) as total_penalties,
        COALESCE(SUM(l.amount), 0) as active_loans,
        COALESCE(SUM(lp.amount), 0) as total_loan_payments
    FROM contributions c
    LEFT JOIN loans l ON l.group_id = p_group_id AND l.status = 'active'
    LEFT JOIN loan_payments lp ON lp.loan_id = l.id AND lp.payment_status = 'paid'
    WHERE c.group_id = p_group_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create loan payment schedule when loan is approved
CREATE OR REPLACE FUNCTION trigger_create_loan_payments()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        PERFORM create_loan_payment_schedule(
            NEW.id,
            NEW.total_amount,
            NEW.due_date,
            NEW.repayment_schedule
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS create_loan_payments_trigger ON loans;
CREATE TRIGGER create_loan_payments_trigger
    AFTER UPDATE ON loans
    FOR EACH ROW
    EXECUTE FUNCTION trigger_create_loan_payments();

-- ==============================================
-- OPTIMIZED FUNCTIONS FOR HIGH-SCALE OPERATIONS
-- ==============================================

-- Optimized function to get user's groups with pagination
CREATE OR REPLACE FUNCTION get_user_groups(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
    group_id UUID,
    group_name VARCHAR,
    role group_role,
    member_count BIGINT,
    total_contributions DECIMAL,
    active_loans DECIMAL,
    pending_payments DECIMAL,
    joined_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gm.group_id,
        g.name as group_name,
        gm.role,
        (SELECT COUNT(*) FROM group_members gm2 WHERE gm2.group_id = gm.group_id AND gm2.is_active = true) as member_count,
        COALESCE((SELECT SUM(amount) FROM contributions c WHERE c.group_id = gm.group_id), 0) as total_contributions,
        COALESCE((SELECT SUM(amount) FROM loans l WHERE l.group_id = gm.group_id AND l.status = 'active'), 0) as active_loans,
        COALESCE((SELECT SUM(lp.amount) FROM loan_payments lp JOIN loans l ON lp.loan_id = l.id WHERE l.group_id = gm.group_id AND lp.payment_status = 'pending'), 0) as pending_payments,
        gm.joined_at
    FROM group_members gm
    JOIN groups g ON gm.group_id = g.id
    WHERE gm.user_id = p_user_id AND gm.is_active = true
    ORDER BY gm.joined_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Optimized function to check group membership
CREATE OR REPLACE FUNCTION is_group_member(
    p_user_id UUID,
    p_group_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS(
        SELECT 1 FROM group_members 
        WHERE user_id = p_user_id 
        AND group_id = p_group_id 
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql;

-- Optimized function to get group financial summary
CREATE OR REPLACE FUNCTION get_group_financial_summary_optimized(p_group_id UUID)
RETURNS TABLE (
    total_contributions DECIMAL,
    total_merry_go_round DECIMAL,
    total_investments DECIMAL,
    total_penalties DECIMAL,
    active_loans DECIMAL,
    total_loan_payments DECIMAL,
    member_count BIGINT,
    pending_contributions DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(c.amount), 0) as total_contributions,
        COALESCE(SUM(c.merry_go_round_amount), 0) as total_merry_go_round,
        COALESCE(SUM(c.investment_amount), 0) as total_investments,
        COALESCE(SUM(c.penalty_amount), 0) as total_penalties,
        COALESCE(SUM(l.amount), 0) as active_loans,
        COALESCE(SUM(lp.amount), 0) as total_loan_payments,
        (SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = p_group_id AND gm.is_active = true) as member_count,
        COALESCE(SUM(CASE WHEN c.payment_status = 'pending' THEN c.amount ELSE 0 END), 0) as pending_contributions
    FROM contributions c
    LEFT JOIN loans l ON l.group_id = p_group_id AND l.status = 'active'
    LEFT JOIN loan_payments lp ON lp.loan_id = l.id AND lp.payment_status = 'paid'
    WHERE c.group_id = p_group_id;
END;
$$ LANGUAGE plpgsql;

-- Success message
SELECT 'Loan module schema with performance optimizations created successfully!' as message;
