import { authClient } from './auth-client';

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  cached?: boolean;
  rateLimit?: {
    remaining: number;
    resetTime: number;
  };
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    // Use current origin if no baseUrl provided, fallback to localhost for SSR
    this.baseUrl = baseUrl || (
      typeof window !== 'undefined' 
        ? window.location.origin 
        : 'http://localhost:3000'
    );
  }

  private async makeRequest<T>(
    url: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      // Get authentication headers
      const authHeaders = await authClient.getAuthHeaders();
      
      // Merge with existing headers
      const headers = {
        ...authHeaders,
        ...options.headers,
      };

      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include', // Include cookies
      });

      // Handle different response types
      if (!response.ok) {
        if (response.status === 401) {
          // Try to refresh session
          const refreshed = await authClient.refreshSession();
          if (refreshed) {
            // Retry the request with new session
            const newAuthHeaders = await authClient.getAuthHeaders();
            const retryResponse = await fetch(url, {
              ...options,
              headers: {
                ...newAuthHeaders,
                ...options.headers,
              },
              credentials: 'include',
            });

            if (retryResponse.ok) {
              return await this.parseResponse<T>(retryResponse);
            }
          }
          
          return {
            error: 'Authentication required. Please log in again.',
          };
        }

        if (response.status === 403) {
          return {
            error: 'Insufficient permissions for this operation.',
          };
        }

        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          return {
            error: `Rate limit exceeded. Please try again in ${retryAfter || 'a few'} seconds.`,
          };
        }

        const errorText = await response.text();
        return {
          error: `Request failed: ${response.status} ${errorText}`,
        };
      }

      return await this.parseResponse<T>(response);
    } catch (error) {
      console.error('API request error:', error);
      return {
        error: error instanceof Error ? error.message : 'Network error occurred',
      };
    }
  }

  private async parseResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      const data = await response.json();
      return {
        data,
        cached: data.cached || false,
        rateLimit: data.rateLimit,
      };
    }
    
    // Handle other content types (like CSV exports)
    const text = await response.text();
    return {
      data: text as T,
    };
  }

  // GET request
  async get<T>(endpoint: string, params?: Record<string, string>): Promise<ApiResponse<T>> {
    // Build URL manually to avoid SSR issues
    let fullUrl = endpoint;
    
    // If endpoint doesn't start with http, prepend baseUrl
    if (!endpoint.startsWith('http')) {
      fullUrl = this.baseUrl + endpoint;
    }
    
    // Add query parameters if provided
    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.set(key, value);
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        fullUrl += (fullUrl.includes('?') ? '&' : '?') + queryString;
      }
    }
    
    return this.makeRequest<T>(fullUrl);
  }

  // POST request
  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    const url = endpoint.startsWith('http') ? endpoint : this.baseUrl + endpoint;
    return this.makeRequest<T>(url, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PUT request
  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    const url = endpoint.startsWith('http') ? endpoint : this.baseUrl + endpoint;
    return this.makeRequest<T>(url, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // DELETE request
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    const url = endpoint.startsWith('http') ? endpoint : this.baseUrl + endpoint;
    return this.makeRequest<T>(url, {
      method: 'DELETE',
    });
  }

  // Admin API methods
  async getAdminStats(params?: { start_date?: string; end_date?: string }) {
    return this.get('/api/admin/stats', params);
  }

  async getAdminUsers(params?: { 
    page?: number; 
    limit?: number; 
    search?: string; 
    role?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const searchParams: Record<string, string> = {};
    if (params?.page) searchParams.page = params.page.toString();
    if (params?.limit) searchParams.limit = params.limit.toString();
    if (params?.search) searchParams.search = params.search;
    if (params?.role) searchParams.role = params.role;
    if (params?.sortBy) searchParams.sortBy = params.sortBy;
    if (params?.sortOrder) searchParams.sortOrder = params.sortOrder;
    
    return this.get('/api/admin/users', searchParams);
  }

  async getAdminGroups(params?: { 
    page?: number; 
    limit?: number; 
    search?: string; 
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const searchParams: Record<string, string> = {};
    if (params?.page) searchParams.page = params.page.toString();
    if (params?.limit) searchParams.limit = params.limit.toString();
    if (params?.search) searchParams.search = params.search;
    if (params?.status) searchParams.status = params.status;
    if (params?.sortBy) searchParams.sortBy = params.sortBy;
    if (params?.sortOrder) searchParams.sortOrder = params.sortOrder;
    
    return this.get('/api/admin/groups', searchParams);
  }

  async bulkOperation(operation: string, target: string, ids: string[], data?: any) {
    return this.post('/api/admin/bulk', {
      operation,
      target,
      ids,
      data,
    });
  }

  async exportData(type: string, format: string = 'json', startDate?: string, endDate?: string) {
    const params: Record<string, string> = { type, format };
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    
    return this.get('/api/admin/export', params);
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
