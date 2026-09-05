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

## HTS classification (Knowledge Expert)

Available to all users from Assist, Klear Agent home, and entry utility chips — not limited to the seven home prompt cards.

**Flow:**

1. **Click / chip** (e.g. “HTS classification”, “Classify this product”) opens chat with a **classification intake** — not an immediate `resolve_hs_code` result.
2. If no product is described yet, the agent asks for **description**, **country of origin**, and **material**.
3. The user replies, or the agent reads attributes from the **open entry’s invoice line** (description, COO, material) when an entry filing is loaded.
4. Only then the agent calls **`resolve_hs_code`** and returns GenUI: HTS, Chapter 99 overlay (when applicable), CROSS ruling references, confidence, alternatives considered.
5. **“How KlearAgent got this”** expands to show the tool trace (`resolve_hs_code` + `lookup_cross_ruling` steps).
6. When an entry is loaded, **Apply to line N** appears — writes an **`agent_draft`** patch only after **`window.confirm`** (same explicit gate as any field write). A lookup **never** silently becomes a patch.

**Implementation:** `classification-assistant.js`, GenUI `CLASSIFICATION_RESULT` in `genui.js`, apply handler in `script.js` / `agentic-broker.js`.

**Product decision (locked): Smart cold start with entry auto-read.**

| Trigger | Behavior |
| --- | --- |
| “Classify this product” (no entry, or incomplete line) | Intake only — ask for description, origin, material. No `resolve_hs_code` yet. |
| Same click while entry filing is open with a complete line | Intake still opens (not an immediate answer), but the agent **auto-reads** description, COO, and material from the focused invoice line and surfaces a primary **Classify line N from entry** action. |
| Explicit “Classify line N…” or typed product details | Runs `resolve_hs_code` and returns the full result card. |
| Apply to line | Separate explicit confirm — lookup never silently becomes a patch. |

Do **not** auto-run `resolve_hs_code` on the first chip click even when the entry line is ready — that would skip the classification-oriented starter the spec requires. Auto-detect applies to **reading** line context into intake, not to firing the lookup.

## Maria Rodriguez — operations shipments (document coordinator)

Maria's **primary screen** is **Shipments in operations** — pre-entry shipments, not filed CBP entries. It is a named home prompt card for coordinators but deserves the same flow depth as Jane's Working Queue.

**Flow:**

1. Agent lists operations shipments with **company**, **ETA**, **carrier**, and **document-completeness** status (missing-document flags are the loudest signal).
2. Selecting a row opens the entry workstation with **`?panel=docs`** — **Document Panel prioritized**, not the entry form (overlay layout, upload zone ready when gaps exist).
3. **Upload gap** routes into the standard document ingestion flow (`startDocumentUpload` / type detection / extraction).
4. Maria **decides what to chase or upload** — coordinator role has **no form-edit or statement-approval** permission; the agent surfaces gaps only.

**Implementation:** `ops-shipments-assistant.js`, `syncDocsFromHash` in `transaction-us-entry-filing.js`, GenUI table in Assist / Klear Agent home.

## Due today triage

Cross-entity morning briefing: entries, ISF filings, and statements due within the day, ranked **most urgent first** (already-**late** items lead).

**Flow:**

1. Ask **“All items due today”** — agent queries entries, ISF, and pending statements.
2. Each result is an **entity card** with a type badge (**Entry** / **ISF** / **Statement**) so a mixed list stays scannable.
3. Cards sort **late → due today**; urgency badge is the primary signal after type.
4. **Open** on a card routes to that item's normal workflow — Working Queue, ISF filing, or Statement Approval.
5. **Triage only** — nothing is filed, approved, or updated from the list.

**Implementation:** `due-today-assistant.js`.

**Product decision (open):** “Due” is **not one clock**. ISF uses the **24-hours-before-loading** regulatory deadline; statements use the **periodic daily / ACH** cycle; entry rows use **operational SLAs**. These must be defined precisely with compliance before production — conflating them here has real consequences.

## Post Summary Corrections (PSC)

§2.1 names PSC in scope; this flow amends an **accepted** entry summary CBP already has on file — different regulatory meaning from pre-submission edits.

**Flow:**

1. Ask **“Post Summary Corrections”** — agent lists **recently accepted entries** (or asks which entry needs correction).
2. Selecting a row opens the entry workstation with **`?mode=psc`** (optional `pscId`) — status bar reads **PSC — Original ES: ACCEPTED** so a correction never looks like a fresh filing.
3. Field edits in PSC mode append audit patches with **`patch_type: psc_amendment`** — not pre-submission edits.
4. **Submit correction to CBP** reuses the transmit action with PSC-specific copy and a **second confirmation** (CBP already has the original record).
5. **Triage only from chat** — nothing is filed until the broker explicitly submits on the workstation.

**Implementation:** `psc-assistant.js`, `syncPscFromHash` / PSC status bar / transmit modal in `transaction-us-entry-filing.js`, journey labels in `entry-journey-tab.js`.

**Product decision (locked for demo):** PSC workstation mode, distinct patch type, and double-submit confirmation are required before production build — legal stakes of amending an accepted filing warrant a dedicated spec review with compliance.

## ISF filing assistant (verified extension)

Surfaces **ISF status across shipments** — filed, pending, or at risk of the **24-hour pre-loading** deadline — ranked by urgency.

**Status flow:**

1. Ask **“Which ISF filings are at risk under the 24-hour rule?”** or **“pending submission”** — ranked cards (late → at risk → pending → filed).
2. Cards route to the ISF filing workstation — triage only until the broker confirms.

**File flow (screenshot-verified copy):**

1. **“File an ISF for the Acme Corp shipment…”** — agent pre-fills ISF-10 from **Commercial Invoice + Bill of Lading** already ingested: importer, consignee, manufacturer (MID), HTS, country of origin.
2. Names **exactly two gaps**: **Container stuffing location** and **Consolidator name** — with the plain line that filing is **one word away**.
3. **“File it”** / **File ISF-10 to CBP** requires explicit broker confirmation — agent files and **confirms aloud**; never silently.

**Implementation:** `isf-assistant.js`, `?agent=prefill` overlay on ISF parties in `transaction-us-isf-detail.js`, `file-isf-confirm` GenUI action in `script.js`.

## CATAIR code 398 (Knowledge Expert — verified extension)

Clicking the pinned **CATAIR code 398** card fires the query immediately — the card **is** the question; nothing to type.

**Flow:**

1. Card click → agent quotes the **CATAIR edit definition** from `entry-validation.js` (`CATAIR Ch. 3B, Reject 398`) — plain-language interpretation follows, labeled separately (§10.1: never a paraphrase presented as fact).
2. If an open or loaded entry has reject **398** on file → bridge: **"Entry #___ is showing this error right now — want me to resolve it?"** with an explicit **Yes — resolve on entry form** button (`?focus=catair398` opens Validation tab — W10 error-resolution path).
3. If no entry is affected → **information only**; no field can change from this path.
4. Resolution is **offered, never assumed** — no silent field writes.

**Implementation:** `knowledge-expert.js` (`answerCatair`), home chip `kind: "query"` in `kn-next-actions.js`, `syncCatairResolveFromHash` in `transaction-us-entry-filing.js`.

**Product note (open):** "CATAIR code 398" does not appear in the original design doc scope list. Confirm with product **why this code earned a pinned home card** — if it is the brokerage's most frequent ACE rejection, document that fact; do not treat the demo pin as arbitrary.

## Change protocol

If a vision or persona rule should change a screen already built, **call it out before applying** the code change.

## Related files

| Area | File |
| --- | --- |
| Entry form SSOT | `entry-form-state.js`, `transaction-us-entry-filing.js` |
| Panel + grounding | `klear-assist-core.js`, `script.js` |
| Full-page broker | `agentic-broker.js`, `agentic-threads.js` |
| Structured answers | `genui.js` |
| HTS classification | `classification-assistant.js` |
| Operations shipments (Maria) | `ops-shipments-assistant.js` |
| Due today triage | `due-today-assistant.js` |
| Post Summary Corrections | `psc-assistant.js` |
| ISF filing assistant | `isf-assistant.js` |
| CATAIR code 398 | `knowledge-expert.js`, `entry-validation.js` |
| Tokens | `tokens.css`, `docs/tokens.md`, `DESIGN.md` |
| Components | `components.css`, `docs/components.md` |
