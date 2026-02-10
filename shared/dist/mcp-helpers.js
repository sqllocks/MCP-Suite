"use strict";
/**
 * MCP Helper Utilities
 * Common functions for MCP server implementations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createToolDefinition = createToolDefinition;
exports.createTextContent = createTextContent;
exports.createErrorResponse = createErrorResponse;
exports.createSuccessResponse = createSuccessResponse;
exports.validateRequiredParams = validateRequiredParams;
exports.formatToolMetadata = formatToolMetadata;
/**
 * Create a tool definition with proper MCP schema
 */
function createToolDefinition(name, description, properties, required) {
    return {
        name,
        description,
        inputSchema: {
            type: 'object',
            properties,
            required
        }
    };
}
/**
 * Create text content response for MCP
 */
function createTextContent(text, isError = false) {
    return {
        content: [{ type: 'text', text }],
        ...(isError && { isError: true })
    };
}
/**
 * Create a standardized error response
 */
function createErrorResponse(error) {
    const message = error instanceof Error ? error.message : error;
    return {
        content: [
            {
                type: 'text',
                text: `Error: ${message}`
            }
        ],
        isError: true
    };
}
/**
 * Create a standardized success response
 */
function createSuccessResponse(data) {
    return {
        content: [
            {
                type: 'text',
                text: data
            }
        ]
    };
}
/**
 * Validate required parameters in tool arguments
 */
function validateRequiredParams(args, required) {
    const missing = required.filter(param => !(param in args) || args[param] === undefined);
    if (missing.length > 0) {
        return { valid: false, missing };
    }
    return { valid: true };
}
/**
 * Format tool metadata for logging
 */
function formatToolMetadata(toolName, duration, model, additionalMeta) {
    return {
        tool: toolName,
        ...(duration && { duration_ms: duration }),
        ...(model && { model }),
        ...additionalMeta
    };
}
//# sourceMappingURL=mcp-helpers.js.map