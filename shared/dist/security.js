"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecretsManager = exports.RateLimiter = exports.SecurityValidator = exports.inputSchemas = exports.SecurityError = exports.SECURITY_LIMITS = void 0;
exports.createSecurityValidator = createSecurityValidator;
exports.createRateLimiter = createRateLimiter;
exports.createSecretsManager = createSecretsManager;
const joi_1 = __importDefault(require("joi"));
const crypto = __importStar(require("crypto"));
/**
 * Security configuration limits
 */
exports.SECURITY_LIMITS = {
    MAX_INPUT_LENGTH: 10000, // 10KB
    MAX_PROMPT_LENGTH: 50000, // 50KB  
    MAX_RESPONSE_LENGTH: 100000, // 100KB
    MAX_CONCURRENT_REQUESTS: 3,
    REQUEST_TIMEOUT_MS: 120000, // 2 minutes
    MAX_REQUESTS_PER_MINUTE: 60,
    MAX_REQUESTS_PER_HOUR: 1000,
    MAX_MEMORY_MB: 512,
    MEMORY_CHECK_INTERVAL_MS: 30000,
    MAX_REGISTERED_SERVERS: 100,
    SERVER_TTL_MS: 86400000, // 24 hours
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
    'code', // VS Code
    'node', // Direct node execution
    'npm', // npm scripts
    'pm2', // PM2 process manager
];
/**
 * Security validation error
 */
class SecurityError extends Error {
    constructor(message, details) {
        super(message);
        this.details = details;
        this.name = 'SecurityError';
    }
}
exports.SecurityError = SecurityError;
/**
 * Input validation schemas
 */
exports.inputSchemas = {
    standardTool: joi_1.default.object({
        input: joi_1.default.string()
            .max(exports.SECURITY_LIMITS.MAX_INPUT_LENGTH)
            .required()
            .messages({
            'string.max': `Input exceeds maximum length of ${exports.SECURITY_LIMITS.MAX_INPUT_LENGTH} characters`,
            'any.required': 'Input is required'
        }),
        options: joi_1.default.object({
            temperature: joi_1.default.number().min(0).max(2).optional(),
            maxTokens: joi_1.default.number().min(1).max(32000).optional(),
            includeContext: joi_1.default.boolean().optional(),
            stream: joi_1.default.boolean().optional()
        }).optional()
    }),
    serverRegistration: joi_1.default.object({
        name: joi_1.default.string()
            .pattern(/^[a-zA-Z0-9-_]+$/)
            .max(100)
            .required()
            .messages({
            'string.pattern.base': 'Server name must contain only alphanumeric characters, hyphens, and underscores'
        }),
        port: joi_1.default.number().port().optional(),
        model: joi_1.default.string().max(100).optional(),
        capabilities: joi_1.default.array().items(joi_1.default.string().max(100)).max(20).optional()
    })
};
/**
 * Security validator class
 */
class SecurityValidator {
    constructor(logger) {
        this.requestCounts = new Map();
        this.logger = logger;
        // Clean up old request counts periodically
        setInterval(() => this.cleanupRequestCounts(), 60000);
    }
    /**
     * Validate parent process is authorized
     */
    validateParentProcess() {
        try {
            const ppid = process.ppid;
            const parent = this.getProcessName(ppid);
            // Check if parent is in allowed list
            const isAllowed = ALLOWED_PARENTS.some(allowed => parent.toLowerCase().includes(allowed.toLowerCase()));
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
        }
        catch (error) {
            this.logger.error('Parent process validation failed', error);
            if (process.env.NODE_ENV === 'production') {
                throw error;
            }
        }
    }
    /**
     * Get process name from PID
     */
    getProcessName(pid) {
        try {
            if (process.platform === 'win32') {
                const { execSync } = require('child_process');
                const output = execSync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`, { encoding: 'utf8' });
                const match = output.match(/"([^"]+)"/);
                return match ? match[1] : 'unknown';
            }
            else {
                const { execSync } = require('child_process');
                const output = execSync(`ps -p ${pid} -o comm=`, { encoding: 'utf8' });
                return output.trim();
            }
        }
        catch (error) {
            return 'unknown';
        }
    }
    /**
     * Validate input against schema
     */
    validateInput(schema, input) {
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
        return value;
    }
    /**
     * Check for potential prompt injection
     */
    checkPromptInjection(input) {
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
    sanitizeInput(input) {
        // Remove null bytes
        let sanitized = input.replace(/\0/g, '');
        // Normalize whitespace
        sanitized = sanitized.replace(/\s+/g, ' ').trim();
        // Limit length
        if (sanitized.length > exports.SECURITY_LIMITS.MAX_INPUT_LENGTH) {
            sanitized = sanitized.substring(0, exports.SECURITY_LIMITS.MAX_INPUT_LENGTH);
        }
        return sanitized;
    }
    /**
     * Rate limiting check
     */
    checkRateLimit(identifier) {
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
        if (record.count > exports.SECURITY_LIMITS.MAX_REQUESTS_PER_MINUTE) {
            this.logger.warn('Rate limit exceeded', {
                identifier,
                count: record.count,
                limit: exports.SECURITY_LIMITS.MAX_REQUESTS_PER_MINUTE
            });
            throw new SecurityError('Rate limit exceeded. Please try again later.');
        }
    }
    /**
     * Cleanup old request counts
     */
    cleanupRequestCounts() {
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
    sanitizeForLogging(data) {
        if (typeof data === 'string') {
            return data
                .replace(/api[_-]?key[=:]\s*[\w-]+/gi, 'api_key=***')
                .replace(/token[=:]\s*[\w.-]+/gi, 'token=***')
                .replace(/password[=:]\s*\S+/gi, 'password=***')
                .replace(/secret[=:]\s*\S+/gi, 'secret=***');
        }
        if (typeof data === 'object' && data !== null) {
            const sanitized = Array.isArray(data) ? [] : {};
            for (const key in data) {
                if (/api[_-]?key|token|password|secret/i.test(key)) {
                    sanitized[key] = '***';
                }
                else {
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
    checkMemoryUsage() {
        const usage = process.memoryUsage();
        const heapUsedMB = usage.heapUsed / 1024 / 1024;
        if (heapUsedMB > exports.SECURITY_LIMITS.MAX_MEMORY_MB * 0.9) {
            this.logger.warn('Memory usage approaching limit', {
                heapUsedMB: Math.round(heapUsedMB),
                limitMB: exports.SECURITY_LIMITS.MAX_MEMORY_MB
            });
            if (heapUsedMB > exports.SECURITY_LIMITS.MAX_MEMORY_MB) {
                this.logger.error('Memory limit exceeded', {
                    heapUsedMB: Math.round(heapUsedMB),
                    limitMB: exports.SECURITY_LIMITS.MAX_MEMORY_MB
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
exports.SecurityValidator = SecurityValidator;
/**
 * Request rate limiter using token bucket algorithm
 */
class RateLimiter {
    constructor(maxRequests, windowMs) {
        this.maxTokens = maxRequests;
        this.tokens = maxRequests;
        this.lastRefill = Date.now();
        this.refillRate = maxRequests / windowMs;
    }
    /**
     * Attempt to consume a token
     */
    async consume() {
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
    refill() {
        const now = Date.now();
        const elapsed = now - this.lastRefill;
        const tokensToAdd = elapsed * this.refillRate;
        this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
        this.lastRefill = now;
    }
    /**
     * Get remaining tokens
     */
    getRemaining() {
        this.refill();
        return Math.floor(this.tokens);
    }
}
exports.RateLimiter = RateLimiter;
/**
 * Secrets manager for encryption/decryption
 */
class SecretsManager {
    constructor(logger, secretKey) {
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
    encrypt(data) {
        try {
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
            let encrypted = cipher.update(data, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            const authTag = cipher.getAuthTag();
            return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
        }
        catch (error) {
            this.logger.error('Encryption failed', error);
            throw new SecurityError('Encryption failed');
        }
    }
    /**
     * Decrypt data
     */
    decrypt(encrypted) {
        try {
            const [ivHex, data, authTagHex] = encrypted.split(':');
            if (!ivHex || !data || !authTagHex) {
                throw new Error('Invalid encrypted data format');
            }
            const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, Buffer.from(ivHex, 'hex'));
            decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
            let decrypted = decipher.update(data, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        }
        catch (error) {
            this.logger.error('Decryption failed', error);
            throw new SecurityError('Decryption failed');
        }
    }
    /**
     * Hash data (one-way)
     */
    hash(data) {
        return crypto.createHash('sha256').update(data).digest('hex');
    }
}
exports.SecretsManager = SecretsManager;
/**
 * Create security validator
 */
function createSecurityValidator(logger) {
    return new SecurityValidator(logger);
}
/**
 * Create rate limiter
 */
function createRateLimiter(maxRequests = 60, windowMs = 60000) {
    return new RateLimiter(maxRequests, windowMs);
}
/**
 * Create secrets manager
 */
function createSecretsManager(logger, secretKey) {
    return new SecretsManager(logger, secretKey);
}
//# sourceMappingURL=security.js.map