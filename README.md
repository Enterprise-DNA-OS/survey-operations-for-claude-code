# Survey Operations for Claude Code

Survey responses, branch scorecards and recovery work in a database you own. Free MIT code from Enterprise DNA. Works with Claude Code, Codex, OpenCode or Cursor.

| Do it yourself | We customise it | We run it for you |
|---|---|---|
| Free code. Clone, install, run the demo and map your export. Database hosting and coding-agent costs are yours. | Your survey questions, score rules, record controls, collection connection and Salesforce data mapping. [Get your version built](https://enterprisedna.co/omni/book?offer=replace-software&utm_campaign=salesforce-feedback-management&utm_medium=readme). | Installed and operated through Omni by Enterprise DNA. One setup fee, then a retainer. [Book a call](https://enterprisedna.co/omni/book?offer=replace-software&utm_campaign=salesforce-feedback-management&utm_medium=readme). |

## The desk after the survey

The manager needs to know which low scores have no owner, which promised callbacks are overdue and whether a branch's satisfaction result rests on two answers or two hundred. This build keeps responses, questions, scores, follow-ups and their evidence together. It produces the weekly review from actual records.

Salesforce Feedback Management Starter lists US$13,500 per organisation per month, billed annually: US$162,000 a year, before the underlying Service Cloud edition. This is public list pricing, not a verified customer's invoice or a saving this build promises. [Vendor pricing](https://www.salesforce.com/service/customer-service-operations/feedback-management/), checked 17 October 2026.

The free build covers internal review of exported responses. Salesforce's hosted survey collection and distribution are a separate scope. Keep a working collection channel until a replacement has been built and checked.

## Quick start

Node 20 or newer. The embedded demo needs no database server.

```bash
git clone https://github.com/Enterprise-DNA-OS/survey-operations-for-claude-code.git
cd survey-operations-for-claude-code
npm install
npm test
npm run demo
```

The demo uses `.data/demo`, ignores DATABASE_URL and includes fictional respondents, low scores, an overdue follow-up and an overdue retention review. It does not change your default database. Later demo reads on Linux or macOS:

```bash
DATA_DIR=.data/demo node scripts/surveys.mjs scorecards
DATA_DIR=.data/demo node scripts/surveys.mjs response SR-101 --json
DATA_DIR=.data/demo npm run view
```

On PowerShell, set `$env:DATA_DIR='.data/demo'`, then run without the DATA_DIR prefix. For your own records, use a fresh DATA_DIR and `npm run migrate` without seed. A controlled PostgreSQL database can be selected with DATABASE_URL. Keep connection settings out of git.

## Recurring work

| Read survey owners, purposes and retention settings | `/surveys` |
| Read the questions and their score scales | `/questions` |
| Review the incoming response register | `/responses` |
| Compare recommendation and satisfaction scores by segment | `/scorecards` |
| Review low recommendation scores and open follow-up counts | `/detractors` |
| Prepare this week's recovery work in due-date order | `/follow-ups` |
| Find overdue follow-ups and retention reviews | `/attention` |
| Review missing accuracy checks and overdue retention reviews | `/compliance` |
| Reconcile response counts, answer counts and questions per response | `/coverage` |
| Read verbatim text answers with their source response | `/comments` |
| Review open and overdue work by owner | `/workload` |
| Read the CLI change history | `/history` |
| Read one complete response file | `/response` |
| Answer ten questions across the records | `/insights` |
| Add a survey, question, response, answer or action | `/add` |
| Record a factual response note | `/log` |
| Record an accuracy check already performed | `/verify-response` |
| Record a reasoned retention review | `/review-retention` |
| Record a completed follow-up with evidence | `/close-action` |
| Bring in a mapped Salesforce survey response export | `/import` |
| Export every record and the original source rows | `/export` |
| Draft the Monday survey review | `/weekly-review` |
| Draft an internal follow-up working note | `/draft-follow-up` |
| Render the read-only dashboards | `/view` |
| Render branded working papers | `/documents` |
| Make the process fit this business | `/customise` |
| Add a read-only report for a new question | `/new-view` |

## Ten questions across your records

`node scripts/surveys.mjs insights` executes all ten today. These are cross-record questions the free desk answers, not a claim that a configured Salesforce report can never answer them.

1. Which survey segments have the lowest recommendation scores?
2. Which low recommendation scores have no follow-up action?
3. Which owners have overdue follow-ups?
4. Which overdue actions belong to low-scoring responses?
5. Which response records need a retention review?
6. Which responses have not had an accuracy check?
7. Which questions have missing answers?
8. Which segments have the lowest satisfaction percentage?
9. Which resolved follow-ups have evidence?
10. Which comments accompany low recommendation scores?

## Your first hour: ten things to ask for

1. Show recommendation scores by branch, with the answer counts.
2. Show low scores without an open follow-up.
3. Read the full SR-101 response and its actions.
4. List overdue recovery work by owner.
5. Which source records need an accuracy check?
6. Which retention reviews are overdue?
7. Draft the Monday review from scores, follow-ups and record checks.
8. Render a working paper for each survey.
9. Test our mapped response export without changing the database.
10. Add our service region and a read-only regional report.

## Import and portable export

```bash
node scripts/surveys.mjs import salesforce --file=examples/salesforce/responses.csv --map=examples/salesforce/mapping.json --actor="Operator" --dry-run --json
node scripts/surveys.mjs import salesforce --file=examples/salesforce/responses.csv --map=examples/salesforce/mapping.json --actor="Operator" --json
node scripts/surveys.mjs export --out=survey-backup.json --json
```

Map exact question headers and metadata once, then import in one command. The importer preserves original rows, skips unchanged repeats and stops on changed sources. NPS, CSAT and text questions are supported. Ranking and multiple-selection exports need a reviewed transformation. No live Salesforce access is needed. Read the [switch guide](docs/replace-salesforce-feedback-management.md) before using a real export.

## Branded views and working papers

Set the name, logo and colours in `brand.json`. `npm run view` renders the week, service-recovery and privacy-review dashboards. `npm run docs` renders survey briefs, follow-up working papers and retention reviews. Output is read-only HTML. Follow-up drafts remain in `drafts/`. Nothing sends.

## Record controls and limits

The [record checks](docs/compliance.md) cite New Zealand privacy principles for accuracy, retention and security. The demo retention periods are business-policy examples, not legal deadlines. Closing a follow-up requires a recorded accuracy check, a current retention review, an outcome and evidence. These checks do not certify compliance.

No collection forms, mobile app, offline sync, invitations, CRM automation or response-rate calculation are included. [Why no front end](docs/why-no-front-end.md) explains the boundary. Source files, reports, drafts and backups can contain personal information. Shared use requires reviewed access and backup arrangements. Actor text is not authenticated identity; a database owner can change data and the audit history is not tamper-proof.

## Verification

`npm test` uses a temporary database, exercises every domain command, checks NPS and CSAT denominators, invalid scores and dates, cross-survey constraints, import rollback, dry runs, repeated and changed source rows, exports, drafts and escaped HTML. CI covers Windows and Linux on Node 20 and 22, plus PostgreSQL 17. TEST_DATABASE_URL must name a disposable test database; the suite creates and removes its own schema. The demo runs with no external service.

## Licence

MIT. Copyright (c) 2026 Enterprise DNA. Salesforce is a trademark of Salesforce, Inc. This independent project is not affiliated with or endorsed by Salesforce.
