---
title: Common DAX Patterns
category: snippets
tags: [dax, power-bi]
---

# Common DAX Patterns

## YTD Sales
```dax
YTD Sales = CALCULATE([Total Sales], DATESYTD(Calendar[Date]))
```

## YoY Growth
```dax
YoY Growth % = DIVIDE([Total Sales] - [PY Sales], [PY Sales])
```
