import { useState, useEffect } from 'react';
import { authClient, AuthState } from '../lib/auth-client';

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>(authClient.getState());

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = authClient.subscribe((newState) => {
      setAuthState(newState);
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  return {
    ...authState,
    signOut: authClient.signOut.bind(authClient),
    refreshSession: authClient.refreshSession.bind(authClient),
    getAuthHeaders: authClient.getAuthHeaders.bind(authClient),
    hasRole: authClient.hasRole.bind(authClient),
    isAdmin: authClient.isAdmin.bind(authClient),
    isSuperAdmin: authClient.isSuperAdmin.bind(authClient)
  };
}