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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
exports.createLogger = createLogger;
const winston = __importStar(require("winston"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
class Logger {
    constructor(config) {
        this.serviceName = config.serviceName;
        // Ensure log directory exists
        if (config.logToFile && !fs.existsSync(config.logDir)) {
            fs.mkdirSync(config.logDir, { recursive: true });
        }
        const transports = [
            new winston.transports.Console({
                format: winston.format.combine(winston.format.colorize(), winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
                    let msg = `${timestamp} [${service}] ${level}: ${message}`;
                    if (Object.keys(meta).length > 0) {
                        msg += ` ${JSON.stringify(meta)}`;
                    }
                    return msg;
                }))
            })
        ];
        if (config.logToFile) {
            transports.push(new winston.transports.File({
                filename: path.join(config.logDir, `${config.serviceName}.log`),
                format: winston.format.combine(winston.format.timestamp(), winston.format.json())
            }), new winston.transports.File({
                filename: path.join(config.logDir, 'error.log'),
                level: 'error',
                format: winston.format.combine(winston.format.timestamp(), winston.format.json())
            }));
        }
        this.logger = winston.createLogger({
            level: config.level || 'info',
            defaultMeta: { service: config.serviceName },
            transports
        });
    }
    info(message, meta) {
        this.logger.info(message, meta);
    }
    error(message, error) {
        if (error instanceof Error) {
            this.logger.error(message, {
                error: error.message,
                stack: error.stack,
                ...error
            });
        }
        else {
            this.logger.error(message, error);
        }
    }
    warn(message, meta) {
        this.logger.warn(message, meta);
    }
    debug(message, meta) {
        this.logger.debug(message, meta);
    }
    log(level, message, meta) {
        this.logger.log(level, message, meta);
    }
    getServiceName() {
        return this.serviceName;
    }
}
exports.Logger = Logger;
function createLogger(config, logDir) {
    // Support both old signature (string) and new signature (config object)
    if (typeof config === 'string') {
        return new Logger({
            serviceName: config,
            level: process.env.LOG_LEVEL || 'info',
            logToFile: process.env.LOG_TO_FILE === 'true',
            logDir: logDir || path.join(process.cwd(), 'logs')
        });
    }
    return new Logger(config);
}
exports.default = createLogger;
//# sourceMappingURL=logger.js.map