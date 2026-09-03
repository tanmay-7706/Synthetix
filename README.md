<div align="center">
  <br />
  <img src="public/logo.png" alt="Synthetix Logo" width="280" />
  <br /><br />

  <h1>Synthetix</h1>
  <h3>Agentic AI Application Builder</h3>

  <p>
    <strong>From Prompt to Production — Generate, preview, and deploy full-stack React applications in seconds.</strong>
  </p>

  <p>
    <a href="https://synthetix-agent.vercel.app/" target="_blank">
      <img src="https://img.shields.io/badge/🚀 Live Demo-synthetix--agent.vercel.app-blue?style=for-the-badge" alt="Live Demo" />
    </a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
    <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
    <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Gemini-3.5 Flash-FF6D00?style=for-the-badge&logo=google&logoColor=white" alt="Gemini" />
    <img src="https://img.shields.io/badge/Supabase-Postgres-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
    <img src="https://img.shields.io/badge/Deployed on-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel" />
  </p>

  <br />

  <p>
    <a href="#-overview">Overview</a> •
    <a href="#-features">Features</a> •
    <a href="#-architecture">Architecture</a> •
    <a href="#-tech-stack">Tech Stack</a> •
    <a href="#-getting-started">Getting Started</a> •
    <a href="#-environment-variables">Environment Variables</a>
  </p>
</div>

---

## 📖 Overview

**Synthetix** is a next-generation, production-grade AI development workspace. It transforms natural language prompts (and even design screenshots) into fully functional React applications — with a live in-browser preview, AI-powered error correction, real-time multiplayer collaboration, and one-click Vercel deployment.

Built to demonstrate advanced AI orchestration, full-stack architecture, and SaaS product design — Synthetix is far beyond a tutorial project.

---

## ✨ Features

### 🧠 Core AI Engine
- **Prompt → App Generation** — Describe any UI or logic; Gemini generates a complete, multi-file React app with correct dependencies
- **Conversational Refinement** — Chat with the AI to iterate on layouts, fix bugs, change color palettes, or add new sections
- **Multi-Modal Vision (Image → Code)** — Upload a screenshot or wireframe and the AI replicates it pixel-perfectly using Gemini's native vision API
- **Framework Engine** — Select your tech stack (CRA / Vite / Vue 3) and UI library (Tailwind / Shadcn / NextUI) — the AI prompt and Sandpack template both switch dynamically

### ⚡ Live Execution Environment
- **Instant In-Browser Preview** — Sandpack renders generated code in a full isolated sandbox with zero context switching
- **Self-Healing UI** — When the preview throws a runtime error, the system silently auto-detects it, calls Gemini in the background, and patches the broken file — up to 3 attempts before surfacing it to the user
- **Code Editor** — Full syntax-highlighted editor with file explorer, powered by CodeMirror inside Sandpack

### 👥 Collaboration & Versioning
- **Real-Time Multiplayer** — Multiple users can collaborate in the same workspace simultaneously with live cursors and avatar presence (powered by Liveblocks)
- **Version History** — Every generation creates a version snapshot. Restore any previous state with a single click
- **Component Library** — Save generated components to a personal library with tags, and reuse them across projects with live mini-previews

### 🚀 Deployment & Export
- **1-Click Deploy to Vercel** — Deploy any generated app directly to Vercel's CDN with a live public URL, all from within the workspace
- **ZIP Export** — Download the full project as a ready-to-use `.zip` file (includes `package.json`, `public/`, and all source files)

### 🛡️ Security & Infrastructure
- **Arcjet Security Layer** — Defends against AI prompt injection attacks, bot scraping, and API abuse via multi-rule dynamic rate limiting
- **Row-Level Security** — Supabase RLS policies ensure users can only access their own data at the database level
- **Clerk Authentication** — Secure, production-grade auth with social login, session management, and middleware protection

### 💎 SaaS Monetization
- **Free & Pro Tiers** — Credit-based usage system with a Pricing Modal gating premium features
- **Admin Dashboard** — Real-time platform analytics (total users, workspaces, credit usage) for the platform owner
- **Pro Features** — "Improve with AI Agent" capability for targeted, conversational code improvements

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser Client                        │
│                                                              │
│  ChatPanel (Prompt Input + Vision Upload)                    │
│       │                                                      │
│       ▼                                                      │
│  WorkspaceClient (State Orchestrator)                        │
│       │                      │                              │
│       ▼                      ▼                              │
│  /api/gen-ai-code      CodePanel (Sandpack)                  │
│  (SSE Stream)           ├── Live Preview                    │
│       │                 ├── Code Editor                     │
│       ▼                 ├── Framework Selector              │
│  Gemini 3.5 Flash       └── Self-Healing Engine             │
│  (with Vision +                                             │
│   Thinking Mode)         Liveblocks Room                    │
│                          └── Multiplayer Cursors            │
└─────────────────────────────────────────────────────────────┘
         │                          │
         ▼                          ▼
   Supabase (Postgres)        Vercel (1-Click Deploy)
   + Prisma ORM               REST API via /api/deploy
   + RLS Policies
         │
         ▼
   Clerk (Auth) + Arcjet (Security)
```

**Key design decisions:**

1. **SSE Streaming** — Generation streams over Server-Sent Events so the UI shows thinking steps in real time instead of waiting for the full response
2. **Stable Sandpack** — File content changes are applied via `sandpack.updateFile()` (not provider remounts), preventing full iframe reloads on every edit
3. **Lazy Liveblocks Init** — The Liveblocks client is initialized inside the handler (not at module level) to prevent Vercel's static page collection from crashing if the key is unconfigured
4. **Framework-Aware Prompting** — When a user selects Vue or Vite, a `frameworkSuffix` is appended to the Gemini system prompt so the AI generates the correct framework code, not just CRA React

---

## 💻 Tech Stack

| Category | Technologies |
|---|---|
| **Framework** | Next.js 16 (App Router, Turbopack, Server Components) |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS, shadcn/ui, Radix UI |
| **AI / ML** | Google Gemini 3.5 Flash (text + vision + thinking mode) |
| **Code Sandbox** | Sandpack by CodeSandbox (in-browser bundler) |
| **Database** | Supabase (PostgreSQL), Prisma ORM, Row-Level Security |
| **Authentication** | Clerk (social login, middleware, session management) |
| **Multiplayer** | Liveblocks (presence, cursors, rooms) |
| **Security** | Arcjet (rate limiting, bot detection, prompt injection defense) |
| **Deployment** | Vercel (app hosting + programmatic deploy API) |
| **Storage** | Supabase Storage (vision image uploads) |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- A [Supabase](https://supabase.com) project
- A [Clerk](https://clerk.com) application
- A [Google AI Studio](https://aistudio.google.com) API key
- An [Arcjet](https://arcjet.com) account
- A [Liveblocks](https://liveblocks.io) account *(for multiplayer)*
- A [Vercel](https://vercel.com) account + token *(for 1-click deploy)*

### 1. Clone the repository
```bash
git clone https://github.com/tanmay-7706/Synthetix.git
cd Synthetix
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables
```bash
cp .env.example .env.local
```
Fill in the values (see [Environment Variables](#-environment-variables) below).

### 4. Push the database schema
```bash
npx prisma db push
```

### 5. Start the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Environment Variables

```env
# ── Clerk (Authentication) ────────────────────────────────────────────────────
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# ── Database (Supabase + Prisma) ─────────────────────────────────────────────
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres

# ── AI (Google Gemini) ────────────────────────────────────────────────────────
GEMINI_API_KEY=AIza...

# ── Security (Arcjet) ────────────────────────────────────────────────────────
ARCJET_KEY=ajkey_...
ARCJET_ENV=development

# ── File Storage (Supabase) ──────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://[ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# ── Deployment (Vercel) ──────────────────────────────────────────────────────
VERCEL_TOKEN=vcp_...

# ── Multiplayer (Liveblocks) ─────────────────────────────────────────────────
LIVEBLOCKS_SECRET_KEY=sk_prod_...
NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY=pk_prod_...

# ── Admin Dashboard ──────────────────────────────────────────────────────────
# Set to your Clerk user ID, or "auto" to make the first registered user admin
ADMIN_CLERK_ID=auto
```

---

## 📁 Project Structure

```
synthetix/
├── app/
│   ├── (main)/
│   │   ├── admin/          # Admin dashboard
│   │   ├── library/        # Component library page
│   │   ├── projects/       # Project listing
│   │   └── workspace/      # Main generation workspace
│   └── api/
│       ├── gen-ai-code/    # Core AI generation (SSE stream)
│       ├── improve/        # AI improvement endpoint
│       ├── heal/           # Self-healing error correction
│       ├── deploy/         # 1-click Vercel deploy
│       ├── versions/       # Version snapshots + restore
│       ├── components/     # Component library CRUD
│       ├── liveblocks-auth/# Multiplayer auth
│       └── admin/stats/    # Platform analytics
├── components/
│   ├── CodePanel.tsx       # Sandpack integration + toolbar
│   ├── ChatPanel.tsx       # Conversation UI + vision upload
│   ├── WorkspaceClient.tsx # State orchestrator
│   ├── FrameworkModal.tsx  # Framework/UI selector
│   ├── CollaboratorCursors.tsx # Liveblocks presence UI
│   ├── VersionHistory.tsx  # Version history panel
│   └── PricingModal.tsx    # Subscription upgrade modal
├── lib/
│   ├── framework-configs.ts # Framework engine + prompt suffixes
│   ├── liveblocks.config.ts # Liveblocks client config
│   ├── prisma.ts           # Prisma client singleton
│   ├── arcjet.ts           # Arcjet security config
│   └── constants.ts        # Credit costs, plan limits
└── prisma/
    └── schema.prisma       # User, Workspace, Version, Component models
```

---

## 🗺️ Roadmap

- [ ] **Figma → Code** — Extract design tokens from Figma URLs via the Figma REST API
- [ ] **GitHub Export** — Push generated code directly to a new GitHub repository
- [ ] **Custom Domain Deploy** — Configure a custom domain for 1-click deployed apps
- [ ] **AI Test Generation** — Auto-generate unit tests for generated components

---

<div align="center">
  <br />
  <p>
    Built with ❤️ by <a href="https://github.com/tanmay-7706">Tanmay Singh</a>
  </p>
  <p>
    <a href="https://synthetix-agent.vercel.app/">Live Demo</a> •
    <a href="https://github.com/tanmay-7706/Synthetix/issues">Report Bug</a> •
    <a href="https://github.com/tanmay-7706/Synthetix/issues">Request Feature</a>
  </p>
  <br />
</div>
