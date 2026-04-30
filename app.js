require("dotenv").config();

const path = require("path");
const express = require("express");
const { engine } = require("express-handlebars");
const morgan = require("morgan");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const methodOverride = require("method-override");
const helmet = require("helmet");

const connectDB = require("./config/db");
const globalLimiter = require("./middleware/rateLimiter");
const errorHandler = require("./middleware/errorHandler");
const { getItemDisplayName } = require("./utils/itemDisplayName");

const app = express();
const PORT = process.env.PORT || 3000;

connectDB();

/* =========================
   VIEW ENGINE
========================= */
app.engine(
  "hbs",
  engine({
    extname: ".hbs",
    defaultLayout: "main",
    layoutsDir: path.join(__dirname, "views", "layouts"),
    partialsDir: path.join(__dirname, "views", "partials"),
    helpers: {
      // Equality check
      eq: (a, b) => a === b,

      // OR operator
      or: (a, b) => a || b,

      // AND operator
      and: (a, b) => a && b,

      isAdmin: (user) => {
        return user && user.role === "Admin";
      },

      // Get first character of string (for avatars)
      firstChar: (str) => {
        if (!str) return "";
        return str.charAt(0).toUpperCase();
      },

      // Convert to lowercase
      toLowerCase: (str) => {
        if (!str) return "";
        return str.toLowerCase();
      },

      // Format date
      formatDate: (date) => {
        if (!date) return "-";
        return new Intl.DateTimeFormat("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }).format(new Date(date));
      },

      // Get current date
      now: () => new Date(),

      // JSON stringify for debugging
      json: (obj) => JSON.stringify(obj, null, 2),

      itemDisplayName: (item) => getItemDisplayName(item),
    },
  }),
);

app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));

/* =========================
   GLOBAL MIDDLEWARE
========================= */
app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: false,
  }),
);
app.use(morgan("common"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(methodOverride("_method"));

function normalizeOrigin(origin) {
  if (!origin) return null;

  return String(origin).replace(/\/$/, "");
}

function getAllowedOrigins() {
  const configuredOrigins = [
    process.env.BASE_URL,
    process.env.CORS_ORIGIN,
    ...(process.env.DEV_CORS_ORIGINS || "").split(","),
  ]
    .map((origin) => normalizeOrigin(origin && origin.trim()))
    .filter(Boolean);

  return new Set(configuredOrigins);
}

const allowedOrigins = getAllowedOrigins();

function corsError(origin) {
  const error = new Error(`CORS origin is not allowed: ${origin}`);
  error.status = 403;
  return error;
}

app.use(
  cors((req, callback) => {
    callback(null, {
      origin: function (origin, originCallback) {
        // Browser same-origin requests and opaque-origin form posts may omit Origin.
        if (!origin) {
          return originCallback(null, true);
        }

        if (origin === "null" && isOpaqueLoginFormPost(req)) {
          return originCallback(null, true);
        }

        const normalizedOrigin = normalizeOrigin(origin);

        if (allowedOrigins.has(normalizedOrigin)) {
          return originCallback(null, true);
        }

        return originCallback(corsError(origin));
      },
      credentials: true,
    });
  }),
);

function isOpaqueLoginFormPost(req) {
  const accept = req.get("accept") || "";
  const contentType = req.get("content-type") || "";

  return (
    req.method === "POST" &&
    req.path === "/api/auth/login" &&
    accept.includes("text/html") &&
    contentType.includes("application/x-www-form-urlencoded")
  );
}

app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.get("/favicon.ico", (req, res) => res.sendStatus(204));

app.use(globalLimiter);

// Make user available to all views
app.use((req, res, next) => {
  res.locals.appName = "Computer Inventory System";
  res.locals.currentYear = new Date().getFullYear();
  res.locals.currentPath = req.path;
  next();
});

// Integration routes (before auth middleware)
const integrationRoutes = require("./routes/integrationRoutes");
app.use("/api/integration", integrationRoutes);

app.get("/", (req, res) => {
  res.redirect("/login");
});

app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
  });
});

app.use("/", require("./routes/viewRoutes"));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/keys", require("./routes/apiKeyRoutes"));
app.use("/api/items", require("./routes/itemRoutes"));
app.use("/api/transactions", require("./routes/transactionRoutes"));
app.use("/api/reports", require("./routes/reportRoutes"));

app.use((req, res) => {
  if (req.originalUrl.startsWith("/api")) {
    return res.status(404).json({
      success: false,
      message: "API route not found",
    });
  }

  return res.status(404).render("404", {
    title: "404 - Page Not Found",
  });
});

app.use(errorHandler);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
