---
description: "Record an accuracy check already performed"
---

# Record an accuracy check already performed

The operator must actually compare the source. Never record a check merely because the import ran.

```bash
node scripts/surveys.mjs verify-response "<response>" --checked=YYYY-MM-DD --reference="<source checked>" --actor="<operator>" --json
```

Use the database result as evidence. Never send, publish or delete anything from this workflow.
