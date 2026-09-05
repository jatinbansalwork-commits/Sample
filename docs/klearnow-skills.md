# Klearnow skills index

Cursor skills for the KlearNow broker + Klear Agent dashboard. Load the relevant skill **before** work; finish DS changes with **klear360-audit**.

## Klear360 (design system)

| Skill | Use when |
| --- | --- |
| **klear360-design-system** | Orchestrator — scope spans tokens + components + AI + motion + Klearnow layers |
| **klear360-tokens** | Colors, spacing, theme, CSS vars — `tokens.css` only |
| **klear360-ai-ui** | ChatInput, ChatMessage, GenUI, purple `ai.*` palette |
| **klear360-components** | `.kn-*` primitives, patterns, MCP docs |
| **klear360-motion** | `--kn-motion-*` / `--theme-motion-*` |
| **klear360-audit** | **Mandatory last step** after DS-related code changes |

## Klearnow (product + agent)

| Skill | Use when |
| --- | --- |
| **klearnow-conversational-ux** | Agent thread, thinking, GenUI answers, follow-ups |
| **klearnow-interaction-patterns** | Forms, search, onboarding, state machines, companion |
| **klearnow-visual-critique** | Pre-ship screen review (hierarchy, density, brand) |
| **klearnow-ux-writing** | Assistant copy, GenUI strings, alerts, buttons |
| **klearnow-design-rationale** | Document locked product/DS decisions |
| **klearnow-user-research** | Personas, journeys, usability plans (Jane/David/Maria) |
| **klearnow-handoff** | Developer handoff specs + QA checklist |
| **klearnow-agent-design** | Agent autonomy, guardrails — uses vendored `ai-design-skills/` |

## Vendored AI design library

Cloned separately (not Cursor skills):

```
ai-design-skills/   ← Owl-Listener/ai-design-skills (44 skills, 6 plugins)
```

Entry point: **klearnow-agent-design** skill routes to the right plugin skill files.

## Workflow

```
1. Product doc     → docs/klear-agent-product.md (agent work)
2. Layer skill     → klear360-* and/or klearnow-*
3. MCP docs        → get_klear360_component_docs / pattern_docs
4. Implement       → main app + sync klearnow-broker sample
5. Audit           → klear360-audit + tests/*-verify.mjs
```

## Sample app sync

When changing canonical behavior, mirror in `Klear360-sample-apps/klearnow-broker/`:

- `tokens.css`, `components.css`, `styles.css`
- `agentic-*.js`, `genui.js`, `script.js`
- `docs/klear-agent-product.md`, `AGENTS.md`
