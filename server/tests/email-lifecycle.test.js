import test from "node:test";
import assert from "node:assert/strict";

import Email from "../models/Email.js";
import {
  scheduleEmail,
  claimScheduledEmail,
} from "../services/email.service.js";
import { markEmailAsSent } from "../services/email-send.service.js";

const emailId = "507f1f77bcf86cd799439011";

test("only one competing request can schedule a draft", async (t) => {
  let status = "draft";
  let writes = 0;

  t.mock.method(Email, "findOneAndUpdate", async (filter, update, options) => {
    assert.equal(filter._id, emailId);
    assert.equal(filter.direction, "outbound");
    assert.equal(filter.status, "draft");
    assert.equal(options.runValidators, true);

    if (status !== filter.status) return null;

    // Simulate one atomic database update.
    status = update.$set.status;
    writes++;

    return { _id: emailId, status };
  });

  t.mock.method(Email, "findById", () => ({
    select: () => ({
      lean: async () => ({ status }),
    }),
  }));

  const when = new Date(Date.now() + 60_000);

  const results = await Promise.allSettled([
    scheduleEmail(emailId, when),
    scheduleEmail(emailId, when),
  ]);

  assert.equal(writes, 1);
  assert.equal(status, "scheduled");

  assert.equal(
    results.filter((result) => result.status === "fulfilled").length,
    1,
  );

  const rejected = results.find(
    (result) => result.status === "rejected",
  );

  assert.equal(rejected.reason.statusCode, 409);
});

test("scheduling rejects an email already being sent", async (t) => {
  t.mock.method(Email, "findOneAndUpdate", async (filter) => {
    assert.equal(filter.status, "draft");
    return null;
  });

  t.mock.method(Email, "findById", () => ({
    select: () => ({
      lean: async () => ({ status: "sending" }),
    }),
  }));

  await assert.rejects(
    scheduleEmail(emailId, new Date(Date.now() + 60_000)),
    (error) =>
      error.statusCode === 409 &&
      error.message.includes("sending"),
  );
});

test("only one scheduler worker can claim the same due email", async (t) => {
  let status = "scheduled";
  let claims = 0;

  t.mock.method(Email, "findOneAndUpdate", async (filter, update) => {
    assert.equal(filter.status, "scheduled");
    assert.ok(filter.scheduledAt.$lte instanceof Date);
    assert.equal(update.$set.status, "sending");
    assert.ok(update.$set.sendingAt instanceof Date);

    if (status !== filter.status) return null;

    status = update.$set.status;
    claims++;

    return { _id: emailId, status };
  });

  const results = await Promise.all([
    claimScheduledEmail(),
    claimScheduledEmail(),
  ]);

  assert.equal(claims, 1);
  assert.equal(results.filter(Boolean).length, 1);
  assert.equal(status, "sending");
});

test("missing provider ID cannot mark an email sent", async (t) => {
  const update = t.mock.method(
    Email,
    "findOneAndUpdate",
    async () => {
      throw new Error("Database must not be called");
    },
  );

  await assert.rejects(
    markEmailAsSent(emailId, null),
    (error) => error.statusCode === 502,
  );

  assert.equal(update.mock.callCount(), 0);
});

test("provider acceptance is recorded only from sending status", async (t) => {
  t.mock.method(Email, "findOneAndUpdate", async (filter, update, options) => {
    assert.deepEqual(filter, {
      _id: emailId,
      status: "sending",
    });

    assert.equal(update.$set.status, "sent");
    assert.equal(update.$set.type, "sent");
    assert.equal(update.$set.providerMessageId, "provider-test-id");
    assert.ok(update.$set.sentAt instanceof Date);
    assert.equal(options.runValidators, true);

    return { _id: emailId, ...update.$set };
  });

  const result = await markEmailAsSent(emailId, "provider-test-id");

  assert.equal(result.status, "sent");
});

test("completion rejects an email no longer in sending status", async (t) => {
  t.mock.method(Email, "findOneAndUpdate", async () => null);

  await assert.rejects(
    markEmailAsSent(emailId, "provider-test-id"),
    (error) => error.statusCode === 409,
  );
});

test("a database failure during completion is propagated", async (t) => {
  const databaseError = new Error("Database unavailable");

  t.mock.method(Email, "findOneAndUpdate", async () => {
    throw databaseError;
  });

  await assert.rejects(
    markEmailAsSent(emailId, "provider-test-id"),
    (error) => error === databaseError,
  );
});