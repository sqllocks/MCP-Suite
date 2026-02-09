# MCP Diagram Generator Server

Generate professional Visio-style diagrams in multiple formats.

## Features

- **ERD Diagrams**: Erwin-style with crow's foot notation
- **Cloud Architecture**: Azure/AWS resource diagrams
- **Multiple Formats**: SVG, Mermaid, HTML
- **Multiple Styles**: Erwin, Modern, Visio, Minimalist
- **Interactive HTML**: Zoom, pan, search capabilities

## Tools

### generate_erd
Generate Entity-Relationship diagrams with crow's foot notation.

**Parameters:**
- `tables` (required): Array of table definitions
  - `name`: Table name
  - `type`: fact | dimension | bridge | reference | staging
  - `columns`: Array of columns
- `relationships` (optional): Array of relationships
- `output_format` (optional): svg | mermaid | html
- `notation` (optional): crows-foot | idef1x | uml | chen
- `style` (optional): erwin | modern | visio | minimalist
- `include` (optional): data_types, indexes, constraints

**Example:**
```json
{
  "tables": [
    {
      "name": "FactSales",
      "type": "fact",
      "columns": [
        {"name": "SalesKey", "dataType": "INT", "nullable": false, "isPrimaryKey": true},
        {"name": "DateKey", "dataType": "INT", "nullable": false, "isForeignKey": true},
        {"name": "Amount", "dataType": "DECIMAL(18,2)", "nullable": false}
      ]
    },
    {
      "name": "DimDate",
      "type": "dimension",
      "columns": [
        {"name": "DateKey", "dataType": "INT", "nullable": false, "isPrimaryKey": true},
        {"name": "Date", "dataType": "DATE", "nullable": false},
        {"name": "Year", "dataType": "INT", "nullable": false}
      ]
    }
  ],
  "relationships": [
    {
      "from": {"table": "FactSales", "columns": ["DateKey"]},
      "to": {"table": "DimDate", "columns": ["DateKey"]},
      "cardinality": "N:1"
    }
  ],
  "output_format": ["svg", "mermaid"],
  "style": "erwin"
}
```

### generate_cloud_architecture
Generate cloud architecture diagrams.

**Parameters:**
- `nodes` (required): Array of cloud resources
  - `id`: Unique identifier
  - `name`: Resource name
  - `type`: resource | resource-group | subscription | network | security
  - `service`: Service type (e.g., 'vm', 'storage', 'vnet')
  - `connections`: Array of connected node IDs
- `output_format` (optional): svg | mermaid | html
- `style` (optional): erwin | modern | visio | minimalist

**Example:**
```json
{
  "nodes": [
    {
      "id": "rg1",
      "name": "Production-RG",
      "type": "resource-group",
      "service": "Resource Group",
      "connections": []
    },
    {
      "id": "vm1",
      "name": "web-server-01",
      "type": "resource",
      "service": "Virtual Machine",
      "connections": ["vnet1"]
    },
    {
      "id": "vnet1",
      "name": "prod-vnet",
      "type": "network",
      "service": "Virtual Network",
      "connections": []
    }
  ],
  "output_format": ["svg", "html"],
  "style": "modern"
}
```

## Diagram Styles

### Erwin Classic
- Traditional ERD appearance
- Light pastel colors (pink/blue)
- Bold table headers
- Crow's foot notation

### Modern
- Contemporary flat design
- Vibrant colors
- Segoe UI fonts
- Clean lines

### Visio Professional
- Microsoft Visio aesthetic
- Soft colors
- Calibri fonts
- Professional look

### Minimalist
- Monochrome palette
- Simple shapes
- Helvetica fonts
- Maximum clarity

## Output Formats

### SVG
- Scalable vector graphics
- High quality at any size
- Embeddable in docs
- Web-compatible

### Mermaid
- Text-based diagram syntax
- Version-control friendly
- Renderable in markdown
- GitHub compatible

### HTML
- Interactive viewer
- Zoom and pan
- Download as PNG
- Responsive design

## Notation Styles

### Crow's Foot (Default)
Standard notation for cardinality:
- One: Single line
- Many: Crow's foot (three lines)
- Optional: Circle
- Mandatory: Perpendicular line

### IDEF1X
Integration DEFinition notation

### UML
Unified Modeling Language

### Chen
Classic academic notation

## Running

```bash
npm run dev
```

## Example Output

The server generates diagrams and saves them to the configured output directory with timestamps:

```
diagrams/
├── erd-1707234567890.svg
├── erd-1707234567890.mermaid
├── erd-1707234567890.html
├── cloud-arch-1707234568901.svg
└── cloud-arch-1707234568901.html
```

## Use Cases

- Database schema visualization
- Data modeling documentation
- Cloud infrastructure diagrams
- Architecture presentations
- Technical documentation
- Onboarding materials
- Change impact analysis
