-- Mama Ledger Database Schema v6
-- Adding Budget Planning and Enhanced Features

-- Create budgets table for budget planning
CREATE TABLE IF NOT EXISTS public.budgets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    category TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    period TEXT NOT NULL CHECK (period IN ('weekly', 'monthly', 'yearly')),
    alert_threshold INTEGER NOT NULL DEFAULT 80 CHECK (alert_threshold >= 1 AND alert_threshold <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create receipts table for photo receipts
CREATE TABLE IF NOT EXISTS public.receipts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    description TEXT,
    amount DECIMAL(10,2),
    category TEXT,
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create financial_goals table for goal tracking
CREATE TABLE IF NOT EXISTS public.financial_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    target_amount DECIMAL(10,2) NOT NULL CHECK (target_amount > 0),
    current_amount DECIMAL(10,2) DEFAULT 0 CHECK (current_amount >= 0),
    goal_type TEXT NOT NULL CHECK (goal_type IN ('saving', 'earning', 'debt_payoff')),
    deadline DATE,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table for smart notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('budget_alert', 'goal_reminder', 'transaction_reminder', 'system')),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON public.budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_category ON public.budgets(category);
CREATE INDEX IF NOT EXISTS idx_receipts_user_id ON public.receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_receipts_transaction_id ON public.receipts(transaction_id);
CREATE INDEX IF NOT EXISTS idx_financial_goals_user_id ON public.financial_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_goals_type ON public.financial_goals(goal_type);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);

-- Enable Row Level Security (RLS)
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for budgets
CREATE POLICY "Users can view their own budgets" ON public.budgets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own budgets" ON public.budgets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budgets" ON public.budgets
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budgets" ON public.budgets
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for receipts
CREATE POLICY "Users can view their own receipts" ON public.receipts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own receipts" ON public.receipts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own receipts" ON public.receipts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own receipts" ON public.receipts
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for financial_goals
CREATE POLICY "Users can view their own goals" ON public.financial_goals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goals" ON public.financial_goals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals" ON public.financial_goals
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals" ON public.financial_goals
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notifications" ON public.notifications
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications" ON public.notifications
    FOR DELETE USING (auth.uid() = user_id);

-- Admin policies (if user is admin)
CREATE POLICY "Admins can view all budgets" ON public.budgets
    FOR SELECT USING (is_admin());

CREATE POLICY "Admins can view all receipts" ON public.receipts
    FOR SELECT USING (is_admin());

CREATE POLICY "Admins can view all goals" ON public.financial_goals
    FOR SELECT USING (is_admin());

CREATE POLICY "Admins can view all notifications" ON public.notifications
    FOR SELECT USING (is_admin());

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON public.budgets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_financial_goals_updated_at BEFORE UPDATE ON public.financial_goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT ALL ON public.budgets TO authenticated;
GRANT ALL ON public.receipts TO authenticated;
GRANT ALL ON public.financial_goals TO authenticated;
GRANT ALL ON public.notifications TO authenticated;

-- Insert some sample budget categories for new users
CREATE OR REPLACE FUNCTION insert_default_budgets()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.budgets (user_id, category, amount, period, alert_threshold)
    VALUES 
        (NEW.id, 'Stock', 1000.00, 'monthly', 80),
        (NEW.id, 'Transport', 200.00, 'monthly', 80),
        (NEW.id, 'Food', 300.00, 'monthly', 80),
        (NEW.id, 'Utilities', 150.00, 'monthly', 80);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new users to get default budgets
CREATE TRIGGER handle_new_user_budgets
    AFTER INSERT ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION insert_default_budgets();

-- Create function to generate budget alerts
CREATE OR REPLACE FUNCTION check_budget_alerts()
RETURNS TRIGGER AS $$
DECLARE
    budget_record RECORD;
    spent_amount DECIMAL(10,2);
    alert_percentage DECIMAL(5,2);
BEGIN
    -- Only check for expense transactions
    IF NEW.type != 'expense' THEN
        RETURN NEW;
    END IF;

    -- Get budget for this category
    SELECT * INTO budget_record 
    FROM public.budgets 
    WHERE user_id = NEW.user_id AND category = NEW.category
    LIMIT 1;

    -- If budget exists, check if alert should be sent
    IF budget_record IS NOT NULL THEN
        -- Calculate total spent in this category
        SELECT COALESCE(SUM(amount), 0) INTO spent_amount
        FROM public.transactions
        WHERE user_id = NEW.user_id 
        AND category = NEW.category 
        AND type = 'expense'
        AND created_at >= CASE 
            WHEN budget_record.period = 'weekly' THEN NOW() - INTERVAL '1 week'
            WHEN budget_record.period = 'monthly' THEN NOW() - INTERVAL '1 month'
            WHEN budget_record.period = 'yearly' THEN NOW() - INTERVAL '1 year'
        END;

        -- Calculate percentage spent
        alert_percentage = (spent_amount / budget_record.amount) * 100;

        -- Send notification if threshold is reached
        IF alert_percentage >= budget_record.alert_threshold THEN
            INSERT INTO public.notifications (user_id, title, message, type)
            VALUES (
                NEW.user_id,
                'Budget Alert',
                'You have reached ' || ROUND(alert_percentage, 1) || '% of your ' || budget_record.category || ' budget!',
                'budget_alert'
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for budget alerts
CREATE TRIGGER check_budget_alerts_trigger
    AFTER INSERT ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION check_budget_alerts();

-- Create function to update goal progress
CREATE OR REPLACE FUNCTION update_goal_progress()
RETURNS TRIGGER AS $$
DECLARE
    goal_record RECORD;
    total_amount DECIMAL(10,2);
BEGIN
    -- Only process income transactions for saving goals
    IF NEW.type = 'income' THEN
        -- Check for saving goals
        FOR goal_record IN 
            SELECT * FROM public.financial_goals 
            WHERE user_id = NEW.user_id 
            AND goal_type = 'saving' 
            AND NOT is_completed
        LOOP
            -- Update current amount
            UPDATE public.financial_goals 
            SET current_amount = current_amount + NEW.amount
            WHERE id = goal_record.id;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for goal progress updates
CREATE TRIGGER update_goal_progress_trigger
    AFTER INSERT ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_goal_progress();

COMMENT ON TABLE public.budgets IS 'User budget plans for different expense categories';
COMMENT ON TABLE public.receipts IS 'Photo receipts linked to transactions';
COMMENT ON TABLE public.financial_goals IS 'User financial goals and progress tracking';
COMMENT ON TABLE public.notifications IS 'User notifications for various alerts and reminders';
