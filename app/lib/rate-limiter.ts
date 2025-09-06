interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private requests = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.requests.entries()) {
      if (now > entry.resetTime) {
        this.requests.delete(key);
      }
    }
  }

  checkLimit(
    identifier: string, 
    maxRequests: number, 
    windowMs: number
  ): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const entry = this.requests.get(identifier);

    if (!entry || now > entry.resetTime) {
      // First request or window expired
      this.requests.set(identifier, {
        count: 1,
        resetTime: now + windowMs
      });
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime: now + windowMs
      };
    }

    if (entry.count >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime
      };
    }

    // Increment count
    entry.count++;
    return {
      allowed: true,
      remaining: maxRequests - entry.count,
      resetTime: entry.resetTime
    };
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.requests.clear();
  }
}

export const rateLimiter = new RateLimiter();

// Rate limit configurations
export const RateLimits = {
  // Admin API endpoints
  ADMIN_STATS: { maxRequests: 60, windowMs: 60000 },      // 60 requests per minute
  ADMIN_USERS: { maxRequests: 30, windowMs: 60000 },      // 30 requests per minute
  ADMIN_GROUPS: { maxRequests: 30, windowMs: 60000 },     // 30 requests per minute
  
  // Bulk operations (more restrictive)
  BULK_OPERATIONS: { maxRequests: 10, windowMs: 60000 },   // 10 requests per minute
  
  // Export operations (very restrictive)
  EXPORT_DATA: { maxRequests: 5, windowMs: 300000 },      // 5 requests per 5 minutes
};

export function getRateLimitKey(request: Request, userId: string): string {
  const url = new URL(request.url);
  const endpoint = url.pathname;
  return `${userId}:${endpoint}`;
}
