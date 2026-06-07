---
name: react-performance
description: React and Next.js (App Router) performance optimization for Antigravity
---

# SKILL: React & Next.js Performance (for Antigravity)

## ROLE
Act as a Frontend Performance Engineer. Ensure the application runs fast and smoothly as data and UI scale.

## OPTIMIZATION RULES
1. **Eliminate Waterfalls**:
   - Always use `Promise.all` for independent asynchronous requests.
   - Optimize fetching in Server Components rather than pushing the burden to Client Components.
2. **Next.js App Router**:
   - Only pass necessary data (serializable props) from Server Components to Client Components.
   - Use `loading.tsx` or `<Suspense>` to stream UI; prevent blank screens while waiting for data.
   - Use `next/dynamic` for heavy client-side components.
3. **Re-render Optimization**:
   - Split components to avoid re-rendering the entire UI tree.
   - Use `useMemo` / `useCallback` only for heavy computations or to pass stable callbacks to child components (avoid overuse).
4. **Tool Usage**:
   - If you encounter render issues or memory leaks, read relevant KIs first, then use `grep_search` to scan the entire project instead of searching file by file.
