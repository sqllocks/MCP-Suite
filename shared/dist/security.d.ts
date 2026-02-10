import Joi from 'joi';
import { Logger } from './logger.js';
/**
 * Security configuration limits
 */
export declare const SECURITY_LIMITS: {
    MAX_INPUT_LENGTH: number;
    MAX_PROMPT_LENGTH: number;
    MAX_RESPONSE_LENGTH: number;
    MAX_CONCURRENT_REQUESTS: number;
    REQUEST_TIMEOUT_MS: number;
    MAX_REQUESTS_PER_MINUTE: number;
    MAX_REQUESTS_PER_HOUR: number;
    MAX_MEMORY_MB: number;
    MEMORY_CHECK_INTERVAL_MS: number;
    MAX_REGISTERED_SERVERS: number;
    SERVER_TTL_MS: number;
};
/**
 * Security validation error
 */
export declare class SecurityError extends Error {
    details?: any | undefined;
    constructor(message: string, details?: any | undefined);
}
/**
 * Input validation schemas
 */
export declare const inputSchemas: {
    standardTool: Joi.ObjectSchema<any>;
    serverRegistration: Joi.ObjectSchema<any>;
};
/**
 * Security validator class
 */
export declare class SecurityValidator {
    private logger;
    private requestCounts;
    constructor(logger: Logger);
    /**
     * Validate parent process is authorized
     */
    validateParentProcess(): void;
    /**
     * Get process name from PID
     */
    private getProcessName;
    /**
     * Validate input against schema
     */
    validateInput<T>(schema: Joi.Schema, input: any): T;
    /**
     * Check for potential prompt injection
     */
    checkPromptInjection(input: string): void;
    /**
     * Sanitize string input
     */
    sanitizeInput(input: string): string;
    /**
     * Rate limiting check
     */
    checkRateLimit(identifier: string): void;
    /**
     * Cleanup old request counts
     */
    private cleanupRequestCounts;
    /**
     * Sanitize data for logging (remove sensitive info)
     */
    sanitizeForLogging(data: any): any;
    /**
     * Check memory usage
     */
    checkMemoryUsage(): void;
}
/**
 * Request rate limiter using token bucket algorithm
 */
export declare class RateLimiter {
    private tokens;
    private lastRefill;
    private readonly maxTokens;
    private readonly refillRate;
    constructor(maxRequests: number, windowMs: number);
    /**
     * Attempt to consume a token
     */
    consume(): Promise<boolean>;
    /**
     * Refill tokens based on time elapsed
     */
    private refill;
    /**
     * Get remaining tokens
     */
    getRemaining(): number;
}
/**
 * Secrets manager for encryption/decryption
 */
export declare class SecretsManager {
    private key;
    private logger;
    constructor(logger: Logger, secretKey?: string);
    /**
     * Encrypt data
     */
    encrypt(data: string): string;
    /**
     * Decrypt data
     */
    decrypt(encrypted: string): string;
    /**
     * Hash data (one-way)
     */
    hash(data: string): string;
}
/**
 * Create security validator
 */
export declare function createSecurityValidator(logger: Logger): SecurityValidator;
/**
 * Create rate limiter
 */
export declare function createRateLimiter(maxRequests?: number, windowMs?: number): RateLimiter;
/**
 * Create secrets manager
 */
export declare function createSecretsManager(logger: Logger, secretKey?: string): SecretsManager;
//# sourceMappingURL=security.d.ts.map