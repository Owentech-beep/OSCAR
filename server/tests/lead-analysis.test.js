import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import LeadAnalysis from "../models/LeadAnalysis.js";
import { getLeadAnalysis } from "../services/lead-analysis.service.js";

test("getLeadAnalysis queries by lead ID and populates the lead", async (t) => {
  const leadId = new mongoose.Types.ObjectId();

  const expectedAnalysis = {
    score: 85,
    qualification: "High Potential",
  };

  let populated = false;

  const originalFindOne = LeadAnalysis.findOne;

  t.after(() => {
    LeadAnalysis.findOne = originalFindOne;
  });

  LeadAnalysis.findOne = (query) => {
    assert.deepEqual(query, { lead: leadId.toString() });

    return {
      populate(field) {
        assert.equal(field, "lead");
        populated = true;

        return Promise.resolve(expectedAnalysis);
      },
    };
  };

  const result = await getLeadAnalysis(leadId.toString());

  assert.equal(populated, true);
  assert.equal(result, expectedAnalysis);
  assert.equal(result.score, 85);
  assert.equal(result.qualification, "High Potential");
});

test("getLeadAnalysis returns null when no analysis exists", async (t) => {
  const originalFindOne = LeadAnalysis.findOne;

  t.after(() => {
    LeadAnalysis.findOne = originalFindOne;
  });

  LeadAnalysis.findOne = () => ({
    populate: async () => null,
  });

  const result = await getLeadAnalysis(
    new mongoose.Types.ObjectId().toString()
  );

  assert.equal(result, null);
});