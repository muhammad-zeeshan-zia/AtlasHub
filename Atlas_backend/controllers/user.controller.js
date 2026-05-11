const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/user.model");
const EmailOtp = require("../models/emailOtp.model");
const Resource = require("../models/resource.model");
const { sendOtpEmail } = require("../services/mail.service");

const OTP_EXPIRES_MS = 15 * 60 * 1000;

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

const sessionPayload = (user) => ({
  message: "Success.",
  token: generateToken(user),
  user: {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role
  }
});

const issueEmailOtp = async (email, purpose, meta = {}) => {
  const normalized = email.toLowerCase().trim();
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + OTP_EXPIRES_MS);

  await EmailOtp.findOneAndUpdate(
    { email: normalized, purpose },
    { email: normalized, purpose, otpHash, expiresAt, meta },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const subject =
    purpose === "signup"
      ? "Verify your Atlas Hub account"
      : purpose === "login_verify"
        ? "Sign in to Atlas Hub — verification code"
        : "Reset your Atlas Hub password";

  const text = `Your verification code is: ${otp}\n\nIt expires in 15 minutes. If you did not request this, you can ignore this email.`;

  try {
    const mailResult = await sendOtpEmail({
      to: normalized,
      subject,
      text
    });

    if (mailResult.skipped) {
      const err = new Error("EMAIL_NOT_CONFIGURED");
      err.code = "EMAIL_NOT_CONFIGURED";
      throw err;
    }
  } catch (err) {
    await EmailOtp.deleteOne({ email: normalized, purpose });
    throw err;
  }

  return { normalized };
};

const consumeOtp = async (email, purpose, plainOtp) => {
  const normalized = email.toLowerCase().trim();
  const doc = await EmailOtp.findOne({ email: normalized, purpose });
  if (!doc) {
    return { error: "invalid_or_expired" };
  }
  if (doc.expiresAt.getTime() < Date.now()) {
    await EmailOtp.deleteOne({ _id: doc._id });
    return { error: "invalid_or_expired" };
  }
  const ok = await bcrypt.compare(String(plainOtp).trim(), doc.otpHash);
  if (!ok) {
    return { error: "invalid_or_expired" };
  }
  await EmailOtp.deleteOne({ _id: doc._id });
  return { doc };
};

/** Start signup: send OTP; user row is created only after verifySignup. */
exports.requestSignup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required." });
    }

    const normalized = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalized });
    if (existing) {
      return res.status(400).json({ message: "Email already registered." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await issueEmailOtp(normalized, "signup", { name: name.trim(), passwordHash });

    return res.status(200).json({
      message: "We sent a verification code to your email. Enter it below to finish creating your account."
    });
  } catch (error) {
    if (error.code === "EMAIL_NOT_CONFIGURED") {
      return res.status(503).json({
        message:
          "Email delivery is not configured on the server. Set EMAIL_USER and EMAIL_PASS (Gmail app password) in the backend .env file."
      });
    }
    return res.status(500).json({ message: "Could not start signup.", error: error.message });
  }
};

exports.verifySignup = async (req, res) => {
  try {
    const { email, otp, name, password } = req.body;
    const normalized = email?.toLowerCase?.().trim();

    if (!normalized || !otp) {
      return res.status(400).json({ message: "Email and verification code are required." });
    }

    const { doc, error } = await consumeOtp(normalized, "signup", otp);
    if (error) {
      return res.status(400).json({ message: "Invalid or expired verification code." });
    }

    let finalName = doc.meta?.name;
    let passwordHash = doc.meta?.passwordHash;

    if (!finalName || !passwordHash) {
      if (!name || !password) {
        return res.status(400).json({
          message: "Verification expired or incomplete. Please sign up again with your details."
        });
      }
      finalName = name.trim();
      passwordHash = await bcrypt.hash(password, 10);
    }

    const stillThere = await User.findOne({ email: normalized });
    if (stillThere) {
      return res.status(400).json({ message: "Email already registered." });
    }

    const user = await User.create({
      name: finalName,
      email: normalized,
      password: passwordHash,
      role: "user",
      isVerified: true
    });

    return res.status(201).json({
      message: "Account created.",
      ...sessionPayload(user)
    });
  } catch (error) {
    return res.status(500).json({ message: "Could not complete signup.", error: error.message });
  }
};

/** Legacy direct signup removed — use request + verify. Kept name for route clarity. */
exports.signup = async (_req, res) => {
  return res.status(410).json({
    message: "Direct signup is disabled. Use the email verification flow (request code, then verify)."
  });
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

    const mustVerify = user.isVerified === false;
    if (mustVerify) {
      try {
        await issueEmailOtp(user.email, "login_verify", {});
      } catch (otpErr) {
        if (otpErr.code === "EMAIL_NOT_CONFIGURED") {
          return res.status(503).json({
            message:
              "Email delivery is not configured. Ask the site administrator to set EMAIL_USER and EMAIL_PASS."
          });
        }
        throw otpErr;
      }
      return res.status(403).json({
        code: "EMAIL_NOT_VERIFIED",
        needsOtp: true,
        message: "This email is not verified yet. We sent a new code — enter it below to finish signing in."
      });
    }

    return res.json({
      message: "Login successful.",
      ...sessionPayload(user)
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to login.", error: error.message });
  }
};

exports.verifyLogin = async (req, res) => {
  try {
    const { email, otp, role } = req.body;
    const normalized = email?.toLowerCase?.().trim();

    if (!normalized || !otp) {
      return res.status(400).json({ message: "Email and verification code are required." });
    }

    const { error } = await consumeOtp(normalized, "login_verify", otp);
    if (error) {
      return res.status(400).json({ message: "Invalid or expired verification code." });
    }

    const user = await User.findOne({ email: normalized });
    if (!user) {
      return res.status(400).json({ message: "Account not found." });
    }

    if (role && user.role !== role) {
      return res.status(403).json({ message: `This account is not a ${role}.` });
    }

    user.isVerified = true;
    await user.save();

    return res.json({
      message: "Login successful.",
      ...sessionPayload(user)
    });
  } catch (error) {
    return res.status(500).json({ message: "Verification failed.", error: error.message });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const email = req.body?.email?.toLowerCase?.().trim();
    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const user = await User.findOne({ email });
    if (user) {
      try {
        await issueEmailOtp(email, "password_reset", {});
      } catch (otpErr) {
        if (otpErr.code === "EMAIL_NOT_CONFIGURED") {
          return res.status(503).json({
            message:
              "Email delivery is not configured on the server. Set EMAIL_USER and EMAIL_PASS in the backend .env file."
          });
        }
        throw otpErr;
      }
    }

    return res.json({
      message:
        "If an account exists for that email, we sent a reset code. Check your inbox and spam folder."
    });
  } catch (error) {
    return res.status(500).json({ message: "Could not process request.", error: error.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const normalized = email?.toLowerCase?.().trim();

    if (!normalized || !otp || !newPassword) {
      return res
        .status(400)
        .json({ message: "Email, verification code, and new password are required." });
    }

    if (String(newPassword).length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters." });
    }

    const { error } = await consumeOtp(normalized, "password_reset", otp);
    if (error) {
      return res.status(400).json({ message: "Invalid or expired verification code." });
    }

    const user = await User.findOne({ email: normalized });
    if (!user) {
      return res.status(400).json({ message: "Account not found." });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.isVerified = true;
    await user.save();

    return res.json({ message: "Password updated. You can sign in with your new password." });
  } catch (error) {
    return res.status(500).json({ message: "Could not reset password.", error: error.message });
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
      role: "admin",
      isVerified: true
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
