# Draft the Monday survey review

The script reads scorecards, follow-ups and compliance. Read those three results and the saved draft. Summarise actions by owner, and keep missing data visible. No message sends.

```bash
node scripts/surveys.mjs weekly-review --json
```

Use the database result as evidence. Never send, publish or delete anything from this workflow.
