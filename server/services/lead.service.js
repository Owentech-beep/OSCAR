import Lead from "../models/Lead.js";

export const createLead = async (leadData) => {
  const lead = await Lead.create(leadData);

  return lead;
};

export const getLeads = async ({
  page = 1,
  limit = 10,
  search = "",
  status = "",
  sort = "newest",
} = {}) => {
  const skip = (page - 1) * limit;

  const filter = {};

  // Search
  if (search) {
    filter.$or = [
      { companyName: { $regex: search, $options: "i" } },
      { contactName: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { industry: { $regex: search, $options: "i" } },
    ];
  }

  // Status filter
  if (status) {
    filter.status = status;
  }

  // Sorting
  let sortOption = { createdAt: -1 };

  if (sort === "oldest") {
    sortOption = { createdAt: 1 };
  }

  if (sort === "score-high") {
    sortOption = { leadScore: -1 };
  }

  if (sort === "score-low") {
    sortOption = { leadScore: 1 };
  }

  const [leads, total] = await Promise.all([
    Lead.find(filter)
      .populate("assignedTo", "name email")
      .sort(sortOption)
      .skip(skip)
      .limit(limit),

    Lead.countDocuments(filter),
  ]);

  return {
    leads,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getLeadById = async (leadId) => {
  const lead = await Lead.findById(leadId).populate("assignedTo", "name email");

  return lead;
};

export const updateLead = async (leadId, leadData) => {
  const lead = await Lead.findByIdAndUpdate(leadId, leadData, {
    new: true,
    runValidators: true,
  });

  return lead;
};

export const deleteLead = async (leadId) => {
  const lead = await Lead.findByIdAndDelete(leadId);

  return lead;
};
