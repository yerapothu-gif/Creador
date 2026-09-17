const jwt = require("jsonwebtoken");

/**
 * Authentication middleware: verifies Bearer token from Authorization header.
 * Attaches decoded user payload ({ userId, id, role }) to req.user.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  let token = null;

  if (header) {
    const parts = header.trim().split(/\s+/);
    if (parts.length === 2 && /^bearer$/i.test(parts[0])) {
      token = parts[1];
    }
  }

  if (!token) {
    return res.status(401).json({ message: "Missing or invalid Authorization header" });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error("JWT_SECRET is not configured in environment variables");
      return res.status(500).json({ message: "Internal server configuration error" });
    }

    const payload = jwt.verify(token, secret);
    req.user = {
      userId: payload.userId,
      id: payload.userId,
      role: payload.role,
    };
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

/**
 * Role-based authorization middleware.
 * Usage: requireRole("admin") or requireRole("admin", "user") or requireRole(["admin", "user"])
 */
function requireRole(...roles) {
  const allowedRoles = roles.flat();
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}

/**
 * Optional authentication middleware: parses token if present,
 * but does not reject requests if header is missing or token is invalid.
 */
function optionalAuth(req, res, next) {
  const header = req.headers.authorization || "";
  if (!header) return next();

  const parts = header.trim().split(/\s+/);
  if (parts.length === 2 && /^bearer$/i.test(parts[0])) {
    try {
      const secret = process.env.JWT_SECRET;
      if (secret) {
        const payload = jwt.verify(parts[1], secret);
        req.user = {
          userId: payload.userId,
          id: payload.userId,
          role: payload.role,
        };
      }
    } catch {
      // Ignore errors for optional authentication
    }
  }
  next();
}

module.exports = { requireAuth, requireRole, optionalAuth };

