# Creador Foundation — "Multiply India"

A financial literacy platform for low-income women in India: structured learning courses, gamified progress tracking, admin-curated content, and an AI-powered Financial Assistant chatbot (text + voice).

## Stack

- **Backend**: Node.js, Express 5, MongoDB / Mongoose 9, JWT auth
- **Frontend**: React 19, Vite 8, React Router 7
- **Bot**: OpenAI (GPT-4o-mini) grounded on the same admin-curated `ContentItem` library, with a template-based fallback when the LLM is unavailable

## Project Structure

```
backend/     Express API (auth, content, goals, admin, bot)
frontend/    React SPA (landing, auth, dashboard, admin, bot chat)
INTEGRATION.md   Team integration guide (models, routes, per-person ownership)
api_contract.md  Frozen API contract — do not change without updating this file
```

## Prerequisites

- Node.js 18+
- A MongoDB connection string (Atlas or local)
- An OpenAI API key (optional — the bot falls back to a template-based answer if missing or if the LLM call fails)

## Setup

1. **Install dependencies**

   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

2. **Configure environment variables**

   Copy `backend/.env.example` to `backend/.env` and fill in your values:

   ```
   PORT=5000
   CLIENT_URL=http://localhost:5173
   MONGODB_URI=mongodb://localhost:27017/multiply-india
   JWT_SECRET=your_super_secret_jwt_key_here
   JWT_EXPIRES_IN=7d
   OPENAI_API_KEY=
   ```

3. **Seed the content library** (only if `ContentItem` collection is empty — this wipes existing content)

   ```bash
   cd backend && npm run seed
   ```

4. **Create an admin user** (optional, for the admin dashboard)

   ```bash
   cd backend && npm run create-admin
   ```

## Running

```bash
# Backend (http://localhost:5000)
cd backend && npm run dev

# Frontend (http://localhost:5173)
cd frontend && npm run dev
```

## Testing

```bash
cd backend
npm test           # auth flow
npm run test:content
npm run test:goal
```

For manual API testing, see `api_contract.md` for the full endpoint contract.

## Key Routes

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/signup`, `/api/auth/login` | public | Account creation / login |
| GET | `/api/content` | user/admin | Read the shared content library |
| POST/PUT/DELETE | `/api/admin/content` | admin | Manage content |
| POST | `/api/goals` | user | Create a learning plan |
| GET | `/api/goals/me` | user | Get active goal + progress |
| POST | `/api/goals/:id/modules/:day/complete` | user | Mark a module complete |
| POST | `/api/bot/query` | user | Ask the Financial Assistant |

Full details, request/response shapes, and the shared `category` enum are in `INTEGRATION.md` and `api_contract.md`.

## Financial Assistant (Bot)

- Frontend route: `/bot` (protected, linked from the dashboard nav)
- Backend: `POST /api/bot/query` — retrieves relevant `ContentItem`s, grounds the LLM answer in them, and returns `sourceContentIds`/`sources`. Refuses to invent facts: if no relevant content is found, it says so instead of guessing.
- Falls back to a template-based answer if `OPENAI_API_KEY` is unset or the LLM call fails, so the bot stays usable even without LLM credits.
- Per-user rate limiting (10 requests/min) on the query endpoint.
- Voice input/output via the browser's Web Speech API (speech-to-text into the chat box, optional text-to-speech playback of answers).

## Notes

- The `category` enum (`loans`, `retirement`, `investment`, `taxation`, `schemes`, `scam_alert`) is a frozen join key shared by content, goals, and the bot — always lowercase, never pluralized/retitled.
- All content reads go through the single `ContentItem` model / `/api/content` route — no feature should create a parallel content collection or route.
