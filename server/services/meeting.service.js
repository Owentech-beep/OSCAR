import mongoose from "mongoose";
import Meeting from "../models/Meeting.js";
import Client from "../models/Client.js";
import Project from "../models/Project.js";

export async function createMeeting(data) {
  const startAt = new Date(data.startAt);
  const endAt = new Date(data.endAt);

  // Validate dates
  if (
    Number.isNaN(startAt.getTime()) ||
    Number.isNaN(endAt.getTime())
  ) {
    const error = new Error("Invalid meeting date or time.");
    error.statusCode = 400;
    throw error;
  }

  // End must be after start
  if (endAt <= startAt) {
    const error = new Error(
      "Meeting end time must be after the start time.",
    );
    error.statusCode = 400;
    throw error;
  }

  // Validate client if supplied
  if (data.client) {
    if (!mongoose.isValidObjectId(data.client)) {
      const error = new Error("Invalid client ID.");
      error.statusCode = 400;
      throw error;
    }

    const clientExists = await Client.exists({
      _id: data.client,
    });

    if (!clientExists) {
      const error = new Error("Client not found.");
      error.statusCode = 404;
      throw error;
    }
  }

  // Validate project if supplied
  if (data.project) {
    if (!mongoose.isValidObjectId(data.project)) {
      const error = new Error("Invalid project ID.");
      error.statusCode = 400;
      throw error;
    }

    const project = await Project.findById(data.project)
      .select("_id client")
      .lean();

    if (!project) {
      const error = new Error("Project not found.");
      error.statusCode = 404;
      throw error;
    }

    // If both project and client are supplied,
    // make sure they belong together.
    if (
      data.client &&
      project.client &&
      project.client.toString() !== data.client.toString()
    ) {
      const error = new Error(
        "The selected project does not belong to the selected client.",
      );
      error.statusCode = 400;
      throw error;
    }
  }

  return Meeting.create({
    ...data,
    startAt,
    endAt,
  });
}

export async function getMeetings({
  page = 1,
  limit = 20,
  search = "",
  status = "",
  meetingType = "",
  client = "",
  project = "",
  from = "",
  to = "",
} = {}) {
  const filter = {};

  if (search) {
    filter.$or = [
      {
        title: {
          $regex: search,
          $options: "i",
        },
      },
      {
        description: {
          $regex: search,
          $options: "i",
        },
      },
      {
        contactName: {
          $regex: search,
          $options: "i",
        },
      },
    ];
  }

  if (status) {
    filter.status = status;
  }

  if (meetingType) {
    filter.meetingType = meetingType;
  }

  if (client) {
    filter.client = client;
  }

  if (project) {
    filter.project = project;
  }

  if (from || to) {
    filter.startAt = {};

    if (from) {
      filter.startAt.$gte = new Date(from);
    }

    if (to) {
      const endDate = new Date(to);

      // Include the entire "to" day.
      endDate.setHours(23, 59, 59, 999);

      filter.startAt.$lte = endDate;
    }
  }

  const skip = (page - 1) * limit;

  const [meetings, total] = await Promise.all([
    Meeting.find(filter)
      .populate("client", "companyName contactName email")
      .populate("project", "name status")
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .sort({ startAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    Meeting.countDocuments(filter),
  ]);

  return {
    meetings,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getMeetingById(meetingId) {
  return Meeting.findById(meetingId)
    .populate("client", "companyName contactName email")
    .populate("project", "name status")
    .populate("assignedTo", "name email")
    .populate("createdBy", "name email")
    .lean();
}

export async function updateMeeting(meetingId, data) {
  const existingMeeting = await Meeting.findById(meetingId);

  if (!existingMeeting) {
    return null;
  }

  const startAt = new Date(
    data.startAt ?? existingMeeting.startAt,
  );

  const endAt = new Date(
    data.endAt ?? existingMeeting.endAt,
  );

  if (
    Number.isNaN(startAt.getTime()) ||
    Number.isNaN(endAt.getTime())
  ) {
    const error = new Error("Invalid meeting date or time.");
    error.statusCode = 400;
    throw error;
  }

  if (endAt <= startAt) {
    const error = new Error(
      "Meeting end time must be after the start time.",
    );
    error.statusCode = 400;
    throw error;
  }

  const clientId = data.client ?? existingMeeting.client;
  const projectId = data.project ?? existingMeeting.project;

  if (clientId) {
    if (!mongoose.isValidObjectId(clientId)) {
      const error = new Error("Invalid client ID.");
      error.statusCode = 400;
      throw error;
    }

    const clientExists = await Client.exists({
      _id: clientId,
    });

    if (!clientExists) {
      const error = new Error("Client not found.");
      error.statusCode = 404;
      throw error;
    }
  }

  if (projectId) {
    if (!mongoose.isValidObjectId(projectId)) {
      const error = new Error("Invalid project ID.");
      error.statusCode = 400;
      throw error;
    }

    const project = await Project.findById(projectId)
      .select("_id client")
      .lean();

    if (!project) {
      const error = new Error("Project not found.");
      error.statusCode = 404;
      throw error;
    }

    if (
      clientId &&
      project.client &&
      project.client.toString() !== clientId.toString()
    ) {
      const error = new Error(
        "The selected project does not belong to the selected client.",
      );
      error.statusCode = 400;
      throw error;
    }
  }

  return Meeting.findByIdAndUpdate(
    meetingId,
    {
      ...data,
      startAt,
      endAt,
    },
    {
      new: true,
      runValidators: true,
    },
  )
    .populate("client", "companyName contactName email")
    .populate("project", "name status")
    .populate("assignedTo", "name email")
    .lean();
}

export async function deleteMeeting(meetingId) {
  return Meeting.findByIdAndDelete(meetingId).lean();
}