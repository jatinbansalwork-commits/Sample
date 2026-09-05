# KlearNow sample app — agent context

This folder mirrors the main KlearNow broker app. **Cursor skills** live at repo root: `../../.cursor/skills/`. Index: [`../../docs/klearnow-skills.md`](../../docs/klearnow-skills.md).

## Klear Agent

**Always load** [`docs/klear-agent-product.md`](./docs/klear-agent-product.md) before changing:

- Klear Agent panel or full-page broker
- Entry form canonical state (`KNEntryFormState`)
- GenUI structured answers
- Agent grounding, personas, or accept/deny behavior
- Agent-related navigation (L1/L2, expand handoff)

## Design system

- Token source: `tokens.css` — do not hardcode hex in UI code.
- Component patterns: `components.css`, `docs/components.md`.
- Full design notes: `DESIGN.md`.

## Skills (use repo root `.cursor/skills/`)

### Klear360

`klear360-design-system`, `klear360-tokens`, `klear360-ai-ui`, `klear360-components`, `klear360-motion`, `klear360-audit`

### Klearnow

`klearnow-conversational-ux`, `klearnow-interaction-patterns`, `klearnow-visual-critique`, `klearnow-ux-writing`, `klearnow-design-rationale`, `klearnow-user-research`, `klearnow-handoff`, `klearnow-agent-design`

Vendored AI design library: `../../ai-design-skills/`

## Klear AI icon

One mark: `#klear-assist-ray` via `KNAssistCore.aiMarkHtml()`. See root [`AGENTS.md`](../../AGENTS.md).

## Sync rule

When changing agent or DS behavior, update **both** repo root and this sample folder for paired files (`tokens.css`, `agentic-*.js`, `genui.js`, `script.js`, `styles.css`).

## Intent

Normal iteration unless `GITHUB__KLEAR_SWE_AGENT_APP__APP_ID` is set (end-to-end cloud agent).
