const jwt = require("jsonwebtoken");

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role === "admin") return next();
  if (req.user.specialRole === "admin") return next();
  return res.status(403).json({ error: "Admin access required" });
}

function requireLeaderOrAdmin(req, res, next) {
 const isAdmin = req.user.role === "admin" || req.user.specialRole === "admin";
  const isLeader = req.user.specialRole === "jumuia_leader";
  const isSecretary = req.user.role === "secretary" || req.user.specialRole === "secretary";
  
  if (!isAdmin && !isLeader && !isSecretary) {
    return res.status(403).json({ error: "Leader, Secretary, or Admin access required" });
  }
  next();
}

module.exports = { authenticate, requireAdmin, requireLeaderOrAdmin };