---
description: "Record a completed follow-up with evidence"
---

# Record a completed follow-up with evidence

Read the action and response first. Closure requires an accuracy check and a current retention review. Record only work that happened.

```bash
node scripts/surveys.mjs close-action "<action id or title>" --closed=YYYY-MM-DD --outcome="<actual result>" --evidence="<record reference>" --actor="<operator>" --json
```

Use the database result as evidence. Never send, publish or delete anything from this workflow.
