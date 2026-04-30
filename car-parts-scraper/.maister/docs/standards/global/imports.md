## Import Conventions

### Import Grouping

External packages first, then relative local imports. Separate groups implicitly (no blank line required but natural ordering).

```typescript
import express from 'express';
import { chromium } from 'playwright';

import { parseResults } from './interPartsParser.js';
import { type ScraperConfig } from './types.js';
```

### Type-Only Import Syntax

Use inline `type` keyword for type-only imports rather than separate `import type` statements.

```typescript
import { type SearchResult, parseHtml } from './parser.js';
```
