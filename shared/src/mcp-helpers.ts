/**
 * MCP Helper Utilities
 * Common functions for MCP server implementations
 */

/**
 * Create a tool definition with proper MCP schema
 */
export function createToolDefinition(
  name: string,
  description: string,
  properties: Record<string, any>,
  required: string[]
) {
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
export function createTextContent(text: string, isError = false) {
  return {
    content: [{ type: 'text', text }],
    ...(isError && { isError: true })
  };
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(error: Error | string) {
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
export function createSuccessResponse(data: string) {
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
export function validateRequiredParams(
  args: Record<string, any>,
  required: string[]
): { valid: boolean; missing?: string[] } {
  const missing = required.filter(param => !(param in args) || args[param] === undefined);
  
  if (missing.length > 0) {
    return { valid: false, missing };
  }
  
  return { valid: true };
}

/**
 * Format tool metadata for logging
 */
export function formatToolMetadata(
  toolName: string,
  duration?: number,
  model?: string,
  additionalMeta?: Record<string, any>
) {
  return {
    tool: toolName,
    ...(duration && { duration_ms: duration }),
    ...(model && { model }),
    ...additionalMeta
  };
}
