import {
  createMeeting,
  getMeetings,
  getMeetingById,
  updateMeeting,
  deleteMeeting,
} from "../services/meeting.service.js";

// =========================================================
// CREATE MEETING
// =========================================================

export async function createMeetingController(req, res, next) {
  try {
    const meeting = await createMeeting({
      ...req.body,
      createdBy: req.session.user.id,
    });

    return res.status(201).json({
      success: true,
      data: meeting,
    });
  } catch (error) {
    return next(error);
  }
}

// =========================================================
// GET MEETINGS
// =========================================================

export async function getMeetingsController(req, res, next) {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);

    const limit = Math.min(Number(req.query.limit) || 20, 100);

    const result = await getMeetings({
      page,

      limit,

      search: req.query.search || "",

      status: req.query.status || "",

      meetingType: req.query.meetingType || "",

      client: req.query.client || "",

      project: req.query.project || "",

      from: req.query.from || "",

      to: req.query.to || "",
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

// =========================================================
// GET SINGLE MEETING
// =========================================================

export async function getMeetingController(req, res, next) {
  try {
    const meeting = await getMeetingById(req.params.id);

    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: "Meeting not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: meeting,
    });
  } catch (error) {
    return next(error);
  }
}

// =========================================================
// UPDATE MEETING
// =========================================================

export async function updateMeetingController(req, res, next) {
  try {
    const meeting = await updateMeeting(req.params.id, req.body);

    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: "Meeting not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: meeting,
    });
  } catch (error) {
    return next(error);
  }
}

// =========================================================
// DELETE MEETING
// =========================================================

export async function deleteMeetingController(req, res, next) {
  try {
    const meeting = await deleteMeeting(req.params.id);

    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: "Meeting not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: meeting,
    });
  } catch (error) {
    return next(error);
  }
}
