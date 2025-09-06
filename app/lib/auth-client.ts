import { supabase } from './supabase';

export interface AuthState {
  user: any | null;
  profile: any | null;
  loading: boolean;
  error: string | null;
}

export class AuthClient {
  private static instance: AuthClient;
  private authState: AuthState = {
    user: null,
    profile: null,
    loading: true,
    error: null
  };
  private listeners: Set<(state: AuthState) => void> = new Set();

  private constructor() {
    this.initializeAuth();
  }

  static getInstance(): AuthClient {
    if (!AuthClient.instance) {
      AuthClient.instance = new AuthClient();
    }
    return AuthClient.instance;
  }

  private async initializeAuth() {
    try {
      // Get initial session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        this.updateState({ user: null, profile: null, loading: false, error: error.message });
        return;
      }

      if (session?.user) {
        await this.loadUserProfile(session.user);
      } else {
        this.updateState({ user: null, profile: null, loading: false, error: null });
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        
        if (session?.user) {
          await this.loadUserProfile(session.user);
        } else {
          this.updateState({ user: null, profile: null, loading: false, error: null });
        }
      });

    } catch (error) {
      console.error('Auth initialization error:', error);
      this.updateState({ 
        user: null, 
        profile: null, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Authentication failed' 
      });
    }
  }

  private async loadUserProfile(user: any) {
    try {
      // Try to get user profile from database
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.warn('User profile not found, using defaults:', error.message);
        // Create default profile from auth metadata
        const defaultProfile = {
          id: user.id,
          email: user.email,
          first_name: user.user_metadata?.full_name?.split(' ')[0] || null,
          last_name: user.user_metadata?.full_name?.split(' ')[1] || null,
          avatar_url: user.user_metadata?.avatar_url || null,
          role: 'user' // Default role
        };
        
        this.updateState({ 
          user, 
          profile: defaultProfile, 
          loading: false, 
          error: null 
        });
      } else {
        this.updateState({ 
          user, 
          profile: { ...profile, email: user.email }, 
          loading: false, 
          error: null 
        });
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      this.updateState({ 
        user, 
        profile: null, 
        loading: false, 
        error: 'Failed to load user profile' 
      });
    }
  }

  private updateState(newState: Partial<AuthState>) {
    this.authState = { ...this.authState, ...newState };
    this.notifyListeners();
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.authState));
  }

  // Public methods
  getState(): AuthState {
    return { ...this.authState };
  }

  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.add(listener);
    // Return unsubscribe function
    return () => this.listeners.delete(listener);
  }

  async signOut() {
    try {
      await supabase.auth.signOut();
      this.updateState({ user: null, profile: null, loading: false, error: null });
    } catch (error) {
      console.error('Sign out error:', error);
      this.updateState({ 
        user: null, 
        profile: null, 
        loading: false, 
        error: 'Failed to sign out' 
      });
    }
  }

  async refreshSession() {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();
      
      if (error) {
        this.updateState({ 
          user: null, 
          profile: null, 
          loading: false, 
          error: error.message 
        });
        return false;
      }

      if (session?.user) {
        await this.loadUserProfile(session.user);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Session refresh error:', error);
      this.updateState({ 
        user: null, 
        profile: null, 
        loading: false, 
        error: 'Failed to refresh session' 
      });
      return false;
    }
  }

  // Helper method to get authentication headers for API calls
  async getAuthHeaders(): Promise<HeadersInit> {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('No active session');
    }

    // Get cookies from the current session
    const cookies = document.cookie;
    
    return {
      'Content-Type': 'application/json',
      'Cookie': cookies,
      'X-User-ID': session.user.id,
      'X-User-Email': session.user.email || ''
    };
  }

  // Check if user has specific role
  hasRole(role: string): boolean {
    return this.authState.profile?.role === role;
  }

  // Check if user has admin privileges
  isAdmin(): boolean {
    const role = this.authState.profile?.role;
    return role === 'admin' || role === 'super_admin' || role === 'moderator';
  }

  // Check if user has super admin privileges
  isSuperAdmin(): boolean {
    return this.authState.profile?.role === 'super_admin';
  }
}

// Export singleton instance
export const authClient = AuthClient.getInstance();
