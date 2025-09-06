import { createServerClient } from '@supabase/ssr';
import { NextRequest } from 'next/server';

export interface AdminUser {
  id: string;
  email: string;
  role: 'admin' | 'super_admin' | 'moderator';
  permissions: string[];
  lastLogin: string | null;
}

export interface AccessLevel {
  level: number;
  name: string;
  permissions: string[];
}

// Define access levels for multi-level admin system
export const ACCESS_LEVELS: Record<string, AccessLevel> = {
  moderator: {
    level: 1,
    name: 'Moderator',
    permissions: ['read_users', 'read_groups', 'read_transactions', 'moderate_content']
  },
  admin: {
    level: 2,
    name: 'Admin',
    permissions: [
      'read_users', 'read_groups', 'read_transactions', 'moderate_content',
      'manage_users', 'manage_groups', 'view_analytics', 'export_data'
    ]
  },
  super_admin: {
    level: 3,
    name: 'Super Admin',
    permissions: [
      'read_users', 'read_groups', 'read_transactions', 'moderate_content',
      'manage_users', 'manage_groups', 'view_analytics', 'export_data',
      'system_settings', 'manage_admins', 'view_sensitive_data', 'bulk_operations'
    ]
  }
};

export async function getAdminUser(request: NextRequest): Promise<AdminUser | null> {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            // No-op for server-side API routes
          },
        },
      }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return null;
    }

    // Get user profile with role
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, email, role, last_login')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return null;
    }

    // Check if user has admin role
    if (!profile.role || !ACCESS_LEVELS[profile.role]) {
      return null;
    }

    return {
      id: profile.id,
      email: profile.email,
      role: profile.role as 'admin' | 'super_admin' | 'moderator',
      permissions: ACCESS_LEVELS[profile.role].permissions,
      lastLogin: profile.last_login
    };
  } catch (error) {
    console.error('Error getting admin user:', error);
    return null;
  }
}

export function hasPermission(adminUser: AdminUser, permission: string): boolean {
  return adminUser.permissions.includes(permission);
}

export function hasAccessLevel(adminUser: AdminUser, requiredLevel: number): boolean {
  return ACCESS_LEVELS[adminUser.role].level >= requiredLevel;
}

export function requirePermission(adminUser: AdminUser, permission: string): void {
  if (!hasPermission(adminUser, permission)) {
    throw new Error(`Insufficient permissions. Required: ${permission}`);
  }
}

export function requireAccessLevel(adminUser: AdminUser, requiredLevel: number): void {
  if (!hasAccessLevel(adminUser, requiredLevel)) {
    throw new Error(`Insufficient access level. Required: ${requiredLevel}`);
  }
}
