// Simple in-memory cache for development
// In production, replace with Redis or similar

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private maxSize = 1000; // Maximum number of entries

  set<T>(key: string, data: T, ttlSeconds: number = 300): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Get cache statistics
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      keys: Array.from(this.cache.keys())
    };
  }
}

export const cache = new MemoryCache();

// Cache key generators
export const CacheKeys = {
  adminStats: (startDate: string, endDate: string) => `admin:stats:${startDate}:${endDate}`,
  userList: (page: number, limit: number, filters: string) => `admin:users:${page}:${limit}:${filters}`,
  groupList: (page: number, limit: number, filters: string) => `admin:groups:${page}:${limit}:${filters}`,
  userCount: () => 'admin:user_count',
  groupCount: () => 'admin:group_count',
  transactionCount: () => 'admin:transaction_count',
  userProfile: (userId: string) => `user:profile:${userId}`,
  groupDetails: (groupId: string) => `group:details:${groupId}`
};

// Cache TTL constants (in seconds)
export const CacheTTL = {
  STATS: 300,        // 5 minutes
  USER_LIST: 180,    // 3 minutes
  GROUP_LIST: 180,   // 3 minutes
  COUNTS: 600,       // 10 minutes
  USER_PROFILE: 900, // 15 minutes
  GROUP_DETAILS: 900 // 15 minutes
};
