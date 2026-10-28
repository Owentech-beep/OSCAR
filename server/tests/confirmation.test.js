import test from "node:test";
import assert from "node:assert/strict";

import {
  createConfirmation,
  getConfirmation,
  consumeConfirmation,
  cancelConfirmation,
} from "../services/confirmation.service.js";

function makeConfirmation() {
  return createConfirmation({
    userId: "test-owner",
    action: "create_client",
    description: "Test confirmation only",
    payload: { companyName: "Test Company" },
  });
}

test("owner can cancel a confirmation and it cannot be consumed", () => {
  const confirmation = makeConfirmation();
  const id = confirmation.confirmationId;

  assert.equal(cancelConfirmation(id, "test-owner"), true);
  assert.equal(getConfirmation(id), null);
  assert.equal(consumeConfirmation(id, "test-owner"), null);
});

test("another user cannot cancel or consume the owner's confirmation", () => {
  const confirmation = makeConfirmation();
  const id = confirmation.confirmationId;

  try {
    assert.equal(cancelConfirmation(id, "another-user"), false);
    assert.equal(consumeConfirmation(id, "another-user"), null);
    assert.ok(getConfirmation(id));
  } finally {
    cancelConfirmation(id, "test-owner");
  }
});

test("a confirmation can only be consumed once", () => {
  const confirmation = makeConfirmation();
  const id = confirmation.confirmationId;

  assert.ok(consumeConfirmation(id, "test-owner"));
  assert.equal(consumeConfirmation(id, "test-owner"), null);
  assert.equal(cancelConfirmation(id, "test-owner"), false);
});

test("expired confirmations cannot be consumed", () => {
  const confirmation = createConfirmation({
    userId: "test-owner",
    action: "create_client",
    description: "Expired test confirmation",
    expiresInMs: -1,
  });

  assert.equal(
    consumeConfirmation(confirmation.confirmationId, "test-owner"),
    null,
  );

  assert.equal(getConfirmation(confirmation.confirmationId), null);
});