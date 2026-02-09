-- Synapse SQL Example Queries
-- For use with mcp-sql-explorer

-- ============================================
-- SYNAPSE SERVERLESS SQL POOL
-- ============================================

-- 1. Query Parquet files directly
SELECT * 
FROM OPENROWSET(
    BULK 'https://storage.dfs.core.windows.net/data/sales/*.parquet',
    FORMAT = 'PARQUET'
) AS sales
WHERE Year = 2024
LIMIT 100;

-- 2. Query CSV with explicit schema
SELECT *
FROM OPENROWSET(
    BULK 'https://storage.dfs.core.windows.net/data/customers/*.csv',
    FORMAT = 'CSV',
    PARSER_VERSION = '2.0',
    HEADER_ROW = TRUE
)
WITH (
    CustomerID INT,
    CustomerName VARCHAR(100),
    Email VARCHAR(200),
    Country VARCHAR(50)
) AS customers;

-- 3. Query JSON files
SELECT 
    JSON_VALUE(doc, '$.customerId') as CustomerID,
    JSON_VALUE(doc, '$.orderDate') as OrderDate,
    JSON_VALUE(doc, '$.total') as Total
FROM OPENROWSET(
    BULK 'https://storage.dfs.core.windows.net/data/orders/*.json',
    FORMAT = 'JSON'
) 
CROSS APPLY OPENJSON(bulk_column) AS doc;

-- 4. Query external table
SELECT TOP 100
    ProductName,
    SUM(Quantity) as TotalQuantity,
    SUM(Amount) as TotalAmount
FROM ExternalSales
WHERE OrderDate >= '2024-01-01'
GROUP BY ProductName
ORDER BY TotalAmount DESC;

-- 5. Cross-database query
SELECT 
    c.CustomerName,
    COUNT(o.OrderID) as OrderCount
FROM SalesDB.dbo.Customers c
LEFT JOIN OrdersDB.dbo.Orders o ON c.CustomerID = o.CustomerID
GROUP BY c.CustomerName;

-- 6. Query with schema inference
SELECT *
FROM OPENROWSET(
    BULK 'https://storage.dfs.core.windows.net/data/events/*.parquet',
    FORMAT = 'PARQUET'
) AS events
WHERE event_type = 'page_view'
LIMIT 1000;

-- 7. Aggregation over data lake
SELECT 
    Year,
    Month,
    SUM(Sales) as TotalSales,
    COUNT(DISTINCT CustomerID) as UniqueCustomers
FROM OPENROWSET(
    BULK 'https://storage.dfs.core.windows.net/data/sales/year=*/month=*/*.parquet',
    FORMAT = 'PARQUET'
) AS sales
GROUP BY Year, Month
ORDER BY Year, Month;

-- 8. Query Delta Lake table
SELECT *
FROM OPENROWSET(
    BULK 'https://storage.dfs.core.windows.net/data/delta/sales/',
    FORMAT = 'DELTA'
) AS delta_sales
WHERE _date >= '2024-01-01';

-- ============================================
-- SYNAPSE DEDICATED SQL POOL
-- ============================================

-- 9. Standard data warehouse query
SELECT 
    d.CalendarYear,
    d.MonthName,
    p.Category,
    SUM(f.SalesAmount) as TotalSales,
    COUNT(DISTINCT f.CustomerKey) as UniqueCustomers,
    AVG(f.SalesAmount) as AvgOrderValue
FROM FactSales f
JOIN DimDate d ON f.DateKey = d.DateKey
JOIN DimProduct p ON f.ProductKey = p.ProductKey
WHERE d.CalendarYear = 2024
GROUP BY d.CalendarYear, d.MonthName, p.Category
ORDER BY d.CalendarYear, d.MonthName;

-- 10. Query with partition elimination
SELECT 
    ProductName,
    SUM(SalesAmount) as TotalSales
FROM FactSales f
JOIN DimProduct p ON f.ProductKey = p.ProductKey
WHERE DateKey BETWEEN 20240101 AND 20240131  -- Partition pruning
GROUP BY ProductName
ORDER BY TotalSales DESC;

-- 11. Use materialized view
SELECT 
    Year,
    Quarter,
    Region,
    TotalSales,
    TotalCost,
    (TotalSales - TotalCost) as Profit
FROM mvw_SalesSummaryByRegion
WHERE Year = 2024
ORDER BY Year, Quarter, Region;

-- 12. Query with result-set caching
SELECT /* RESULT_SET_CACHING = ON */
    Category,
    SUM(Sales) as TotalSales,
    SUM(Quantity) as TotalQuantity,
    AVG(Price) as AvgPrice
FROM SalesSummary
WHERE Year = 2024
GROUP BY Category;

-- 13. Window functions for rankings
SELECT 
    ProductName,
    Category,
    TotalSales,
    RANK() OVER (PARTITION BY Category ORDER BY TotalSales DESC) as CategoryRank,
    PERCENT_RANK() OVER (ORDER BY TotalSales DESC) as PercentileRank
FROM (
    SELECT 
        p.ProductName,
        p.Category,
        SUM(f.SalesAmount) as TotalSales
    FROM FactSales f
    JOIN DimProduct p ON f.ProductKey = p.ProductKey
    WHERE f.DateKey >= 20240101
    GROUP BY p.ProductName, p.Category
) ranked;

-- 14. Slowly Changing Dimension Type 2 query
SELECT 
    c.CustomerKey,
    c.CustomerName,
    c.City,
    c.Country,
    c.EffectiveDate,
    c.ExpiryDate,
    c.IsCurrent
FROM DimCustomer c
WHERE c.IsCurrent = 1  -- Get current records only
ORDER BY c.CustomerName;

-- 15. Temporal query with SCD
SELECT 
    c.CustomerName,
    SUM(f.SalesAmount) as TotalSales
FROM FactSales f
JOIN DimDate d ON f.DateKey = d.DateKey
JOIN DimCustomer c ON f.CustomerKey = c.CustomerKey
WHERE d.FullDate BETWEEN c.EffectiveDate AND c.ExpiryDate
  AND d.CalendarYear = 2024
GROUP BY c.CustomerName
ORDER BY TotalSales DESC;

-- ============================================
-- PERFORMANCE & OPTIMIZATION
-- ============================================

-- 16. Check table statistics
DBCC SHOW_STATISTICS('FactSales', 'IX_FactSales_DateKey');

-- 17. View table distribution
SELECT 
    distribution_policy_desc,
    COUNT(*) as num_distributions
FROM sys.pdw_table_distribution_properties tp
JOIN sys.tables t ON tp.object_id = t.object_id
WHERE t.name = 'FactSales'
GROUP BY distribution_policy_desc;

-- 18. Check partition info
SELECT 
    t.name as TableName,
    p.partition_number,
    p.rows,
    p.data_compression_desc
FROM sys.tables t
JOIN sys.partitions p ON t.object_id = p.object_id
WHERE t.name = 'FactSales'
ORDER BY p.partition_number;

-- 19. Query execution plan (via MCP tool: sql_explain_plan)
-- Use the sql_explain_plan tool to get execution plan

-- 20. Table sizes
SELECT 
    t.name as TableName,
    SUM(p.rows) as RowCount,
    SUM(a.total_pages) * 8 / 1024 / 1024 as SizeGB
FROM sys.tables t
JOIN sys.indexes i ON t.object_id = i.object_id
JOIN sys.partitions p ON i.object_id = p.object_id AND i.index_id = p.index_id
JOIN sys.allocation_units a ON p.partition_id = a.container_id
WHERE t.is_ms_shipped = 0
GROUP BY t.name
ORDER BY SizeGB DESC;
