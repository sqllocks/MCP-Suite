import * as winston from 'winston';
import * as path from 'path';
import * as fs from 'fs';
import { LoggerConfig } from './types';

export class Logger {
  private logger: winston.Logger;
  private serviceName: string;

  constructor(config: LoggerConfig) {
    this.serviceName = config.serviceName;
    
    // Ensure log directory exists
    if (config.logToFile && !fs.existsSync(config.logDir)) {
      fs.mkdirSync(config.logDir, { recursive: true });
    }

    const transports: winston.transport[] = [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
            let msg = `${timestamp} [${service}] ${level}: ${message}`;
            if (Object.keys(meta).length > 0) {
              msg += ` ${JSON.stringify(meta)}`;
            }
            return msg;
          })
        )
      })
    ];

    if (config.logToFile) {
      transports.push(
        new winston.transports.File({
          filename: path.join(config.logDir, `${config.serviceName}.log`),
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          )
        }),
        new winston.transports.File({
          filename: path.join(config.logDir, 'error.log'),
          level: 'error',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          )
        })
      );
    }

    this.logger = winston.createLogger({
      level: config.level || 'info',
      defaultMeta: { service: config.serviceName },
      transports
    });
  }

  public info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  public error(message: string, error?: Error | any): void {
    if (error instanceof Error) {
      this.logger.error(message, {
        error: error.message,
        stack: error.stack,
        ...error
      });
    } else {
      this.logger.error(message, error);
    }
  }

  public warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  public debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  public log(level: string, message: string, meta?: any): void {
    this.logger.log(level, message, meta);
  }

  public getServiceName(): string {
    return this.serviceName;
  }
}

export function createLogger(config: string | LoggerConfig, logDir?: string): Logger {
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

export default createLogger;
