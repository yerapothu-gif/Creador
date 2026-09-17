const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());

app.get("/api/health", (req, res) => res.status(200).json({ status: "ok" }));

// Each feature's routes are mounted defensively so one broken route file
// (e.g. a teammate's in-progress bot/content module) can't crash the whole server.
function mount(path, routeModulePath) {
  try {
    const router = require(routeModulePath);
    app.use(path, router);
  } catch (err) {
    console.error(`Failed to mount ${path} from ${routeModulePath}:`, err.message);
  }
}

mount("/api/auth", "./routes/authRoutes");
mount("/api/content", "./routes/contentRoutes");
mount("/api/goals", "./routes/goalRoutes");
mount("/api/bot", "./routes/botRoutes");
mount("/api/admin/content", "./routes/adminContentRoutes");

module.exports = app;
