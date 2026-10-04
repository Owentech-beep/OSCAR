import {
  createClient,
  getClients,
  getClientById,
  updateClient,
  deleteClient,
} from "../services/client.service.js";

export async function createClientController(req, res, next) {
  try {
    const client = await createClient(req.body);

    return res.status(201).json({
      success: true,
      data: client,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getClientsController(req, res, next) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const search = req.query.search || "";
    const status = req.query.status || "";

    const result = await getClients({
      page,
      limit,
      search,
      status,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getClientController(req, res, next) {
  try {
    const client = await getClientById(req.params.id);

    if (!client) {
      return res.status(404).json({
        success: false,
        error: "Client not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: client,
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateClientController(req, res, next) {
  try {
    const client = await updateClient(req.params.id, req.body);

    if (!client) {
      return res.status(404).json({
        success: false,
        error: "Client not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: client,
    });
  } catch (error) {
    return next(error);
  }
}

export async function deleteClientController(req, res, next) {
  try {
    const client = await deleteClient(req.params.id);

    if (!client) {
      return res.status(404).json({
        success: false,
        error: "Client not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: client,
    });
  } catch (error) {
    return next(error);
  }
}