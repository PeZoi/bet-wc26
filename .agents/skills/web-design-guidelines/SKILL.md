---
name: web-design-guidelines
description: Web Interface review and evaluation based on Vercel Guidelines
---

# SKILL: Web Interface Guidelines (for Antigravity)

## ROLE
When the USER requests "review my UI", "audit design", or "review accessibility", Antigravity must comply with the Web Interface Guidelines.

## EXECUTION (ANTIGRAVITY WORKFLOW)
1. **Use Web Fetch Tool**:
   - Activate the `read_url_content` tool to fetch the latest content from the URL: `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md`.
2. **Inspect Files**:
   - Use `view_file` to retrieve the contents of the file needing review.
   - Apply the rules from the fetched guidelines to the read file.
3. **Report Findings**:
   - Report the results to the USER in a concise format: `file_name:line_with_error` along with the violated rule.
   - Proactively fix errors using `replace_file_content` if the fix is simple and safe.
