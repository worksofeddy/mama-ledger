import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser, requirePermission, hasAccessLevel } from '@/app/lib/admin-auth';
import { cache, CacheKeys, CacheTTL } from '@/app/lib/cache';
import { rateLimiter, RateLimits, getRateLimitKey } from '@/app/lib/rate-limiter';
import { createOptimizedSupabaseClient, OptimizedQueries, PaginationOptions, FilterOptions } from '@/app/lib/database-optimizations';
import { adminApiWrapper } from '@/app/lib/secure-api';

async function getGroups(request: NextRequest) {
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
      RateLimits.ADMIN_GROUPS.maxRequests,
      RateLimits.ADMIN_GROUPS.windowMs
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
            'X-RateLimit-Limit': RateLimits.ADMIN_GROUPS.maxRequests.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.resetTime.toString(),
            'Retry-After': Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString()
          }
        }
      );
    }

    // Check permissions
    requirePermission(adminUser, 'read_groups');

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const pagination: PaginationOptions = {
      page: Math.max(1, parseInt(searchParams.get('page') || '1')),
      limit: Math.min(100, Math.max(10, parseInt(searchParams.get('limit') || '20'))), // Max 100 per page
      sortBy: searchParams.get('sortBy') || 'created_at',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'
    };

    const filters: FilterOptions = {
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined
    };

    // Generate cache key
    const filtersString = JSON.stringify(filters);
    const cacheKey = CacheKeys.groupList(pagination.page, pagination.limit, filtersString);
    
    // Check cache first
    const cachedResult = cache.get(cacheKey);
    if (cachedResult) {
      return NextResponse.json({
        ...cachedResult,
        cached: true,
        cacheTimestamp: new Date().toISOString()
      });
    }

    // Create optimized database client
    const supabase = createOptimizedSupabaseClient(request);
    const queries = new OptimizedQueries(supabase);

    // Get paginated groups with filters
    const result = await queries.getGroupsPaginated(pagination, filters);

    // Enhance group data with statistics
    const enhancedGroups = await enhanceGroupData(result.data, supabase, { role: 'admin' });

    const response = {
      groups: enhancedGroups,
      pagination: result.pagination,
      filters: filters,
      generatedAt: new Date().toISOString(),
      adminUser: {
        id: 'test-admin',
        role: 'admin',
        accessLevel: 'admin'
      }
    };

    // Cache the results
    cache.set(cacheKey, response, CacheTTL.GROUP_LIST);

    return NextResponse.json({
      ...response,
      cached: false,
      rateLimit: {
        remaining: 100,
        resetTime: Date.now() + 60000
      }
    });

  } catch (error) {
    console.error('Error fetching groups:', error);
    
    if (error instanceof Error && error.message.includes('Insufficient permissions')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to enhance group data with statistics
async function enhanceGroupData(groups: any[], supabase: any, adminUser: any) {
  if (!groups || groups.length === 0) {
    return [];
  }

  const groupIds = groups.map(g => g.id);
  
  // Batch query for member counts
  const { data: memberCounts } = await supabase
    .from('group_members')
    .select('group_id')
    .in('group_id', groupIds);

  // Batch query for contribution totals
  const { data: contributions } = await supabase
    .from('contributions')
    .select('group_id, amount')
    .in('group_id', groupIds);

  // Batch query for transaction statistics
  const { data: transactions } = await supabase
    .from('transactions')
    .select('group_id, amount, created_at')
    .in('group_id', groupIds);

  // Batch query for group activity (last activity date)
  const { data: lastActivities } = await supabase
    .from('transactions')
    .select('group_id, created_at')
    .in('group_id', groupIds)
    .order('created_at', { ascending: false });

  // Process the data efficiently
  const memberCountMap: any = {};
  const contributionMap: any = {};
  const transactionMap: any = {};
  const lastActivityMap: any = {};

  // Count members per group
  memberCounts?.forEach((member: any) => {
    memberCountMap[member.group_id] = (memberCountMap[member.group_id] || 0) + 1;
  });

  // Sum contributions per group
  contributions?.forEach((contribution: any) => {
    contributionMap[contribution.group_id] = (contributionMap[contribution.group_id] || 0) + (contribution.amount || 0);
  });

  // Count transactions per group
  transactions?.forEach((transaction: any) => {
    if (!transactionMap[transaction.group_id]) {
      transactionMap[transaction.group_id] = { count: 0, total: 0 };
    }
    transactionMap[transaction.group_id].count++;
    transactionMap[transaction.group_id].total += (transaction.amount || 0);
  });

  // Get last activity per group
  lastActivities?.forEach((activity: any) => {
    if (!lastActivityMap[activity.group_id]) {
      lastActivityMap[activity.group_id] = activity.created_at;
    }
  });

  return groups.map(group => {
    const memberCount = memberCountMap[group.id] || 0;
    const totalContributions = contributionMap[group.id] || 0;
    const transactionStats = transactionMap[group.id] || { count: 0, total: 0 };
    const lastActivity = lastActivityMap[group.id] || null;

    return {
      ...group,
      member_count: memberCount,
      total_contributions: totalContributions,
      transaction_stats: {
        count: transactionStats.count,
        total_amount: transactionStats.total
      },
      last_activity: lastActivity,
      status: group.status || 'active',
      // Add health metrics
      health_metrics: {
        member_engagement: memberCount > 0 ? Math.min(100, (transactionStats.count / memberCount) * 10) : 0,
        contribution_consistency: memberCount > 0 ? Math.min(100, (totalContributions / memberCount) / 100) : 0
      },
      // Mask sensitive data for non-super admins
      ...(hasAccessLevel(adminUser, 3) ? {} : {
        // Remove sensitive fields for lower access levels
      admin_notes: group.admin_notes ? '[REDACTED]' : null
    })
  };
});
}

// Export with secure wrapper
export const GET = adminApiWrapper(getGroups);