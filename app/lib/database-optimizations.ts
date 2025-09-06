import { createServerClient } from '@supabase/ssr';
import { NextRequest } from 'next/server';

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterOptions {
  search?: string;
  role?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function createOptimizedSupabaseClient(request: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {
          // No-op for server-side
        },
      },
    }
  );
}

export function buildPaginationQuery(
  page: number, 
  limit: number, 
  sortBy: string = 'created_at', 
  sortOrder: 'asc' | 'desc' = 'desc'
) {
  const offset = (page - 1) * limit;
  return {
    offset,
    limit,
    sortBy,
    sortOrder
  };
}

export function buildUserFilters(filters: FilterOptions) {
  let query = '';
  const params: any[] = [];
  let paramCount = 1;

  if (filters.search) {
    query += ` AND (first_name ILIKE $${paramCount} OR last_name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
    params.push(`%${filters.search}%`);
    paramCount++;
  }

  if (filters.role) {
    query += ` AND role = $${paramCount}`;
    params.push(filters.role);
    paramCount++;
  }

  if (filters.dateFrom) {
    query += ` AND created_at >= $${paramCount}`;
    params.push(filters.dateFrom);
    paramCount++;
  }

  if (filters.dateTo) {
    query += ` AND created_at <= $${paramCount}`;
    params.push(filters.dateTo);
    paramCount++;
  }

  return { query, params };
}

export function buildGroupFilters(filters: FilterOptions) {
  let query = '';
  const params: any[] = [];
  let paramCount = 1;

  if (filters.search) {
    query += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
    params.push(`%${filters.search}%`);
    paramCount++;
  }

  if (filters.status) {
    query += ` AND status = $${paramCount}`;
    params.push(filters.status);
    paramCount++;
  }

  if (filters.dateFrom) {
    query += ` AND created_at >= $${paramCount}`;
    params.push(filters.dateFrom);
    paramCount++;
  }

  if (filters.dateTo) {
    query += ` AND created_at <= $${paramCount}`;
    params.push(filters.dateTo);
    paramCount++;
  }

  return { query, params };
}

// Optimized queries for large datasets
export class OptimizedQueries {
  private supabase: any;

  constructor(supabase: any) {
    this.supabase = supabase;
  }

  async getUsersPaginated(
    pagination: PaginationOptions,
    filters: FilterOptions = {}
  ): Promise<PaginatedResult<any>> {
    const { offset, limit, sortBy, sortOrder } = buildPaginationQuery(
      pagination.page,
      pagination.limit,
      pagination.sortBy,
      pagination.sortOrder
    );

    // Build filter query
    let selectQuery = this.supabase
      .from('user_profiles')
      .select('*', { count: 'exact' })
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (filters.search) {
      selectQuery = selectQuery.or(
        `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
      );
    }

    if (filters.role) {
      selectQuery = selectQuery.eq('role', filters.role);
    }

    if (filters.dateFrom) {
      selectQuery = selectQuery.gte('created_at', filters.dateFrom);
    }

    if (filters.dateTo) {
      selectQuery = selectQuery.lte('created_at', filters.dateTo);
    }

    const { data, count, error } = await selectQuery;

    if (error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }

    const totalPages = Math.ceil((count || 0) / limit);

    return {
      data: data || [],
      pagination: {
        page: pagination.page,
        limit,
        total: count || 0,
        totalPages,
        hasNext: pagination.page < totalPages,
        hasPrev: pagination.page > 1
      }
    };
  }

  async getGroupsPaginated(
    pagination: PaginationOptions,
    filters: FilterOptions = {}
  ): Promise<PaginatedResult<any>> {
    const { offset, limit, sortBy, sortOrder } = buildPaginationQuery(
      pagination.page,
      pagination.limit,
      pagination.sortBy,
      pagination.sortOrder
    );

    let selectQuery = this.supabase
      .from('groups')
      .select('*', { count: 'exact' })
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (filters.search) {
      selectQuery = selectQuery.or(
        `name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
      );
    }

    if (filters.status) {
      selectQuery = selectQuery.eq('status', filters.status);
    }

    if (filters.dateFrom) {
      selectQuery = selectQuery.gte('created_at', filters.dateFrom);
    }

    if (filters.dateTo) {
      selectQuery = selectQuery.lte('created_at', filters.dateTo);
    }

    const { data, count, error } = await selectQuery;

    if (error) {
      throw new Error(`Failed to fetch groups: ${error.message}`);
    }

    const totalPages = Math.ceil((count || 0) / limit);

    return {
      data: data || [],
      pagination: {
        page: pagination.page,
        limit,
        total: count || 0,
        totalPages,
        hasNext: pagination.page < totalPages,
        hasPrev: pagination.page > 1
      }
    };
  }

  async getSystemStats(startDate: string, endDate: string) {
    // Use parallel queries for better performance
    const [
      userCountResult,
      groupCountResult,
      transactionCountResult,
      revenueResult
    ] = await Promise.all([
      this.supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
      this.supabase.from('groups').select('*', { count: 'exact', head: true }),
      this.supabase.from('transactions').select('*', { count: 'exact', head: true }),
      this.supabase
        .from('transactions')
        .select('amount')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
    ]);

    const totalRevenue = revenueResult.data?.reduce((sum: number, t: any) => sum + (t.amount || 0), 0) || 0;

    return {
      totalUsers: userCountResult.count || 0,
      totalGroups: groupCountResult.count || 0,
      totalTransactions: transactionCountResult.count || 0,
      totalRevenue
    };
  }
}
