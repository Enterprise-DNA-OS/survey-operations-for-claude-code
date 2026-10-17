# Survey operations CLI

Run `node scripts/surveys.mjs --help`. Arguments use `--key=value`. Quote values with spaces. Every command supports `--json`. Human output is the default. Unknown flags and ambiguous records exit 1. Names match without case sensitivity; UUID prefixes also work. Imported source identifiers are unique within a survey, so use UUIDs if source names repeat across surveys.

## Reads

- `surveys`: Read survey owners, purposes and retention settings.
- `questions`: Read the questions and their score scales.
- `responses`: Review the incoming response register.
- `scorecards`: Compare recommendation and satisfaction scores by segment.
- `detractors`: Review low recommendation scores and open follow-up counts.
- `follow-ups`: Prepare this week's recovery work in due-date order.
- `attention`: Find overdue follow-ups and retention reviews.
- `compliance`: Review missing accuracy checks and overdue retention reviews.
- `coverage`: Reconcile response counts, answer counts and questions per response.
- `comments`: Read verbatim text answers with their source response.
- `workload`: Review open and overdue work by owner.
- `history`: Read the CLI change history.
- `response <record>`: full response, answers, actions and notes.
- `insights`: ten real cross-record queries.

## Add a record

`node scripts/surveys.mjs add <kind> --file=record.json --actor="Operator" --json`

| Kind | JSON fields |
|---|---|
| survey | code, name, owner, purpose, retention_days (1 to 3650) |
| question | survey (reference), code, name, kind (nps, csat or text) |
| response | survey, source_id, respondent, segment, received_on, review_due |
| answer | response, question (code within that survey), score for numeric questions or answer_text for text |
| action | response, title, owner, due_on |

Dates use YYYY-MM-DD. Receipt dates, verification dates and closure dates cannot be in the future. NPS is an integer from 0 to 10. CSAT is an integer from 1 to 5. Text answers cannot have scores. A response has at most one answer per question. Blank answers from imports are omitted, never scored as zero.

```json
{"response":"SR-101","title":"Confirm actual delivery date","owner":"Mia","due_on":"2026-10-20"}
```

## Changes and drafts

### log

Read the full response first. Attribute the note to the actual operator.

```bash
node scripts/surveys.mjs log "<response>" --note="<facts>" --actor="<operator>" --json
```

### verify-response

The operator must actually compare the source. Never record a check merely because the import ran.

```bash
node scripts/surveys.mjs verify-response "<response>" --checked=YYYY-MM-DD --reference="<source checked>" --actor="<operator>" --json
```

### review-retention

Read docs/compliance.md. A future review date requires a real purpose, not a way to clear a warning. This does not delete anything.

```bash
node scripts/surveys.mjs review-retention "<response>" --due=YYYY-MM-DD --reason="<lawful ongoing purpose>" --actor="<operator>" --json
```

### close-action

Read the action and response first. Closure requires an accuracy check and a current retention review. Record only work that happened.

```bash
node scripts/surveys.mjs close-action "<action id or title>" --closed=YYYY-MM-DD --outcome="<actual result>" --evidence="<record reference>" --actor="<operator>" --json
```

### import

Read docs/replace-salesforce-feedback-management.md. Inspect the actual headers. Confirm the mapping and score scales, run a dry run, then remove --dry-run to import. Reconcile coverage and scorecards. Never silently reshape ranking or multiple-choice exports.

```bash
node scripts/surveys.mjs import salesforce --file=<responses.csv> --map=<mapping.json> --actor="<operator>" --dry-run --json
```

### export

Choose a new protected output path. Exported comments, audit entries and original rows may identify people. Never send the file.

```bash
node scripts/surveys.mjs export --out=<new-backup.json> --json
```

### weekly-review

The script reads scorecards, follow-ups and compliance. Read those three results and the saved draft. Summarise actions by owner, and keep missing data visible. No message sends.

```bash
node scripts/surveys.mjs weekly-review --json
```

### draft-follow-up

Read the complete response. Verify accuracy and retention first. The draft stays in drafts/. A person chooses recipients, approves wording and sends elsewhere.

```bash
node scripts/surveys.mjs draft-follow-up "<response>" --json
```

Writes run in one database transaction. The import dry run rolls back all records. Exports and drafts are filesystem outputs, not database backups. Set OUTPUT_DIR to control generated output location. Neither emits messages to an external service.
