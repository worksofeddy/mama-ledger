/**
 * Security utilities for Mama Ledger
 * Critical for protecting sensitive financial data
 */

import { NextRequest, NextResponse } from 'next/server';

// Security headers configuration
export const securityHeaders = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https:;
    font-src 'self';
    connect-src 'self' https://*.supabase.co;
    frame-ancestors 'none';
    base-uri 'self';
    form-action 'self';
  `.replace(/\s+/g, ' ').trim()
};

// Rate limiting configuration for financial endpoints
export const rateLimits = {
  // Very strict limits for financial operations
  financial: {
    maxRequests: 10,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many financial requests, please try again later'
  },
  // Moderate limits for admin operations
  admin: {
    maxRequests: 50,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many admin requests, please try again later'
  },
  // Standard limits for general API
  general: {
    maxRequests: 100,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many requests, please try again later'
  }
};

// Input validation patterns
export const validationPatterns = {
  // UUID pattern
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  
  // Email pattern
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  
  // Amount pattern (positive numbers with up to 2 decimal places)
  amount: /^\d+(\.\d{1,2})?$/,
  
  // Phone number pattern
  phone: /^\+?[\d\s\-\(\)]+$/,
  
  // Safe string pattern (alphanumeric, spaces, basic punctuation)
  safeString: /^[a-zA-Z0-9\s\-_.,!?]+$/,
  
  // Date pattern (YYYY-MM-DD)
  date: /^\d{4}-\d{2}-\d{2}$/
};

// Sanitization functions
export const sanitizeInput = {
  // Remove potentially dangerous characters
  string: (input: string): string => {
    return input
      .trim()
      .replace(/[<>\"'&]/g, '') // Remove HTML/XML characters
      .substring(0, 1000); // Limit length
  },
  
  // Sanitize amount (ensure it's a valid number)
  amount: (input: string | number): number => {
    const num = typeof input === 'string' ? parseFloat(input) : input;
    if (isNaN(num) || num < 0) {
      throw new Error('Invalid amount');
    }
    return Math.round(num * 100) / 100; // Round to 2 decimal places
  },
  
  // Sanitize UUID
  uuid: (input: string): string => {
    if (!validationPatterns.uuid.test(input)) {
      throw new Error('Invalid UUID format');
    }
    return input.toLowerCase();
  }
};

// Audit logging for financial operations
export const auditLog = {
  // Log financial transactions
  financialTransaction: async (userId: string, action: string, details: any) => {
    // In production, this should write to a secure audit log
    console.log(`[AUDIT] Financial Transaction - User: ${userId}, Action: ${action}`, {
      timestamp: new Date().toISOString(),
      userId,
      action,
      details: {
        // Only log non-sensitive details
        transactionType: details.type,
        amount: details.amount ? '***' : undefined, // Mask sensitive data
        category: details.category
      }
    });
  },
  
  // Log admin actions
  adminAction: async (adminId: string, action: string, target?: string) => {
    console.log(`[AUDIT] Admin Action - Admin: ${adminId}, Action: ${action}`, {
      timestamp: new Date().toISOString(),
      adminId,
      action,
      target
    });
  },
  
  // Log security events
  securityEvent: async (event: string, details: any) => {
    console.log(`[SECURITY] ${event}`, {
      timestamp: new Date().toISOString(),
      event,
      details: {
        // Mask sensitive information
        ip: details.ip ? '***' : undefined,
        userAgent: details.userAgent ? details.userAgent.substring(0, 50) : undefined
      }
    });
  }
};

// Security middleware for API routes
export const securityMiddleware = {
  // Add security headers to response
  addSecurityHeaders: (response: NextResponse): NextResponse => {
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  },
  
  // Validate request origin
  validateOrigin: (request: NextRequest): boolean => {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    
    // In production, implement proper origin validation
    if (process.env.NODE_ENV === 'production') {
      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
      return !origin || allowedOrigins.includes(origin) || origin === `https://${host}`;
    }
    
    return true; // Allow all origins in development
  },
  
  // Check for suspicious patterns
  detectSuspiciousActivity: (request: NextRequest): boolean => {
    const userAgent = request.headers.get('user-agent') || '';
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i
    ];
    
    return suspiciousPatterns.some(pattern => pattern.test(userAgent));
  }
};

// Data masking utilities
export const dataMasking = {
  // Mask email addresses
  maskEmail: (email: string): string => {
    const [local, domain] = email.split('@');
    if (local.length <= 2) return email;
    return `${local.substring(0, 2)}***@${domain}`;
  },
  
  // Mask phone numbers
  maskPhone: (phone: string): string => {
    if (phone.length <= 4) return phone;
    return `${phone.substring(0, 2)}***${phone.substring(phone.length - 2)}`;
  },
  
  // Mask financial amounts (for logging)
  maskAmount: (amount: number): string => {
    return '***';
  },
  
  // Mask sensitive strings
  maskString: (str: string, visibleChars: number = 2): string => {
    if (str.length <= visibleChars * 2) return '***';
    return `${str.substring(0, visibleChars)}***${str.substring(str.length - visibleChars)}`;
  }
};

// Encryption utilities (for sensitive data)
export const encryption = {
  // Simple encryption for non-critical data (use proper encryption in production)
  simpleEncrypt: (data: string): string => {
    // In production, use proper encryption libraries like crypto-js
    return btoa(data); // Base64 encoding (not secure, for demo only)
  },
  
  // Simple decryption
  simpleDecrypt: (encryptedData: string): string => {
    return atob(encryptedData); // Base64 decoding
  }
};

// Security validation helpers
export const securityValidation = {
  // Validate financial transaction
  validateFinancialTransaction: (data: any): boolean => {
    try {
      // Check required fields
      if (!data.user_id || !data.amount || !data.type || !data.category) {
        return false;
      }
      
      // Validate amount
      const amount = sanitizeInput.amount(data.amount);
      if (amount <= 0 || amount > 1000000) { // Max 1M limit
        return false;
      }
      
      // Validate type
      const validTypes = ['credit', 'debit'];
      if (!validTypes.includes(data.type)) {
        return false;
      }
      
      return true;
    } catch {
      return false;
    }
  },
  
  // Validate admin request
  validateAdminRequest: (request: NextRequest): boolean => {
    // Check for admin authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return false;
    }
    
    // Additional admin validation logic here
    return true;
  }
};

export default {
  securityHeaders,
  rateLimits,
  validationPatterns,
  sanitizeInput,
  auditLog,
  securityMiddleware,
  dataMasking,
  encryption,
  securityValidation
};
