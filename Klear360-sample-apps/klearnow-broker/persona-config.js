/**
 * Signed-in persona + Icon Rail (L1) visibility.
 *
 * Administrator → Administration only
 * Broker & Supervisor → full catalogue
 * Compliance Reviewer & Coordinator → reduced operational set
 */
(() => {
  const NAV_KEYS = Object.freeze([
    "agentic-broker",
    "dashboard",
    "administration",
    "entity",
    "master-data",
    "finance",
    "billing",
    "klearhub",
    "transaction",
    "drayage",
    "analytics",
    "payment",
    "einvoices",
    "notification-mgmt"
  ]);

  const ALL_NAV = "*";

  const ALL_PROMPTS = "*";

  /** Broker home empty-state prompt cards (Chat Mode). */
  const HOME_PROMPT_KEYS = Object.freeze([
    "dashboard",
    "queue",
    "statements",
    "shipments",
    "dueToday",
    "corrections",
    "isf"
  ]);

  const HOME_PROMPT_KEYS_BY_ROLE = Object.freeze({
    administrator: [],
    broker: ALL_PROMPTS,
    supervisor: ALL_PROMPTS,
    "compliance-reviewer": ["queue", "statements", "dueToday", "corrections", "isf"],
    coordinator: ["shipments", "dueToday", "queue", "statements", "isf"]
  });

  const NAV_RAIL_BY_ROLE = Object.freeze({
    administrator: ["administration"],
    broker: ALL_NAV,
    supervisor: ALL_NAV,
    "compliance-reviewer": [
      "agentic-broker",
      "dashboard",
      "transaction",
      "klearhub",
      "analytics",
      "payment",
      "einvoices"
    ],
    coordinator: ["agentic-broker", "dashboard", "klearhub", "transaction", "einvoices", "drayage"]
  });

  const PERSONAS = Object.freeze({
    "jane-cooper": {
      id: "jane-cooper",
      name: "Jane Cooper",
      roleLabel: "Broker",
      roleKey: "broker",
      agentMode: "auto-accept"
    },
    "david-chen": {
      id: "david-chen",
      name: "David Chen",
      roleLabel: "Compliance Reviewer",
      roleKey: "compliance-reviewer",
      agentMode: "deny-all"
    },
    "maria-rodriguez": {
      id: "maria-rodriguez",
      name: "Maria Rodriguez",
      roleLabel: "Coordinator",
      roleKey: "coordinator",
      agentMode: "permission"
    },
    administrator: {
      id: "administrator",
      name: "Admin User",
      roleLabel: "Administrator",
      roleKey: "administrator",
      agentMode: "permission"
    },
    supervisor: {
      id: "supervisor",
      name: "Supervisor",
      roleLabel: "Supervisor",
      roleKey: "supervisor",
      agentMode: "permission"
    }
  });

  const ROLE_LABEL_TO_KEY = Object.freeze({
    broker: "broker",
    administrator: "administrator",
    admin: "administrator",
    supervisor: "supervisor",
    "compliance reviewer": "compliance-reviewer",
    compliance: "compliance-reviewer",
    coordinator: "coordinator"
  });

  const STORAGE_KEY = "kn-active-persona-id";

  function normalizeRoleKey(raw = "") {
    return ROLE_LABEL_TO_KEY[String(raw).trim().toLowerCase()] || "broker";
  }

  function readStoredPersonaId() {
    try {
      return window.sessionStorage.getItem(STORAGE_KEY) || "";
    } catch (_error) {
      return "";
    }
  }

  function writeStoredPersonaId(id) {
    try {
      if (id) {
        window.sessionStorage.setItem(STORAGE_KEY, id);
      } else {
        window.sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch (_error) {
      /* ignore */
    }
  }

  function personaFromDom() {
    const name = document.querySelector(".profile-text__name")?.textContent?.trim() || "";
    const roleLabel = document.querySelector(".profile-text__role")?.textContent?.trim() || "Broker";
    const roleKey = normalizeRoleKey(roleLabel);
    const match =
      Object.values(PERSONAS).find((persona) => persona.name === name && persona.roleKey === roleKey) ||
      Object.values(PERSONAS).find((persona) => persona.roleKey === roleKey) ||
      PERSONAS["jane-cooper"];
    return { ...match, name: name || match.name, roleLabel: roleLabel || match.roleLabel };
  }

  function resolvePersona() {
    const override = new URLSearchParams(window.location.search).get("persona");
    if (override && PERSONAS[override]) {
      return { ...PERSONAS[override] };
    }
    const stored = readStoredPersonaId();
    if (stored && PERSONAS[stored]) {
      return { ...PERSONAS[stored] };
    }
    return personaFromDom();
  }

  function getAllowedNavKeys(roleKey = resolvePersona().roleKey) {
    return NAV_RAIL_BY_ROLE[roleKey] || NAV_RAIL_BY_ROLE.broker;
  }

  function isNavKeyAllowed(navKey, roleKey = resolvePersona().roleKey) {
    const allowed = getAllowedNavKeys(roleKey);
    return allowed === ALL_NAV || allowed.includes(navKey);
  }

  function getHomePromptKeys(roleKey = resolvePersona().roleKey) {
    return HOME_PROMPT_KEYS_BY_ROLE[roleKey] || HOME_PROMPT_KEYS_BY_ROLE.broker;
  }

  function isHomePromptKeyAllowed(promptKey, roleKey = resolvePersona().roleKey) {
    const allowed = getHomePromptKeys(roleKey);
    return allowed === ALL_PROMPTS || allowed.includes(promptKey);
  }

  function applyAgentModeForPersona(persona = resolvePersona()) {
    if (!persona?.agentMode) {
      return;
    }
    try {
      window.sessionStorage.setItem("kn-entry-agent-mode", persona.agentMode);
    } catch (_error) {
      /* ignore */
    }
  }

  function applyNavRail(persona = resolvePersona()) {
    const allowed = getAllowedNavKeys(persona.roleKey);
    document.querySelectorAll(".l1-item-wrapper[data-nav-key]").forEach((item) => {
      const key = item.getAttribute("data-nav-key") || "";
      const visible = allowed === ALL_NAV || allowed.includes(key);
      item.hidden = !visible;
      item.setAttribute("aria-hidden", visible ? "false" : "true");
    });
    document.documentElement.dataset.knPersona = persona.roleKey || "broker";
  }

  function bootstrapPersona() {
    const persona = resolvePersona();
    writeStoredPersonaId(persona.id);
    applyAgentModeForPersona(persona);
    applyNavRail(persona);
    return persona;
  }

  const root = typeof window !== "undefined" ? window : globalThis;
  root.KNPersona = Object.freeze({
    NAV_KEYS,
    NAV_RAIL_BY_ROLE,
    HOME_PROMPT_KEYS,
    HOME_PROMPT_KEYS_BY_ROLE,
    PERSONAS,
    resolve: resolvePersona,
    getAllowedNavKeys,
    isNavKeyAllowed,
    getHomePromptKeys,
    isHomePromptKeyAllowed,
    applyNavRail,
    applyAgentModeForPersona,
    bootstrap: bootstrapPersona,
    setActivePersona(id) {
      if (!PERSONAS[id]) {
        return resolvePersona();
      }
      writeStoredPersonaId(id);
      const persona = { ...PERSONAS[id] };
      applyAgentModeForPersona(persona);
      applyNavRail(persona);
      return persona;
    }
  });
})();
