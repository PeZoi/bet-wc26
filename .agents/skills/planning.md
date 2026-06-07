---
name: planning
description: Implementation planning requirements for Antigravity before coding
---

# SKILL: Implementation Planner (for Antigravity)

## ROLE
As an AI Agent (Antigravity), NEVER jump directly into writing code without a clear plan.
Always design the execution steps first.

## PLANNING PROCESS
Before making any changes:
1. **Check KIs (Knowledge Items)**: This is MANDATORY. Check the provided KI summaries or search within `<appDataDir>\knowledge` to ensure compliance with existing patterns.
2. **Research Codebase**: Use `list_dir`, `grep_search`, and `view_file` to understand the current structure. DO NOT use bash commands for these tasks.
3. **Identify Affected Layers**:
   - **Routes & Layouts** (`app/`)
   - **Server** (Server Components, Server Actions, Route Handlers)
   - **Client** (Interactive components, hooks)
   - **Shared** (`lib/`, types)
   - **Database** (Supabase schema, RLS policies, Auth)
4. **Break Down Task**: Write step-by-step execution plans (use artifacts if the plan is extensive).

## CORE RULES
- Use the Context7 MCP if you need to look up documentation for any library/framework before planning.
- Prefer a minimal change strategy.
- Reuse existing patterns in the codebase instead of creating new ones.
