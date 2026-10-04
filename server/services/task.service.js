import Task from "../models/Task.js";
import Project from "../models/Project.js";

export async function createTask(data) {
  const project = await Project.findById(data.project)
    .select("client")
    .lean();

  if (!project) {
    const error = new Error("Project not found.");
    error.statusCode = 404;
    throw error;
  }

  return Task.create({
    ...data,
    client: project.client,
  });
}

export async function getTasks({
  page = 1,
  limit = 20,
  search = "",
  status = "",
  priority = "",
  project = "",
  client = "",
} = {}) {
  const filter = {};

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  if (status) {
    filter.status = status;
  }

  if (priority) {
    filter.priority = priority;
  }

  if (project) {
    filter.project = project;
  }

  if (client) {
    filter.client = client;
  }

  const skip = (page - 1) * limit;

  const [tasks, total] = await Promise.all([
    Task.find(filter)
      .populate("project", "name status")
      .populate("client", "companyName")
      .populate("assignedTo", "name email")
      .sort({ dueDate: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    Task.countDocuments(filter),
  ]);

  return {
    tasks,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getTaskById(taskId) {
  return Task.findById(taskId)
    .populate("project", "name status")
    .populate("client", "companyName")
    .populate("assignedTo", "name email")
    .lean();
}

export async function updateTask(taskId, data) {
  const task = await Task.findById(taskId)
    .select("project")
    .lean();

  if (!task) {
    const error = new Error("Task not found.");
    error.statusCode = 404;
    throw error;
  }

  const projectId = data.project || task.project;

  const project = await Project.findById(projectId)
    .select("client")
    .lean();

  if (!project) {
    const error = new Error("Project not found.");
    error.statusCode = 404;
    throw error;
  }

  const updateData = {
    ...data,
    client: project.client,
  };

  return Task.findByIdAndUpdate(
    taskId,
    updateData,
    {
      new: true,
      runValidators: true,
    }
  )
    .populate("project", "name status")
    .populate("client", "companyName")
    .populate("assignedTo", "name email")
    .lean();
}

export async function deleteTask(taskId) {
  return Task.findByIdAndDelete(taskId).lean();
}