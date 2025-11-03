const express = require("express");
const {
  register,
  login,
  forgotPassword,
  resetPassword,
  send2FA,
  verify2FA,
} = require("../controllers/auth.controller");
const { protect, restrictTo } = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/send-otp", send2FA);
router.post("/verify-otp", verify2FA);

// protected routers
router.get("/profile", protect, (req, res) => {
  res.json({ message: "Welcome to your profile", user: req.user });
});

// Admin only route
router.get("/admin", protect, restrictTo("admin"), (req, res) => {
  res.json({ message: "Welcome Admin" });
});

module.exports = router;
