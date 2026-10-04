import {
  createLead,
  getLeads,
  getLeadById,
  updateLead,
  deleteLead,
} from "../services/lead.service.js";

import {
  analyzeLead,
  getLeadAnalysis,
} from "../services/lead-analysis.service.js";

export const createLeadController = async (req, res, next) => {
  try {
    const lead = await createLead(req.body);

    res.status(201).json({
      success: true,
      data: lead,
    });
  } catch (error) {
    next(error);
  }
};

export const getLeadsController = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      status = "",
      sort = "newest",
    } = req.query;

    const result = await getLeads({
      page: Number(page),
      limit: Number(limit),
      search,
      status,
      sort,
    });

    res.status(200).json({
      success: true,
      data: result.leads,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getLeadController = async (req, res, next) => {
  try {
    const lead = await getLeadById(req.params.id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    res.status(200).json({
      success: true,
      data: lead,
    });
  } catch (error) {
    next(error);
  }
};

export const updateLeadController = async (req, res, next) => {
  try {
    const lead = await updateLead(req.params.id, req.body);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    res.status(200).json({
      success: true,
      data: lead,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteLeadController = async (req, res, next) => {
  try {
    const lead = await deleteLead(req.params.id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Lead deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const analyzeLeadController = async (req, res, next) => {
  try {
    const analysis = await analyzeLead(req.params.id);

    if (!analysis) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    res.status(200).json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    next(error);
  }
};

export const getLeadAnalysisController = async (req, res, next) => {
  try {
    const analysis = await getLeadAnalysis(req.params.id);

    if (!analysis) {
      return res.status(404).json({
        success: false,
        message: "Lead analysis not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    next(error);
  }
};