import mongoose from "mongoose";

const leadAnalysisSchema = new mongoose.Schema(
  {
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
      unique: true,
    },

    score: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    qualification: {
      type: String,
      enum: [
        "Low Potential",
        "Medium Potential",
        "High Potential",
      ],
      default: "Low Potential",
    },

    reasoning: {
      type: String,
      trim: true,
    },

    strengths: [
      {
        type: String,
        trim: true,
      },
    ],

    concerns: [
      {
        type: String,
        trim: true,
      },
    ],

    recommendedAction: {
      type: String,
      trim: true,
    },

    analyzedAt: {
      type: Date,
      default: Date.now,
    },

    model: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const LeadAnalysis = mongoose.model(
  "LeadAnalysis",
  leadAnalysisSchema
);

export default LeadAnalysis;