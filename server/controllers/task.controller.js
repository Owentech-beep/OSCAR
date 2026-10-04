import {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
} from "../services/task.service.js";

export async function createTaskController(req, res, next) {
  try {
    const task = await createTask(req.body);

    return res.status(201).json({
      success: true,
      data: task,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getTasksController(req, res, next) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 20, 100);

    const search = req.query.search || "";
    const status = req.query.status || "";
    const priority = req.query.priority || "";
    const project = req.query.project || "";
    const client = req.query.client || "";

    const result = await getTasks({
      page,
      limit,
      search,
      status,
      priority,
      project,
      client,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getTaskController(req, res, next) {
  try {
    const task = await getTaskById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: "Task not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateTaskController(req, res, next) {
  try {
    const task = await updateTask(
      req.params.id,
      req.body
    );

    if (!task) {
      return res.status(404).json({
        success: false,
        error: "Task not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    return next(error);
  }
}

export async function deleteTaskController(req, res, next) {
  try {
    const task = await deleteTask(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: "Task not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    return next(error);
  }
}