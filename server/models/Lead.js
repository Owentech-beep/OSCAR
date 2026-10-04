import mongoose from "mongoose";

const leadSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: true,
      trim: true,
    },

    contactName: {
      type: String,
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
    },

    phone: {
      type: String,
      trim: true,
    },

    website: {
      type: String,
      trim: true,
    },

    industry: {
      type: String,
      trim: true,
    },

    location: {
      type: String,
      trim: true,
    },

    source: {
      type: String,
      trim: true,
    },

    leadScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    status: {
      type: String,
      enum: [
        "New",
        "Researching",
        "Qualified",
        "Contacted",
        "Interested",
        "Meeting",
        "Proposal",
        "Won",
        "Lost",
        "No Response",
      ],
      default: "New",
    },

    notes: {
      type: String,
      trim: true,
    },

    lastContact: {
      type: Date,
    },

    nextFollowUp: {
      type: Date,
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

const Lead = mongoose.model("Lead", leadSchema);

export default Lead;