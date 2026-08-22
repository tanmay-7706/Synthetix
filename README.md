<div align="center">
  <br />
  <img src="public/logo.png" alt="Synthetix Logo" width="300" />
  <br />

  <h3 align="center">Synthetix: Agentic AI Application Builder</h3>

  <p align="center">
    <strong>From Prompt to Production. Build full-stack React applications instantly inside your browser.</strong>
  </p>

  <p align="center">
    <a href="#-tech-stack">Tech Stack</a> •
    <a href="#-architecture">Architecture</a> •
    <a href="#-features">Features</a> •
    <a href="#-getting-started">Getting Started</a>
  </p>
  
  <p align="center">
    <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js" alt="Next.js" />
    <img src="https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react" alt="React" />
    <img src="https://img.shields.io/badge/TypeScript-Ready-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
    <img src="https://img.shields.io/badge/AI-Gemini%203.5-orange?style=for-the-badge" alt="Gemini" />
    <img src="https://img.shields.io/badge/Database-Supabase-green?style=for-the-badge&logo=supabase" alt="Supabase" />
  </p>
</div>

<br/>

## 📖 Overview

**Synthetix** is a next-generation AI-powered development workspace that autonomously generates, refines, and executes React applications based on natural language prompts. It bridges the gap between ideation and deployment by combining a conversational AI agent with a live, in-browser code execution sandbox. 

Whether you want to build a specialized dashboard, a landing page, or a complex UI component, Synthetix handles the architecture, component hierarchy, styling (via Tailwind & shadcn/ui), and dependency management.

---

## 🏗️ Architecture

Synthetix employs a highly modern, agent-driven architecture designed for scale and security:

1. **The Agentic Core**: Powered by **Google's Gemini 3.5 Flash** and orchestrated via the **Cline SDK**, the AI agent doesn't just write text—it writes file structures, resolves dependencies, and iteratively patches code based on real-time feedback.
2. **Execution Environment**: We utilize **Sandpack** (by CodeSandbox) to create an isolated, secure, and blazing-fast in-browser bundler that renders the AI's generated React code instantly.
3. **Security Layer**: Integrated with **Arcjet** to provide robust defenses against AI Prompt Injection attacks, bot scraping, and API abuse via dynamic rate limiting.
4. **Data & Auth**: **Clerk** handles secure user authentication and session management, while **Supabase** (interfaced via Prisma ORM) manages user profiles, project persistence, and subscription data.

---

## ✨ Features

- 🧠 **Prompt-to-App Generation**: Describe the UI or logic you need, and the AI will scaffold a production-ready React component.
- ⚡ **Live Interactive Preview**: Instantly see your generated code render in real-time. No context switching.
- 🔄 **Conversational Refinement**: Chat with the agent to tweak layouts, switch color palettes, or debug issues on the fly.
- 📦 **One-Click Export**: Download your generated application as a complete `.zip` file, ready to be deployed to Vercel or Netlify.
- 🛡️ **Enterprise-Grade Security**: Built-in defenses against malicious AI prompts and rate-limiting abuse.
- 💎 **SaaS Ready**: Fully integrated subscription models (Free & Pro tiers) managed via Supabase.

---

## 💻 Tech Stack

| Category | Technologies |
|---|---|
| **Frontend** | Next.js 16 (App Router), React, Tailwind CSS, shadcn/ui, Framer Motion |
| **AI / ML** | Gemini 3.5 Flash, @cline/sdk |
| **Backend & DB** | Supabase, PostgreSQL, Prisma ORM |
| **Authentication** | Clerk |
| **Code Execution** | Sandpack (CodeSandbox) |
| **Security** | Arcjet (Rate Limiting, Bot Detection, Prompt Injection Defense) |

---

## 🚀 Getting Started

Follow these steps to run Synthetix locally on your machine.

### 1. Clone the repository
```bash
git clone https://github.com/tanmay-7706/Synthetix.git
cd Synthetix
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Variables
Create a `.env.local` file in the project root. You will need to provision API keys from Clerk, Supabase, Google AI Studio (Gemini), and Arcjet.

```env
# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_pub_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Database (Supabase)
DATABASE_URL=your_transaction_connection_string
DIRECT_URL=your_session_connection_string

# AI Provider
GEMINI_API_KEY=your_gemini_api_key

# Security (Arcjet)
ARCJET_KEY=your_arcjet_key
ARCJET_ENV="development"
```

### 4. Database Migration
Push the Prisma schema to your Supabase instance:
```bash
npx prisma db push
```

### 5. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application in your browser.

---

<div align="center">
  <p>Built with passion and a vision for the future of AI development.</p>
</div>
