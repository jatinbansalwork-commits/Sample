# KlearNow sample app — agent context

## Klear Agent

**Always load** [`docs/klear-agent-product.md`](./docs/klear-agent-product.md) before changing:

- Klear Agent panel or full-page broker
- Entry form canonical state (`KNEntryFormState`)
- GenUI structured answers
- Agent grounding, personas, or accept/deny behavior
- Agent-related navigation (L1/L2, expand handoff)

That doc holds the **vision**, **personas** (Jane Cooper, David Chen, Maria Rodriguez), **non-negotiables**, **entry form state contract**, and **token rules**.

## Design system

- Token source: `tokens.css` — do not hardcode hex in UI code.
- Component patterns: `components.css`, `docs/components.md`.
- Full design notes: `DESIGN.md`.

## Klear AI icon (single source of truth)

**One mark everywhere** — the Klear AI ray (`#klear-assist-ray`), not sparkle glyphs (✦) or ad-hoc SVGs.

| What | Where |
| --- | --- |
| SVG symbol | `#klear-assist-ray` in `index.html` / `home.html` (define once) |
| HTML helper | `KNAssistCore.aiMarkHtml({ size, spin, suggest, className })` in `klear-assist-core.js` |
| CSS classes | `.klear-assistant-mark` (+ `.ai-suggest-mark` for AI-suggested fields, `.klear-assistant-mark--spin` for animated triggers) |

**Do:** `KNAssistCore.aiMarkHtml({ suggest: true })` for AI-suggested chips, flags, and field markers.

**Do not:** add `✦`, duplicate inline ray paths, or new AI icon variants without updating this contract.

**Exception:** `iconFieldAiFinal()` checkmark-in-circle is a *status* icon (accepted AI value), not the brand mark — keep separate.

## Intent

Normal iteration unless `GITHUB__KLEAR_SWE_AGENT_APP__APP_ID` is set (end-to-end cloud agent).
