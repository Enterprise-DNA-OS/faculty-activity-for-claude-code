---
description: "Import interfolio DIRECTORY mapped CSV exports"
---

# Import interfolio DIRECTORY mapped CSV exports

Read CLAUDE.md and docs/cli.md. Resolve the 2 required arguments from the user’s request. Do not guess missing identifiers.

Run `npm run faculty -- import <arguments> --actor="<operator>"`. Accepted options: --mapping, --batch, --dry-run. Use --json when preparing analysis.

Read docs/replace-interfolio-far.md. Run with --dry-run first; compare counts and mappings. Apply the same batch only after the preview matches the requested import. Imported activities always start unverified.
