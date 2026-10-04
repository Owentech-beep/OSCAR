import Email from "../models/Email.js";

export async function createEmailDraft({
  leadId,
  to,
  subject,
  body,
  metadata = {},
}) {
  return Email.create({
    lead: leadId,
    direction: "outbound",
    type: "draft",
    to,
    subject,
    body,
    status: "draft",
    metadata,
  });
}

export async function getEmailById(emailId) {
  return Email.findById(emailId).populate(
    "lead",
    "companyName contactName email",
  );
}

export async function getEmails({
  page = 1,
  limit = 20,
  status = "",
} = {}) {
  const filter = {};

  if (status) {
    filter.status = status;
  }

  const skip = (page - 1) * limit;

  const [emails, total] = await Promise.all([
    Email.find(filter)
      .populate("lead", "companyName contactName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),

    Email.countDocuments(filter),
  ]);

  return {
    emails,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getLeadEmails(leadId) {
  return Email.find({ lead: leadId }).sort({ createdAt: -1 });
}
