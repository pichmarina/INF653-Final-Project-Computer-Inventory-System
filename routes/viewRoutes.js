const express = require("express");
const router = express.Router();

router.get("/login", (req, res) => {
  res.render("login", { title: "Login" });
});

router.get("/dashboard", (req, res) => {
  res.render("dashboard", { title: "Dashboard" });
});

router.get("/reports", (req, res) => {
  res.render("reports", { title: "Reports" });
});

router.get("/history", (req, res) => {
  res.render("history", { title: "History" });
});

module.exports = router;