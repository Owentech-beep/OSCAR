import test from "node:test";
import assert from "node:assert/strict";
import { executeConfirmedEmail } from "../services/confirmed-email.service.js";

function setup({ providerError, completionError } = {}) {
  const approvedEmail = {
    to: "test@example.com",
    subject: "Test email",
    body: "Test body",
  };

  const record = {
    _id: "507f1f77bcf86cd799439011",
    direction: "outbound",
    status: "draft",
    ...approvedEmail,
  };

  const payload = {
    emailId: record._id,
    approvedEmail: { ...approvedEmail },
  };

  let providerCalls = 0;
  let completionCalls = 0;

  const dependencies = {
    Email: {
      async findById(id) {
        assert.equal(id, record._id);
        return { ...record };
      },

      async findOneAndUpdate(filter, update, options) {
        assert.equal(filter._id, record._id);
        assert.equal(filter.status, "draft");
        assert.equal(filter.direction, "outbound");
        assert.equal(options.runValidators, true);

        // Simulate atomic matching and mutation without an await.
        const matches = Object.entries(filter).every(
          ([key, value]) => record[key] === value,
        );

        if (!matches) return null;

        Object.assign(record, update.$set);
        return { ...record };
      },
    },

    async sendEmail(content) {
      providerCalls++;
      assert.deepEqual(content, approvedEmail);

      if (providerError) throw providerError;

      return { messageId: "provider-test-id" };
    },

    async markEmailAsSent(id, messageId) {
      completionCalls++;
      assert.equal(id, record._id);
      assert.equal(record.status, "sending");

      if (completionError) throw completionError;

      Object.assign(record, {
        status: "sent",
        sentAt: new Date(),
        providerMessageId: messageId,
      });

      return { ...record };
    },
  };

  return {
    record,
    payload,
    dependencies,
    providerCalls: () => providerCalls,
    completionCalls: () => completionCalls,
  };
}

test("changed content is rejected before sending", async () => {
  const fixture = setup();
  fixture.record.body = "Changed after approval";

  const result = await executeConfirmedEmail(
    fixture.payload,
    fixture.dependencies,
  );

  assert.equal(result.success, false);
  assert.match(result.error, /changed|outdated/);
  assert.equal(fixture.providerCalls(), 0);
  assert.equal(fixture.record.status, "draft");
});

test("competing approved sends call the provider only once", async () => {
  const fixture = setup();

  const results = await Promise.all([
    executeConfirmedEmail(fixture.payload, fixture.dependencies),
    executeConfirmedEmail(fixture.payload, fixture.dependencies),
  ]);

  assert.equal(results.filter((result) => result.success).length, 1);
  assert.equal(fixture.providerCalls(), 1);
  assert.equal(fixture.completionCalls(), 1);
  assert.equal(fixture.record.status, "sent");
});

test("provider timeout leaves sending status and blocks another attempt", async () => {
  const timeout = new Error("Provider timeout");
  const fixture = setup({ providerError: timeout });

  await assert.rejects(
    executeConfirmedEmail(fixture.payload, fixture.dependencies),
    (error) => error === timeout,
  );

  assert.equal(fixture.record.status, "sending");
  assert.equal(fixture.completionCalls(), 0);

  const retry = await executeConfirmedEmail(
    fixture.payload,
    fixture.dependencies,
  );

  assert.equal(retry.success, false);
  assert.equal(fixture.providerCalls(), 1);
});

test("database failure after acceptance does not trigger another send", async () => {
  const databaseError = new Error("Database unavailable");
  const fixture = setup({ completionError: databaseError });

  await assert.rejects(
    executeConfirmedEmail(fixture.payload, fixture.dependencies),
    (error) => error === databaseError,
  );

  assert.equal(fixture.record.status, "sending");
  assert.equal(fixture.completionCalls(), 1);

  const retry = await executeConfirmedEmail(
    fixture.payload,
    fixture.dependencies,
  );

  assert.equal(retry.success, false);
  assert.equal(fixture.providerCalls(), 1);
});