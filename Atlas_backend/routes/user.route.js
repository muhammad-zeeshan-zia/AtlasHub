const express = require("express");
const {
  login,
  signup,
  seedAdmin,
  requestSignup,
  verifySignup,
  verifyLogin,
  forgotPassword,
  resetPassword
} = require("../controllers/user.controller");

const router = express.Router();

router.post("/signup", signup);
router.post("/signup/request", requestSignup);
router.post("/signup/verify", verifySignup);
router.post("/login", login);
router.post("/login/verify", verifyLogin);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/seed-admin", seedAdmin);

module.exports = router;
