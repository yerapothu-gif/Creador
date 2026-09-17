# Integration Guide — Creador Foundation ("Multiply India")

This document is the single source of truth for Person A (Integration Lead), Person B (Goals & Learning), Person C (Voice/Text Bot), and Person D (Admin Content).

---

## 1. System Overview & Quick Start

* **Stack**: Node.js + Express 5 + MongoDB / Mongoose 9 + React 19 + Vite 8
* **Base Backend URL**: `http://localhost:5000`
* **Base Frontend URL**: `http://localhost:5173`

### Startup Commands
```bash
# 1. Install dependencies
cd backend && npm install
cd ../frontend && npm install

# 2. Seed database with realistic categorized financial literacy content
cd ../backend && npm run seed

# 3. Start dev server
npm run dev

# 4. Verify Auth & Protected Routes
node test-auth-flow.js
```

---

## 2. Frozen Join Keys & Enums

The `category` string enum is the join key between **Admin Content** (`ContentItem`), **Learning Plans** (`Goal`), and **Bot Search** (`ContentItem`).

```javascript
const CATEGORIES = [
  "loans",
  "retirement",
  "investment",
  "taxation",
  "schemes",
  "scam_alert"
];
```
> ⚠️ **Rule**: Never use singular forms like `"loan"` or title case like `"Loans"`. Always use the exact lowercase strings above.

---

## 3. Database Models Reference

All models are located in `backend/src/models/`:

### 1. `User.js`
* `_id`: ObjectId
* `name`: String (required)
* `email`: String (unique, lowercase, required)
* `passwordHash`: String (bcrypt hash, required)
* `role`: `"user"` | `"admin"` (default `"user"`)

### 2. `ContentItem.js`
* `_id`: ObjectId
* `title`: String (required)
* `body`: String (required text explanation)
* `mediaUrl`: String (optional video/PDF link)
* `category`: String (enum: `CATEGORIES`, required)
* `tags`: `[String]`
* `language`: String (default `"en"`)
* `createdBy`: ObjectId (ref `User`, optional)

### 3. `Goal.js`
* `_id`: ObjectId
* `userId`: ObjectId (ref `User`, required, indexed)
* `category`: String (enum: `CATEGORIES`, required)
* `title`: String (required)
* `durationDays`: Number (required, e.g. 7)
* `modules`: Array of `{ day: Number, contentId: ObjectId (ref ContentItem), completed: Boolean }`

### 4. `Progress.js`
* `userId`: ObjectId (ref `User`, required, unique)
* `streakCount`: Number (default 0)
* `badges`: `[String]` (e.g. `["7-Day Champion", "Debt Free Learner"]`)
* `lastActiveDate`: Date (default `Date.now`)

---

## 4. Auth & Authorization Middleware

Located in `backend/src/middleware/auth.js`:

```javascript
const { requireAuth, requireRole, optionalAuth } = require("../middleware/auth");

// Protected for logged-in user:
router.get("/me", requireAuth, (req, res) => {
  const { userId, role } = req.user;
  // ...
});

// Protected for admin only:
router.post("/content", requireAuth, requireRole("admin"), (req, res) => {
  // ...
});
```

Headers required on protected endpoints:
```http
Authorization: Bearer <jwt_token>
```

---

## 5. Person B Guide: Goals, Modules & Gamification

* **Files owned**:
  * Backend: `backend/src/routes/goalRoutes.js`, `backend/src/controllers/goalController.js`
  * Frontend: Goal selection screen, daily learning roadmap, module viewer, streak & badge widget
* **Models to import**:
  ```javascript
  const Goal = require("../models/Goal");
  const Progress = require("../models/Progress");
  const { ContentItem } = require("../models/ContentItem");
  ```

### Key Workflow:
1. **Auto-Filling Modules (`POST /api/goals`)**:
   ```javascript
   // 1. Fetch content items matching the requested goal category
   const contentDocs = await ContentItem.find({ category: req.body.category }).limit(req.body.durationDays);
   
   // 2. Map into daily modules
   const modules = contentDocs.map((item, index) => ({
     day: index + 1,
     contentId: item._id,
     completed: false
   }));
   
   // 3. Create Goal
   const goal = await Goal.create({
     userId: req.user.userId,
     category: req.body.category,
     title: req.body.title,
     durationDays: req.body.durationDays,
     modules
   });
   ```

2. **Fetching Active Goal (`GET /api/goals/me`)**:
   ```javascript
   const goal = await Goal.findOne({ userId: req.user.userId })
     .sort({ createdAt: -1 })
     .populate("modules.contentId");
   ```

3. **Module Completion & Streaks (`POST /api/goals/:id/modules/:day/complete`)**:
   * Update `completed = true` for the matching day module.
   * Check user's `Progress` record:
     * If completed today, update `streakCount += 1` and set `lastActiveDate = new Date()`.
     * If user reaches milestones (e.g. 3-day streak or day 7 complete), push badge to `badges` array.
   * Return `{ goal, progress }`.

---

## 6. Person C Guide: Voice & Text Bot

* **Files owned**:
  * Backend: `backend/src/routes/botRoutes.js`, `backend/src/controllers/botController.js`
  * Frontend: Audio input button (Web Speech API), chat window, TTS playback
* **Content Access**:
  * Read from `ContentItem` model or `GET /api/content`:
  ```javascript
  const { ContentItem } = require("../models/ContentItem");
  
  // Retrieve content relevant to query
  const contentItems = await ContentItem.find({}).select("title body category");
  ```
* **Endpoint Contract**:
  * **Path**: `POST /api/bot/query`
  * **Role**: `user` (`requireAuth`)
  * **Request**:
    ```json
    {
      "text": "How can I apply for a microloan without collateral?",
      "lang": "en"
    }
    ```
  * **Response**:
    ```json
    {
      "answer": "You can apply for collateral-free microloans through Self-Help Groups (SHGs) under the NRLM scheme or certified NBFC microfinance institutions.",
      "sourceContentIds": ["6aab831bf11ccc78496032cf"]
    }
    ```
* **Voice Speech Frontend**:
  * Use native browser `webkitSpeechRecognition` with language code (e.g. `'hi-IN'` for Hindi, `'en-IN'` for Indian English).
  * Send transcribed text to `POST /api/bot/query`.
  * Optionally read response using `window.speechSynthesis`.

---

## 7. Person D Guide: Admin Content Management

* **Files owned**:
  * Backend: `backend/src/routes/adminContentRoutes.js` (Already built and verified!)
  * Frontend: Content creation form, category filter, table of uploaded resources, edit/delete actions
* **Endpoints available**:
  * `GET /api/content` &mdash; List all resources (supports `?category=loans`)
  * `POST /api/admin/content` &mdash; Create resource (`admin` only)
  * `PUT /api/admin/content/:id` &mdash; Edit resource (`admin` only)
  * `DELETE /api/admin/content/:id` &mdash; Delete resource (`admin` only)
* **Categories to use in frontend dropdown**:
  * Use the 6 categories: `loans`, `retirement`, `investment`, `taxation`, `schemes`, `scam_alert`.
