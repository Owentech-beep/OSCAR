import mongoose from "mongoose";

const meetingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    // Optional CRM relationship
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
    },

    // Optional project relationship
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
    },

    // Person we're meeting
    contactName: {
      type: String,
      trim: true,
    },

    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },

    location: {
      type: String,
      trim: true,
    },

    meetingType: {
      type: String,
      enum: [
        "Discovery",
        "Consultation",
        "Follow-up",
        "Client Meeting",
        "Internal",
        "Other",
      ],
      default: "Other",
    },

    status: {
      type: String,
      enum: ["Scheduled", "Completed", "Cancelled", "No Show"],
      default: "Scheduled",
    },

    startAt: {
      type: Date,
      required: true,
    },

    endAt: {
      type: Date,
      required: true,
    },

    notes: {
      type: String,
      trim: true,
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

// Useful for calendar queries
meetingSchema.index({ startAt: 1 });
meetingSchema.index({ status: 1 });
meetingSchema.index({ client: 1 });
meetingSchema.index({ project: 1 });

export default mongoose.model("Meeting", meetingSchema);
