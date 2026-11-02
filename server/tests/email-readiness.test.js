import test from "node:test";
import assert from "node:assert/strict";

import {
  isEmailConfigured,
  assertEmailConfigured,
} from "../services/email-readiness.service.js";

import {
  executeConfirmedEmail,
} from "../services/confirmed-email.service.js";

test("email readiness requires both nonblank configuration values", () => {
  for (const config of [
    {},
    { RESEND_API_KEY: "test-only" },
    { RESEND_FROM_EMAIL: "test@example.com" },
    {
      RESEND_API_KEY: "   ",
      RESEND_FROM_EMAIL: "test@example.com",
    },
    {
      RESEND_API_KEY: "test-only",
      RESEND_FROM_EMAIL: "   ",
    },
  ]) {
    assert.equal(isEmailConfigured(config), false);

    assert.throws(
      () => assertEmailConfigured(config),
      (error) =>
        error.statusCode === 503 &&
        error.code === "EMAIL_NOT_CONFIGURED",
    );
  }
});

test("email readiness accepts present configuration without provider access", () => {
  const config = {
    RESEND_API_KEY: "test-only-not-a-real-key",
    RESEND_FROM_EMAIL: "test@example.com",
  };

  assert.equal(isEmailConfigured(config), true);
  assert.doesNotThrow(() => assertEmailConfigured(config));
});

test("missing email configuration rejects an approved send before claiming", async () => {
  const approvedEmail = {
    to: "test@example.com",
    subject: "Offline test",
    body: "Do not send.",
  };

  const draft = {
    _id: "test-email",
    status: "draft",
    direction: "outbound",
    ...approvedEmail,
  };

  let claims = 0;
  let sends = 0;
  let completions = 0;

  await assert.rejects(
    executeConfirmedEmail(
      { emailId: draft._id, approvedEmail },
      {
        Email: {
          async findById() {
            return draft;
          },

          async findOneAndUpdate() {
            claims += 1;
            return draft;
          },
        },

        assertEmailConfigured() {
          assertEmailConfigured({});
        },

        async sendEmail() {
          sends += 1;
        },

        async markEmailAsSent() {
          completions += 1;
        },
      },
    ),
    (error) => error.code === "EMAIL_NOT_CONFIGURED",
  );

  assert.equal(draft.status, "draft");
  assert.equal(claims, 0);
  assert.equal(sends, 0);
  assert.equal(completions, 0);
});