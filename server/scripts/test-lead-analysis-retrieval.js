import dns from "node:dns";

dns.setServers(["1.1.1.1"]);

import mongoose from "mongoose";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import Lead from "../models/Lead.js";
import LeadAnalysis from "../models/LeadAnalysis.js";
import { getLeadAnalysis } from "../services/lead-analysis.service.js";

await mongoose.connect(env.MONGODB_URI, {
  serverSelectionTimeoutMS: 60000,
  connectTimeoutMS: 60000,
});

console.log("MongoDB connected for test.");

const testUser = await User.findOne();

if (!testUser) {
  throw new Error("No user found in the database.");
}

console.log("Using test user:", testUser.email);

const lead = await Lead.findOne({
  companyName: "OwenTech Test",
});

if (!lead) {
  throw new Error("OwenTech Test lead was not found.");
}

console.log("\nTEST LEAD FOUND:");

console.dir(
  {
    id: lead._id.toString(),
    companyName: lead.companyName,
    contactName: lead.contactName,
    email: lead.email,
  },
  { depth: null }
);

// Create temporary analysis
const testAnalysis = await LeadAnalysis.findOneAndUpdate(
  { lead: lead._id },
  {
    lead: lead._id,
    score: 85,
    qualification: "High Potential",
    reasoning:
      "Temporary automated test analysis. Strong technology profile and clear business contact information.",
    strengths: [
      "Technology industry",
      "Valid business email",
      "Identified contact",
    ],
    concerns: [
      "No previous contact recorded",
    ],
    recommendedAction:
      "Contact the lead with a personalized introduction.",
    analyzedAt: new Date(),
    model: "test-model",
  },
  {
    new: true,
    upsert: true,
    runValidators: true,
  }
);

console.log("\nTEST ANALYSIS CREATED:");

console.dir(
  {
    id: testAnalysis._id.toString(),
    lead: lead._id.toString(),
    score: testAnalysis.score,
    qualification: testAnalysis.qualification,
    model: testAnalysis.model,
  },
  { depth: null }
);

// Retrieve through the actual service
const analysis = await getLeadAnalysis(lead._id.toString());

if (!analysis) {
  throw new Error("Lead analysis retrieval failed.");
}

console.log("\nSERVICE RESULT:");

console.dir(
  {
    leadId:
      analysis.lead?._id?.toString() ??
      analysis.lead?.toString(),

    score: analysis.score,
    qualification: analysis.qualification,
    reasoning: analysis.reasoning,
    strengths: analysis.strengths,
    concerns: analysis.concerns,
    recommendedAction: analysis.recommendedAction,
    model: analysis.model,
  },
  { depth: null }
);

// Verify
if (
  analysis.score !== 85 ||
  analysis.qualification !== "High Potential" ||
  analysis.model !== "test-model"
) {
  throw new Error("Lead analysis verification failed.");
}

const retrievedLeadId =
  analysis.lead?._id?.toString() ??
  analysis.lead?.toString();

if (retrievedLeadId !== lead._id.toString()) {
  throw new Error("Lead ID verification failed.");
}

console.log("\n🔥 LEAD ANALYSIS RETRIEVAL TEST PASSED.");

// Clean up temporary analysis
await LeadAnalysis.findByIdAndDelete(testAnalysis._id);

console.log("TEST ANALYSIS CLEANED UP.");

await mongoose.disconnect();

console.log("Test database connection closed.");