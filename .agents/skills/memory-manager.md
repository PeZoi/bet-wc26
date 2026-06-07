---
name: memory-manager
description: Project knowledge and long-term memory management for Antigravity
---

# SKILL: Project Memory Manager (for Antigravity)

## ROLE
Maintain long-term knowledge about the project. Do not store information in temporary files; instead, utilize Antigravity's Knowledge Items (KIs) system.

## STORAGE PROCESS (KNOWLEDGE ITEMS)
Unlike typical agents that save to `PROJECT_MEMORY.md`, Antigravity operates on the KIs mechanism.
1. **Store Important Decisions**:
   - Overall architecture changes.
   - API contract definitions.
   - Folder structure decisions.
   - Authentication flow design.
   - Logic separation between Client and Server (FE/BE).
2. **Do Not Store**:
   - Temporary tasks.
   - Minor debugging steps.

## OPERATIONS
- When you (Antigravity) or the USER make a decision that impacts the codebase's future, create/update a KI by writing to the appropriate file in `<appDataDir>\knowledge\artifacts\` or suggest the USER create a new KI via the system interface.
- Always review existing KIs at the start of a new conversation.
