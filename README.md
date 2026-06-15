# Aurora — AI-Powered Health Companion

🚀 **Say hello to Aurora — a next-generation AI Health & Wellness Companion!**

Aurora is a full-stack, voice-enabled companion application that helps you manage your wellness journey. Rather than acting as a static tracker, it is powered by an agentic AI that listens, learns, and interacts dynamically with user data.

---

## ✨ Key Features

* 🗣️ **Interactive Voice & Chat**: Speak or type to discuss habits, sleep, or hydration using Whisper-1 and Text-to-Speech (TTS).
* 🤖 **Agentic Actions**: The AI can write directly back to the database. Tell it *"I drank 500ml water"* or *"I slept 8 hours"* and watch it instantly update your dashboard.
* 💧 **Hydration & Sleep Trackers**: Log daily water intake and sleep patterns with automated metrics and streak calculations.
* 🥗 **Habits & Nutrition Logs**: Interactive checklists, calorie tracking, and progress trends to keep you on path.
* 🔔 **Smart Notifications & Alerts**: Custom reminders for hydration, habit streaks, and wellness checkpoints to keep users engaged.
* 🔐 **Secure Clerk Authentication & Mock OAuth**: Cookie-based Clerk auth integrated with a premium, glassmorphic Google/Apple account chooser for developer testing.
* 🌓 **Responsive Dark & Light Mode**: Seamless theme switching with custom Amber `Sun` and Indigo `Moon` icon animations across all landing and internal pages.
* 📊 **Data Visualization**: Rich dashboards powered by Recharts, updating dynamically in real-time as you log details.

---

## 🛠️ Tech Stack

* 📦 **Containerization**: Docker & Docker Compose setup for consistent production and local environments.
* 🔑 **Authentication**: Clerk Auth (with custom Google/Apple developer mock flows).
* 🏗️ **Monorepo Architecture**: Node.js & TypeScript with `pnpm` workspaces.
* 🎨 **Frontend**: React 19, Vite 7, Tailwind CSS v4, shadcn/ui components, wouter client routing, and Recharts dashboards.
* ⚙️ **Backend API**: Express 5 (served at `/api`), esbuild compilation (ESM module bundle).
* 🗄️ **Database & ORM**: PostgreSQL 16 + Drizzle ORM, `schema.sql` initialization.
* 🧠 **AI Platform**: OpenAI API (Whisper-1, TTS-1, gpt-4o-mini) & Gemini API.
* 🛡️ **Validation & Codegen**: Zod schema validation & Orval OpenAPI client codegen.

---

## 🛠️ Environment Variables Configuration

To run the application, configure your variables in the root [.env](file:///Users/bipasasaha/Documents/carebot/Untitled/AURORA-AI/.env) or [.env.local](file:///Users/bipasasaha/Documents/carebot/Untitled/AURORA-AI/.env.local) file:

```ini
# Database Connection String
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/health_companion"

# Local Server Ports
PORT=8080
FRONTEND_PORT=8082

# Auth Settings
BYPASS_CLERK=true
VITE_BYPASS_CLERK=true

# AI Service Keys
OPENAI_API_KEY="your_openai_api_key"
GEMINI_API_KEY="your_gemini_api_key"

# Session Details
SESSION_SECRET="super-secret-session-key-12345"
```

---

## 💻 Step-by-Step Setup & Run Guide

### Prerequisites
Make sure you have the following installed on your machine:
* **Node.js** (v24 recommended)
* **pnpm** (workspaces package manager)
* **PostgreSQL** (running locally on port 5432) or **Docker**

---

### Step 1: Environment Variables Configuration
Create a `.env` file (or copy the existing `.env.local` to `.env`) in the root directory and ensure the variables are populated correctly:
```bash
cp .env.local .env
```
Ensure your database connection string, OpenAI key, Gemini key, and Clerk credentials are configured inside `.env`.

---

### Step 2: Install Project Dependencies
Use `pnpm` to install all package workspace dependencies:
```bash
pnpm install
```

---

### Step 3: Run Database Schema setup
Apply the `schema.sql` database file to initialize the PostgreSQL database tables:
```bash
psql "postgresql://postgres:postgres@localhost:5432/health_companion" -f schema.sql
```

---

### Step 4: Run the Application

#### Option A: Automatic Dev Launcher (Recommended)
Simply launch the dev manager shell script from the root directory:
```bash
chmod +x run-dev.sh
./run-dev.sh
```
This script validates your setup, checks if PostgreSQL is running, applies the database schemas, cleans the ports, and boots up both the backend API and frontend React application concurrently.

#### Option B: Manual Local Running
If you prefer to run services individually in separate terminal windows:
1. **API Server (Port 8080)**:
   ```bash
   pnpm --filter @workspace/api-server run dev
   ```
2. **Frontend Client (Port 8082)**:
   ```bash
   pnpm --filter @workspace/aurora dev
   ```

#### Option C: Run via Docker (Docker Compose)
To run the full stack (database, api, frontend) containerized:
```bash
docker-compose up --build
```

---

### Additional Developer Commands
* **Typecheck Verification**: `pnpm --filter @workspace/aurora typecheck`
* **Codegen**: `pnpm --filter @workspace/api-spec run codegen`

---

## 📂 Project Architecture

* [artifacts/aurora/src/pages/](file:///Users/bipasasaha/Documents/carebot/Untitled/AURORA-AI/artifacts/aurora/src/pages/) — Main application pages:
  * [landing.tsx](file:///Users/bipasasaha/Documents/carebot/Untitled/AURORA-AI/artifacts/aurora/src/pages/landing.tsx) — Landing page, landing stats carousel, and theme toggle.
  * [aurora-ai.tsx](file:///Users/bipasasaha/Documents/carebot/Untitled/AURORA-AI/artifacts/aurora/src/pages/aurora-ai.tsx) — Voice & text AI Companion chat page.
  * [habits.tsx](file:///Users/bipasasaha/Documents/carebot/Untitled/AURORA-AI/artifacts/aurora/src/pages/habits.tsx) — Habit checklist and streak calculator.
  * [hydration.tsx](file:///Users/bipasasaha/Documents/carebot/Untitled/AURORA-AI/artifacts/aurora/src/pages/hydration.tsx) — Daily tracking log & 7-day water graphs.
* [artifacts/aurora/src/lib/clerk.tsx](file:///Users/bipasasaha/Documents/carebot/Untitled/AURORA-AI/artifacts/aurora/src/lib/clerk.tsx) — Local mock authentication middleware and Google/Apple overlay dialog rendering.
* [artifacts/api-server/src/](file:///Users/bipasasaha/Documents/carebot/Untitled/AURORA-AI/artifacts/api-server/src/) — API server controllers, mock authentication, OpenAI integrations, and speech handlers.
* [schema.sql](file:///Users/bipasasaha/Documents/carebot/Untitled/AURORA-AI/schema.sql) — PostgreSQL tables structure.
