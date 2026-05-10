const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

dotenv.config();

const userRoutes = require("./routes/user.route");
const {
  getSavedResources,
  saveResource,
  unsaveResource
} = require("./controllers/user.controller");
const donationController = require("./controllers/donation.controller");
const {
  submitResource,
  approveResource,
  rejectResource,
  getPendingResources,
  getApprovedResources,
  getAllResources,
  setResourceStatus
} = require("./controllers/resource.controller");

const app = express();

app.post(
  "/api/donations/webhook",
  express.raw({ type: "application/json" }),
  donationController.handleStripeWebhook
);

app.use(cors());
app.use(express.json());

const auth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

    if (!token) {
      return res.status(401).json({ message: "Missing auth token." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Admin access required." });
  }
  return next();
};

const userOnly = (req, res, next) => {
  if (req.user?.role !== "user") {
    return res.status(403).json({
      message: "Only signed-in community members can donate. Administrator accounts use separate tools."
    });
  }
  return next();
};

app.get("/", (_req, res) => {
  res.json({ message: "Atlas backend is running." });
});

app.use("/api/users", userRoutes);
app.get("/api/users/me/saved-resources", auth, getSavedResources);
app.post("/api/users/me/saved-resources", auth, saveResource);
app.delete("/api/users/me/saved-resources/:resourceId", auth, unsaveResource);
app.post("/api/donations/checkout", auth, userOnly, donationController.createCheckoutSession);
app.get("/api/resources/approved", getApprovedResources);
app.post("/api/resources", auth, submitResource);
app.get("/api/admin/resources", auth, adminOnly, getAllResources);
app.get("/api/admin/resources/pending", auth, adminOnly, getPendingResources);
app.patch("/api/admin/resources/:id/status", auth, adminOnly, setResourceStatus);
app.patch("/api/admin/resources/:id/approve", auth, adminOnly, approveResource);
app.patch("/api/admin/resources/:id/reject", auth, adminOnly, rejectResource);

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  throw new Error("MONGO_URI is required in .env");
}

mongoose
  .connect(MONGO_URI)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
  });
