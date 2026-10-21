---
target: expensa admin UI
total_score: 18
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
target_identity: "file:/Users/rafa/Documents/github/expensa/src/app/components"
timestamp: 2026-10-21T14-10-40Z
slug: src-app-components
---
Method: dual-agent (A: design review · B: detector). No browser: A reviewed source only; B ran the CLI detector only (0 findings).

## Design Health Score: 18/40 (Poor)
| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 2 | AI extraction failure swallowed (UploadExpensePage.tsx:325); delete failure reverts silently; new row not highlighted after save |
| 2 | Match real world | 3 | Good domain terms; "Workspace", "Slug", "$" icon leak |
| 3 | User control & freedom | 2 | Cancel discards AI-filled form without guard; second drop overwrites edits |
| 4 | Consistency & standards | 1 | violet/purple/cyan accents; EN/ES mixed copy; three page shells; Monto vs Importe |
| 5 | Error prevention | 2 | Incomplete material lines dropped silently; unit price label always (S/) |
| 6 | Recognition over recall | 2 | Icon-only gear/+ buttons; placeholder-as-label filters |
| 7 | Flexibility & efficiency | 1 | No shortcuts, sort, bulk, save-and-add-another; fixed 10 rows |
| 8 | Aesthetic & minimalist | 2 | Crowded list header; card-in-card glow shadows |
| 9 | Error recovery | 1 | Errors without retry/cause; save error far from field |
| 10 | Help & documentation | 2 | Good AI copy; nothing explains Etapa/Nivel/Situación fiscal |

## Design specificity
Domain logic is specific; visual layer is a generic SaaS template ("finolis" logo, not Mezco); screens look like different kits. Detector: 0 findings across 16 files (rules target AI-slop patterns; real issues are consistency/a11y/states).

## Priority issues
- [P0] Unlabeled form fields (Field htmlFor never passed) and keyboard-unreachable file input — harden
- [P1] Silent failures in money path (AI extraction, delete, dropped material lines, only first file read) — harden
- [P1] Mixed-currency totals shown as one number (ExpensesClient.tsx:394, MaterialsClient rows[0].currency) — clarify
- [P1] No design system: 3 accents, 2 languages, 3 page shells, "Workspace" naming — polish/clarify
- [P2] Upload not built for phones on site: no camera capture, cramped grids, hover-only remove, save at bottom — adapt

## Persona red flags
Alex: no save-and-add-another, no bulk upload/sort/select, new row may land on page 3, Summary opens new tab per click.
Sam: P0 above; modals without focus trap; low-contrast greys and white-on-cyan pagination; 7 links per table row.
Casey: no camera capture; 14px inputs trigger iOS zoom; sub-44px targets; wide table with horizontal scroll.

## Minor
FormSection back link title="Users"; section titles weaker than labels; Dashboard trend Y axis likely misconfigured; "Fecha de emision"; user category colors may fail contrast; two detail routes for one expense; 3 clicks to register an expense.

## Questions
1. Why a 20-field form instead of a "confirm what we read" card?
2. Accountant at a desk or site resident with a phone — who gets the first-class flow?
3. Four expense views with different filters/date semantics — or one table with saved views?
