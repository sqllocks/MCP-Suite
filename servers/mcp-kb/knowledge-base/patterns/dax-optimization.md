---
id: dax-filter-optimization
title: DAX Filter Context Optimization
category: patterns
tags: [dax, performance, power-bi]
---

# DAX Filter Context Optimization

## Problem
Measures are slow when filtering across multiple tables.

## Solution
Use CALCULATETABLE with TREATAS for efficient filter propagation.

## Example
```dax
OptimizedMeasure = 
CALCULATE([Total Sales], TREATAS(VALUES(Calendar[Date]), Sales[Date]))
```
