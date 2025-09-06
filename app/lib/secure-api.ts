/**
 * Secure API wrapper for financial operations
 * Provides comprehensive security measures for sensitive endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  securityMiddleware, 
  rateLimits, 
  auditLog, 
  securityValidation,
  sanitizeInput 
} from './security';

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Security wrapper for API routes
export function secureApiWrapper(
  handler: (request: NextRequest) => Promise<NextResponse>,
  options: {
    rateLimit?: keyof typeof rateLimits;
    requireAuth?: boolean;
    requireAdmin?: boolean;
    auditLog?: boolean;
    sensitiveData?: boolean;
  } = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // 1. Security Headers Check
      if (!securityMiddleware.validateOrigin(request)) {
        await auditLog.securityEvent('Invalid Origin', {
          origin: request.headers.get('origin'),
          ip: request.headers.get('x-forwarded-for') || 'unknown'
        });
        return NextResponse.json(
          { error: 'Invalid request origin' },
          { status: 403 }
        );
      }

      // 2. Suspicious Activity Detection
      if (securityMiddleware.detectSuspiciousActivity(request)) {
        await auditLog.securityEvent('Suspicious Activity Detected', {
          userAgent: request.headers.get('user-agent'),
          ip: request.headers.get('x-forwarded-for') || 'unknown'
        });
        return NextResponse.json(
          { error: 'Request blocked' },
          { status: 403 }
        );
      }

      // 3. Rate Limiting
      if (options.rateLimit) {
        const clientId = getClientId(request);
        const rateLimit = rateLimits[options.rateLimit];
        
        if (!checkRateLimit(clientId, rateLimit)) {
          await auditLog.securityEvent('Rate Limit Exceeded', {
            clientId,
            endpoint: request.url,
            ip: request.headers.get('x-forwarded-for') || 'unknown'
          });
          
          return NextResponse.json(
            { error: rateLimit.message },
            { status: 429 }
          );
        }
      }

      // 4. Authentication Check
      if (options.requireAuth || options.requireAdmin) {
        const authResult = await validateAuthentication(request, options.requireAdmin);
        if (!authResult.valid) {
          await auditLog.securityEvent('Authentication Failed', {
            reason: authResult.reason,
            ip: request.headers.get('x-forwarded-for') || 'unknown'
          });
          
          return NextResponse.json(
            { error: 'Authentication required' },
            { status: 401 }
          );
        }
      }

      // 5. Input Validation for Sensitive Data
      if (options.sensitiveData) {
        const validationResult = await validateSensitiveInput(request);
        if (!validationResult.valid) {
          await auditLog.securityEvent('Invalid Input', {
            reason: validationResult.reason,
            ip: request.headers.get('x-forwarded-for') || 'unknown'
          });
          
          return NextResponse.json(
            { error: 'Invalid input data' },
            { status: 400 }
          );
        }
      }

      // 6. Execute the actual handler
      const response = await handler(request);

      // 7. Add security headers to response
      securityMiddleware.addSecurityHeaders(response);

      // 8. Audit logging
      if (options.auditLog) {
        await auditLog.securityEvent('API Access', {
          endpoint: request.url,
          method: request.method,
          status: response.status,
          ip: request.headers.get('x-forwarded-for') || 'unknown'
        });
      }

      return response;

    } catch (error) {
      // Log security errors without exposing sensitive information
      await auditLog.securityEvent('API Error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        endpoint: request.url,
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      });

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

// Helper functions
function getClientId(request: NextRequest): string {
  // Use IP address and user agent for rate limiting
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  return `${ip}-${userAgent}`;
}

function checkRateLimit(clientId: string, rateLimit: any): boolean {
  const now = Date.now();
  const clientData = rateLimitStore.get(clientId);

  if (!clientData || now > clientData.resetTime) {
    // Reset or initialize
    rateLimitStore.set(clientId, {
      count: 1,
      resetTime: now + rateLimit.windowMs
    });
    return true;
  }

  if (clientData.count >= rateLimit.maxRequests) {
    return false;
  }

  clientData.count++;
  return true;
}

async function validateAuthentication(
  request: NextRequest, 
  requireAdmin: boolean = false
): Promise<{ valid: boolean; reason?: string }> {
  try {
    // Check for authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { valid: false, reason: 'Missing or invalid authorization header' };
    }

    // In production, validate JWT token here
    // For now, we'll do basic validation
    const token = authHeader.substring(7);
    if (!token || token.length < 10) {
      return { valid: false, reason: 'Invalid token format' };
    }

    // Admin validation (in production, check user role from token)
    if (requireAdmin) {
      // This should check the actual user role from the token
      // For demo purposes, we'll assume admin tokens contain 'admin'
      if (!token.includes('admin')) {
        return { valid: false, reason: 'Admin privileges required' };
      }
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, reason: 'Authentication validation failed' };
  }
}

async function validateSensitiveInput(request: NextRequest): Promise<{ valid: boolean; reason?: string }> {
  try {
    // For POST/PUT requests, validate the body
    if (request.method === 'POST' || request.method === 'PUT') {
      const body = await request.json();
      
      // Check for required fields
      if (!body || typeof body !== 'object') {
        return { valid: false, reason: 'Invalid request body' };
      }

      // Validate financial data if present
      if (body.amount !== undefined) {
        try {
          sanitizeInput.amount(body.amount);
        } catch {
          return { valid: false, reason: 'Invalid amount format' };
        }
      }

      // Validate UUIDs if present
      if (body.user_id) {
        try {
          sanitizeInput.uuid(body.user_id);
        } catch {
          return { valid: false, reason: 'Invalid user ID format' };
        }
      }
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, reason: 'Input validation failed' };
  }
}

// Specific security wrappers for different types of endpoints
export const financialApiWrapper = (handler: (request: NextRequest) => Promise<NextResponse>) => {
  return secureApiWrapper(handler, {
    rateLimit: 'financial',
    requireAuth: true,
    auditLog: true,
    sensitiveData: true
  });
};

export const adminApiWrapper = (handler: (request: NextRequest) => Promise<NextResponse>) => {
  return secureApiWrapper(handler, {
    rateLimit: 'admin',
    requireAuth: true,
    requireAdmin: true,
    auditLog: true,
    sensitiveData: true
  });
};

export const generalApiWrapper = (handler: (request: NextRequest) => Promise<NextResponse>) => {
  return secureApiWrapper(handler, {
    rateLimit: 'general',
    requireAuth: true,
    auditLog: true
  });
};

export default {
  secureApiWrapper,
  financialApiWrapper,
  adminApiWrapper,
  generalApiWrapper
};
