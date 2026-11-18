# CLI reference

One executable: `npm run faculty -- <command>`. Add `--json` for structured output. Every mutation requires `--actor="Coordinator"`. Options use `--name=value`. Unknown options and ambiguous names fail with exit 1; the latter lists candidates. Exact codes, UUIDs, UUID prefixes and case-insensitive name fragments resolve records. Use codes for imports.

## Read the record

Read commands: departments, faculty, cycles, activities, teaching, research, service, annual-returns, returns-due, evidence-gaps, department-review, compliance, attention, insights, weekly-review, audit, imports. They take no positional arguments. `history FACULTY` includes the full faculty record, activities, returns with frozen copies, notes and audit actions. `--help` lists all commands without opening a database.

## Set up the period

```bash
npm run faculty -- add-department SCI "School of Science" --actor="Coordinator"
npm run faculty -- add-faculty L01 "Taylor Cole" SCI --role=Lecturer --purpose="Annual activity reporting" --review=2027-12-31 --review-evidence="Retention policy 2026" --notice="Direct collection" --notice-evidence="Staff notice 2026" --actor="Coordinator"
npm run faculty -- add-cycle Y2026 "2026 academic year" --start=2026-01-01 --end=2026-12-31 --due=2027-01-31 --actor="Coordinator"
npm run faculty -- open-return L01 Y2026 --actor="Coordinator"
```

Dates are real UTC calendar days in YYYY-MM-DD form. The period end cannot precede its start, and its due date cannot precede its end. The deadline and next privacy review date are institution policy. Faculty may be added without privacy fields for staged imports; the missing fields block later submission.

## Record and verify activities

```bash
npm run faculty -- add-activity T001 L01 Y2026 "Field ecology course" --kind=teaching --date=2026-11-01 --hours=24 --reference=ECO201 --evidence="Course allocation 2026" --actor="Coordinator"
npm run faculty -- verify-activity T001 --actor="Reviewer"
npm run faculty -- update-activity T001 --hours=26 --evidence="Corrected course allocation" --actor="Coordinator"
npm run faculty -- verify-activity T001 --actor="Reviewer"
npm run faculty -- log L01 --note="Confirmed the revised allocation." --actor="Coordinator"
```

Kind is teaching, research or service. Hours are optional nonnegative recorded hours with up to two decimals, never FTE or a performance score. An activity date must fall within its reporting cycle. `add-activity` opens a draft return if needed. A new activity is draft even when evidence is supplied. Evidence and references are text; the CLI never fetches them.

`update-activity ACTIVITY` accepts title, date, hours, reference and evidence. Any update clears verification. `withdraw-activity ACTIVITY --reason="Duplicate record" --actor="Coordinator"` preserves the record but excludes it from the return. Withdrawn activities cannot be reactivated; add the correction with a new code. Submitted or approved returns must be reopened before changing their activities.

## Submit, review and correct

```bash
npm run faculty -- submit-return L01 Y2026 --actor="Coordinator"
npm run faculty -- history L01 --json
npm run faculty -- approve-return L01 Y2026 --reason="Checked against the agreed reporting scope" --actor="Reviewer"
npm run faculty -- reopen-return L01 Y2026 --reason="Correct a teaching allocation" --actor="Coordinator"
```

Submission checks faculty privacy findings and requires every included activity to be verified. A return without activities needs `--declaration="No activities in this reporting period"`. A submission stores the exact faculty, cycle, included activities and declaration. Approval records a human review; it does not make an employment decision. Reopening clears the current frozen copy and keeps its complete earlier value in the append-only audit record.

`review-privacy FACULTY --purpose="..." --review=YYYY-MM-DD --review-evidence="..." --notice="Direct collection, notification or exception basis" --notice-evidence="..." --actor="Coordinator"` updates all five review fields. The next review date must be today or later. A reason or document reference is evidence of what the operator recorded, not automated legal validation.

## Import, export and draft

Read [the switch guide](replace-interfolio-far.md). `import interfolio DIRECTORY --mapping=FILE --batch=KEY --actor="Coordinator" --dry-run` exercises the full import in a transaction and rolls it back. Remove --dry-run to apply. Same batch and content replays safely; changed content with the same batch key fails. Reused natural codes fail rather than overwrite existing records. Import only one-time cutover bundles or new distinct records; this is not a synchronisation engine.

`export` writes every record, frozen copy, audit entry and migration marker to a private JSON file. Evidence attachment binaries remain in their source store. `draft-reminders` writes private JSON drafts for overdue draft returns, never sends. OUTPUT_DIR selects the output root; defaults are exports/ and drafts/ under the repo. Unique filenames prevent overwriting earlier runs. Import files, exports and reports are ignored by Git.

`npm run view` renders three dashboards; `npm run docs` renders private CV drafts, annual returns and department briefs. Both use brand.json and read-only transactions. A submitted or approved annual-return document uses the frozen activity copy. A current CV is a separate working draft and uses currently verified activities.

All writes run in a transaction and use a shared database lock so concurrent coordinators cannot submit while an activity changes. This simple serialization suits small coordinator teams. It is not a staff self-service portal or authenticated multi-tenant service.
