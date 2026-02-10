import { LoggerConfig } from './types';
export declare class Logger {
    private logger;
    private serviceName;
    constructor(config: LoggerConfig);
    info(message: string, meta?: any): void;
    error(message: string, error?: Error | any): void;
    warn(message: string, meta?: any): void;
    debug(message: string, meta?: any): void;
    log(level: string, message: string, meta?: any): void;
    getServiceName(): string;
}
export declare function createLogger(config: string | LoggerConfig, logDir?: string): Logger;
export default createLogger;
//# sourceMappingURL=logger.d.ts.map