# Klear Agent — product vision

> **Status:** Vision + personas locked for improvisation. Sample data is sparse — treat flows as directional, not production-complete.
>
> **Load this file** whenever changing Klear Agent panel, full-page broker, GenUI, context grounding, entry form state, or agent-adjacent UX.

## Vision

**Klear Agent is the primary interaction model**, not a bolted-on chat widget. It fills, validates, and explains — the licensed broker decides and stays legally accountable.

This build moves toward more agent autonomy over time; it is not there yet.

## Personas (default demo user: Jane Cooper)

| Persona | Role | Mode / posture | Daily reality | Primary surface |
| --- | --- | --- | --- | --- |
| **Jane Cooper** | Licensed broker | **Auto-accept** — speed without hiding what changed | 40–60 entries/day | Klear Agent thread, contextual panel on record pages, queue / due-today GenUI |
| **David Chen** | Compliance | **Deny-all** — advisor only, never auto-applies | Lives in validation findings | Validation findings, audit patches, flagged field status |
| **Maria Rodriguez** | Coordinator | Uploads documents | Document panel | Document upload / attachment flows |

### Persona rules for UX copy & behavior

- **Jane:** Show diffs and status chips; prefer one-click accept of safe suggestions; never hide that something changed.
- **David:** Surface every suggestion as review-only; emphasize audit trail and explicit approve/deny; no silent apply.
- **Maria:** Ground on documents and upload state; avoid entry-filing jargon unless the page is a filing form.

Demo shell currently signs in as **Jane Cooper · Broker** (`index.html` profile). Switching personas later should change accept/deny defaults and which panels are primary — not implemented yet.

## Non-negotiables

The agent may **suggest, fill, and flag**. It must **never**:

- Submit to ACE
- Clear an OFAC/BIS hold
- Approve a statement
- Finalize anything without an **explicit human click**

Additional requirements:

- Every field carries a **visible status** (`empty` | `agent_draft` | `agent_final` | `user_override` | `locked` | `error`).
- Every settled change is an **append-only audit patch** (who, when, before → after, tool call).
- **WCAG 2.1 AA** everywhere — brokers work under time pressure.

## Entry form state (canonical)

Single source of truth per entry: `window.KNEntryFormState` in `entry-form-state.js`.

**Per field:** `value`, `status`, `confidence`, `fill_source`, `tool_used`, `rationale`, `citations[]`, `locked_until`, `alternatives[]`.

**Patches (append-only):** `patch_id`, `fields_changed[]`, `source`, `timestamp`, `tool_call`, optional `meta` for UI.

**Events (future SSE bridge):**

- `kn-entry-form-state:patch` — dispatched within 500ms of append
- `kn-entry-form-state:field` — single field update
- `kn-entry-form-state:snapshot` — reserved for full-state push

Subscribe: `KNEntryFormState.subscribe(KNEntryFormState.EVENT_PATCH, handler)`.

## Design system (Klear360 / KlearNow tokens)

**Never hardcode hex in component CSS or JS.** Use semantic tokens from `tokens.css`.

| Spec name | Hex (reference only) | Token path |
| --- | --- | --- |
| Primary / interactive / navigation | `#003F5B` | `--kn-primitive-indigo-500`, `--kn-color-background-interactive-primary-*` |
| Marigold accent (sparingly) | `#F69000` | `--kn-primitive-marigold-500` |
| Blue sapphire (text, borders, disabled) | `#005D7B` family | `--kn-primitive-blue-sapphire-*`, `--kn-color-text-*` |
| Success | `#23C55E` (≈ `#22C55E` in tokens) | `--kn-primitive-green-500`, `--kn-color-feedback-success-*` |
| Error | `#FF3D33` (≈ `#FF3D32` in tokens) | `--kn-primitive-red-500`, `--kn-color-feedback-error-*` |
| Klear Agent accent | Purple family | `--kn-primitive-purple-*`, `--ai-assistant-accent*` in `styles.css` |

### Typography

- **Spec:** Inter only, **14px base** (`type-body-md` / `--theme-font-size-100`).
- **Current app:** Inter for text/heading; Roboto fallback + Roboto Mono for code per `DESIGN.md`. Display greeting uses `--kn-font-family-display`.
- **When improvising Agent UI:** prefer Inter + 14px body; do not introduce new font families.

### Agent-specific chrome

- Purple accent for Klear Agent mark, trigger pill, and thread chrome is **intentional** (distinct from primary indigo nav).
- GenUI streaming ring (`.kn-genui__ring`) is sanctioned — see `DESIGN.md` § Spark empty Agent.

## Sparse data disclaimer

We do not yet have enough real broker data in the prototype. When improvising:

- Use plausible ISF / entry / statement / PSC scenarios from `us-tm-scenarios.js` and thread fixtures.
- Label mock rows clearly in dev copy if needed.
- Do not block UX exploration waiting for backend — but **never** fake autonomous actions that violate non-negotiables.

## Change protocol

If a vision or persona rule should change a screen already built, **call it out before applying** the code change.

## Related files

| Area | File |
| --- | --- |
| Entry form SSOT | `entry-form-state.js`, `transaction-us-entry-filing.js` |
| Panel + grounding | `klear-assist-core.js`, `script.js` |
| Full-page broker | `agentic-broker.js`, `agentic-threads.js` |
| Structured answers | `genui.js` |
| Tokens | `tokens.css`, `docs/tokens.md`, `DESIGN.md` |
| Components | `components.css`, `docs/components.md` |
