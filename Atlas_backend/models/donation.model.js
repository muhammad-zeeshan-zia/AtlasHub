const mongoose = require("mongoose");

const donationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    amountCents: {
      type: Number,
      required: true,
      min: 1
    },
    currency: {
      type: String,
      default: "usd",
      trim: true,
      lowercase: true
    },
    stripeSessionId: {
      type: String,
      default: "",
      trim: true,
      index: true
    },
    stripePaymentIntentId: {
      type: String,
      default: "",
      trim: true
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "expired"],
      default: "pending"
    },
    failureReason: {
      type: String,
      default: "",
      trim: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Donation", donationSchema);
