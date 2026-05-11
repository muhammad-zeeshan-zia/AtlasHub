const mongoose = require("mongoose");

const emailOtpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    purpose: {
      type: String,
      enum: ["signup", "login_verify", "password_reset"],
      required: true
    },
    otpHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { timestamps: true }
);

emailOtpSchema.index({ email: 1, purpose: 1 }, { unique: true });
emailOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("EmailOtp", emailOtpSchema);
