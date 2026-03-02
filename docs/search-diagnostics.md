# Search Diagnostics & Fixes

## Summary
Two issues were investigated and fixed:
- The location search dropdown could feel like it “opens twice” because the UI could open before results were ready, and multiple instances could be open at the same time.
- Queries like “ghanta ghar kanpur” produced poor/empty results because OpenStreetMap Nominatim returns no direct match for that full phrase.

This work introduces debounced searching, request cancellation, singleton dropdown behavior, and better empty/error UX.

## Root Cause Analysis

### 1) “Search opens twice”
Observed causes in the previous implementation:
- The dropdown state was toggled from multiple sources:
  - Immediate open on every keystroke.
  - A second open when results arrived.
  This created a perception of two “opens” during a single interaction.
- When multiple `LocationSearch` instances exist on the site (e.g., Home hero + another UI), each instance could independently open, making the UI feel duplicated.

### 2) “ghanta ghar kanpur” returns inaccurate results
The upstream geocoder (Nominatim) returns an empty array for that full query.
Example (direct request):
`https://nominatim.openstreetmap.org/search?format=json&q=ghanta%20ghar%20kanpur&limit=8&addressdetails=1&countrycodes=in`
→ `[]`

That means the UI needs a fallback strategy to still provide useful suggestions (e.g., return city results for “kanpur”).

## Implemented Solutions

### Debounce (300–500ms)
- Added a 350ms debounce using [useDebouncedValue.ts](file:///Users/adnanaslam/github-workspace/zero-broker/src/hooks/useDebouncedValue.ts).

### Request cancellation for outdated queries
- Each debounced query creates an AbortController and aborts any in-flight request before starting a new one.
- Implemented in [LocationSearch.tsx](file:///Users/adnanaslam/github-workspace/zero-broker/src/components/property/LocationSearch.tsx).

### Event listener cleanup
- Outside click and Escape handlers use `pointerdown` + `keydown` and are removed on unmount.
- Implemented in [LocationSearch.tsx](file:///Users/adnanaslam/github-workspace/zero-broker/src/components/property/LocationSearch.tsx).

### Singleton dropdown behavior
- A module-level “active dropdown closer” ensures only one `LocationSearch` dropdown is visible globally.
- Implemented in [LocationSearch.tsx](file:///Users/adnanaslam/github-workspace/zero-broker/src/components/property/LocationSearch.tsx).

### Better results for “ghanta ghar kanpur”
- Added a fallback strategy in the API layer:
  - Try full query.
  - If empty, search the last token as a city (“kanpur”) and show those results with a clear UX hint.
- Implemented in [locationSearchService.ts](file:///Users/adnanaslam/github-workspace/zero-broker/src/lib/locationSearchService.ts).

### Error handling, loading, empty states
- Added user-friendly error message when requests fail.
- Added “Searching…” state and “No results found.” empty state.
- Implemented in [LocationSearch.tsx](file:///Users/adnanaslam/github-workspace/zero-broker/src/components/property/LocationSearch.tsx).

## Benchmarks (before/after)
These are reproducible, code-level metrics gathered via tests:
- **Repeated identical query**:
  - Before: could trigger repeated network calls when users re-focus and type the same query.
  - After: identical query is served from in-memory cache for 10 minutes.
  - Verified by [locationSearchService.perf.test.ts](file:///Users/adnanaslam/github-workspace/zero-broker/src/lib/locationSearchService.perf.test.ts).

## Testing Protocol (manual cross-browser)
Recommended manual verification checklist:
- Desktop: Chrome/Firefox/Safari/Edge
  - Type quickly and slowly; confirm one dropdown and no duplicated overlays.
  - Confirm only one network request per debounced query in DevTools Network.
  - Confirm “ghanta ghar kanpur” shows fallback city results for Kanpur.
- Mobile: iOS Safari / Android Chrome
  - Confirm dropdown works with touch (pointerdown).
  - Confirm results still show under slower networks.
- Network throttling (DevTools): 3G/4G/WiFi
  - Confirm “Searching…” renders while waiting.
  - Confirm abort/cancellation prevents outdated results popping in.

