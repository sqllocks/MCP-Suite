# Complete Microsoft Fabric Component Reference

## 🏗️ All Fabric Data Components

### Data Engineering Workload

#### 1. **Lakehouse**
- **Description**: Delta Lake-based data lake with automatic table discovery
- **Icon Color**: #00B7C3 (Teal)
- **Use Case**: Store raw and processed data, supports both structured and unstructured
- **SQL Support**: Spark SQL, automatic metadata discovery
- **Storage**: OneLake (Azure Data Lake Storage Gen2)

#### 2. **Warehouse** (SQL Analytics Endpoint)
- **Description**: T-SQL analytics engine optimized for read-heavy workloads
- **Icon Color**: #0078D4 (Azure Blue)
- **Use Case**: Enterprise data warehousing, analytics, reporting
- **SQL Support**: Full T-SQL (similar to Synapse dedicated pool)
- **Storage**: OneLake with optimized columnstore indexes

#### 3. **SQL Database** (Preview/New)
- **Description**: Transactional SQL database in Fabric, fully managed
- **Icon Color**: #0078D4 (Azure Blue) - slightly different shade
- **Use Case**: Operational workloads, OLTP, application databases
- **SQL Support**: T-SQL with transactional support (ACID)
- **Storage**: OneLake with row-store indexes
- **Key Difference**: Read-WRITE (vs Warehouse which is read-optimized)

#### 4. **KQL Database**
- **Description**: Real-time analytics with Kusto Query Language
- **Icon Color**: #00BCF2 (Cyan)
- **Use Case**: Time-series data, logs, IoT, streaming analytics
- **SQL Support**: KQL (Kusto Query Language)
- **Storage**: Optimized for time-series and streaming data

### Quick Comparison Matrix

| Component | Primary Use | SQL Dialect | Read/Write | Optimized For |
|-----------|-------------|-------------|------------|---------------|
| **Lakehouse** | Data Lake + Analytics | Spark SQL | Read/Write | Large-scale data processing |
| **Warehouse** | Analytics/DW | T-SQL | Read-heavy | Complex queries, aggregations |
| **SQL Database** | Operational/OLTP | T-SQL | Read/Write | Transactional workloads |
| **KQL Database** | Real-time Analytics | KQL | Read-heavy | Time-series, streaming |

### When to Use What?

**Lakehouse**: 
- ✅ Need both structured and unstructured data
- ✅ Data science and ML workloads
- ✅ Large-scale ETL
- ✅ Data engineering pipelines

**Warehouse**:
- ✅ Enterprise data warehouse
- ✅ Complex analytical queries
- ✅ Power BI semantic models
- ✅ Read-heavy reporting

**SQL Database**:
- ✅ Application backend database
- ✅ OLTP workloads
- ✅ Need transactions (INSERT/UPDATE/DELETE)
- ✅ Operational reporting

**KQL Database**:
- ✅ IoT telemetry
- ✅ Log analytics
- ✅ Real-time dashboards
- ✅ Time-series analysis

### Architecture Pattern

```
[Operational Apps] 
    ↓
[SQL Database] ──────┐
                     │
[IoT/Streaming] ──→ [Eventstream] ──→ [KQL Database]
                     │                      │
[Raw Data Sources] ──→ [Lakehouse] ─────────┤
                           │                 │
                           ↓                 ↓
                      [Warehouse] ←──────────┘
                           │
                           ↓
                      [Power BI Reports]
```

### Icon Visual Guide

```
🏠 Lakehouse     - House on water (data lake concept)
🏢 Warehouse     - Building with shelves (data warehouse)
💾 SQL Database  - Cylinder/disk (traditional database)
📊 KQL Database  - Graph with time axis (time-series)
```

## 🎨 Official Icon Details

### SQL Database Icon
- **File**: `Azure SQL Database.svg`
- **Color**: #0078D4 (same as Warehouse but different icon)
- **Design**: Traditional database cylinder
- **Size**: Standard 64x64px
- **Style**: Flat, modern Microsoft design

### Visual Distinction
- **Warehouse**: Building/warehouse structure with shelves
- **SQL Database**: Classic database cylinder/disk
- **KQL Database**: Graph with data points
- **Lakehouse**: House structure with water/lake

## 📦 Complete Fabric Icon Set

### Core Data Storage (4)
1. Lakehouse
2. Warehouse
3. SQL Database ← **This was missing!**
4. KQL Database

### Data Movement (3)
5. Data Pipeline
6. Dataflow Gen2
7. Eventstream

### Compute (3)
8. Notebook
9. Spark Job Definition
10. Environment

### Analytics (4)
11. Report
12. Dashboard
13. Semantic Model (Dataset)
14. Paginated Report

### Data Science (2)
15. ML Model
16. Experiment

### Infrastructure (3)
17. Workspace
18. Capacity
19. Gateway

**Total: 19 core Fabric components**
