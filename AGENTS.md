# AGENTS.md

- Vanilla HTML, CSS, JavaScript only. No framework, no build step.
- Must run offline after installation. No CDN calls at runtime.
- Do not add a dependency without asking me first.
- Out of scope for now: translation, camera input, automatic text detection.
- Only edit files relevant to the current task.
- Commit after each completed step with a clear message.
- If a requirement is ambiguous, ask me before writing code.
- Support right-to-left text (Arabic). Use dir="auto" and logical CSS properties

## Agent skills

### Issue tracker

Issues, PRDs, and specs live as local markdown files under `docs/`. These files define the issue tracker: `docs/agents/issue-tracker.md`.

### Triage labels

Default five canonical labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). These files define the triage labels: `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout (`GLOSSARY.md` + `docs/adr/` at the repo root). These files define the domain docs: `docs/agents/domain.md`. Create these files only when a term or decision needs recording.

`docs/agents/` is reserved for agent configuration. Do not use `agents` as a feature or effort slug.
