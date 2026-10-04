import mongoose from "mongoose";

const businessMetricSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
      index: true
    },
    revenue: {
      type: Number,
      min: 0,
      default: 0
    },
    activeClients: {
      type: Number,
      min: 0,
      default: 0
    },
    potentialLeads: {
      type: Number,
      min: 0,
      default: 0
    },
    emailsSent: {
      type: Number,
      min: 0,
      default: 0
    },
    responses: {
      type: Number,
      min: 0,
      default: 0
    },
    conversionRate: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    }
  },
  { timestamps: true }
);

businessMetricSchema.index({ date: -1 });

export const BusinessMetric = mongoose.model("BusinessMetric", businessMetricSchema);
