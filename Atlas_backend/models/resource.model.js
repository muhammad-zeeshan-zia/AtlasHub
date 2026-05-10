const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema(
  {
    method: {
      type: String,
      enum: ["phone", "text", "link"],
      default: "phone"
    },
    actionLabel: {
      type: String,
      trim: true,
      default: "Call"
    },
    value: {
      type: String,
      trim: true,
      default: ""
    },
    note: {
      type: String,
      trim: true,
      default: ""
    }
  },
  { _id: false }
);

const sectionSchema = new mongoose.Schema(
  {
    heading: {
      type: String,
      trim: true,
      default: ""
    },
    contacts: {
      type: [contactSchema],
      default: []
    },
    footerNote: {
      type: String,
      trim: true,
      default: ""
    }
  },
  { _id: false }
);

const resourceSchema = new mongoose.Schema(
  {
    orgName: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      required: true,
      trim: true
    },
    website: {
      type: String,
      trim: true,
      default: ""
    },
    phone: {
      type: String,
      trim: true,
      default: ""
    },
    address: {
      type: String,
      trim: true,
      default: ""
    },
    latitude: {
      type: Number,
      min: -90,
      max: 90,
      default: null
    },
    longitude: {
      type: Number,
      min: -180,
      max: 180,
      default: null
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    keywords: {
      type: String,
      trim: true,
      default: ""
    },
    hours: {
      type: String,
      trim: true,
      default: ""
    },
    contactAction: {
      type: String,
      trim: true,
      default: "Call"
    },
    contactNote: {
      type: String,
      trim: true,
      default: ""
    },
    sections: {
      type: [sectionSchema],
      default: []
    },
    submitterName: {
      type: String,
      trim: true,
      default: ""
    },
    submitterEmail: {
      type: String,
      trim: true,
      default: ""
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    approvedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Resource", resourceSchema);
