import Project from "../models/Project.js";

export async function createProject(data) {
  return Project.create(data);
}

export async function getProjects({
  page = 1,
  limit = 20,
  search = "",
  status = "",
  client = "",
} = {}) {
  const filter = {};

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  if (status) {
    filter.status = status;
  }

  if (client) {
    filter.client = client;
  }

  const skip = (page - 1) * limit;

  const [projects, total] = await Promise.all([
    Project.find(filter)
      .populate("client", "companyName contactName email")
      .populate("assignedTo", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    Project.countDocuments(filter),
  ]);

  return {
    projects,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getProjectById(projectId) {
  return Project.findById(projectId)
    .populate("client", "companyName contactName email")
    .populate("assignedTo", "name email")
    .lean();
}

export async function updateProject(projectId, data) {
  return Project.findByIdAndUpdate(projectId, data, {
    new: true,
    runValidators: true,
  })
    .populate("client", "companyName contactName email")
    .populate("assignedTo", "name email")
    .lean();
}

export async function deleteProject(projectId) {
  return Project.findByIdAndDelete(projectId).lean();
}
