# Supabase Setup Guide for Mama Ledger

This guide will walk you through setting up Supabase for your Mama Ledger project.

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/sign in
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: `mama-ledger` (or your preferred name)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose the closest region to your users
5. Click "Create new project"
6. Wait for the project to be set up (this may take a few minutes)

## Step 2: Get Your Project Credentials

1. In your project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (e.g., `https://your-project-id.supabase.co`)
   - **Anon/Public Key** (starts with `eyJ...`)
   - **Service Role Key** (starts with `eyJ...`)

## Step 3: Set Up Environment Variables

1. Create a `.env.local` file in your project root (if it doesn't exist)
2. Add the following variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# Database Configuration (for server-side operations)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Important**: Never commit `.env.local` to version control!

## Step 4: Set Up the Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Copy the contents of `supabase-schema.sql` from this project
3. Paste it into the SQL editor
4. Click "Run" to execute the schema

This will create:
- `users` table (extends Supabase auth)
- `categories` table (for transaction categories)
- `transactions` table (for financial records)
- Row Level Security (RLS) policies
- Default categories for new users
- Automatic timestamp updates

## Step 5: Configure Authentication

1. Go to **Authentication** → **Settings** in your Supabase dashboard
2. Configure the following:

### Email Templates
- Customize the email templates for sign-up and password reset
- Update the site URL to match your domain

### Auth Providers
- **Email**: Enabled by default
- **Google**: Optional - enable if you want Google OAuth
- **GitHub**: Optional - enable if you want GitHub OAuth

### Security
- Set minimum password length (recommended: 8)
- Enable email confirmation (recommended: Yes)

## Step 6: Test Your Setup

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Try to register a new user at `/register`
3. Check your Supabase dashboard to see if the user was created
4. Verify that default categories were created for the new user

## Step 7: Database Management

### Viewing Data
- Go to **Table Editor** in your Supabase dashboard
- You can view and edit data directly in the browser

### Row Level Security (RLS)
- RLS is enabled by default
- Users can only access their own data
- Policies are automatically applied based on `auth.uid()`

### Backups
- Supabase automatically creates daily backups
- You can also create manual backups from the dashboard

## Troubleshooting

### Common Issues

1. **Environment Variables Not Working**
   - Make sure `.env.local` is in the project root
   - Restart your development server after adding environment variables

2. **Authentication Errors**
   - Check that your Supabase URL and keys are correct
   - Verify that email confirmation is properly configured

3. **Database Connection Issues**
   - Ensure your database is not paused (free tier pauses after inactivity)
   - Check that your IP is not blocked by firewall rules

4. **RLS Policy Issues**
   - Verify that RLS is enabled on all tables
   - Check that policies are correctly written
   - Use the SQL editor to debug policy issues

### Getting Help

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com)
- [GitHub Issues](https://github.com/supabase/supabase/issues)

## Next Steps

After setting up Supabase:

1. **Implement real-time features** using Supabase subscriptions
2. **Add file storage** for receipts and documents
3. **Set up edge functions** for complex business logic
4. **Configure monitoring** and alerts
5. **Set up CI/CD** for database migrations

## Security Best Practices

1. **Never expose service role keys** in client-side code
2. **Use RLS policies** to restrict data access
3. **Validate all inputs** on both client and server
4. **Regularly review** your RLS policies
5. **Monitor** your application logs for suspicious activity

## Performance Tips

1. **Use indexes** on frequently queried columns
2. **Implement pagination** for large datasets
3. **Use database functions** for complex calculations
4. **Monitor query performance** in the dashboard
5. **Consider read replicas** for high-traffic applications
