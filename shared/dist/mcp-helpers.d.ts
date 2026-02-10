/**
 * MCP Helper Utilities
 * Common functions for MCP server implementations
 */
/**
 * Create a tool definition with proper MCP schema
 */
export declare function createToolDefinition(name: string, description: string, properties: Record<string, any>, required: string[]): {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: Record<string, any>;
        required: string[];
    };
};
/**
 * Create text content response for MCP
 */
export declare function createTextContent(text: string, isError?: boolean): {
    isError?: boolean | undefined;
    content: {
        type: string;
        text: string;
    }[];
};
/**
 * Create a standardized error response
 */
export declare function createErrorResponse(error: Error | string): {
    content: {
        type: string;
        text: string;
    }[];
    isError: boolean;
};
/**
 * Create a standardized success response
 */
export declare function createSuccessResponse(data: string): {
    content: {
        type: string;
        text: string;
    }[];
};
/**
 * Validate required parameters in tool arguments
 */
export declare function validateRequiredParams(args: Record<string, any>, required: string[]): {
    valid: boolean;
    missing?: string[];
};
/**
 * Format tool metadata for logging
 */
export declare function formatToolMetadata(toolName: string, duration?: number, model?: string, additionalMeta?: Record<string, any>): {
    model?: string | undefined;
    duration_ms?: number | undefined;
    tool: string;
};
//# sourceMappingURL=mcp-helpers.d.ts.map