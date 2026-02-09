# MCP Docs RAG Server

Offline semantic search over locally indexed documentation using embeddings.

## Features

- **Semantic Search**: Vector similarity search using embeddings
- **Multi-Platform**: Pre-configured for Fabric, Databricks, Snowflake, Azure
- **Offline**: Works without internet after initial indexing
- **Smart Chunking**: Overlapping chunks for context preservation
- **Code Extraction**: Separate indexing for code examples

## Tools

### doc_search
Semantic search across indexed documentation.

**Parameters:**
- `query` (required): Search query
- `doc_set` (optional): Filter by doc set (e.g., 'fabric', 'azure')
- `top_k` (optional): Number of results (default: 5)
- `include_sources` (optional): Include URLs (default: true)

**Example:**
```json
{
  "query": "How do I create a semantic model in Fabric?",
  "doc_set": "fabric",
  "top_k": 5
}
```

### doc_get_stats
Get statistics about the index.

### doc_list_sets
List available documentation sets.

## Configuration

```json
{
  "client_id": "client-a",
  "platform": "fabric",
  "index_path": "./index.json",
  "doc_sets": ["fabric", "power-bi"],
  "embedding_provider": "openai",
  "openai_api_key": "sk-xxx",
  "chunk_size": 1000,
  "chunk_overlap": 200
}
```

## Indexing Documentation

**Note:** The indexer is a placeholder. Full implementation requires:
- Web crawler for documentation sites
- Sitemap parser
- HTML-to-markdown conversion
- Chunking and embedding generation
- Progress tracking

For production use, you would:

```bash
# 1. Configure your documentation sources
# 2. Run the indexer
npm run index

# 3. The index will be saved to index_path
# 4. Start the server
npm run dev
```

## Running

```bash
export CONFIG_PATH=/path/to/config.json
npm run dev
```

## Embedding Providers

- **OpenAI** (recommended): Requires API key, high quality
- **Mock** (fallback): Random vectors for testing

## Platform Presets

Pre-configured documentation sources:

- **Fabric**: learn.microsoft.com/fabric, dax.guide
- **Databricks**: docs.databricks.com, docs.delta.io
- **Snowflake**: docs.snowflake.com
- **Azure**: learn.microsoft.com/azure
- **AWS**: docs.aws.amazon.com
- **GCP**: cloud.google.com/docs
