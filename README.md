# Synthetix 🚀

A full-stack, AI-powered React application generator. Synthetix allows users to describe the application they want to build, and the AI autonomously writes the code, selects the necessary packages, and renders a live, interactive preview entirely within the browser.

## ✨ Features

- **Prompt-to-App Generation**: Describe any UI or application, and the AI will build it.
- **Live Interactive Preview**: Instant rendering of React code using Sandpack.
- **Agentic AI Refinement**: Iteratively improve and chat with the AI to tweak the UI, add features, or fix bugs.
- **Code Export**: Download your generated application as a full ZIP file ready for deployment.
- **Secure Architecture**: Built-in rate limiting, bot protection, and prompt injection defenses.
- **Pro Tier**: Subscription management for increased generation limits.

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [shadcn/ui](https://ui.shadcn.com/)
- **Authentication**: [Clerk](https://clerk.com/)
- **Database & ORM**: [Supabase](https://supabase.com/) & [Prisma](https://www.prisma.io/)
- **AI & Agent Runtime**: [Gemini 3.5 Flash](https://deepmind.google/technologies/gemini/) via the [@cline/sdk](https://github.com/cline/sdk)
- **Live Code Execution**: [Sandpack](https://sandpack.codesandbox.io/)
- **Security**: [Arcjet](https://arcjet.com/)

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/tanmay-7706/Synthetix.git
cd Synthetix
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up Environment Variables
Create a `.env.local` file in the root directory and add your API keys:
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

DATABASE_URL=
DIRECT_URL=

GEMINI_API_KEY=
ARCJET_KEY=
ARCJET_ENV="development"
```

### 4. Setup Database
```bash
npx prisma db push
```

### 5. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

---
*Made with shadcn ui, supabase, etc.*


<!-- Cache invalidation commit -->
