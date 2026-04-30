## Backend Patterns

### Scraper+Parser Module Pair

Each vendor gets two files: `{name}Scraper.ts` (Playwright browser automation) + `{name}Parser.ts` (Cheerio HTML parsing). Both live in a kebab-case directory under src/.

```
src/inter-parts/
  interPartsScraper.ts   # Playwright automation
  interPartsParser.ts    # Cheerio HTML parsing
```

### JSON Response Envelope

All API responses use consistent envelope. Success returns data array, failure returns empty array with error message.

```typescript
// Success
res.json({ success: true, data: results });

// Failure
res.json({ success: false, data: [], error: 'Connection timeout' });
```

### Try-Catch with instanceof Error

Error handling uses instanceof check for safe message extraction.

```typescript
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  res.json({ success: false, data: [], error: message });
}
```

### Console Logging with Bracket Tags

Prefix all log messages with context in format `[Layer/Module]`.

```typescript
console.log('[API/inter-parts] Starting scrape...');
console.log('[Scraper/apcat] Login successful');
console.error('[Parser/auto-partner] Failed to parse row');
```
