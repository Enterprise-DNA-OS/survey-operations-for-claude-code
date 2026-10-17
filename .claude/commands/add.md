# Add a survey, question, response, answer or action

Read docs/cli.md for the exact fields. Prepare the JSON from supplied facts, read the related records, run once, then read back. Do not invent names, scores or dates.

```bash
node scripts/surveys.mjs add <survey|question|response|answer|action> --file=<record.json> --actor="<operator>" --json
```

Use the database result as evidence. Never send, publish or delete anything from this workflow.
