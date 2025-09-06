import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser, requirePermission } from '@/app/lib/admin-auth';
import { rateLimiter, RateLimits, getRateLimitKey } from '@/app/lib/rate-limiter';
import { createOptimizedSupabaseClient } from '@/app/lib/database-optimizations';
import { adminApiWrapper } from '@/app/lib/secure-api';

async function exportData(request: NextRequest) {
  try {
    // Authentication and authorization
    const adminUser = await getAdminUser(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting for export operations (very restrictive)
    const rateLimitKey = getRateLimitKey(request, adminUser.id);
    const rateLimit = rateLimiter.checkLimit(
      rateLimitKey,
      RateLimits.EXPORT_DATA.maxRequests,
      RateLimits.EXPORT_DATA.windowMs
    );

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded for export operations',
          retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': RateLimits.EXPORT_DATA.maxRequests.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.resetTime.toString(),
            'Retry-After': Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString()
          }
        }
      );
    }

    // Check permissions
    requirePermission(adminUser, 'export_data');

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'users';
    const format = searchParams.get('format') || 'json';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!['users', 'groups', 'transactions', 'all'].includes(type)) {
      return NextResponse.json({ error: 'Invalid export type' }, { status: 400 });
    }

    if (!['json', 'csv'].includes(format)) {
      return NextResponse.json({ error: 'Invalid export format' }, { status: 400 });
    }

    const supabase = createOptimizedSupabaseClient(request);
    const exportData = await generateExportData(supabase, type, startDate || undefined, endDate || undefined);

    if (format === 'csv') {
      const csv = convertToCSV(exportData, type);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${type}_export_${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    return NextResponse.json({
      type,
      format,
      recordCount: exportData.length,
      generatedAt: new Date().toISOString(),
      generatedBy: adminUser.id,
      data: exportData
    });

  } catch (error) {
    console.error('Error in export operation:', error);
    
    if (error instanceof Error && error.message.includes('Insufficient permissions')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function generateExportData(supabase: any, type: string, startDate?: string, endDate?: string) {
  const baseQuery = (table: string) => {
    let query = supabase.from(table).select('*');
    
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    
    if (endDate) {
      query = query.lte('created_at', endDate);
    }
    
    return query;
  };

  switch (type) {
    case 'users':
      const { data: users } = await baseQuery('user_profiles')
        .order('created_at', { ascending: false });
      return users || [];

    case 'groups':
      const { data: groups } = await baseQuery('groups')
        .order('created_at', { ascending: false });
      return groups || [];

    case 'transactions':
      const { data: transactions } = await baseQuery('transactions')
        .order('created_at', { ascending: false });
      return transactions || [];

    case 'all':
      // Export all data types
      const [usersData, groupsData, transactionsData] = await Promise.all([
        baseQuery('user_profiles').order('created_at', { ascending: false }),
        baseQuery('groups').order('created_at', { ascending: false }),
        baseQuery('transactions').order('created_at', { ascending: false })
      ]);

      return {
        users: usersData.data || [],
        groups: groupsData.data || [],
        transactions: transactionsData.data || [],
        exportMetadata: {
          usersCount: usersData.data?.length || 0,
          groupsCount: groupsData.data?.length || 0,
          transactionsCount: transactionsData.data?.length || 0,
          totalRecords: (usersData.data?.length || 0) + (groupsData.data?.length || 0) + (transactionsData.data?.length || 0)
        }
      };

    default:
      return [];
  }
}

function convertToCSV(data: any[], type: string): string {
  if (!data || data.length === 0) {
    return '';
  }

  // Handle nested data structure for 'all' type
  if (type === 'all' && (data as any).users) {
    const csvParts = [];
    
    if ((data as any).users.length > 0) {
      csvParts.push('=== USERS ===');
      csvParts.push(convertArrayToCSV((data as any).users));
    }
    
    if ((data as any).groups.length > 0) {
      csvParts.push('\n=== GROUPS ===');
      csvParts.push(convertArrayToCSV((data as any).groups));
    }
    
    if ((data as any).transactions.length > 0) {
      csvParts.push('\n=== TRANSACTIONS ===');
      csvParts.push(convertArrayToCSV((data as any).transactions));
    }
    
    return csvParts.join('\n');
  }

  return convertArrayToCSV(data);
}

function convertArrayToCSV(data: any[]): string {
  if (!data || data.length === 0) {
    return '';
  }

  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];

  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      // Handle null/undefined values and escape commas
      if (value === null || value === undefined) {
        return '';
      }
      const stringValue = String(value);
      // Escape quotes and wrap in quotes if contains comma
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}

// Export with secure wrapper
export const GET = adminApiWrapper(exportData);
