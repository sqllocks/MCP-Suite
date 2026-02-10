import Joi from 'joi';
import { Logger } from './logger.js';
import * as crypto from 'crypto';

/**
 * Security configuration limits
 */
export const SECURITY_LIMITS = {
  MAX_INPUT_LENGTH: 10000,        // 10KB
  MAX_PROMPT_LENGTH: 50000,       // 50KB  
  MAX_RESPONSE_LENGTH: 100000,    // 100KB
  MAX_CONCURRENT_REQUESTS: 3,
  REQUEST_TIMEOUT_MS: 120000,     // 2 minutes
  MAX_REQUESTS_PER_MINUTE: 60,
  MAX_REQUESTS_PER_HOUR: 1000,
  MAX_MEMORY_MB: 512,
  MEMORY_CHECK_INTERVAL_MS: 30000,
  MAX_REGISTERED_SERVERS: 100,
  SERVER_TTL_MS: 86400000,        // 24 hours
};

/**
 * Allowed parent processes for MCP servers
 */
const ALLOWED_PARENTS = [
  'claude',
  'claude-desktop',
  'claude-code',
  'cline',
  'continue',
  'code',           // VS Code
  'node',           // Direct node execution
  'npm',            // npm scripts
  'pm2',            // PM2 process manager
];

/**
 * Security validation error
 */
export class SecurityError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'SecurityError';
  }
}

/**
 * Input validation schemas
 */
export const inputSchemas = {
  standardTool: Joi.object({
    input: Joi.string()
      .max(SECURITY_LIMITS.MAX_INPUT_LENGTH)
      .required()
      .messages({
        'string.max': `Input exceeds maximum length of ${SECURITY_LIMITS.MAX_INPUT_LENGTH} characters`,
        'any.required': 'Input is required'
      }),
    options: Joi.object({
      temperature: Joi.number().min(0).max(2).optional(),
      maxTokens: Joi.number().min(1).max(32000).optional(),
      includeContext: Joi.boolean().optional(),
      stream: Joi.boolean().optional()
    }).optional()
  }),

  serverRegistration: Joi.object({
    name: Joi.string()
      .pattern(/^[a-zA-Z0-9-_]+$/)
      .max(100)
      .required()
      .messages({
        'string.pattern.base': 'Server name must contain only alphanumeric characters, hyphens, and underscores'
      }),
    port: Joi.number().port().optional(),
    model: Joi.string().max(100).optional(),
    capabilities: Joi.array().items(Joi.string().max(100)).max(20).optional()
  })
};

/**
 * Security validator class
 */
export class SecurityValidator {
  private logger: Logger;
  private requestCounts: Map<string, { count: number; resetTime: number }> = new Map();

  constructor(logger: Logger) {
    this.logger = logger;
    
    // Clean up old request counts periodically
    setInterval(() => this.cleanupRequestCounts(), 60000);
  }

  /**
   * Validate parent process is authorized
   */
  validateParentProcess(): void {
    try {
      const ppid = process.ppid;
      const parent = this.getProcessName(ppid);

      // Check if parent is in allowed list
      const isAllowed = ALLOWED_PARENTS.some(allowed => 
        parent.toLowerCase().includes(allowed.toLowerCase())
      );

      if (!isAllowed) {
        this.logger.warn('Unauthorized parent process detected', {
          ppid,
          parent,
          allowed: ALLOWED_PARENTS
        });
        
        // In development, allow but warn
        if (process.env.NODE_ENV === 'production') {
          throw new SecurityError(`Unauthorized parent process: ${parent}`);
        }
      }

      this.logger.debug('Parent process validated', { parent, ppid });
    } catch (error: any) {
      this.logger.error('Parent process validation failed', error);
      
      if (process.env.NODE_ENV === 'production') {
        throw error;
      }
    }
  }

  /**
   * Get process name from PID
   */
  private getProcessName(pid: number): string {
    try {
      if (process.platform === 'win32') {
        const { execSync } = require('child_process');
        const output = execSync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`, { encoding: 'utf8' });
        const match = output.match(/"([^"]+)"/);
        return match ? match[1] : 'unknown';
      } else {
        const { execSync } = require('child_process');
        const output = execSync(`ps -p ${pid} -o comm=`, { encoding: 'utf8' });
        return output.trim();
      }
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Validate input against schema
   */
  validateInput<T>(schema: Joi.Schema, input: any): T {
    const { error, value } = schema.validate(input, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const details = error.details.map(d => d.message).join('; ');
      this.logger.warn('Input validation failed', {
        error: details,
        input: this.sanitizeForLogging(input)
      });
      throw new SecurityError('Invalid input', details);
    }

    return value as T;
  }

  /**
   * Check for potential prompt injection
   */
  checkPromptInjection(input: string): void {
    const suspiciousPatterns = [
      /ignore\s+(all\s+)?previous\s+instructions?/i,
      /disregard\s+(all\s+)?previous\s+instructions?/i,
      /forget\s+(all\s+)?previous\s+instructions?/i,
      /new\s+instructions?:/i,
      /system\s*:/i,
      /\[system\]/i,
      /<s>/i,
      /execute\s+command/i,
      /run\s+command/i,
      /\/etc\/passwd/,
      /rm\s+-rf/,
      /curl\s+.*\|/,
      /wget\s+.*\|/,
      /;\s*rm\s+-rf/,
      /&&\s*rm\s+-rf/
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(input)) {
        this.logger.warn('Potential prompt injection detected', {
          pattern: pattern.source,
          input: input.substring(0, 100)
        });

        if (process.env.SECURITY_MODE === 'strict') {
          throw new SecurityError('Input contains prohibited patterns');
        }
      }
    }
  }

  /**
   * Sanitize string input
   */
  sanitizeInput(input: string): string {
    // Remove null bytes
    let sanitized = input.replace(/\0/g, '');
    
    // Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim();
    
    // Limit length
    if (sanitized.length > SECURITY_LIMITS.MAX_INPUT_LENGTH) {
      sanitized = sanitized.substring(0, SECURITY_LIMITS.MAX_INPUT_LENGTH);
    }

    return sanitized;
  }

  /**
   * Rate limiting check
   */
  checkRateLimit(identifier: string): void {
    const now = Date.now();
    const key = `rate_${identifier}`;
    
    let record = this.requestCounts.get(key);
    
    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + 60000 // Reset after 1 minute
      };
      this.requestCounts.set(key, record);
      return;
    }

    record.count++;

    if (record.count > SECURITY_LIMITS.MAX_REQUESTS_PER_MINUTE) {
      this.logger.warn('Rate limit exceeded', {
        identifier,
        count: record.count,
        limit: SECURITY_LIMITS.MAX_REQUESTS_PER_MINUTE
      });
      throw new SecurityError('Rate limit exceeded. Please try again later.');
    }
  }

  /**
   * Cleanup old request counts
   */
  private cleanupRequestCounts(): void {
    const now = Date.now();
    for (const [key, record] of this.requestCounts.entries()) {
      if (now > record.resetTime) {
        this.requestCounts.delete(key);
      }
    }
  }

  /**
   * Sanitize data for logging (remove sensitive info)
   */
  sanitizeForLogging(data: any): any {
    if (typeof data === 'string') {
      return data
        .replace(/api[_-]?key[=:]\s*[\w-]+/gi, 'api_key=***')
        .replace(/token[=:]\s*[\w.-]+/gi, 'token=***')
        .replace(/password[=:]\s*\S+/gi, 'password=***')
        .replace(/secret[=:]\s*\S+/gi, 'secret=***');
    }

    if (typeof data === 'object' && data !== null) {
      const sanitized: any = Array.isArray(data) ? [] : {};
      for (const key in data) {
        if (/api[_-]?key|token|password|secret/i.test(key)) {
          sanitized[key] = '***';
        } else {
          sanitized[key] = this.sanitizeForLogging(data[key]);
        }
      }
      return sanitized;
    }

    return data;
  }

  /**
   * Check memory usage
   */
  checkMemoryUsage(): void {
    const usage = process.memoryUsage();
    const heapUsedMB = usage.heapUsed / 1024 / 1024;

    if (heapUsedMB > SECURITY_LIMITS.MAX_MEMORY_MB * 0.9) {
      this.logger.warn('Memory usage approaching limit', {
        heapUsedMB: Math.round(heapUsedMB),
        limitMB: SECURITY_LIMITS.MAX_MEMORY_MB
      });

      if (heapUsedMB > SECURITY_LIMITS.MAX_MEMORY_MB) {
        this.logger.error('Memory limit exceeded', {
          heapUsedMB: Math.round(heapUsedMB),
          limitMB: SECURITY_LIMITS.MAX_MEMORY_MB
        });

        // Force garbage collection if available
        if (global.gc) {
          this.logger.info('Forcing garbage collection');
          global.gc();
        }
      }
    }
  }
}

/**
 * Request rate limiter using token bucket algorithm
 */
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per millisecond

  constructor(maxRequests: number, windowMs: number) {
    this.maxTokens = maxRequests;
    this.tokens = maxRequests;
    this.lastRefill = Date.now();
    this.refillRate = maxRequests / windowMs;
  }

  /**
   * Attempt to consume a token
   */
  async consume(): Promise<boolean> {
    this.refill();

    if (this.tokens < 1) {
      return false;
    }

    this.tokens -= 1;
    return true;
  }

  /**
   * Refill tokens based on time elapsed
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = elapsed * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  /**
   * Get remaining tokens
   */
  getRemaining(): number {
    this.refill();
    return Math.floor(this.tokens);
  }
}

/**
 * Secrets manager for encryption/decryption
 */
export class SecretsManager {
  private key: Buffer;
  private logger: Logger;

  constructor(logger: Logger, secretKey?: string) {
    this.logger = logger;
    
    // Derive key from environment or provided key
    const keySource = secretKey || process.env.ENCRYPTION_KEY || 'default-development-key-change-in-production';
    
    this.key = crypto.scryptSync(keySource, 'mcp-suite-salt', 32);

    if (process.env.NODE_ENV === 'production' && !secretKey && !process.env.ENCRYPTION_KEY) {
      this.logger.warn('Using default encryption key in production! Set ENCRYPTION_KEY environment variable.');
    }
  }

  /**
   * Encrypt data
   */
  encrypt(data: string): string {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);

      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
    } catch (error) {
      this.logger.error('Encryption failed', error);
      throw new SecurityError('Encryption failed');
    }
  }

  /**
   * Decrypt data
   */
  decrypt(encrypted: string): string {
    try {
      const [ivHex, data, authTagHex] = encrypted.split(':');

      if (!ivHex || !data || !authTagHex) {
        throw new Error('Invalid encrypted data format');
      }

      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        this.key,
        Buffer.from(ivHex, 'hex')
      );

      decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

      let decrypted = decipher.update(data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      this.logger.error('Decryption failed', error);
      throw new SecurityError('Decryption failed');
    }
  }

  /**
   * Hash data (one-way)
   */
  hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}

/**
 * Create security validator
 */
export function createSecurityValidator(logger: Logger): SecurityValidator {
  return new SecurityValidator(logger);
}

/**
 * Create rate limiter
 */
export function createRateLimiter(maxRequests: number = 60, windowMs: number = 60000): RateLimiter {
  return new RateLimiter(maxRequests, windowMs);
}

/**
 * Create secrets manager
 */
export function createSecretsManager(logger: Logger, secretKey?: string): SecretsManager {
  return new SecretsManager(logger, secretKey);
}
