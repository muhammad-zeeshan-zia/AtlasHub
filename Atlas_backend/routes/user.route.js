const express = require("express");
const { login, signup, seedAdmin } = require("../controllers/user.controller");

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/seed-admin", seedAdmin);

module.exports = router;
