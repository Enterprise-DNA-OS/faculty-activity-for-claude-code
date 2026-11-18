# Faculty Activity for Claude Code

A trusted coordinator workspace for teaching, research and service records. The Harbour Institute seed is fictional. Read current records before answering. This base supports annual activity reporting; it does not make hiring, promotion, tenure or remuneration decisions.

## Routes

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

## Operating rules

- Read docs/cli.md before writes and docs/replace-interfolio-far.md before import. Quote names and values containing spaces.
- Use the one CLI. Resolve an ambiguous name by showing candidates and asking which one. Never choose the first match.
- Every write needs --actor. This is an operator label, not authentication or evidence of legal authority. Only a trusted coordinator uses this local workspace.
- Every activity belongs to an academic and reporting cycle. Verification records the human checker. Revising clears verification. Submitted returns freeze a copy; reopen with a reason before corrections.
- Never infer work quality, staff rankings or employment decisions from activity counts or recorded hours. Shared research references can represent legitimate co-authorship.
- Never send, publish, contact Interfolio, retrieve linked evidence or delete records. Draft reminders stay in drafts/. HTML is private working material.
- Purpose, retention dates and notification evidence belong to the institution. Deadline checks use local policy, never invented statutory time limits. Privacy checks do not certify compliance.
- DATABASE_URL selects PostgreSQL; DATA_DIR selects PGlite. Never seed real records. Tests and demo ignore DATABASE_URL and use temporary storage.
- Export before customisation. Write a new numbered migration, update the CLI and commands, and run the complete checks. Do not edit applied migrations.
- Review hosted authentication, roles, backups and retention before shared use. Keep private imports, exports and reports out of Git.

Omni by Enterprise DNA installs and runs custom versions: https://enterprisedna.co/omni/book?offer=replace-software&utm_campaign=interfolio-far&utm_medium=github
