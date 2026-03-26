require("dotenv").config();

const path = require("path");
const express = require("express");
const hbs = require("hbs");
const morgan = require("morgan");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const methodOverride = require("method-override");

const connectDB = require("./config/db");

const app = express();
const PORT = process.env.PORT || 3000;

/* =========================
   DATABASE
========================= */
connectDB();

/* =========================
   VIEW ENGINE (HBS)
========================= */
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));

hbs.registerPartials(path.join(__dirname, "views", "partials"));

/* Optional helper examples
hbs.registerHelper("eq", (a, b) => a === b);
hbs.registerHelper("formatDate", (date) => {
  return new Date(date).toLocaleDateString();
});
*/

/* =========================
   GLOBAL MIDDLEWARE
========================= */

// Trust proxy when deployed behind Render/Railway/etc.
app.set("trust proxy", 1);

// Request logging for audit trail
app.use(morgan("dev"));

// Parse incoming data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Support PUT/PATCH/DELETE from forms using ?_method=PATCH
app.use(methodOverride("_method"));

/* =========================
   CORS
   Strictly limit to your app's own domain/origin
========================= */
const allowedOrigins = [
  process.env.BASE_URL || "http://localhost:3000",
];

app.use(
  cors({
    origin(origin, callback) {
      // Allow server-to-server tools or same-origin browser requests with no origin
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

/* =========================
   RATE LIMITING
   Requirement: 20 requests/minute/IP
========================= */
const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again in a minute.",
  },
});

app.use(globalLimiter);

/* Optional:
   If you want login to have its own limiter later, move this global limiter
   to route level and create a separate stricter auth limiter.
*/

/* =========================
   STATIC FILES
========================= */
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* =========================
   GLOBAL TEMPLATE VARIABLES
========================= */
app.use((req, res, next) => {
  res.locals.appName = "Computer Inventory System";
  res.locals.currentYear = new Date().getFullYear();

  // Later you can attach logged-in user info here from JWT/session
  res.locals.user = null;

  next();
});

/* =========================
   BASIC HOME / HEALTH CHECK
========================= */
app.get("/", (req, res) => {
  res.redirect("/login");
});

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
  });
});

/* =========================
   ROUTES
========================= */

// UI routes
app.use("/", require("./routes/viewRoutes"));

// API routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/keys", require("./routes/apiKeyRoutes"));
app.use("/api/items", require("./routes/itemRoutes"));
app.use("/api/transactions", require("./routes/transactionRoutes"));
app.use("/api/reports", require("./routes/reportRoutes"));

/* =========================
   404 HANDLER
========================= */
app.use((req, res, next) => {
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

/* =========================
   GLOBAL ERROR HANDLER
========================= */
app.use((err, req, res, next) => {
  console.error(err.stack);

  // CORS errors
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({
      success: false,
      message: err.message,
    });
  }

  if (req.originalUrl.startsWith("/api")) {
    return res.status(err.status || 500).json({
      success: false,
      message: err.message || "Internal Server Error",
    });
  }

  return res.status(err.status || 500).render("error", {
    title: "Error",
    message: err.message || "Something went wrong",
  });
});

/* =========================
   START SERVER
========================= */
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;