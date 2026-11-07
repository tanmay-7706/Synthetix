<div align="center">
  <br />
  <img src="public/logo.png" alt="Synthetix Logo" width="280" />
  <br /><br />

  <h1>Synthetix</h1>
  <p><strong>Production-Grade Agentic AI Application Builder & In-Browser Development Workspace</strong></p>

  <p>
    <a href="https://synthetix-agent.vercel.app/" target="_blank">
      <img src="https://img.shields.io/badge/🚀_Live_Demo-synthetix--agent.vercel.app-2563eb?style=for-the-badge" alt="Live Demo" />
    </a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/Next.js_16-App_Router_%2F_Turbopack-000000?style=flat-square&logo=next.js&logoColor=white" alt="Next.js 16" />
    <img src="https://img.shields.io/badge/React_19-Server_Components-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React 19" />
    <img src="https://img.shields.io/badge/TypeScript_5-Strict_Mode-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript 5" />
    <img src="https://img.shields.io/badge/Google_Gemini-3.5_Flash-FF6D00?style=flat-square&logo=google&logoColor=white" alt="Gemini AI" />
    <img src="https://img.shields.io/badge/Supabase-PostgreSQL_17-3FCF8E?style=flat-square&logo=supabase&logoColor=white" alt="Supabase" />
    <img src="https://img.shields.io/badge/Prisma_ORM-Type--Safe_Schema-2D3748?style=flat-square&logo=prisma&logoColor=white" alt="Prisma" />
    <img src="https://img.shields.io/badge/Vitest-34_Unit_Tests_Passed-6E9F18?style=flat-square&logo=vitest&logoColor=white" alt="Vitest" />
    <img src="https://img.shields.io/badge/Playwright-16_E2E_Tests_Passed-45ba4b?style=flat-square&logo=playwright&logoColor=white" alt="Playwright" />
    <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="MIT License" />
  </p>

  <br />

  <p>
    <a href="#-project-overview">Overview</a> •
    <a href="#-key-features">Key Features</a> •
    <a href="#-system-architecture">Architecture</a> •
    <a href="#-tech-stack">Tech Stack</a> •
    <a href="#-product-screenshots">Screenshots</a> •
    <a href="#-getting-started">Getting Started</a> •
    <a href="#-testing">Testing</a> •
    <a href="#-deployment">Deployment</a> •
    <a href="#-known-limitations">Limitations</a>
  </p>
</div>

---

## 📌 Project Overview

**Synthetix** is a cloud-native, full-stack AI web application builder that translates natural language prompts and design wireframes into fully functional, multi-file web applications in real time. Powered by Google Gemini 3.5 Flash and Next.js 16 (App Router and Turbopack), Synthetix streams architectural reasoning and structured code trees over Server-Sent Events (SSE), executes live code inside an in-browser Sandpack runtime without cloud container overhead, automatically heals runtime errors through an autonomous self-healing loop, and persists versioned workspaces to Supabase PostgreSQL with defense-in-depth multi-tenant security.

A live, production-grade deployment is actively maintained and publicly accessible at **[https://synthetix-agent.vercel.app](https://synthetix-agent.vercel.app)**.

---

## ✨ Key Features

- **Prompt & Vision-to-App Generation**: Generates complete, multi-file React and Vue web applications from natural language specifications or uploaded UI wireframe screenshots.
- **Real-Time Streaming Reasoning**: Streams model thinking steps, architectural plans, package resolution, and file creation over Server-Sent Events (SSE) for low perceived latency.
- **Progressive AI JSON Recovery Pipeline**: Uses a progressive 4-tier JSON recovery pipeline (`lib/json-recovery.ts`) to normalize and extract valid multi-file code trees even when models emit raw control characters or unescaped JSX quotes.
- **In-Browser Sandpack Sandbox**: Renders and executes generated code in a secure client-side sandbox with live hot reload, syntax-highlighted editing (CodeMirror), and zero disruptive iframe reloads.
- **Autonomous Self-Healing Runtime**: Automatically intercepts unhandled browser runtime exceptions, debounces inputs, and streams surgical code repairs via Gemini with a 3-attempt circuit breaker.
- **Multi-Framework Export Engine**: Compiles standalone, installable project bundles for **Vite + React**, **Vite + Vue 3**, and **Create React App (CRA)**, downloadable as clean ZIP archives.
- **Version History & Snapshots**: Automatically captures immutable version snapshots on every generation cycle, allowing one-click rollbacks to any prior project state.
- **Reusable Component Library**: Enables users to extract, tag, search, and preview reusable UI components across different workspaces.
- **Defense-in-Depth Security**: Enforces edge-level authentication proxying with Clerk, Arcjet token-bucket rate limiting (10 req/min healing, 3 req/min deploy, 5 req/min generation), bot shielding, and strict IDOR multi-tenant database isolation.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph Client["Client Browser"]
        CP["ChatPanel (Prompt + Vision Upload)"]
        WC["WorkspaceClient (State Orchestrator)"]
        SP["Sandpack Runtime (Live Preview & Editor)"]
        CP -->|Submit Request| WC
        WC -->|Update Code Tree| SP
    end

    subgraph Edge["Edge Layer (Next.js 16)"]
        PROXY["Auth Proxy & Clerk Middleware"]
        ARCJET["Arcjet Shield (Rate Limiter & Bot Guard)"]
        API["/api/gen-ai-code (SSE Stream)"]
        HEAL["/api/heal (Self-Healing Loop)"]
        DEPLOY["/api/deploy (Vercel Integration)"]
        PROXY --> ARCJET --> API
        PROXY --> HEAL
        PROXY --> DEPLOY
    end

    subgraph AI["AI Inference & JSON Pipeline"]
        GEMINI["Google Gemini 3.5 Flash (Thinking + Vision)"]
        JSON_REC["Progressive JSON Recovery (lib/json-recovery.ts)"]
        API --> GEMINI --> JSON_REC
        HEAL --> GEMINI
    end

    subgraph Data["Database & External Services"]
        PG[("Supabase PostgreSQL (Prisma ORM)")]
        LB["Liveblocks (Presence & Cursors)"]
        VERCEL["Vercel REST API"]
        JSON_REC -->|Persist Workspace & Version| PG
        WC <-->|Presence Cursors| LB
        DEPLOY -->|Project Export| VERCEL
    end

    WC -->|Stream Request| PROXY
    JSON_REC -->|SSE Stream Events| WC
    SP -.->|Runtime Error| HEAL
```

---

## 🛠️ Tech Stack

| Layer | Technologies | Architectural Rationale |
|---|---|---|
| **Core Framework** | **Next.js 16** (App Router, Turbopack, React 19) | Sub-second compilation, edge route handlers, and React Server Components |
| **Language** | **TypeScript 5 (Strict Mode)** | Complete type safety across data models, API payloads, and frontend state |
| **Styling & Components** | **Tailwind CSS**, **shadcn/ui**, **Radix UI** | Modern accessible UI primitives styled with utility classes and dark-mode support |
| **AI Orchestration** | **Google Gemini 3.5 Flash** (Thinking + Vision) | High token throughput, multimodal screenshot reasoning, and structured thought streaming |
| **In-Browser Runtime** | **Sandpack (CodeSandbox)** | Secure client-side bundler and virtual file system eliminating container spin-up overhead |
| **Database & ORM** | **Supabase (PostgreSQL 17.6)**, **Prisma ORM** | Relational data integrity, schema migrations, foreign-key cascades, and connection pooling |
| **Authentication** | **Clerk** | Social OAuth, session token cookies, and edge proxy protected route enforcement |
| **Application Security** | **Arcjet** | Token-bucket rate limiting (10 req/min heal, 3 req/min deploy), bot defense, and prompt protection |
| **Multiplayer Presence** | **Liveblocks** | Room-based real-time cursor coordinate broadcasting and presence synchronization |
| **Automated Testing** | **Vitest 5**, **Playwright Test** | Deterministic unit tests (140ms execution) and Chromium browser journey validation |
| **Deployment & CI/CD** | **Vercel**, **GitHub Actions** | Automated CI pipeline and edge production hosting |

---

## 📸 Product Screenshots

<!-- Placeholder sections for demo assets -->
### 1. Workspace & Live Sandpack Preview
> Generate multi-file applications with live streaming thoughts, instant preview, and interactive code editing.
```
┌────────────────────────────────────────────────────────────────────────┐
│                        [ Screenshot Placeholder ]                      │
│                                                                        │
│   Recommended: Capture the split-pane workspace showing:               │
│   1. Left pane: Chat conversation with streaming thoughts and prompt   │
│   2. Right pane: Sandpack live preview rendering an interactive app    │
│                                                                        │
│   Target path: docs/images/workspace-preview.png                       │
└────────────────────────────────────────────────────────────────────────┘
```

### 2. Autonomous Self-Healing Error Correction
> Automated runtime exception capture and surgical background code patching.
```
┌────────────────────────────────────────────────────────────────────────┐
│                        [ Screenshot Placeholder ]                      │
│                                                                        │
│   Recommended: Capture the self-healing toast banner:                  │
│   "Auto-fixing error… (1/3) [SELF-HEALING]" at the bottom of preview   │
│                                                                        │
│   Target path: docs/images/self-healing-flow.png                       │
└────────────────────────────────────────────────────────────────────────┘
```

### 3. Multi-Framework Selector & Project Export
> Switch frameworks dynamically or export full standalone ZIP codebases.
```
┌────────────────────────────────────────────────────────────────────────┐
│                        [ Screenshot Placeholder ]                      │
│                                                                        │
│   Recommended: Capture the framework modal showing:                    │
│   - Framework options (Vite React / Vite Vue / Create React App)       │
│   - UI library options (Tailwind CSS / shadcn/ui / NextUI)             │
│                                                                        │
│   Target path: docs/images/framework-modal.png                         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

Follow these steps to clone, configure, test, and run Synthetix locally.

### Prerequisites
- **Node.js**: `v20.x` or higher (LTS recommended)
- **npm**: `v10.x` or higher
- **Accounts**: Supabase (PostgreSQL), Clerk (Authentication), Google AI Studio (Gemini API)

### 1. Clone the Repository
```bash
git clone https://github.com/tanmay-7706/Synthetix.git
cd Synthetix
```

### 2. Install Dependencies
```bash
npm install
```
*(Note: An `.npmrc` file with `legacy-peer-deps=true` is included to ensure clean peer dependency resolution).*

### 3. Configure Environment Variables
```bash
cp .env.example .env.local
```
Configure your credentials in `.env.local` (see [Environment Variables](#-deployment--environment-variables) below).

### 4. Apply Database Migrations
```bash
npx prisma migrate deploy
npx prisma generate
```

### 5. Execute Automated Test Suites
```bash
npm test            # 34 Vitest unit tests (~140ms execution)
npm run test:e2e    # 16 Playwright browser journeys
```

### 6. Verify Static Types & Build
```bash
npx tsc --noEmit    # Type check (0 errors)
npm run lint        # ESLint 9 check (0 errors, 0 warnings)
npm run build       # Next.js 16 Turbopack build (16/16 routes compiled)
```

### 7. Launch Development Server
```bash
npm run dev
# Open http://localhost:3000 in your browser
```

---

## 🧪 Testing

Synthetix includes a comprehensive, multi-tiered test suite that runs fast, deterministically, and independently of paid external services:

```bash
# Run Vitest unit tests (34 tests across 6 test suites)
npm test

# Run tests in watch mode during development
npm run test:watch

# Run Playwright end-to-end browser tests
npm run test:e2e
```

### Test Inventory (50 Tests Total):

| Suite | File | Tests | Focus Area | Status |
|---|---|:---:|---|:---:|
| **AI JSON Recovery** | `tests/unit/json-recovery.test.ts` | 12 | Markdown code fences, raw control char escaping, unescaped JSX quotes recovery | **PASS** 🟢 |
| **Project Bundler** | `tests/unit/project-export.test.ts` | 5 | Vite React, Vue 3, CRA package.json, entrypoints, index.html, and Vercel configs | **PASS** 🟢 |
| **Admin Access Control** | `tests/unit/admin.test.ts` | 6 | Clerk ID matching, non-admin rejection, auto mode lookup, DB error fallback | **PASS** 🟢 |
| **Version History Auth** | `tests/unit/versions-auth.test.ts` | 5 | 401 unauthenticated, 400 invalid params, 404 unowned workspace (IDOR protection) | **PASS** 🟢 |
| **Liveblocks Auth** | `tests/unit/liveblocks-auth.test.ts` | 5 | 503 missing secret, 401 unauth, 403 unowned room access, 200 session token issue | **PASS** 🟢 |
| **Arcjet Rate Limiting** | `tests/unit/arcjet.test.ts` | 1 | Token-bucket configurations for healing (10/min) and deploy (3/min) | **PASS** 🟢 |
| **Navigation & Auth Guards** | `tests/e2e/navigation-auth.spec.ts` | 7 | Landing page render, prompt preservation across login, 307 redirects on private routes | **PASS** 🟢 |
| **API Access Control** | `tests/e2e/api-access-control.spec.ts` | 7 | 401 Unauthorized enforcement across private REST endpoints without session cookies | **PASS** 🟢 |
| **Component Database Lifecycle** | `tests/e2e/component-lifecycle.spec.ts` | 2 | Component creation, querying, foreign-key relational cascade, and responsive viewports | **PASS** 🟢 |

---

## 🌐 Deployment & Environment Variables

Synthetix is configured for deployment on **Vercel** with continuous deployment from GitHub:

1. Push your repository to GitHub.
2. Import the project into Vercel.
3. Configure the following environment variables in **Project Settings → Environment Variables**:

```env
# ── Authentication (Clerk) ────────────────────────────────────────────────────
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# ── Database (Supabase PostgreSQL + Prisma) ──────────────────────────────────
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres

# ── Artificial Intelligence (Google Gemini) ───────────────────────────────────
GEMINI_API_KEY=AIzaSy...

# ── Application Security (Arcjet) ─────────────────────────────────────────────
ARCJET_KEY=ajkey_...
ARCJET_ENV=production

# ── Cloud Storage (Supabase Storage) ──────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://[ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# ── Programmatic Deployments (Vercel API) ─────────────────────────────────────
VERCEL_TOKEN=vcp_...

# ── Real-Time Presence (Liveblocks) ───────────────────────────────────────────
LIVEBLOCKS_SECRET_KEY=sk_prod_...
NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY=pk_prod_...

# ── Admin Dashboard Access ────────────────────────────────────────────────────
ADMIN_CLERK_ID=auto  # Set to your Clerk user_id or "auto" for first registered user
```

---

## ⚠️ Known Limitations

To maintain accurate technical documentation for portfolio reviews and engineering interviews:

- **Multiplayer Cursor Presence**: Liveblocks room authentication and cursor coordinate broadcasting are implemented; live two-user cursor synchronization requires manual testing with two concurrent browser sessions logged into separate Clerk accounts.
- **Programmatic Vercel Deployments**: The programmatic 1-click Vercel deployment endpoint (`/api/deploy`) is implemented; live deployment not continuously verified to avoid consuming user project deployment quotas. Standalone ZIP exports build and run independently without external deployment tokens.
- **AI Generation Quotas**: Live generation is verified in production on the Gemini API; high-volume production traffic may require Google Cloud quota adjustments.
- **Mobile Experience**: Because multi-file code editing and live Sandpack execution require desktop screen real estate, navigating to `/workspace` on mobile devices displays an informative desktop-recommendation banner (`MobileBlocker.tsx`). All other routes (homepage, library, projects) are fully responsive.

---

## 📄 License

This project is open-source software licensed under the [MIT License](LICENSE).

---

<div align="center">
  <br />
  <p>
    Authored by <strong><a href="https://github.com/tanmay-7706">Tanmay Singh</a></strong>
  </p>
  <p>
    <a href="https://synthetix-agent.vercel.app/">Live Production Application</a> •
    <a href="https://github.com/tanmay-7706/Synthetix">GitHub Repository</a> •
    <a href="https://github.com/tanmay-7706/Synthetix/issues">Issue Tracker</a>
  </p>
  <br />
</div>
