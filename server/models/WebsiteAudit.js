import mongoose from "mongoose";

const websiteAuditSchema = new mongoose.Schema(
  {
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
      index: true,
    },

    url: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: Number,
    },

    title: {
      type: String,
      trim: true,
    },

    content: {
      type: String,
      trim: true,
    },

    analyzedAt: {
      type: Date,
    },

    model: {
      type: String,
      trim: true,
    },

    analysis: {
      summary: {
        type: String,
        trim: true,
      },

      businessDescription: {
        type: String,
        trim: true,
      },

      services: {
        type: [String],
        default: [],
      },

      targetAudience: {
        type: String,
        trim: true,
      },

      strengths: {
        type: [String],
        default: [],
      },

      weaknesses: {
        type: [String],
        default: [],
      },

      opportunities: {
        type: [String],
        default: [],
      },

      recommendedApproach: {
        type: String,
        trim: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("WebsiteAudit", websiteAuditSchema);