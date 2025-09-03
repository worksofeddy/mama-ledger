# Mama Ledger

A comprehensive financial management application built with Next.js and Supabase for daily bookkeeping, expense tracking, and financial insights.

## Features

- **User Authentication**: Secure login and registration system powered by Supabase Auth
- **Dashboard**: Overview of financial status with charts and summaries
- **Daily Bookkeeping**: Track income and expenses with categories
- **Reports**: Generate financial reports and insights
- **Responsive Design**: Modern UI built with Tailwind CSS
- **Real-time Updates**: Live data synchronization with Supabase

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Authentication**: Supabase Auth with Row Level Security
- **Database**: PostgreSQL with automatic backups
- **State Management**: React hooks with Supabase subscriptions

## Project Structure

```
mama-ledger/
├── app/
│   ├── (auth)/                 # Authentication routes
│   │   ├── login/             # Login page
│   │   └── register/          # Registration page
│   ├── (dashboard)/           # Dashboard routes
│   │   ├── layout.tsx         # Dashboard layout with sidebar
│   │   └── dashboard/         # Main dashboard page
│   ├── (bookkeeping)/         # Bookkeeping routes
│   │   ├── layout.tsx         # Bookkeeping layout
│   │   └── bookkeeping/       # Bookkeeping overview page
│   ├── api/                   # API routes
│   │   ├── auth/              # Authentication endpoints
│   │   └── bookkeeping/       # Financial data endpoints
│   ├── components/            # Reusable components
│   │   ├── ui/                # UI components (Shadcn)
│   │   ├── auth/              # Authentication components
│   │   ├── bookkeeping/       # Bookkeeping components
│   │   └── dashboard/         # Dashboard components
│   ├── lib/                   # Utility libraries
│   │   └── supabase.ts        # Supabase client configuration
│   ├── types/                 # TypeScript type definitions
│   │   ├── index.ts           # Application types
│   │   └── supabase.ts        # Supabase database types
│   ├── hooks/                 # Custom React hooks
│   │   └── useAuth.ts         # Authentication hook
│   └── utils/                 # Utility functions
├── public/                    # Static assets
├── supabase-schema.sql        # Database schema for Supabase
├── SUPABASE_SETUP.md          # Supabase setup guide
├── package.json               # Dependencies and scripts
└── README.md                  # Project documentation
```

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### 1. Clone and Install

```bash
git clone <repository-url>
cd mama-ledger
npm install
```

### 2. Set Up Supabase

1. **Create a Supabase project** at [supabase.com](https://supabase.com)
2. **Get your credentials** from Settings → API
3. **Set up environment variables** (see `.env.example`)
4. **Run the database schema** from `supabase-schema.sql`

For detailed setup instructions, see [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)

### 3. Configure Environment

Create a `.env.local` file:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 4. Run the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Database Schema

The application uses three main tables:

- **`users`** - User profiles (extends Supabase auth)
- **`categories`** - Transaction categories with colors and icons
- **`transactions`** - Financial records with type, amount, and metadata

All tables include Row Level Security (RLS) for data privacy.

### Authentication Flow

1. **Registration**: User signs up → Supabase Auth creates account → Profile created in `users` table
2. **Login**: User authenticates → JWT token issued → User profile fetched
3. **Data Access**: All queries filtered by `auth.uid()` for security

## Features to Implement

### Phase 1: Core Functionality ✅
- [x] User authentication with Supabase
- [x] Database integration with PostgreSQL
- [x] Transaction CRUD operations
- [x] Category management
- [x] Row Level Security

### Phase 2: Enhanced Features
- [ ] Financial charts and graphs (Recharts)
- [ ] Export functionality (PDF/CSV)
- [ ] Budget planning and goals
- [ ] Recurring transactions
- [ ] Real-time notifications

### Phase 3: Advanced Features
- [ ] Multi-currency support
- [ ] Receipt image uploads
- [ ] Financial insights and AI
- [ ] Mobile app (React Native)
- [ ] Data backup and sync

## Supabase Features Used

- **Authentication**: Email/password, social providers
- **Database**: PostgreSQL with real-time subscriptions
- **Row Level Security**: Automatic data isolation
- **Storage**: File uploads (planned)
- **Edge Functions**: Serverless backend logic (planned)

## Security Features

- **Row Level Security (RLS)**: Users can only access their own data
- **JWT Authentication**: Secure token-based auth
- **Input Validation**: Server-side validation for all inputs
- **SQL Injection Protection**: Parameterized queries via Supabase
- **HTTPS Only**: All connections encrypted

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

- **Documentation**: [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)
- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)
- **Issues**: Open a GitHub issue for bugs or feature requests
