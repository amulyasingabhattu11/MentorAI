// middleware/auth.js — mirrors @jwt_required() from Flask-JWT-Extended

const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "missing or invalid authorization header" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET_KEY || "dev-secret-change-me");
    // identity was created as create_access_token(identity=str(user.id)) in the Flask version,
    // so we mirror that: the token's "sub" claim is the user id as a string.
    req.userId = parseInt(payload.sub, 10);
    next();
  } catch (e) {
    return res.status(401).json({ error: "invalid or expired token" });
  }
}

module.exports = { requireAuth };
