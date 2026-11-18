# Move an Interfolio activity record

Interfolio Faculty Activity Reporting (FAR, formerly Faculty180) supports bulk CSV reporting. [Penn’s implementation FAQ](https://faculty.upenn.edu/wp-content/uploads/FAR-Implementation-Frequently-Asked-Questions-FAQs.pdf) documents the bulk data report; the [Watermark migration guide](https://support.watermarkinsights.com/hc/en-us/articles/29256903755675-Interfolio-Database-Migration) describes receiving a FAR backup CSV and mapping it. Checked 18 November 2026. Exact permissions, sections and headers depend on the institution. This is a mapped import, not a universal raw-backup parser.

1. Ask the FAR administrator for the authorised bulk data export covering selected academics, their departments and teaching, research and service sections. Preserve the original file and its record counts. Export attachment files separately if authorised; this base keeps references only.
2. Split the selected sections into UTF-8 departments.csv, faculty.csv, cycles.csv and activities.csv in a private imports/cutover folder. Keep stable department, faculty and activity identifiers. Assign the reporting period explicitly. Normalize dates to YYYY-MM-DD, activity kinds to teaching/research/service, and hours to decimal numbers. A source spanning periods needs an agreed allocation rule; never invent dates or activity identifiers.
3. Map headers with a JSON file as shown in examples/interfolio-map.json. Each mapping is destination field to exact source header. Files use the names above; empty or missing source headers fail. Existing department and cycle codes can be referenced by new faculty and activities; omit files for those existing records.
4. Preview the one import command below. It performs all inserts and validations, then rolls back. Compare counts by section and sample names, dates, titles and evidence references. Unknown academics, categories and dates fail the whole batch.
5. Repeat without --dry-run. Read imports, activities, evidence-gaps and compliance. Imported activities start draft regardless of source approval labels. Record privacy purpose, retention review and notice basis; inspect supporting evidence and verify activities before submitting a new annual return.
6. Work side by side through a complete annual return and document check. Preserve old reviewed returns in the institution’s archive. Cancel the old service only when the agreed workflows, connections and records have been reconciled.

```bash
npm run faculty -- import interfolio ./imports/cutover --mapping=./imports/field-map.json --batch=cutover-2026 --actor="Coordinator" --dry-run
```

## Destination fields

| File | Required fields | Optional fields |
|---|---|---|
| departments.csv | code, name | none |
| faculty.csv | code, name, department | role, purpose, review_on, review_evidence, notification_basis, notification_evidence |
| cycles.csv | code, name, starts_on, ends_on, due_on | none |
| activities.csv | code, faculty, cycle, kind, title, occurred_on | hours, reference, evidence |

An import bundle needs at least one nonempty supported file. Matching is by existing codes or unambiguous names. Existing activity or faculty codes are refused, never silently updated. Store a new batch key per prepared bundle. Identical content replays without duplication; a reused key with different content is refused. Correction is an explicit update command with an audit record, not re-import over the old record.

The example files are synthetic fixtures using illustrative headers. They are not copied from a customer export and do not establish the vendor’s raw column layout. Keep each institution’s conversion rules and reconciliations with the private cutover work.

## What stays outside this record

Publication harvesting, DOI lookups, attachment binaries, public profiles, sign-in roles, confidential promotion cases, recruitment, tenure decisions, historical approval signatures and live university connections do not carry over automatically. Scope these separately with the institution; keep the existing services until tested. Co-authored research can legitimately have the same reference for multiple academics. Do not merge it automatically or treat counts as work-quality scores.

Enterprise DNA can map and reconcile the exports and build the institution’s version. One setup fee, then a retainer through Omni by Enterprise DNA.
