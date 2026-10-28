import dns from "node:dns";
dns.setServers(["1.1.1.1"]);

import mongoose from "mongoose";
import { env } from "../config/env.js";
import Lead from "../models/Lead.js";
import LeadAnalysis from "../models/LeadAnalysis.js";
import { getLeadAnalysis } from "../services/lead-analysis.service.js";

try {
  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 60000,
    connectTimeoutMS: 60000,
  });

  console.log("MongoDB connected for test.");

  const lead = await Lead.findOne({
    companyName: "OwenTech Test",
  });

  if (!lead) {
    throw new Error("OwenTech Test lead was not found.");
  }

  console.log("Test lead found:", lead.companyName);

  const expectedAnalysis = await LeadAnalysis.findOne({
    lead: lead._id,
  }).lean();

  if (!expectedAnalysis) {
    throw new Error(
      "No existing analysis found for OwenTech Test. " +
      "This test requires an existing analysis and will not create one."
    );
  }

  const analysis = await getLeadAnalysis(lead._id.toString());

  if (!analysis) {
    throw new Error("Lead analysis retrieval failed.");
  }

  const retrievedLeadId =
    analysis.lead?._id?.toString() ??
    analysis.lead?.toString();

  if (retrievedLeadId !== lead._id.toString()) {
    throw new Error("Lead ID verification failed.");
  }

  if (analysis.score !== expectedAnalysis.score) {
    throw new Error("Analysis score does not match the stored record.");
  }

  if (analysis.qualification !== expectedAnalysis.qualification) {
    throw new Error(
      "Analysis qualification does not match the stored record."
    );
  }

  if (analysis.model !== expectedAnalysis.model) {
    throw new Error("Analysis model does not match the stored record.");
  }

  if (!analysis.lead?.companyName) {
    throw new Error("Lead population failed.");
  }

  console.log("\nRETRIEVED ANALYSIS:");

  console.dir(
    {
      companyName: analysis.lead.companyName,
      leadId: retrievedLeadId,
      score: analysis.score,
      qualification: analysis.qualification,
      model: analysis.model,
      analyzedAt: analysis.analyzedAt,
    },
    { depth: null }
  );

  console.log("\nLEAD ANALYSIS RETRIEVAL TEST PASSED.");
} catch (error) {
  console.error("\nLEAD ANALYSIS RETRIEVAL TEST FAILED:");
  console.error(error);
  process.exitCode = 1;
} finally {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log("Test database connection closed.");
  }
}