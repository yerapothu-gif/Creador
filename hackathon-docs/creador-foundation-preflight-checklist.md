# Hackathon Pre-flight Checklist — Creador Foundation ("Multiply India")

**Team size:** 4
**Time budget:** 24 hours
**Stack:** React + Tailwind + Express + MongoDB + JWT Auth + Dialogflow/LLM bot + Web Speech API

## Context recap (from the problem statement PDF)
- **Users**: women from low-income households, financial literacy focus, not all tech-savvy.
- **Core problem stated by the NGO**: retention — users visit, learn once, leave, and don't come back "until a day in need."
- **Requested solution**: gamified, goal-based learning (user picks a financial goal / customizes a plan over a span of days) + a regional voice/text bot answering queries from Creador's own content + admin upload of categorized content.
- Only two real roles exist: **User** and **Admin**. No "mentor" layer.

---

## 1. One-sentence demo path
> Admin uploads a categorized financial-literacy resource → a new User signs up, picks a goal (e.g. "Save for retirement," 7-day plan) → sees a gamified day-by-day plan with the admin's content, completes a step and earns a streak/badge → asks the voice bot a question ("mujhe loan kaise milega?") and gets an answer sourced from the same content library.

**Cuttable if time runs short (in this order):**
1. Voice input → fall back to text-only bot (Web Speech API's Indian-language recognition is the single biggest unknown).
2. Multi-day plan scheduling → collapse to a single-session module list with a progress bar.
3. Badges/points visuals → keep just a completion checkmark and a streak counter.
4. Dialogflow intent design → replace with a plain LLM call over retrieved content (much faster to stand up in 24h).

Never cut: signup/login, goal selection, one working content→learning flow, one working bot answer.

---

## 2. Role table

| Role | Can view | Can do |
|---|---|---|
| **User** (woman seeking financial literacy) | Own dashboard, own goal/plan, own progress/streak/badges, published content library, bot chat | Sign up/log in, pick or customize a learning goal + duration, mark modules complete, ask the bot questions (text or voice), see recommended content by category |
| **Admin** (Creador staff) | All uploaded content, content categories, (stretch) aggregate user engagement stats | Upload/edit/delete content items, assign category + tags + media type, (stretch) mark content as "goal-eligible" so it appears in a specific learning path |

No content is admin-only-visible except the upload/edit screen — everything admin publishes is immediately what Users and the bot draw from. That shared surface is exactly why the data model below has to be frozen early.

---

## 3. Frozen data model

One person (the integration lead, Person A below) commits this file in the first 45 minutes and nobody changes field names after that without telling the whole team.

```
User {
  _id, name, email, passwordHash,
  role: "user" | "admin",
  createdAt
}

ContentItem {
  _id,
  title,
  body,              // text content or explanation
  mediaUrl,          // optional link/video/pdf
  category,          // enum: "loans" | "retirement" | "investment" | "taxation" | "schemes" | "scam_alert"
  tags: [String],
  language,          // e.g. "en" | "hi" | "regional code" — stub to "en" if no time for translation
  createdBy,         // admin userId
  createdAt
}

Goal {
  _id,
  userId,
  category,          // matches ContentItem.category — this is the join key
  title,             // e.g. "Save for retirement"
  durationDays,      // e.g. 7
  modules: [
    { day: Number, contentId: ObjectId (ref ContentItem), completed: Boolean }
  ],
  createdAt
}

Progress {
  userId,
  streakCount,
  badges: [String],
  lastActiveDate
}

ChatLog {  // optional, only if time allows
  userId, query, answer, sourceContentIds: [ObjectId], timestamp
}
```

**Frozen join key**: `Goal.category` and `ContentItem.category` must use the exact same enum strings. Write this enum list down once, paste it into both the frontend dropdown and the seed script — this is the #1 place a "loans" vs "loan" typo silently breaks the whole demo.

---

## 4. Exact API contract

| Method | Path | Who calls it | Request | Response | Role |
|---|---|---|---|---|---|
| POST | `/api/auth/signup` | Auth | `{name, email, password}` | `{token, user:{id,name,role}}` | public |
| POST | `/api/auth/login` | Auth | `{email, password}` | `{token, user:{id,name,role}}` | public |
| GET | `/api/content` | Learning + Bot | query: `?category=` | `[ContentItem]` | user, admin |
| POST | `/api/admin/content` | Admin | `{title, body, category, tags, mediaUrl, language}` | `ContentItem` | admin only |
| PUT | `/api/admin/content/:id` | Admin | partial ContentItem | `ContentItem` | admin only |
| DELETE | `/api/admin/content/:id` | Admin | — | `{success}` | admin only |
| POST | `/api/goals` | Learning | `{category, title, durationDays}` | `Goal` (server auto-fills `modules` from matching ContentItem docs) | user |
| GET | `/api/goals/me` | Learning | — | `Goal` (current active goal) | user |
| POST | `/api/goals/:id/modules/:day/complete` | Learning | — | `{goal, progress}` (updates streak) | user |
| POST | `/api/bot/query` | Bot | `{text, lang?}` | `{answer, sourceContentIds}` | user |

**Highest-risk mismatch to flag**: the bot feature and the admin content feature both touch `ContentItem`, but they're likely owned by different people. Mount **all** content-reading routes under `/api/content` (never let the bot person invent `/api/bot/content` or the learning person invent `/api/learning/content` as a shortcut) — one read path, one contract, no duplicate query logic drifting apart. Bot's `/api/bot/query` is the only bot-specific route; everything else it needs comes from `/api/content`.

---

## 5. Auth proof plan

Since this is hand-rolled JWT (not Supabase), the foundation owner demos this once, live, before anyone else builds against it:

```
JWT payload: { userId: "...", role: "user" | "admin", iat, exp }
```

Proof to run in front of the team:
1. `POST /api/auth/signup` with a test user → confirm `201` + token returned.
2. Hit a protected route (`GET /api/goals/me`) with the token in `Authorization: Bearer <token>` → confirm `200`.
3. Hit `POST /api/admin/content` with a **user**-role token → confirm `403`, not a silent pass-through.

Don't let anyone build a protected screen until step 3 has actually been shown working — role checks are the easiest thing to forget under time pressure and the easiest to demo-break in front of judges.

---

## 6. Env var / secrets list

```
MONGODB_URI=
JWT_SECRET=
PORT=

# Bot — pick ONE path given 24h, don't stand up both:
OPENAI_API_KEY=          # if going LLM-direct (faster to integrate)
# or
DIALOGFLOW_PROJECT_ID=
DIALOGFLOW_PRIVATE_KEY=
DIALOGFLOW_CLIENT_EMAIL=

CLIENT_URL=              # for CORS
```

Given 24 hours, recommend collapsing "Dialogflow/LLM bot" to a plain LLM call (send the user's question + a few retrieved `ContentItem` snippets as context, ask for an answer) rather than configuring Dialogflow intents/entities — Dialogflow's setup overhead (agent, intents, training phrases, webhook fulfillment) is disproportionate for a 24h build and duplicates what an LLM prompt does in one API call. Decide this now, not at hour 12.

---

## 7. Design tokens

- Font: system default or Inter (Tailwind default stack is fine — don't spend time on custom fonts).
- One accent color: a warm teal/green (`#0F766E` or similar) — reads as "financial trust/growth," works for progress bars and badges.
- Spacing: Tailwind's default scale, `p-4`/`gap-4` as the base unit everywhere — no one invents custom margins.
- Card style: `rounded-lg shadow-sm border` for every content/goal/module card, no exceptions — this alone makes 4 people's screens look like one product.

---

## 8. Process agreement — role split for 4 people, 24 hours

Vertical slices, no separate "shared bot module" owner — with only 4 people, a dedicated shared-component owner becomes a bottleneck. Instead, make the bot itself one person's full-stack slice, and have everyone consume `ContentItem` through the one frozen `/api/content` contract.

| Person | Owns (frontend + backend, end-to-end) |
|---|---|
| **A — Foundation & Integration Lead** | Repo scaffold, Mongo connection, JWT auth (signup/login/middleware), the frozen data model file, merges everyone's branches |
| **B** | Goal selection + gamified learning-plan UI, `/api/goals*` routes, streak/badge logic |
| **C** | Bot feature: chat UI + Web Speech API mic button, `/api/bot/query`, LLM call |
| **D** | Admin content upload UI, `/api/admin/content*` routes, seed script with ~10 real content items across categories (so B and C have real data to build against by hour 2) |

- **Merge cadence**: every 60–90 minutes, not one big merge at the end. With only 24 hours, a big-bang merge at hour 20 leaves no time to debug — this is the failure mode to avoid.
- **Definition of done for a merge**: app boots with `npm run dev` on both client and server, you can log in as the relevant role, and the new screen loads without a console error — not "the code is written."
- **Integration lead (A)** does a defensive server boot: wrap route mounting so one broken route file doesn't crash the whole Express app (`try/catch` around route requires, or at minimum test each merge immediately).
- Person D should push the seed script by hour 2 so B and C aren't blocked waiting for real content to test against.
