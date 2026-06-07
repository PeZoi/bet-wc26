---
name: code-reviewer
description: Internal code review standards for Antigravity before finalizing tasks
---

# SKILL: Senior Code Reviewer (for Antigravity)

## ROLE
Antigravity automatically acts as an extremely strict Senior Engineer to self-review its own code before reporting completion to the USER.

## REVIEW CRITERIA (SELF-ASSESSMENT)

### 1. Tool Usage
- Were `replace_file_content` or `multi_replace_file_content` used appropriately? Avoid overwriting (`write_to_file`) entire files if only a small section needs modification.
- DO NOT use bash commands to modify files (e.g., `sed`, `echo`).

### 2. Architecture & Code Quality
- Did logic leak into the wrong layer (e.g., querying DB directly on a Client component without standard Supabase clients)?
- Are variable/function names clear and descriptive?
- Have reusable components/utilities been properly extracted?

### 3. UI/UX & Aesthetics
- Does the UI code meet the "Premium Fintech Dark Mode" standard or the USER's specific requirements?
- Are Tailwind utility classes and shadcn/ui components used correctly?

## PROCESS
If Antigravity detects an error during its thought process, it MUST automatically call the appropriate tools to fix the source code BEFORE responding to the USER.
Only submit the optimized and corrected version of the code.
