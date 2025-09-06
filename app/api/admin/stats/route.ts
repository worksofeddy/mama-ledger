import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser, requirePermission } from '@/app/lib/admin-auth';
import { cache, CacheKeys, CacheTTL } from '@/app/lib/cache';
import { rateLimiter, RateLimits, getRateLimitKey } from '@/app/lib/rate-limiter';
import { createOptimizedSupabaseClient, OptimizedQueries } from '@/app/lib/database-optimizations';
import { adminApiWrapper } from '@/app/lib/secure-api';

async function getStats(request: NextRequest) {
  try {
    // Authentication and authorization
    const adminUser = await getAdminUser(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const rateLimitKey = getRateLimitKey(request, adminUser.id);
    const rateLimit = rateLimiter.checkLimit(
      rateLimitKey,
      RateLimits.ADMIN_STATS.maxRequests,
      RateLimits.ADMIN_STATS.windowMs
    );

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': RateLimits.ADMIN_STATS.maxRequests.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.resetTime.toString(),
            'Retry-After': Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString()
          }
        }
      );
    }

    // Check permissions
    requirePermission(adminUser, 'view_analytics');

    // Get date range from query params
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = searchParams.get('end_date') || new Date().toISOString().split('T')[0];

    // Check cache first
    const cacheKey = CacheKeys.adminStats(startDate, endDate);
    const cachedStats = cache.get(cacheKey);
    
    if (cachedStats) {
      return NextResponse.json({
        ...cachedStats,
        cached: true,
        cacheTimestamp: new Date().toISOString()
      });
    }

    // Create optimized database client
    const supabase = createOptimizedSupabaseClient(request);
    const queries = new OptimizedQueries(supabase);

    // Get system statistics with optimized queries
    const systemStats = await queries.getSystemStats(startDate, endDate);


    // Get growth data (parallel queries for better performance)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const [userGrowthData, groupGrowthData] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('created_at')
        .gte('created_at', sixMonthsAgo.toISOString()),
      supabase
        .from('groups')
        .select('created_at')
        .gte('created_at', sixMonthsAgo.toISOString())
    ]);

    // Process growth data efficiently
    const userGrowth = processGrowthData(userGrowthData.data || [], 'users');
    const groupGrowth = processGrowthData(groupGrowthData.data || [], 'groups');

    // Get revenue by month (parallel queries)
    const revenueByMonth = await getRevenueByMonth(supabase);

    const stats = {
      ...systemStats,
      userGrowth,
      groupGrowth,
      revenueByMonth,
      generatedAt: new Date().toISOString(),
      adminUser: {
        id: adminUser.id,
        role: adminUser.role
      }
    };

    // Cache the results
    cache.set(cacheKey, stats, CacheTTL.STATS);

    return NextResponse.json({
      ...stats,
      cached: false,
      rateLimit: {
        remaining: rateLimit.remaining,
        resetTime: rateLimit.resetTime
      }
    });

  } catch (error) {
    console.error('Error fetching admin stats:', error);
    
    if (error instanceof Error && error.message.includes('Insufficient permissions')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Export the secure wrapped function
export const GET = adminApiWrapper(getStats);

// Helper function to process growth data efficiently
function processGrowthData(data: any[], type: 'users' | 'groups'): Array<{ month: string; [key: string]: any }> {
  const growth = [];
  const fieldName = type === 'users' ? 'users' : 'groups';
  
  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    
    const count = data.filter(item => {
      const itemDate = new Date(item.created_at);
      return itemDate >= monthStart && itemDate <= monthEnd;
    }).length;
    
    growth.push({ month, [fieldName]: count });
  }
  
  return growth;
}

// Helper function to get revenue by month
async function getRevenueByMonth(supabase: any): Promise<Array<{ month: string; revenue: number }>> {
  const revenueByMonth = [];
  
  // Use parallel queries for better performance
  const monthPromises = [];
  
  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    
    monthPromises.push(
      supabase
        .from('transactions')
        .select('amount')
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString())
        .then(({ data }: any) => ({
          month,
          revenue: data?.reduce((sum: number, t: any) => sum + (t.amount || 0), 0) || 0
        }))
    );
  }
  
  const results = await Promise.all(monthPromises);
  return results;
}