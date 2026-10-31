# BFF UI Kit (`bff-ui`)

> **[Applied Tape Mechanics](https://github.com/applied-tape-mechanics)** — *Empirical computation and discrete field dynamics on minimal linear substrates.*
> *Enterprise-grade cloud microservices—except the core business logic is pure Brainfuck. Best Friends Forever (`BFF`) with the most hostile programming language ever created.*

**Zero-Dependency Shared Design System, Stylesheet, and Client-Side Controller Library for Brainfuck Microservices.**

Provides switchable retro-enterprise desktop themes (**OS 9** & **OS X**), responsive dual-window conversion layouts, preset loaders, interactive Brainfuck source code & tape memory inspector modals, and automatic **Client-Side JS VM Fallback** when no backend server is present.

---

## 📦 Repository Structure & File Reference

```text
bff-ui/
├── css/
│   └── bff-theme.css          # Complete multi-theme CSS design system (OS 9 & OS X, windows, modals, tabs)
├── js/
│   └── bff-ui.js              # Zero-dependency BffUI controller (theme switcher, API probe, BF inspector, client VM runner, toasts)
├── templates/
│   ├── bf_modal.html          # Reusable Brainfuck source code & tape memory inspector modal markup
│   └── app_shell.html         # Ready-to-use HTML boilerplate for new Applied Tape Mechanics microservices
├── index.html                 # Interactive component showcase, live theme switcher & in-browser Brainfuck execution demo
├── Dockerfile                 # Lightweight Apache (httpd:alpine) container serving the interactive styleguide & assets
├── docker-compose.yml         # Local preview service running on http://localhost:8088
├── package.json               # Package & release metadata (v1.0.0)
└── LICENSE                    # MIT License
```

### Detailed File Breakdown

| File | Purpose |
| :--- | :--- |
| [`css/bff-theme.css`](css/bff-theme.css) | Complete CSS design system with zero external CSS frameworks. Implements `[data-theme="os9"]` (OS 9 Beveled windows, stippled desktop background, Charcoal/Monaco typography) and `[data-theme="osx"]` (OS X brushed-metal/glass windows, traffic-light controls, glowing pill buttons). |
| [`js/bff-ui.js`](js/bff-ui.js) | Vanilla JavaScript global controller (`window.BffUI`). Automatically probes `GET /health` on load to detect whether a backend API is active (displaying a **Swagger API** link) or offline/static (displaying a **Client JS VM** badge and routing execution through `bff-interpreter.js`). |
| [`templates/bf_modal.html`](templates/bf_modal.html) | Drop-in HTML modal snippet (`#bfModal`) for inspecting `.bf` state machines, viewing instruction breakdown chips (`+ -`, `> <`, `[ ]`, `. ,`), toggling word-wrap, copying source code, and downloading `.bf` files. |
| [`templates/app_shell.html`](templates/app_shell.html) | Complete starter HTML template pre-wired with the dual-window input/output grid, mode tabs, preset bar, inspector modal, and jsDelivr CDN links. |
| [`index.html`](index.html) | Live interactive component showcase where you can switch themes between **OS 9** and **OS X** and execute preset Brainfuck programs (`Hello World`, `Fibonacci`) directly in the browser. |

---

## 🎨 Theme System & CSS Custom Properties (`css/bff-theme.css`)

All surface colors, bevels, and fonts are controlled via CSS custom properties and switched dynamically via `<html data-theme="os9 | osx">`:

| Variable | OS 9 (`os9`) | OS X (`osx`) | Description |
| :--- | :--- | :--- | :--- |
| `--bg-desktop` | `#666699` | `#2b3e50` (Aurora gradient) | Desktop background surface |
| `--window-bg` | `#dddddd` | `#ececec` | Primary window/card surface |
| `--window-border` | `#000000` | `#7a7a7a` | Window frame border |
| `--window-bevel-light` | `#ffffff` | `rgba(255,255,255,0.85)` | Top/left highlight bevel |
| `--window-bevel-dark` | `#888888` | `#b5b5b5` | Bottom/right shadow bevel |
| `--accent` | `#224488` | `#0066cc` | Primary focus & active accent |
| `--code-bg` | `#ffffff` | `#ffffff` | Monospace code/output surface |
| `--font-system` | `Charcoal, Geneva, sans-serif` | `Lucida Grande, sans-serif` | UI system font stack |
| `--font-mono` | `Monaco, JetBrains Mono` | `Monaco, JetBrains Mono` | Code & tape inspector font stack |

---

## 🚀 Runtime Integration in Microservices (CDN)

**Applied Tape Mechanics** microservices do **not** use Git submodules. Instead, any microservice HTML page loads a pinned release of `bff-ui` and `bff-interpreter` directly at runtime via jsDelivr CDN:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Applied Tape Mechanics Microservice</title>
  <!-- Load shared theme stylesheet from pinned GitHub release -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/applied-tape-mechanics/bff-ui@v1.0.0/css/bff-theme.css">
</head>
<body>
  <!-- App markup (see templates/app_shell.html) -->

  <!-- Load zero-dependency Brainfuck VM + UI Controller from pinned GitHub releases -->
  <script src="https://cdn.jsdelivr.net/gh/applied-tape-mechanics/bff-interpreter@v1.0.0/bff-interpreter.js"></script>
  <script src="https://cdn.jsdelivr.net/gh/applied-tape-mechanics/bff-ui@v1.0.0/js/bff-ui.js"></script>
</body>
</html>
```

---

## 🧠 Brainfuck Inspector & Client VM Controller API (`js/bff-ui.js`)

`BffUI` initializes automatically on `DOMContentLoaded` (restoring the user's saved theme from `localStorage`, injecting the top-right Appearance switcher and API/Client VM badge, and binding `Escape` / backdrop click handlers):

```javascript
// 1. Execute a Brainfuck state machine directly in the browser (64k tape)
const output = BffUI.runBrainfuck(BF_CODE, inputString);

// 2. Probe for an active backend API (/health) and update the top status badge
const hasBackend = await BffUI.detectApi({ healthUrl: '/health', docsUrl: '/docs' });

// 3. Open the multi-tab Brainfuck Source Code & Tape Inspector Modal (fetches /bf)
BffUI.initBfInspector({
  modalId: 'bfModal',
  endpoint: '/bf',
  defaultView: 'url_encode'
});

// 4. Or open an on-demand modal with inline Brainfuck code
BffUI.showBfModal('UN/EDIFACT Parser', BF_CODE, 'Streaming state machine');

// 5. Switch active UI theme ('os9' | 'osx')
BffUI.setTheme('osx');

// 6. Copy text to clipboard with a floating toast notification
BffUI.copyText("Hello World", "Copied to clipboard!");

// 7. Trigger a floating toast notification directly
BffUI.showToast("Executed in 0.42ms via JS VM");
```

---

## 🐳 Docker Setup (Component Showcase & Local Preview)

A pre-built container image serving the interactive Component Showcase (`index.html`) and static UI assets is published automatically to **GitHub Container Registry (`ghcr.io`)**:

```bash
# Run the interactive showcase directly from GHCR on http://localhost:8088
docker run --rm -p 8088:80 ghcr.io/applied-tape-mechanics/bff-ui:latest
```

### Running Locally with Docker Compose

You can also run the showcase locally with live volume mounting (so edits to `css/bff-theme.css`, `js/bff-ui.js`, or `index.html` take effect immediately on refresh):

```bash
# Build and start the showcase container in the background
docker compose up -d --build

# View container status
docker compose ps

# Stop the container
docker compose down
```

Then open **[http://localhost:8088](http://localhost:8088)** in your browser.
