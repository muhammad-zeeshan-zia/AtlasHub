const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/user.model");
const Resource = require("../models/resource.model");

const generateToken = (user) =>
  jwt.sign(
    {
      id: user._id,
      role: user.role
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "1d"
    }
  );

exports.signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required." });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: "Email already registered." });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hash,
      role: "user"
    });

    const token = generateToken(user);

    return res.status(201).json({
      message: "Signup successful.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to signup.", error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials." });
    }

    if (role && user.role !== role) {
      return res.status(403).json({ message: `This account is not a ${role}.` });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials." });
    }

    const token = generateToken(user);
    return res.json({
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to login.", error: error.message });
  }
};

exports.seedAdmin = async (req, res) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminName = process.env.ADMIN_NAME || "Admin";

    if (!adminEmail || !adminPassword) {
      return res.status(400).json({
        message: "Set ADMIN_EMAIL and ADMIN_PASSWORD in .env first."
      });
    }

    const existing = await User.findOne({ email: adminEmail.toLowerCase() });
    if (existing) {
      return res.json({ message: "Admin already exists." });
    }

    const hash = await bcrypt.hash(adminPassword, 10);
    await User.create({
      name: adminName,
      email: adminEmail,
      password: hash,
      role: "admin"
    });

    return res.status(201).json({ message: "Admin account created." });
  } catch (error) {
    return res.status(500).json({ message: "Failed to create admin.", error: error.message });
  }
};

exports.getSavedResources = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("savedResources");
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const ids = Array.isArray(user.savedResources) ? user.savedResources : [];
    const resources = await Resource.find({
      _id: { $in: ids },
      status: "approved"
    }).sort({ createdAt: -1 });

    return res.json(resources);
  } catch (error) {
    return res.status(500).json({ message: "Could not load saved resources.", error: error.message });
  }
};

exports.saveResource = async (req, res) => {
  try {
    const resourceId = req.body?.resourceId || req.body?.id;
    if (!resourceId || !mongoose.isValidObjectId(resourceId)) {
      return res.status(400).json({ message: "A valid resource id is required." });
    }

    const resource = await Resource.findOne({ _id: resourceId, status: "approved" });
    if (!resource) {
      return res.status(404).json({ message: "Resource not found or is not published yet." });
    }

    await User.findByIdAndUpdate(req.user.id, {
      $addToSet: { savedResources: resourceId }
    });

    return res.status(201).json({ message: "Saved to your list.", resource });
  } catch (error) {
    return res.status(500).json({ message: "Could not save resource.", error: error.message });
  }
};

exports.unsaveResource = async (req, res) => {
  try {
    const { resourceId } = req.params;
    if (!resourceId || !mongoose.isValidObjectId(resourceId)) {
      return res.status(400).json({ message: "A valid resource id is required." });
    }

    await User.findByIdAndUpdate(req.user.id, {
      $pull: { savedResources: resourceId }
    });

    return res.json({ message: "Removed from saved." });
  } catch (error) {
    return res.status(500).json({ message: "Could not remove saved resource.", error: error.message });
  }
};
