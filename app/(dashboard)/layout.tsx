'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, X, User as UserIcon, LogOut, Settings, Shield } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'
import EnvironmentChecker from '../components/EnvironmentChecker'

const navLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/bookkeeping', label: 'Daily Money' },
  { href: '/groups', label: 'Table Banking' },
  { href: '/loans', label: 'Loans' },
  { href: '/budget', label: 'Budget Planning' },
  { href: '/goals', label: 'Financial Goals' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/receipts', label: 'Photo Receipts' },
  { href: '/reports', label: 'Reports & Export' },
  { href: '/notifications', label: 'Notifications' },
  { href: '/settings', label: 'Settings' }
]

interface UserProfile {
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  role: string | null
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isSidebarOpen, setSidebarOpen] = useState(false)
  const [isProfileMenuOpen, setProfileMenuOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          setUser(session.user)
          
          // Try to get user profile, but handle gracefully if table doesn't exist
          try {
            const { data: userProfile, error } = await supabase
              .from('user_profiles')
              .select('first_name, last_name, avatar_url, role')
              .eq('id', session.user.id)
              .single()
            
            if (error) {
              console.warn('User profile not found, using defaults:', error.message)
              // Set a default profile if the query fails
              setProfile({
                first_name: session.user.user_metadata?.full_name?.split(' ')[0] || null,
                last_name: session.user.user_metadata?.full_name?.split(' ')[1] || null,
                avatar_url: session.user.user_metadata?.avatar_url || null,
                role: 'user' // Default role
              })
            } else {
              setProfile({
                ...userProfile,
                role: userProfile.role || 'user' // Use role from DB or default
              })
            }
          } catch (tableError) {
            console.warn('user_profiles table may not exist, using auth user data:', tableError)
            // Fallback to auth user metadata
            setProfile({
              first_name: session.user.user_metadata?.full_name?.split(' ')[0] || null,
              last_name: session.user.user_metadata?.full_name?.split(' ')[1] || null,
              avatar_url: session.user.user_metadata?.avatar_url || null,
              role: 'user' // Default role
            })
          }
        } else {
          router.push('/login')
        }
      } catch (error) {
        console.error('Error in fetchUser:', error)
        router.push('/login')
      }
    }
    fetchUser()
  }, [router])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const SidebarContent = () => (
    <nav className="mt-8">
      <div className="px-4 space-y-2">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
              pathname === link.href
                ? 'bg-indigo-100 text-indigo-900'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
            onClick={() => setSidebarOpen(false)}
          >
            <span>{link.label}</span>
          </Link>
        ))}
         {profile?.role === 'admin' && (
           <Link
            href="/admin"
            className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
              pathname === '/admin'
                ? 'bg-red-100 text-red-900'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
            onClick={() => setSidebarOpen(false)}
          >
            <Shield size={16} className="mr-2" />
            <span>Admin Panel</span>
          </Link>
        )}
      </div>
    </nav>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <EnvironmentChecker />
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              {/* Mobile Menu Button */}
              <button 
                onClick={() => setSidebarOpen(!isSidebarOpen)}
                className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 md:hidden mr-2"
              >
                {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
              <h1 className="text-xl font-semibold text-gray-900">Mama Ledger</h1>
            </div>
            
            {/* Profile Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center space-x-2 p-2 rounded-full hover:bg-gray-100"
              >
                <span className="text-sm font-medium text-gray-700 hidden sm:block">{profile?.first_name || user?.email}</span>
                <div className="w-8 h-8 bg-indigo-200 rounded-full flex items-center justify-center">
                  <UserIcon size={20} className="text-indigo-600" />
                </div>
              </button>
              
              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                  <div className="px-4 py-2 text-xs text-gray-400">Manage Account</div>
                  <Link href="/settings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    <Settings size={14} className="inline mr-2" />
                    Settings
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <LogOut size={14} className="inline mr-2" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Mobile Sidebar */}
        <div 
          className={`fixed inset-0 z-50 md:hidden transition-transform duration-300 ease-in-out ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="fixed inset-0 bg-black/30" onClick={() => setSidebarOpen(false)}></div>
          <aside className="relative w-64 bg-white shadow-lg border-r border-gray-200 h-full">
            <div className="p-4 border-b">
              <h2 className="text-xl font-semibold">Menu</h2>
            </div>
            <SidebarContent />
          </aside>
        </div>

        {/* Desktop Sidebar */}
        <aside className="hidden md:block w-64 bg-white shadow-sm border-r border-gray-200 min-h-screen">
          <div className="p-4 border-b sticky top-0 bg-white">
            <h1 className="text-xl font-semibold text-gray-900">Mama Ledger</h1>
          </div>
          <SidebarContent />
        </aside>

        {/* Main content */}
        <main className="flex-1 p-4 sm:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
