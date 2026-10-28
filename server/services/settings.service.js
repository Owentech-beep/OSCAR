import { z } from "zod";
import BusinessSettings from "../models/BusinessSettings.js";

const businessSettingsInput = z.object({
  name: z.string().trim().min(1, "Business name is required.").max(150),

  email: z.union([
    z.string().trim().email().max(254),
    z.literal(""),
  ]),

  phone: z.string().trim().max(50),

  website: z.string().trim().max(500).refine(
    (value) => {
      if (!value) return true;

      try {
        const url = new URL(value);
        return ["http:", "https:"].includes(url.protocol);
      } catch {
        return false;
      }
    },
    "Website must start with http:// or https://.",
  ),

  address: z.string().trim().max(500),
});

export async function getBusinessSettings() {
  const saved = await BusinessSettings.findById("business").lean();

  return {
    name: saved?.name ?? process.env.BUSINESS_NAME ?? "OwenTech",
    email: saved?.email ?? process.env.BUSINESS_EMAIL ?? "",
    phone: saved?.phone ?? process.env.BUSINESS_PHONE ?? "",
    website: saved?.website ?? process.env.BUSINESS_WEBSITE ?? "",
    address: saved?.address ?? process.env.BUSINESS_ADDRESS ?? "",
  };
}

export async function saveBusinessSettings(input, userId) {
  const parsed = businessSettingsInput.safeParse(input);

  if (!parsed.success) {
    const error = new Error(
      parsed.error.issues.map((issue) => issue.message).join(" "),
    );

    error.statusCode = 400;
    throw error;
  }

  return BusinessSettings.findOneAndUpdate(
    { _id: "business" },
    {
      $set: {
        ...parsed.data,
        updatedBy: userId,
      },
    },
    {
      upsert: true,
      new: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  );
}