import pino from 'pino';

/**
 * Create configured logger instance
 */
export function createLogger(name: string) {
  return pino({
    name,
    level: process.env.LOG_LEVEL || 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        ignore: 'pid,hostname',
        translateTime: 'SYS:standard',
      },
    },
  });
}

/**
 * Default logger instance
 */
export const logger = createLogger('mcp-code-search');
