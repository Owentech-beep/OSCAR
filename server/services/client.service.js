import Client from "../models/Client.js";

export async function createClient(data) {
  return Client.create(data);
}

export async function getClients({
  page = 1,
  limit = 20,
  search = "",
  status = "",
} = {}) {
  const filter = {};

  if (search) {
    filter.$or = [
      { companyName: { $regex: search, $options: "i" } },
      { contactName: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  if (status) {
    filter.status = status;
  }

  const skip = (page - 1) * limit;

  const [clients, total] = await Promise.all([
    Client.find(filter)
      .populate("assignedTo", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    Client.countDocuments(filter),
  ]);

  return {
    clients,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getClientById(clientId) {
  return Client.findById(clientId)
    .populate("assignedTo", "name email")
    .lean();
}

export async function updateClient(clientId, data) {
  return Client.findByIdAndUpdate(
    clientId,
    data,
    {
      new: true,
      runValidators: true,
    }
  )
    .populate("assignedTo", "name email")
    .lean();
}

export async function deleteClient(clientId) {
  return Client.findByIdAndDelete(clientId).lean();
}