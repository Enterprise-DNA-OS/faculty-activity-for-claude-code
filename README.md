# Faculty Activity for Claude Code

Keep teaching, research and service records together. Review evidence, close annual activity returns and produce private CV drafts from a database you own. This is a working base for the activity-record part of Interfolio Faculty Activity Reporting, formerly Faculty180.

## Three ways to use it

**Do it yourself.** Free, open source under MIT. Open this folder in Claude Code, Codex, OpenCode or Cursor and use the commands below.

**We customise it.** Enterprise DNA maps your Interfolio records, builds your reporting categories and prepares your documents. Your version can include a web front end or a different stack. One setup fee, then a retainer.

**We run it for you.** Omni by Enterprise DNA installs, connects and operates your version. One setup fee, then a monthly retainer. [Book a 30-minute call](https://enterprisedna.co/omni/book?offer=replace-software&utm_campaign=interfolio-far&utm_medium=github).

The supplier’s [May 2024 UK G-Cloud pricing schedule](https://assets.applytosupply.digitalmarketplace.service.gov.uk/g-cloud-14/documents/711237/585850858708934-pricing-document-2024-04-17-0852.pdf) lists Faculty Activity Reporting at GBP 64,935 annually for its first academic-staff band, excluding VAT. That is a historical UK schedule, not a current NZ or Australian invoice or quote. The current product page gives no price figure. See [research and scope](docs/research.md).

## Quick start

Node 22 or newer on Windows, Linux or macOS.

```bash
npm install
npm test
npm run demo
```

The demo creates a temporary fictional database, prints three actual command runs and renders reports. It ignores DATABASE_URL. For a persistent fictional workspace, run npm run migrate, npm run seed, then npm run faculty -- weekly-review. For real records, migrate only. DATABASE_URL selects PostgreSQL; otherwise DATA_DIR selects embedded PGlite. Remote TLS certificates are verified.

## What ships

36 slash commands, three printable dashboards and three document types: academic CV drafts, annual activity returns and department briefs. Edit brand.json for your institution’s name, colours and logo. [CLI reference](docs/cli.md), [privacy and policy checks](docs/compliance.md), [screen boundaries](docs/why-no-front-end.md).

The database holds departments, academics, reporting cycles, activities, annual returns, notes, import batches and operator actions. Evidence is a reference, not a copied file. Every included activity must be verified before submission. An empty return requires a declaration. Submission records a frozen copy. Correction reopens it with a reason, and the earlier copy stays in the audit trail. Failed operations and imports roll back completely.

## Bring your records across

```bash
npm run faculty -- import interfolio ./imports/cutover --mapping=./imports/field-map.json --batch=cutover --actor="Coordinator" --dry-run
```

Repeat without --dry-run after comparing the records and counts. FAR supports bulk CSV reporting, but institutions configure their own sections and fields. The [switch guide](docs/replace-interfolio-far.md) explains splitting selected reports, field mapping, date and category normalization, and the review needed before use. The examples are synthetic mapping fixtures, not a claimed universal vendor export. Importing is one command after that preparation.

## Ten questions to ask today

Run npm run faculty -- insights. These are implemented joins over your records. Interfolio also supports custom reports; no claim is made that its reporting cannot answer them. Recorded activities are not measures of staff performance.

1. Which overdue returns also have missing activity evidence?
2. Which research references appear under more than one academic?
3. Which departments have teaching records still awaiting verification?
4. Which returns contain teaching but no recorded research?
5. Who has an open return with no recorded activities?
6. Which academics with overdue returns also need a retention review?
7. Which draft returns have verified activities and no privacy findings?
8. How much recorded service time sits in each department and cycle?
9. Which submitted returns are waiting for coordinator approval?
10. Which departments have the most unfinished annual returns?

## Your first hour: ten things to ask for

1. Show the annual returns past their due date.
2. Find research outputs with missing evidence.
3. Show teaching records awaiting verification.
4. Read one academic’s full activity history.
5. Record a service contribution with its evidence reference.
6. Verify an activity after checking its source.
7. Prepare an annual return and inspect its frozen copy.
8. Draft reminders without sending them.
9. Put our name on the private department brief.
10. Add our reporting field with /customise and a report with /new-view.

## Commands

| Command | Job |
|---|---|
| /departments | Read departments |
| /faculty | Read academic staff and review dates |
| /cycles | Read reporting periods |
| /activities | Read the complete activity register |
| /teaching | Review teaching activities |
| /research | Review research outputs |
| /service | Review service contributions |
| /annual-returns | Review annual return status |
| /returns-due | Find draft returns past their deadline |
| /evidence-gaps | Find missing or unverified evidence |
| /department-review | Read completion by department |
| /compliance | Check privacy records and local deadlines |
| /attention | Review overdue returns and evidence gaps |
| /insights | Answer ten joined activity questions |
| /weekly-review | Combine return deadlines, evidence and compliance |
| /history | Read one academic and their activity, return and note history |
| /audit | Read the operator trail |
| /imports | Reconcile imported batches |
| /add-department | Add CODE NAME |
| /add-faculty | Add CODE NAME DEPARTMENT |
| /add-cycle | Add CODE NAME and reporting dates |
| /open-return | Open FACULTY CYCLE annual return |
| /add-activity | Add CODE FACULTY CYCLE TITLE |
| /update-activity | Revise ACTIVITY and clear verification |
| /verify-activity | Verify ACTIVITY against its recorded evidence |
| /withdraw-activity | Withdraw ACTIVITY with a reason |
| /submit-return | Submit FACULTY CYCLE with a frozen copy |
| /approve-return | Approve FACULTY CYCLE after human review |
| /reopen-return | Reopen FACULTY CYCLE for correction |
| /review-privacy | Review FACULTY purpose, retention and notice |
| /log | Add an operational note for FACULTY |
| /import | Import interfolio DIRECTORY mapped CSV exports |
| /export | Export all records as structured JSON |
| /draft-reminders | Draft overdue-return reminders without sending |
| /customise | Add a field or change a reporting rule |
| /new-view | Add a private read-only report |

## Operating scope

This is a trusted coordinator’s local record, not an authenticated staff portal. Operator labels are not identities. Row security is enabled and public grants are removed; hosted authentication and least-privilege roles need configuration for shared use. Protect and review exports and reports before sharing them. Privacy checks support review and do not certify compliance.

The base does not harvest scholarly databases, host public staff profiles, run recruitment, decide promotion or tenure, score staff performance, send messages or store attachment binaries. Those source systems and decisions remain with the institution. Keep existing services until any agreed replacement connections have been tested.

Tests exercise annual-return transitions, verification invalidation, frozen copies, import replay and rollback, evidence checks, exports, drafts and escaped HTML. The workflow checks Windows, Linux and PostgreSQL 16; inspect the workflow run for execution evidence.

MIT. Copyright (c) 2026 Enterprise DNA. Not affiliated with Elsevier or Interfolio.
