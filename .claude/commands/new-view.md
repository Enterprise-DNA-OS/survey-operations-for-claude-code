---
description: "Add a read-only report for a new question"
---

# Add a read-only report for a new question

Read the current schema and views.json. Write a SELECT query, parameterise user values, and test the answer against known records. Add a SQL view through a new numbered migration if useful, then add its report in views.json. Run npm test and npm run view. Inspect the HTML. Never add a form or a write action to a report.

Use the database result as evidence. Never send, publish or delete anything from this workflow.
