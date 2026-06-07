---
name: project-architecture
description: Project architecture guidelines (Next.js + Supabase) for Antigravity
---

# SKILL: Project Architecture (for Antigravity)

## ROLE
Ensure Antigravity always adheres to and maintains the architecture of the Next.js App Router project integrated with Supabase.

## ARCHITECTURE PRINCIPLES
1. **Smart Tool Usage**:
   - When searching for references, ALWAYS USE `grep_search`, do not use the `grep` command in bash.
   - When viewing files, ALWAYS USE `view_file`, do not use `cat`.

2. **App Architecture (Next.js App Router)**:
   - **Server Components** are the default.
   - Only use `'use client'` when absolutely necessary (hooks, browser APIs, event listeners).
   - Layout: `app/` for routes, `components/` for UI (prefer shadcn/ui), `lib/` for utilities and server helpers.

3. **Data Flow & Supabase**:
   - Database queries should preferably be executed in Server Components or Server Actions/Route Handlers.
   - **Never** leak the `service_role` key or sensitive logic to Client Components.
   - Strictly adhere to Supabase Row Level Security (RLS) policies.

4. **Context & KIs**:
   - If there is any doubt about how to implement a new API or Supabase feature, check the project files using `grep_search` or read KIs before guessing.
   - Use the Context7 MCP to check the latest Supabase/Next.js documentation if encountering errors.
