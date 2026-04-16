require("dotenv").config();

const path = require("path");
const express = require("express");
const { engine } = require("express-handlebars");
const morgan = require("morgan");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const methodOverride = require("method-override");

const connectDB = require("./config/db");
const globalLimiter = require("./middleware/rateLimiter");
const errorHandler = require("./middleware/errorHandler");

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
    },
  }),
);

app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));

/* =========================
   GLOBAL MIDDLEWARE
========================= */
app.set("trust proxy", 1);

app.use(morgan("common"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(methodOverride("_method"));

const whitelist = [process.env.BASE_URL || "http://localhost:3000"];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || whitelist.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

app.use(globalLimiter);

app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

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
