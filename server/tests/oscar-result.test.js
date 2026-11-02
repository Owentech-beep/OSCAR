import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyOscarToolResult,
  extractOscarConfirmation,
  classifyOscarRunResult
} from "../services/oscar-result.service.js";

test("tool results distinguish explicit success and failure", () => {
  assert.deepEqual(
    classifyOscarToolResult({ success: true, data: {} }),
    { status: "completed", success: true },
  );

  assert.deepEqual(
    classifyOscarToolResult(
      JSON.stringify({ success: false, error: "Access denied." }),
    ),
    { status: "failed", success: false },
  );
});

test("approval requests are not reported as completed actions", () => {
  assert.deepEqual(
    classifyOscarToolResult({
      success: true,
      requiresConfirmation: true,
      confirmation: { confirmationId: "test-confirmation" },
    }),
    { status: "awaiting_confirmation", success: null },
  );
});

test("explicit failure takes precedence over an approval flag", () => {
  assert.deepEqual(
    classifyOscarToolResult({
      success: false,
      requiresConfirmation: true,
    }),
    { status: "failed", success: false },
  );
});

test("unrecognized tool results remain unknown", () => {
  for (const output of [
    undefined,
    null,
    "not JSON",
    "null",
    [],
    {},
    { data: [] },
  ]) {
    assert.deepEqual(
      classifyOscarToolResult(output),
      { status: "unknown", success: null },
    );
  }
});

test("confirmation extraction supports object and JSON outputs", () => {
  const confirmation = { confirmationId: "test-confirmation" };

  for (const output of [
    { requiresConfirmation: true, confirmation },
    JSON.stringify({ requiresConfirmation: true, confirmation }),
  ]) {
    assert.deepEqual(
      extractOscarConfirmation({
        newItems: [{ type: "tool_call_output_item", output }],
      }),
      confirmation,
    );
  }
});

test("failed tool results cannot supply a confirmation", () => {
  assert.equal(
    extractOscarConfirmation({
      newItems: [{
        type: "tool_call_output_item",
        output: {
          success: false,
          requiresConfirmation: true,
          confirmation: { confirmationId: "invalid" },
        },
      }],
    }),
    null,
  );
});

function runWithOutputs(...outputs) {
  return {
    newItems: outputs.map((output) => ({
      type: "tool_call_output_item",
      output,
    })),
  };
}

test("a failed tool prevents a successful final classification", () => {
  assert.equal(
    classifyOscarRunResult(
      runWithOutputs(
        { success: true },
        { success: false, error: "Access denied." },
      ),
    ),
    "failed",
  );
});

test("pending and unknown tool outcomes remain distinct", () => {
  assert.equal(
    classifyOscarRunResult(
      runWithOutputs({
        success: true,
        requiresConfirmation: true,
      }),
    ),
    "awaiting_confirmation",
  );

  assert.equal(
    classifyOscarRunResult(runWithOutputs("unrecognized output")),
    "unknown",
  );
});

test("successful tools and text-only turns classify as completed", () => {
  assert.equal(
    classifyOscarRunResult(runWithOutputs({ success: true })),
    "completed",
  );

  assert.equal(
    classifyOscarRunResult({ newItems: [] }),
    "completed",
  );
});