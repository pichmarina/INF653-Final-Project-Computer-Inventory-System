const express = require("express");
const router = express.Router();

router.get("/login", (req, res) => {
  res.render("login", { title: "Login" });
});

router.get("/dashboard", (req, res) => {
  res.render("dashboard", { title: "Dashboard" });
});

router.get("/items", (req, res) => {
  res.render("items", {
    title: "Inventory List",
  });
});

router.get("/items/new", (req, res) => {
  res.render("item-form", {
    title: "Add Item",
    isEdit: false,
  });
});

router.get("/items/:id/edit", (req, res) => {
  res.render("item-form", {
    title: "Edit Item",
    isEdit: true,
    itemId: req.params.id,
  });
});

router.get("/items/:id", (req, res) => {
  res.render("item-details", {
    title: "Item Details",
    itemId: req.params.id,
  });
});

router.get("/checkout", (req, res) => {
  res.render("checkout-form", {
    title: "Check Out Item",
  });
});

router.get("/checkin", (req, res) => {
  res.render("checkin-form", {
    title: "Check In Item",
  });
});

module.exports = router;