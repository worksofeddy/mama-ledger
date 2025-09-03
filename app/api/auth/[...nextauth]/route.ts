import NextAuth from 'next-auth'
import { SupabaseAdapter } from '@auth/supabase-adapter'
import CredentialsProvider from 'next-auth/providers/credentials'

// Only import supabase if environment variables are available
let supabase: any = null
if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const { supabase: supabaseClient } = await import('../../../lib/supabase')
  supabase = supabaseClient
}

const handler = NextAuth({
  adapter: process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY ? 
    SupabaseAdapter({
      url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    }) : undefined,
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password || !supabase) {
          return null
        }

        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: credentials.email,
            password: credentials.password,
          })

          if (error || !data.user) {
            return null
          }

          // Fetch user profile from our users table
          const { data: userProfile } = await supabase
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .single()

          if (userProfile) {
            return {
              id: userProfile.id,
              email: userProfile.email,
              name: userProfile.full_name,
              image: null,
            }
          }

          return null
        } catch (error) {
          console.error('Auth error:', error)
          return null
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id as string
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
})

export { handler as GET, handler as POST }
