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

## Intent

Normal iteration unless `GITHUB__KLEAR_SWE_AGENT_APP__APP_ID` is set (end-to-end cloud agent).
