# Move the response-review desk from Salesforce Feedback Management

This replaces the internal work of reviewing exported responses, comparing scores and recording follow-ups. It does not replace Salesforce's hosted surveys, invitations, branching, multilingual forms, journeys or distribution services. Decide how new responses will be collected before changing any subscription.

## Export and keep the originals

Salesforce documents **Export Survey Responses**, which produces a CSV with survey questions in its header. Ranking and multiple-selection questions can add another header row. See [Salesforce export help](https://help.salesforce.com/s/articleView?id=sf.task_export_responses.htm&language=en_US&type=5), checked 17 October 2026. Access depends on the user's survey permissions. Export the relevant survey version and date range. Retain an untouched copy in protected storage.

## Map this survey once

Copy `examples/salesforce/mapping.json`. Set the survey code, owner, purpose and reviewed retention period. Map response identifier, received date, optional respondent and segment columns by their exact header text. Map each supported question by its exact header text. Question codes must be unique within the survey. Supported types are NPS 0 to 10, CSAT 1 to 5 and free text.

The example column names are a prepared fixture, not a claim that every Salesforce export uses those metadata headers. If your export does not contain a stable response identifier, join the corresponding response detail export before importing. Use actual source identifiers, never row numbers. Convert dates to YYYY-MM-DD explicitly, preserving the raw file. Do not infer names for anonymous responses. Omit the respondent mapping to keep them anonymous. A missing segment mapping becomes Unassigned.

Ranking, multiple-selection, other score scales and duplicate question labels require a reviewed transformation before import. Flatten extra header rows, give columns unique names and retain their meaning. Do not feed those files directly to this importer. An invalid score, unknown column, repeated source identifier or changed source row rejects the entire import. The fixture deliberately covers only supported question types.

## One import after mapping

```bash
node scripts/surveys.mjs import salesforce --file=examples/salesforce/responses.csv --map=examples/salesforce/mapping.json --actor="Operator" --dry-run --json
node scripts/surveys.mjs import salesforce --file=examples/salesforce/responses.csv --map=examples/salesforce/mapping.json --actor="Operator" --json
```

Run against a fresh migrated database for your own records. The importer creates the mapped survey and questions, then all response and answer records in one transaction. It retains every source column, including unmapped columns. Empty answers are not scored. An unchanged repeat is skipped. A changed row or mapping stops for explicit reconciliation rather than overwriting reviewed information. The dry run rolls everything back, including the audit entries.

## Reconcile before switching

Compare exported and imported response counts, date ranges, question counts, blank answers and score totals for each survey and segment. The CLI's `coverage`, `scorecards`, `response` and `export` commands provide the checks. Read raw rows for several scored and anonymous responses. Imports start unverified, so verify records before drafting a follow-up or closing an action.

Invitation delivery state, response-rate denominators, partial survey sessions, files, translations, branching, CRM automation, lifecycle maps, dashboards and historical follow-up tasks are not imported. Bring additional records across through a separately reviewed mapping. Keep your collection channel running until the replacement has been tested end to end. Enterprise DNA can map your actual exports and build the collection connection into your version.

## Take a portable copy

```bash
node scripts/surveys.mjs export --out=survey-backup.json --json
```

This exports all domain records, notes, original source rows and audit events. It refuses to overwrite a file. The JSON is a portable data export, not a complete PostgreSQL disaster-recovery backup or an automatic restore command. Use your database's backup procedure as well.
