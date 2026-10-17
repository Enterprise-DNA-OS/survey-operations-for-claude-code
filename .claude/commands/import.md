# Bring in a mapped Salesforce survey response export

Read docs/replace-salesforce-feedback-management.md. Inspect the actual headers. Confirm the mapping and score scales, run a dry run, then remove --dry-run to import. Reconcile coverage and scorecards. Never silently reshape ranking or multiple-choice exports.

```bash
node scripts/surveys.mjs import salesforce --file=<responses.csv> --map=<mapping.json> --actor="<operator>" --dry-run --json
```

Use the database result as evidence. Never send, publish or delete anything from this workflow.
