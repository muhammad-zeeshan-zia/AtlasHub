const express = require("express");
const {
  submitResource,
  approveResource,
  rejectResource,
  getPendingResources,
  getApprovedResources,
  getAllResources,
  setResourceStatus
} = require("../controllers/resource.controller");

const router = express.Router();

router.post("/", submitResource);
router.get("/", getAllResources);
router.get("/pending", getPendingResources);
router.get("/approved", getApprovedResources);
router.patch("/:id/status", setResourceStatus);
router.patch("/:id/approve", approveResource);
router.patch("/:id/reject", rejectResource);

module.exports = router;
