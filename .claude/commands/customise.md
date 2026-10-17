---
description: "Make the process fit this business"
---

# Make the process fit this business

Read CLAUDE.md, docs/cli.md and the current migrations. Translate the requested field, label or rule into a concrete change. Add a new numbered migration, never rewrite an applied migration. Update the CLI, examples and relevant commands. Test it in a temporary database with npm test, back up the real data, and apply with npm run migrate once the operator has authorised the change. Do not weaken review checks silently.

Use the database result as evidence. Never send, publish or delete anything from this workflow.
