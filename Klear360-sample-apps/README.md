# Klear360 Sample Apps

Demo apps that use the [Klear360 design system](https://github.com/jatinbansalwork-commits/Klear360).

This is a **separate repo** from the design system. Open it as its own Cursor project.

## Local setup (two folders side by side)

Your machine should look like this:

```text
Design System/
├── klear360-design-system/   ← design system repo
└── klear360-sample-apps/     ← this repo
```

1. Clone or open the design system repo next to this folder.
2. From the design system repo root, run `yarn install && yarn build:klear360`.
3. From this repo, pick an app and install:

```bash
cd basic
yarn install
yarn start
```

Sample apps use the local design system package:

```json
"@klearnow/klear360": "file:../klear360-design-system/design-system/klear360"
```

## Apps

| Folder | Description |
| --- | --- |
| `basic/` | Minimal Create React App |
| `vite-example/` | Vite + React |
| `dashboard-template/` | Sample dashboard |
| `with-react-hook-form/` | Form example |
| `with-multiple-theme-providers/` | Theme providers example |
| `klearnow-broker/` | Vanilla broker dashboard with Klear Agent, GenUI, and dashboard AI copilot |
