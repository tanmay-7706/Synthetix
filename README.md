<div align="center">
  <br />
  <img src="public/logo.png" alt="Synthetix Logo" width="280" />
  <br /><br />

  <h1>Synthetix</h1>
  <p><strong>Production-Grade Agentic AI Application Builder & In-Browser Development Workspace</strong></p>

  <p>
    <a href="https://synthetix-agent.vercel.app/" target="_blank">
      <img src="https://img.shields.io/badge/🚀_Live_Production_Demo-synthetix--agent.vercel.app-2563eb?style=for-the-badge" alt="Live Demo" />
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
    <img src="https://img.shields.io/badge/Security-Arcjet_Token_Bucket-purple?style=flat-square" alt="Arcjet Security" />
  </p>

  <br />

  <p>
    <a href="#-executive-summary">Executive Summary</a> •
    <a href="#-architecture--request-lifecycle">Architecture</a> •
    <a href="#-key-engineering-highlights">Engineering Highlights</a> •
    <a href="#-tech-stack">Tech Stack</a> •
    <a href="#-testing--verification">Testing & Quality</a> •
    <a href="#-getting-started">Getting Started</a> •
    <a href="#-environment-variables">Environment Variables</a> •
    <a href="#-calibrated-operational-notes">Operational Notes</a>
  </p>
</div>

---

## 📌 Executive Summary

**Synthetix** is a full-stack, cloud-native AI web application builder that translates natural language prompts and design wireframes into fully functional, multi-file web applications in real time.

Unlike generic code generators that output single markdown code blocks, Synthetix features a specialized client-server architecture:
1. **Server-Sent Events (SSE) Streaming Pipeline**: Streams model reasoning thoughts, architectural plans, dependency checks, and structured multi-file code trees.
2. **Fault-Tolerant JSON Recovery Engine**: Progressively sanitizes and extracts valid multi-file ASTs from LLM outputs even when models emit raw control characters or unescaped JSX quotes.
3. **In-Browser Sandpack Runtime**: Directly executes React and Vue applications in an isolated client sandbox with hot module replacement, custom UI frameworks, and zero full-page reloads.
4. **Autonomous Self-Healing Runtime**: Traps unhandled Sandpack iframe exceptions, debounces errors, and streams surgical automated patches via Gemini with a 3-attempt circuit breaker.
5. **Multi-Tenant Relational Isolation**: Backed by Supabase PostgreSQL and Prisma ORM, enforcing strict user ownership, version snapshotting, and component libraries.

Live production deployment is actively maintained and verified at [**synthetix-agent.vercel.app**](https://synthetix-agent.vercel.app).

---

## 🏗️ Architecture & Request Lifecycle

```
                                  [ User Browser ]
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 │                                               │
           [ Chat Panel ]                                [ Sandpack Runtime ]
     Prompt + Vision Screenshot                     In-Browser Isolated Execution
                 │                                               ▲
                 │ (HTTP POST SSE)                               │ (sandpack.updateFile)
                 ▼                                               │
      [/api/gen-ai-code Handler]                                 │
     Edge Proxy & Clerk Identity                                 │
                 │                                               │
                 ├──► [ Arcjet Rate Limiting & Bot Shield ]      │
                 │                                               │
                 ├──► [ Google Gemini 3.5 Flash Engine ]         │
                 │      ├── Thinking & Planning Stream           │
                 │      └── Multi-File Code Synthesis            │
                 │                                               │
                 ├──► [ Fault-Tolerant JSON Recovery ] ──────────┘
                 │      ├── Strict Parse -> Fence Stripping
                 │      ├── Control Character Escape in Strings
                 │      └── Structural AST / Field Extraction
                 │
                 ├──► [ Supabase PostgreSQL (Prisma ORM) ]
                 │      ├── Workspace Record Creation
                 │      ├── Version Snapshot Persistence
                 │      └── User Credit Deduction (Atomic)
                 │
                 └──► [ Liveblocks Real-time Room ]
                        └── Collaborator Cursors & Presence
```

---

## 💡 Key Engineering Highlights

### 1. Resilient SSE AI Streaming & Fault-Tolerant JSON Recovery
Large Language Models frequently emit raw unescaped newlines, unescaped double quotes inside JSX attributes (`className="..."`), or markdown code fences when generating complex multi-file schemas. Standard `JSON.parse` immediately throws `SyntaxError`, resulting in broken generation streams.

Synthetix resolves this with a 4-tier progressive recovery pipeline (`lib/json-recovery.ts`):
- **Tier 1 (Strict Parse)**: Attempts high-performance native `JSON.parse`.
- **Tier 2 (Fence & Boundary Extraction)**: Trims prose and strips surrounding Markdown triple-backtick fences (` ```json `).
- **Tier 3 (String Literal Sanitization)**: Deterministically walks string boundaries and escapes unescaped control characters (`\n`, `\r`, `\t`) inside JSON string values without corrupting structural whitespace.
- **Tier 4 (Structural AST Extraction)**: Regex-extracts top-level properties (`assistantMessage`, `title`, `creditsRemaining`) and isolates individual file entries (`/App.js`, `/components/*.js`), reconstructing clean JSON even with unescaped nested JSX quotes.

### 2. Zero-Flicker In-Browser Code Sandboxing
Synthetix integrates CodeSandbox's Sandpack runtime to execute generated code client-side without spinning up expensive cloud containers. To prevent disruptive iframe re-mounts on every keystroke or generation token:
- Files are updated incrementally using `sandpack.updateFile()`.
- Active file buffers and tab states are preserved in React state.
- Dynamic dependency injection injects requisite packages (`lucide-react`, `framer-motion`, `recharts`, Tailwind CSS) on the fly.

### 3. Autonomous Self-Healing Error Correction
When previewed code produces a runtime error (syntax error, missing import, null reference), Synthetix's error interceptor captures the stack trace from Sandpack:
- Debounces errors (1,800ms) to ignore transient typing errors.
- Dispatches targeted error contexts and existing file trees to `/api/heal`.
- Enforces a 3-attempt circuit breaker to prevent infinite healing loops.
- Rate-limited per user via Arcjet (10 req/min) to prevent credit exhaustion.

### 4. Multi-Framework Export Engine
Generated applications are not locked into the web IDE. Synthetix includes a multi-framework bundle generator (`lib/project-export.ts`):
- **Vite + React**: Standalone production bundle with `vite.config.js`, `@vitejs/plugin-react`, and Tailwind configuration.
- **Vite + Vue 3**: Converted single-file component templates with `@vitejs/plugin-vue`.
- **Create React App (CRA)**: Standard React Scripts bundle with `public/index.html` and manifest.
- **Instant ZIP Export**: Downloads complete, ready-to-run codebases with `package.json` that execute independently via `npm install && npm run build`.

### 5. Multi-Tenant Access Isolation & Security
- **Edge Authentication Proxy**: Next.js 16 Proxy layer gates all private application routes (`/workspace`, `/projects`, `/library`, `/admin`), issuing HTTP 307 redirects to sign-in.
- **In-Depth IDOR Defense**: All API routes verify tenant ownership (`where: { userId: user.id }`) before querying or modifying workspaces, versions, or components.
- **Arcjet Security**: Employs user-based token bucket rate limiting (10 req/min heal, 3 req/min deploy, 5 req/min AI code) and automated bot shielding (`DRY_RUN` in dev, `LIVE` in prod).

---

## 🛠️ Tech Stack

| Layer | Technologies | Rationale |
|---|---|---|
| **Full-Stack Framework** | **Next.js 16** (App Router, Turbopack, React 19) | High-performance edge routing, server components, and rapid compile times |
| **Language** | **TypeScript 5 (Strict Mode)** | End-to-end type safety across schemas, API payloads, and components |
| **Styling & UI** | **Tailwind CSS**, **shadcn/ui**, **Radix UI**, **Lucide Icons** | Accessible, responsive, dark-mode-first component system |
| **AI Orchestration** | **Google Gemini 3.5 Flash** (Text + Vision + Thinking) | Sub-second latency, 1M+ token context, native image parsing, and structured reasoning |
| **In-Browser Runtime** | **Sandpack (CodeSandbox)** | Instant, client-side compilation and hot reloading of React and Vue applications |
| **Database & ORM** | **Supabase (PostgreSQL 17)**, **Prisma ORM** | Relational integrity, foreign key constraints (`ON DELETE CASCADE`), connection pooling |
| **Authentication** | **Clerk** | Social OAuth, session cookie management, protected route middleware |
| **Real-Time Collaboration** | **Liveblocks** | Room-based state synchronization and pointer coordinate broadcasting |
| **Application Security** | **Arcjet** | Token bucket rate limiting, prompt injection defenses, and bot protection |
| **Automated Testing** | **Vitest 5**, **Playwright Test** | Deterministic unit tests (~140ms execution) and Chromium browser E2E flows |
| **Hosting & CI/CD** | **Vercel** | Automated Git-triggered builds with custom `.npmrc` peer dependency resolution |

---

## 🧪 Testing & Verification

Synthetix enforces high code quality through automated test suites, type checking, and linting:

```bash
# Execute Vitest unit test suite (34 tests across 6 suites)
npm test

# Execute Playwright end-to-end test suite (16 tests across 3 suites)
npm run test:e2e

# Validate static typing and code linting
npx tsc --noEmit
npm run lint

# Production compilation
npm run build
```

### Automated Test Coverage Breakdown (50 Total Tests):

| Test Suite | Framework | Count | Key Verification Targets | Status |
|---|---|:---:|---|:---:|
| **AI JSON Recovery** | Vitest | 12 | Stripping markdown fences, control char escapes in strings, unescaped JSX quotes recovery | **PASS** 🟢 |
| **Project Export** | Vitest | 5 | Vite React, Vue 3, CRA package.json, entrypoints, index.html, and Vercel configs | **PASS** 🟢 |
| **Admin Access Control** | Vitest | 6 | Clerk ID matching, non-admin rejection, auto mode discovery, database error fallback | **PASS** 🟢 |
| **Version History Auth** | Vitest | 5 | 401 unauthenticated, 400 invalid params, 404 unowned workspace (IDOR protection) | **PASS** 🟢 |
| **Liveblocks Auth** | Vitest | 5 | 503 missing secret, 401 unauth, 403 unowned room access, 200 session token issue | **PASS** 🟢 |
| **Arcjet Rate Limiting** | Vitest | 1 | Token-bucket configurations for healing (10/min) and deploy (3/min) | **PASS** 🟢 |
| **Navigation & Auth Guards** | Playwright | 7 | Landing page render, prompt preservation across login, 307 redirects on private routes | **PASS** 🟢 |
| **API Access Control** | Playwright | 7 | 401 Unauthorized enforcement across private REST endpoints without session cookies | **PASS** 🟢 |
| **Database Lifecycle** | Playwright | 2 | Component creation, querying, foreign-key relational cascade, and responsive viewports | **PASS** 🟢 |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20.x or higher
- Supabase account (PostgreSQL database + storage)
- Clerk account (Authentication)
- Google AI Studio API key (Gemini 3.5 Flash)
- Arcjet account (Rate limiting & security)

### 1. Clone & Install
```bash
git clone https://github.com/tanmay-7706/Synthetix.git
cd Synthetix
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env.local
```
Configure your credentials in `.env.local` using the documented template below.

### 3. Deploy Database Migrations
```bash
npx prisma migrate deploy
npx prisma generate
```

### 4. Run Test Suite
```bash
npm test          # 34 Vitest unit tests in ~140ms
npm run test:e2e  # 16 Playwright browser tests
```

### 5. Launch Development Server
```bash
npm run dev
# Navigate to http://localhost:3000
```

---

## 🔑 Environment Variables

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
ARCJET_ENV=development  # Set to "production" in production deployments

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

## ⚠️ Calibrated Operational Notes

To ensure rigorous accuracy for technical evaluations and resume documentation:

- **AI Code Generation**: Fully verified in production (`https://synthetix-agent.vercel.app`). Multi-file generation, streaming reasoning, package validation, and Supabase PostgreSQL persistence are verified end-to-end.
- **Multiplayer Presence**: Presence coordinate broadcasting and room-based authorization with Liveblocks are implemented; live two-user cursor synchronization requires manual verification across two authenticated browser sessions.
- **Vercel User App Deployment**: Programmatic Vercel deployment integration is implemented via REST API; verified in unit/mock tests to avoid consuming live Vercel project quotas. Standalone ZIP exports build and run independently.
- **Database Engine**: Backed by Supabase PostgreSQL 17.6 with 3 applied Prisma migrations, foreign key constraints (`ON DELETE CASCADE`), and multi-tenant isolation enforced at the application data access layer.

---

## 📁 Repository Structure

```
synthetix/
├── app/
│   ├── (auth)/             # Clerk sign-in / sign-up routes
│   ├── (main)/
│   │   ├── admin/          # Platform owner metrics & analytics dashboard
│   │   ├── library/        # User component library with tags & search
│   │   ├── projects/       # User project portfolio & workspace selector
│   │   └── workspace/      # Main AI ideation, chat, and Sandpack preview
│   ├── api/
│   │   ├── gen-ai-code/    # Core SSE AI generation stream & persistence
│   │   ├── heal/           # Autonomous runtime error self-healing
│   │   ├── improve/        # Targeted AI code refinement
│   │   ├── deploy/         # Programmatic Vercel deployment API
│   │   ├── versions/       # Snapshot history creation & restore
│   │   ├── components/     # Component library CRUD operations
│   │   ├── liveblocks-auth/# Multiplayer room authorization
│   │   └── admin/stats/    # System analytics aggregation
├── components/
│   ├── CodePanel.tsx       # Sandpack runtime, toolbar, framework switcher
│   ├── ChatPanel.tsx       # Prompt submission, thoughts feed, vision upload
│   ├── WorkspaceClient.tsx # Central state orchestrator & event bus
│   ├── FrameworkModal.tsx  # Framework (React/Vite/Vue) & UI library selector
│   ├── CollaboratorCursors.tsx # Real-time cursor overlay
│   ├── VersionHistory.tsx  # Version snapshot inspector
│   └── PricingModal.tsx    # Plan upgrade & credit management modal
├── lib/
│   ├── json-recovery.ts    # 4-tier fault-tolerant JSON extraction engine
│   ├── project-export.ts   # Multi-framework bundle generator (Vite/Vue/CRA)
│   ├── framework-configs.ts# Framework system prompts & Sandpack configs
│   ├── arcjet.ts           # Token bucket rate limiting & bot defense rules
│   └── prisma.ts           # Type-safe Prisma Client singleton
├── prisma/
│   ├── schema.prisma       # Relational models: User, Workspace, Version, Component
│   └── migrations/         # Non-destructive version-controlled SQL migrations
└── tests/
    ├── unit/               # 34 Vitest unit tests (export, admin, arcjet, auth, json)
    └── e2e/                # 16 Playwright E2E tests (auth, navigation, lifecycle)
```

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
