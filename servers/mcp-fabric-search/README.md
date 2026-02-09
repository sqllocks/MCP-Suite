# MCP Fabric Search Server

Platform-biased web search server with caching and rate limiting.

## Features

- **Platform Presets**: Pre-configured for Fabric, Databricks, Snowflake, Azure, AWS, GCP
- **Domain Boosting**: Prioritizes trusted sources (learn.microsoft.com, sqlbi.com, etc.)
- **Intelligent Caching**: LRU cache with TTL to reduce API calls
- **Rate Limiting**: Prevents API quota exhaustion
- **Page Fetching**: Clean HTML-to-Markdown conversion
- **Multi-Backend**: Support for SerpAPI (more backends coming)

## Tools

### web_search

Search for platform-specific documentation and resources.

**Parameters:**
- `query` (required): Search query
- `top_k` (optional): Number of results (default: 5)
- `date_range` (optional): Filter by date (last_week, last_month, last_year, any)
- `content_type` (optional): Type of content (documentation, blog, video, forum, any)

**Example:**
```json
{
  "query": "DAX CALCULATE filter context",
  "top_k": 5,
  "date_range": "last_year"
}
```

### fetch_page

Fetch and convert web page to clean markdown.

**Parameters:**
- `url` (required): URL to fetch

**Example:**
```json
{
  "url": "https://dax.guide/calculate/"
}
```

## Configuration

Create a configuration file (e.g., `config.json`):

```json
{
  "client_id": "client-a",
  "platform": "fabric",
  "search_api_key": "YOUR_SERPAPI_KEY",
  "preferred_domains": [
    "learn.microsoft.com",
    "sqlbi.com",
    "dax.guide"
  ],
  "strict_domains": false,
  "max_results": 10,
  "cache_ttl": 3600,
  "rate_limit_per_minute": 10
}
```

## Running

```bash
# Set config path
export CONFIG_PATH=/path/to/config.json

# Run server
npm run dev

# Or build and run
npm run build
node dist/index.js
```

## Platform Presets

The server comes with built-in presets for:

- **Fabric/Power BI**: learn.microsoft.com, sqlbi.com, dax.guide, guyinacube.com
- **Databricks**: docs.databricks.com, databricks.com/blog, community.databricks.com
- **Snowflake**: docs.snowflake.com, community.snowflake.com, select.dev
- **Azure**: learn.microsoft.com/azure, azure.microsoft.com/blog
- **AWS**: docs.aws.amazon.com, aws.amazon.com/blogs
- **GCP**: cloud.google.com/docs

Presets automatically configure domain preferences and boost relevant sources.

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Development mode
npm run dev
```

## API Keys

Get a free SerpAPI key at: https://serpapi.com/

Add to your config:
```json
{
  "search_api_key": "your_key_here"
}
```
