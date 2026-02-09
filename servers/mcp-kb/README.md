# MCP Knowledge Base Server

Personal knowledge management for consulting patterns, runbooks, and lessons learned.

## Features

- **Markdown-Based Storage**: Simple, version-controllable knowledge base
- **Multiple Categories**: Patterns, runbooks, client notes, snippets, lessons learned
- **Full-Text Search**: Search across titles, content, and tags
- **Client Filtering**: Isolate knowledge by client
- **Automatic Indexing**: Loads all markdown files on startup
- **Frontmatter Support**: YAML metadata in markdown files

## Tools

### kb_search
Search knowledge base with filtering.

**Parameters:**
- `query` (required): Search query
- `client` (optional): Filter by client
- `category` (optional): Filter by category
- `top_k` (optional): Number of results (default: 5)

**Returns:**
- Matched entries with scores
- Matched fields (title, content, tags)

**Example:**
```json
{
  "query": "DAX optimization",
  "category": "patterns",
  "top_k": 5
}
```

### kb_add
Add new knowledge entry.

**Parameters:**
- `title` (required): Entry title
- `content` (required): Entry content (markdown)
- `category` (required): Category
- `tags` (optional): Tags array
- `client` (optional): Associated client

**Example:**
```json
{
  "title": "Incremental Refresh Pattern",
  "content": "# Incremental Refresh\n\n## Problem\n...",
  "category": "patterns",
  "tags": ["power-bi", "performance", "refresh"],
  "client": "ClientA"
}
```

### kb_get_runbook
Get specific runbook by topic.

**Parameters:**
- `topic` (required): Runbook topic

**Example:**
```json
{
  "topic": "fabric deployment"
}
```

### kb_list_patterns
List all available patterns.

**Parameters:**
- `category` (optional): Filter by pattern category

### kb_similar_issues
Find similar past issues and solutions.

**Parameters:**
- `description` (required): Issue description
- `client` (optional): Filter by client

## Knowledge Base Structure

```
knowledge-base/
├── patterns/
│   ├── dax-optimization/
│   │   └── filter-context-optimization.md
│   ├── pipeline-patterns/
│   │   └── incremental-load.md
│   └── data-modeling/
│       └── star-schema-design.md
├── runbooks/
│   ├── fabric-deployment.md
│   ├── troubleshooting-refresh-failures.md
│   └── performance-tuning.md
├── client-notes/
│   ├── client-a/
│   │   ├── architecture-decisions.md
│   │   └── lessons-learned.md
│   └── client-b/
│       └── data-dictionary.md
├── snippets/
│   ├── common-dax-patterns.md
│   └── m-query-templates.md
└── lessons-learned/
    ├── 2024-q1-learnings.md
    └── 2024-q2-learnings.md
```

## Markdown Format

### Entry with Frontmatter

```markdown
---
id: dax-filter-optimization
title: DAX Filter Context Optimization
category: patterns
tags:
  - dax
  - performance
  - power-bi
client: ClientA
created: 2024-01-15
modified: 2024-02-07
---

# DAX Filter Context Optimization

## Problem
Measures are slow when filtering across multiple tables...

## Solution
Use CALCULATETABLE with TREATAS pattern...

## Examples
```dax
OptimizedMeasure = 
CALCULATE(
    [Total Sales],
    TREATAS(VALUES(Calendar[Date]), Sales[Date])
)
```

## Related Patterns
- Variable Pattern
- Context Transition
```

## Use Cases

### Pattern Library
Store reusable patterns:
- DAX optimization techniques
- Pipeline design patterns
- Data modeling best practices
- Architecture patterns

### Runbooks
Step-by-step procedures:
- Deployment procedures
- Troubleshooting guides
- Configuration steps
- Migration checklists

### Client Notes
Client-specific information:
- Architecture decisions
- Data dictionaries
- Naming conventions
- Custom requirements

### Snippets
Code templates:
- Common DAX measures
- M query patterns
- SQL snippets
- Python utilities

### Lessons Learned
Post-project insights:
- What worked well
- What to avoid
- Performance tips
- Common pitfalls

## Search Scoring

Matches are scored by field:
- **Title match**: 10 points
- **Tag match**: 7 points
- **Content match**: 5 points

Results are sorted by score, highest first.

## Example Entries

### Pattern Example

```markdown
---
title: Star Schema Design
category: patterns
tags: [data-modeling, kimball, dimensional]
---

# Star Schema Design Pattern

## Problem
Need scalable, performant data model for analytics...

## Solution
Implement star schema with fact and dimension tables...
```

### Runbook Example

```markdown
---
title: Fabric Workspace Deployment
category: runbooks
tags: [deployment, fabric, automation]
---

# Fabric Workspace Deployment Runbook

## Prerequisites
- Azure CLI installed
- Fabric capacity access
- Deployment pipeline configured

## Steps
1. Backup existing workspace
2. Deploy to development
3. Test functionality
4. Deploy to production

## Troubleshooting
**Problem**: Deployment fails with permission error
**Solution**: Check service principal has Contributor role
```

## Configuration

```json
{
  "kb_root": "./knowledge-base",
  "categories": [
    "patterns",
    "runbooks",
    "client-notes",
    "snippets",
    "lessons-learned"
  ],
  "max_results": 20,
  "enable_semantic_search": false
}
```

## Running

```bash
cd servers/mcp-kb
npm install
npm run build
npm run dev
```

## Version Control

Knowledge base is designed to work with Git:
- Markdown files are text-based
- Easy to diff and merge
- Full history tracking
- Collaborative editing

## Best Practices

### Organize by Category
- Use appropriate categories
- Create subcategories as needed
- Keep related content together

### Use Descriptive Titles
- Clear, searchable titles
- Include key terms
- Avoid abbreviations

### Tag Generously
- Multiple relevant tags
- Technology names
- Client names
- Problem domains

### Keep It Updated
- Regular reviews
- Remove outdated content
- Update lessons learned
- Maintain accuracy

### Cross-Reference
- Link related patterns
- Reference runbooks
- Connect concepts
- Build knowledge graph

## Future Enhancements

- Semantic search with embeddings
- Automatic tagging
- Knowledge graph visualization
- Markdown preview
- Full-text indexing
- Version history tracking
