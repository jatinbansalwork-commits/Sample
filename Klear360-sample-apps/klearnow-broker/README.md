# Klearnow broker sample

Vanilla HTML/JS broker dashboard with Klear Agent, GenUI, and klear360-ai-ui patterns (purple AI palette, ChatInput + ChatMessage + streaming GenUI).

## Run locally

```bash
node .claude/static-server.mjs
```

Open [http://localhost:8080/index.html#dashboard](http://localhost:8080/index.html#dashboard) for the dashboard AI insights widget.

Use another port if 8080 is busy:

```bash
PORT=8082 node .claude/static-server.mjs
```
