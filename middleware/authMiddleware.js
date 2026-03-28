const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function verifyJWT(req, res, next) {
  try {
    let token = null;

    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-passwordHash");

    if (!user || user.isDeleted || !user.isEnabled) {
      return res.status(401).json({
        success: false,
        message: "User is invalid or disabled",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
}

async function requireViewAuth(req, res, next) {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.redirect("/login");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-passwordHash");

    if (!user || user.isDeleted || !user.isEnabled) {
      res.clearCookie("token");
      return res.redirect("/login");
    }

    req.user = user;
    res.locals.user = user;
    next();
  } catch (error) {
    res.clearCookie("token");
    return res.redirect("/login");
  }
}

module.exports = { verifyJWT, requireViewAuth };