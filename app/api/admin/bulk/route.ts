import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser, requirePermission, hasAccessLevel } from '@/app/lib/admin-auth';
import { rateLimiter, RateLimits, getRateLimitKey } from '@/app/lib/rate-limiter';
import { createOptimizedSupabaseClient } from '@/app/lib/database-optimizations';
import { adminApiWrapper } from '@/app/lib/secure-api';

async function bulkOperations(request: NextRequest) {
  try {
    // Authentication and authorization
    const adminUser = await getAdminUser(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting for bulk operations (more restrictive)
    const rateLimitKey = getRateLimitKey(request, adminUser.id);
    const rateLimit = rateLimiter.checkLimit(
      rateLimitKey,
      RateLimits.BULK_OPERATIONS.maxRequests,
      RateLimits.BULK_OPERATIONS.windowMs
    );

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded for bulk operations',
          retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': RateLimits.BULK_OPERATIONS.maxRequests.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.resetTime.toString(),
            'Retry-After': Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString()
          }
        }
      );
    }

    // Check permissions
    requirePermission(adminUser, 'bulk_operations');

    const body = await request.json();
    const { operation, target, ids, data } = body;

    if (!operation || !target || !ids || !Array.isArray(ids)) {
      return NextResponse.json({ error: 'Invalid request parameters' }, { status: 400 });
    }

    // Limit bulk operations to prevent system overload
    if (ids.length > 1000) {
      return NextResponse.json({ error: 'Bulk operations limited to 1000 items' }, { status: 400 });
    }

    const supabase = createOptimizedSupabaseClient(request);
    let result;

    switch (operation) {
      case 'update_status':
        result = await bulkUpdateStatus(supabase, target, ids, data, adminUser);
        break;
      case 'delete':
        result = await bulkDelete(supabase, target, ids, adminUser);
        break;
      case 'export':
        result = await bulkExport(supabase, target, ids, adminUser);
        break;
      default:
        return NextResponse.json({ error: 'Unsupported operation' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      operation,
      target,
      processed: result.processed,
      failed: result.failed,
      errors: result.errors,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in bulk operation:', error);
    
    if (error instanceof Error && error.message.includes('Insufficient permissions')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function bulkUpdateStatus(supabase: any, target: string, ids: string[], data: any, adminUser: any) {
  const processed = [];
  const failed = [];
  const errors = [];

  for (const id of ids) {
    try {
      let updateData = { ...data, updated_by: adminUser.id, updated_at: new Date().toISOString() };
      
      const { error } = await supabase
        .from(target)
        .update(updateData)
        .eq('id', id);

      if (error) {
        failed.push(id);
        errors.push({ id, error: error.message });
      } else {
        processed.push(id);
      }
    } catch (error) {
      failed.push(id);
      errors.push({ id, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  return { processed, failed, errors };
}

async function bulkDelete(supabase: any, target: string, ids: string[], adminUser: any) {
  // Only super admins can perform bulk deletes
  if (!hasAccessLevel(adminUser, 3)) {
    throw new Error('Insufficient permissions for bulk delete operations');
  }

  const processed = [];
  const failed = [];
  const errors = [];

  for (const id of ids) {
    try {
      // Soft delete by updating status
      const { error } = await supabase
        .from(target)
        .update({ 
          status: 'deleted', 
          deleted_by: adminUser.id, 
          deleted_at: new Date().toISOString() 
        })
        .eq('id', id);

      if (error) {
        failed.push(id);
        errors.push({ id, error: error.message });
      } else {
        processed.push(id);
      }
    } catch (error) {
      failed.push(id);
      errors.push({ id, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  return { processed, failed, errors };
}

async function bulkExport(supabase: any, target: string, ids: string[], adminUser: any) {
  const processed: any[] = [];
  const failed: any[] = [];
  const errors: any[] = [];

  try {
    // Get all data for the specified IDs
    const { data, error } = await supabase
      .from(target)
      .select('*')
      .in('id', ids);

    if (error) {
      throw new Error(error.message);
    }

    // Process the data for export
    const exportData = data?.map((item: any) => ({
      ...item,
      exported_by: adminUser.id,
      exported_at: new Date().toISOString()
    })) || [];

    processed.push(...ids);
    
    return { 
      processed, 
      failed, 
      errors, 
      exportData,
      exportFormat: 'json',
      recordCount: exportData.length
    };
  } catch (error) {
    failed.push(...ids);
    errors.push({ error: error instanceof Error ? error.message : 'Unknown error' });
    return { processed, failed, errors };
  }
}

// Export with secure wrapper
export const POST = adminApiWrapper(bulkOperations);
