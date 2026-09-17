# API Contract — Creador Foundation ("Multiply India")

Frozen contract for all routes. Do not rename paths, fields, or response shapes without updating this file and telling the whole team.

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
