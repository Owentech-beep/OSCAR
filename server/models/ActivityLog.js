import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
  {
    actorUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true
    },
    action: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    resourceType: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80
    },
    resourceId: {
      type: String,
      trim: true,
      maxlength: 120
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    ipAddress: {
      type: String,
      maxlength: 100
    },
    userAgent: {
      type: String,
      maxlength: 500
    }
  },
  { timestamps: true }
);

activityLogSchema.index({ createdAt: -1 });

export const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);
