const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    password: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user"
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    savedResources: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Resource"
        }
      ],
      default: []
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("User", userSchema);
