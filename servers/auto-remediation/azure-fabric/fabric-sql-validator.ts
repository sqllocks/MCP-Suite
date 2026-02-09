/**
 * Microsoft Fabric SQL Validator
 * Validates and optimizes SQL queries for Fabric Warehouse and Lakehouse
 */

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
  optimizedQuery?: string;
}

export interface ValidationError {
  type: string;
  message: string;
  line?: number;
  column?: number;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  type: string;
  message: string;
  suggestion: string;
}

export class FabricSQLValidator {
  /**
   * Validate SQL query for Fabric compatibility
   */
  validate(query: string): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    // Check for unsupported features
    this.checkUnsupportedFeatures(query, result);

    // Check syntax
    this.checkSyntax(query, result);

    // Check performance issues
    this.checkPerformance(query, result);

    // Check best practices
    this.checkBestPractices(query, result);

    // Generate optimized query if issues found
    if (result.errors.length === 0 && result.warnings.length > 0) {
      result.optimizedQuery = this.optimizeQuery(query, result);
    }

    result.valid = result.errors.length === 0;

    return result;
  }

  /**
   * Check for unsupported Fabric features
   */
  private checkUnsupportedFeatures(query: string, result: ValidationResult): void {
    // SELECT INTO not supported
    if (/SELECT\s+.*\s+INTO\s+/i.test(query)) {
      result.errors.push({
        type: 'UNSUPPORTED_FEATURE',
        message: 'SELECT INTO is not supported in Fabric. Use CREATE TABLE AS SELECT (CTAS) instead.',
        severity: 'error'
      });
      result.suggestions.push('Replace SELECT INTO with: CREATE TABLE new_table AS SELECT ...');
    }

    // ISNULL vs COALESCE
    if (/ISNULL\s*\(/i.test(query)) {
      result.warnings.push({
        type: 'DEPRECATED_FUNCTION',
        message: 'ISNULL() is deprecated in Fabric',
        suggestion: 'Use COALESCE() instead for better compatibility'
      });
    }

    // TOP without parentheses
    if (/SELECT\s+TOP\s+\d+\s+/i.test(query) && !/SELECT\s+TOP\s*\(\d+\)/i.test(query)) {
      result.warnings.push({
        type: 'SYNTAX_WARNING',
        message: 'TOP clause should use parentheses',
        suggestion: 'Use SELECT TOP (100) instead of SELECT TOP 100'
      });
    }

    // NOLOCK hint
    if (/WITH\s*\(\s*NOLOCK\s*\)/i.test(query)) {
      result.warnings.push({
        type: 'HINT_WARNING',
        message: 'NOLOCK hint may not be necessary in Fabric',
        suggestion: 'Fabric uses snapshot isolation by default'
      });
    }

    // Cursors
    if (/DECLARE\s+.*\s+CURSOR/i.test(query)) {
      result.warnings.push({
        type: 'PERFORMANCE_WARNING',
        message: 'Cursors are not optimal in Fabric',
        suggestion: 'Consider set-based operations instead'
      });
    }

    // Temp tables with #
    if (/#\w+/i.test(query)) {
      result.warnings.push({
        type: 'COMPATIBILITY_WARNING',
        message: 'Temp tables (#table) may have different behavior in Fabric',
        suggestion: 'Consider using CTEs or regular tables in a dedicated schema'
      });
    }
  }

  /**
   * Check SQL syntax
   */
  private checkSyntax(query: string, result: ValidationResult): void {
    // Check for unmatched parentheses
    const openParen = (query.match(/\(/g) || []).length;
    const closeParen = (query.match(/\)/g) || []).length;
    
    if (openParen !== closeParen) {
      result.errors.push({
        type: 'SYNTAX_ERROR',
        message: 'Unmatched parentheses',
        severity: 'error'
      });
    }

    // Check for unmatched quotes
    const singleQuotes = (query.match(/'/g) || []).length;
    if (singleQuotes % 2 !== 0) {
      result.errors.push({
        type: 'SYNTAX_ERROR',
        message: 'Unmatched single quotes',
        severity: 'error'
      });
    }

    // Check for missing FROM clause in SELECT
    if (/SELECT\s+.*\s+WHERE/i.test(query) && !/FROM/i.test(query)) {
      result.errors.push({
        type: 'SYNTAX_ERROR',
        message: 'SELECT with WHERE must have FROM clause',
        severity: 'error'
      });
    }

    // Check for missing semicolon at end (best practice)
    if (!query.trim().endsWith(';')) {
      result.warnings.push({
        type: 'BEST_PRACTICE',
        message: 'Query should end with semicolon',
        suggestion: 'Add ; at the end of the query'
      });
    }
  }

  /**
   * Check performance issues
   */
  private checkPerformance(query: string, result: ValidationResult): void {
    // SELECT *
    if (/SELECT\s+\*\s+FROM/i.test(query)) {
      result.warnings.push({
        type: 'PERFORMANCE_WARNING',
        message: 'SELECT * can be inefficient',
        suggestion: 'Specify only the columns you need'
      });
    }

    // Missing WHERE clause on large tables
    if (/SELECT\s+.*\s+FROM\s+\w+/i.test(query) && !/WHERE/i.test(query)) {
      result.warnings.push({
        type: 'PERFORMANCE_WARNING',
        message: 'Query without WHERE clause may scan entire table',
        suggestion: 'Add WHERE clause to filter data'
      });
    }

    // OR in WHERE clause
    if (/WHERE\s+.*\s+OR\s+/i.test(query)) {
      result.warnings.push({
        type: 'PERFORMANCE_WARNING',
        message: 'OR in WHERE clause can prevent index usage',
        suggestion: 'Consider using UNION or IN clause instead'
      });
    }

    // Functions on indexed columns
    if (/WHERE\s+\w+\s*\([^)]*\w+\s*\)\s*=/i.test(query)) {
      result.warnings.push({
        type: 'PERFORMANCE_WARNING',
        message: 'Function on column in WHERE clause prevents index usage',
        suggestion: 'Move functions to the right side of the comparison'
      });
    }

    // DISTINCT without need
    if (/SELECT\s+DISTINCT/i.test(query) && !/GROUP BY/i.test(query)) {
      result.suggestions.push('Verify if DISTINCT is necessary - it adds overhead');
    }

    // Implicit conversions
    if (/WHERE\s+\w+\s*=\s*'\d+'/i.test(query)) {
      result.warnings.push({
        type: 'PERFORMANCE_WARNING',
        message: 'Implicit type conversion detected',
        suggestion: 'Use explicit CAST or ensure column and value types match'
      });
    }
  }

  /**
   * Check best practices
   */
  private checkBestPractices(query: string, result: ValidationResult): void {
    // Schema qualification
    if (/FROM\s+([a-zA-Z_]\w*)\s+/i.test(query) && !/FROM\s+\w+\.\w+/i.test(query)) {
      result.warnings.push({
        type: 'BEST_PRACTICE',
        message: 'Table names should be schema-qualified',
        suggestion: 'Use dbo.TableName instead of just TableName'
      });
    }

    // Column aliases
    if (/SELECT\s+.*\s+AS\s+["'].*["']/i.test(query)) {
      result.warnings.push({
        type: 'BEST_PRACTICE',
        message: 'Avoid quoted identifiers for aliases',
        suggestion: 'Use simple alias names without quotes'
      });
    }

    // ANSI JOIN syntax
    if (/FROM\s+\w+\s*,\s*\w+\s+WHERE/i.test(query)) {
      result.warnings.push({
        type: 'BEST_PRACTICE',
        message: 'Use ANSI JOIN syntax instead of comma joins',
        suggestion: 'Replace comma with INNER JOIN and move join condition to ON clause'
      });
    }

    // Reserved keywords as identifiers
    const reservedKeywords = ['USER', 'TABLE', 'SELECT', 'FROM', 'WHERE', 'ORDER', 'GROUP'];
    for (const keyword of reservedKeywords) {
      const regex = new RegExp(`\\b${keyword}\\b(?!\\s+(FROM|WHERE|JOIN|AS))`, 'i');
      if (regex.test(query)) {
        result.warnings.push({
          type: 'BEST_PRACTICE',
          message: `'${keyword}' is a reserved keyword`,
          suggestion: `Use [${keyword}] or rename the identifier`
        });
      }
    }
  }

  /**
   * Optimize query based on warnings
   */
  private optimizeQuery(query: string, result: ValidationResult): string {
    let optimized = query;

    // Replace ISNULL with COALESCE
    optimized = optimized.replace(/ISNULL\s*\((.*?),\s*(.*?)\)/gi, 'COALESCE($1, $2)');

    // Add parentheses to TOP
    optimized = optimized.replace(/SELECT\s+TOP\s+(\d+)\s+/gi, 'SELECT TOP ($1) ');

    // Remove NOLOCK hints
    optimized = optimized.replace(/WITH\s*\(\s*NOLOCK\s*\)/gi, '');

    // Add semicolon if missing
    if (!optimized.trim().endsWith(';')) {
      optimized = optimized.trim() + ';';
    }

    // Add schema qualification if simple table names detected
    optimized = optimized.replace(/FROM\s+([a-zA-Z_]\w*)(\s|$)/gi, (match, table, space) => {
      // Don't qualify if already qualified or is a CTE/subquery
      if (table.includes('.') || /\(/i.test(match)) {
        return match;
      }
      return `FROM dbo.${table}${space}`;
    });

    return optimized;
  }

  /**
   * Validate multiple queries in a file
   */
  validateFile(content: string): { [query: string]: ValidationResult } {
    const results: { [query: string]: ValidationResult } = {};
    
    // Split by semicolon or GO
    const queries = content.split(/;|\bGO\b/i);
    
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i].trim();
      if (query && query.length > 10) {
        results[`Query ${i + 1}`] = this.validate(query);
      }
    }

    return results;
  }

  /**
   * Get Fabric-specific recommendations
   */
  getFabricRecommendations(query: string): string[] {
    const recommendations: string[] = [];

    // Distribution recommendations
    if (/CREATE\s+TABLE/i.test(query)) {
      recommendations.push('Consider adding DISTRIBUTION = HASH([column]) for large fact tables');
      recommendations.push('Use DISTRIBUTION = REPLICATE for small dimension tables');
    }

    // Partitioning recommendations
    if (/CREATE\s+TABLE/i.test(query) && !/PARTITION/i.test(query)) {
      recommendations.push('Consider partitioning large tables by date for better performance');
    }

    // Indexing recommendations
    if (/CREATE\s+TABLE/i.test(query) && !/INDEX/i.test(query)) {
      recommendations.push('Add clustered columnstore index for large tables');
      recommendations.push('Add non-clustered indexes on frequently filtered columns');
    }

    // Statistics recommendations
    recommendations.push('Create statistics on join and filter columns');
    recommendations.push('Update statistics regularly for optimal query plans');

    return recommendations;
  }

  /**
   * Convert SQL Server query to Fabric-compatible query
   */
  convertToFabric(sqlServerQuery: string): string {
    let fabricQuery = sqlServerQuery;

    // Convert SELECT INTO to CTAS
    fabricQuery = fabricQuery.replace(
      /SELECT\s+(.*?)\s+INTO\s+(\w+)\s+FROM/gi,
      'CREATE TABLE $2 AS\nSELECT $1\nFROM'
    );

    // Convert ISNULL to COALESCE
    fabricQuery = fabricQuery.replace(/ISNULL\s*\(/gi, 'COALESCE(');

    // Remove NOLOCK hints
    fabricQuery = fabricQuery.replace(/WITH\s*\(\s*NOLOCK\s*\)/gi, '');

    // Add TOP parentheses
    fabricQuery = fabricQuery.replace(/SELECT\s+TOP\s+(\d+)\s+/gi, 'SELECT TOP ($1) ');

    // Convert ## temp tables to regular tables in a temp schema
    fabricQuery = fabricQuery.replace(/##(\w+)/g, 'temp.$1');

    // Add schema qualification
    fabricQuery = fabricQuery.replace(/FROM\s+([a-zA-Z_]\w*)(\s)/gi, 'FROM dbo.$1$2');
    fabricQuery = fabricQuery.replace(/JOIN\s+([a-zA-Z_]\w*)(\s)/gi, 'JOIN dbo.$1$2');

    return fabricQuery;
  }
}

/**
 * Quick validation function for exports
 */
export function validateFabricSQL(query: string): ValidationResult {
  const validator = new FabricSQLValidator();
  return validator.validate(query);
}

/**
 * Quick conversion function
 */
export function convertSQLServerToFabric(query: string): string {
  const validator = new FabricSQLValidator();
  return validator.convertToFabric(query);
}
