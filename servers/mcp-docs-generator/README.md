# MCP Docs Generator Server

Generate professional consulting-grade documentation from workspace exports.

## Features

- **Multiple Templates**: McKinsey, BCG, Bain, Deloitte, Standard
- **Multiple Formats**: DOCX, PPTX, XLSX, PDF, HTML
- **Deep Analysis**: Performance, security, best practices
- **Data Catalogs**: Comprehensive spreadsheet catalogs
- **Comparisons**: Compare workspace versions
- **Recommendations**: Strategic recommendations with priorities

## Tools

### generate_full_documentation
Generate complete documentation suite.

**Parameters:**
- `workspace_path` (required): Path to workspace directory
- `output_path` (required): Output directory
- `template` (optional): Template style (mckinsey, bcg, bain, deloitte, standard)
- `formats` (optional): Output formats (docx, pptx, xlsx)
- `client_name` (optional): Client name
- `project_name` (optional): Project name

**Generates:**
- Executive-Summary.docx
- Technical-Architecture.docx
- Recommendations.pptx
- Data-Catalog.xlsx

### analyze_workspace
Deep analysis with insights and recommendations.

**Parameters:**
- `workspace_path` (required): Path to workspace directory
- `checks` (optional): Analysis checks (performance, security, best-practices)
- `severity_threshold` (optional): Minimum severity (low, medium, high, critical)

**Returns:**
- Summary statistics
- Findings by category/severity
- Recommendations with priorities
- Performance metrics

### generate_catalog
Create comprehensive data catalog.

**Parameters:**
- `workspace_path` (required): Path to workspace directory
- `output_path` (required): Output file path (.xlsx)
- `include_samples` (optional): Include sample data
- `include_profiling` (optional): Include data profiling

**Generates:**
- Multi-sheet Excel workbook with items, catalog, relationships

### generate_comparison_report
Compare two workspace versions.

**Parameters:**
- `baseline` (required): Baseline workspace path
- `current` (required): Current workspace path
- `output` (required): Output file path

**Returns:**
- Changes summary (added, modified, removed)
- Impact analysis
- Risk assessment

## Document Templates

### McKinsey Style
- Pyramid principle structure
- Signature blue/navy colors
- Executive-first approach
- Key findings upfront

### BCG Style
- Green brand colors
- Matrix-based analysis
- Strategic recommendations
- Growth-focused narrative

### Bain Style
- Red brand colors
- Results-oriented structure
- Action-focused recommendations
- Implementation roadmap

### Standard Style
- Professional blue colors
- Comprehensive structure
- Balanced technical/executive content
- Flexible formatting

## Example Usage

```json
{
  "tool": "generate_full_documentation",
  "arguments": {
    "workspace_path": "/path/to/workspace",
    "output_path": "/path/to/output",
    "template": "mckinsey",
    "formats": ["docx", "pptx", "xlsx"],
    "client_name": "Acme Corp",
    "project_name": "Data Platform Modernization"
  }
}
```

## Running

```bash
export CONFIG_PATH=/path/to/config.json
npm run dev
```

## Output Structure

```
output/
├── Executive-Summary.docx       # 5-10 pages
├── Technical-Architecture.docx  # 20-30 pages
├── Recommendations.pptx         # 15-20 slides
└── Data-Catalog.xlsx            # Multi-sheet workbook
```

## Analysis Categories

### Performance
- Large files/tables
- Excessive item counts
- Missing indexes
- Slow measures

### Security
- Permission reviews
- RLS configuration
- Sensitivity labels
- Shared workspaces

### Best Practices
- Naming conventions
- Documentation completeness
- Code complexity
- Organization structure
