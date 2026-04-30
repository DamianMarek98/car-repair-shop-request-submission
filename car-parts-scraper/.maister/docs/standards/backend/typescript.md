## TypeScript Conventions

### ESM with .js Extensions

All relative imports must use .js extension even for .ts source files (NodeNext module resolution).

```typescript
import { foo } from './bar.js';
import { parseResults } from '../inter-parts/interPartsParser.js';
```

### Interface Over Type

Use `interface` exclusively for data shapes and configs. Never use `type` aliases for object shapes.

```typescript
export interface ScraperConfig {
  headless: boolean;
  timeout: number;
}

export interface SearchResult {
  name: string;
  price: number;
  available: boolean;
}
```

### Named Async Function Declarations

Core logic uses `async function name()` declarations, not arrow functions.

```typescript
async function login(page: Page): Promise<void> {
  // ...
}

async function scrapeResults(page: Page, query: string): Promise<SearchResult[]> {
  // ...
}
```

### Arrow Functions for Route Handlers

Express route callbacks use arrow function syntax.

```typescript
app.post('/api/scrape/inter-parts', async (req, res) => {
  // ...
});
```

### Direct-Run Guard Pattern

Modules that can run standalone use import.meta.url guard.

```typescript
if (process.argv[1] === new URL(import.meta.url).pathname) {
  main();
}
```
