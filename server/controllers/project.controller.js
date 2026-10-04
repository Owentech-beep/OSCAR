import {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
} from "../services/project.service.js";

export async function createProjectController(req, res, next) {
  try {
    const project = await createProject(req.body);

    return res.status(201).json({
      success: true,
      data: project,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getProjectsController(req, res, next) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const search = req.query.search || "";
    const status = req.query.status || "";
    const client = req.query.client || "";

    const result = await getProjects({
      page,
      limit,
      search,
      status,
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

export async function getProjectController(req, res, next) {
  try {
    const project = await getProjectById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: "Project not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: project,
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateProjectController(req, res, next) {
  try {
    const project = await updateProject(req.params.id, req.body);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: "Project not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: project,
    });
  } catch (error) {
    return next(error);
  }
}

export async function deleteProjectController(req, res, next) {
  try {
    const project = await deleteProject(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: "Project not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: project,
    });
  } catch (error) {
    return next(error);
  }
}
