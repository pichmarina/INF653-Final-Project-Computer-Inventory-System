const express = require("express");
const router = express.Router();

router.get("/login", (req, res) => {
  res.render("login", { title: "Login" });
});

router.get("/dashboard", (req, res) => {
  res.render("dashboard", { title: "Dashboard" });
});

module.exports = router;