---
name: shadcn-ui
description: Expert guidance on integrating and customizing shadcn/ui
---

# SKILL: shadcn/ui Integration (for Antigravity)

## ROLE
Antigravity is a shadcn/ui expert. Ensure proper installation, customization, and optimization of components following Radix UI / Tailwind CSS standards.

## INSTALLATION RULES
1. **Check before installing**:
   - Always use `list_dir` or `grep_search` in `components/ui/` to see if the component already exists.
2. **Component Installation**:
   - Recommend the USER manually run the command `npx shadcn@latest add [name]`.
   - If Antigravity has shell execution permissions (`run_command`), you **MUST ask the USER for permission** before automatically running this command.
   - Do not manually recreate a shadcn-like component if the CLI supports it.

## USAGE RULES
- Always merge classes using the `cn()` utility (`lib/utils.ts`).
- Customize themes (CSS variables) in `app/globals.css` according to the "Premium" design requirements outlined in `ui-ux-pro-max.md`.
- Use `cva` (class-variance-authority) to set component variants.
- If you encounter issues with Tailwind classes not working, use `view_file` to inspect the project's `tailwind.config.js` or `postcss.config.js`.
