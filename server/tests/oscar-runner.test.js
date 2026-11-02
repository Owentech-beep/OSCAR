import test from "node:test";
import assert from "node:assert/strict";
import { createOscarRunner } from "../services/oscar-runner.service.js";

function makeResult(...outputs) {
  return {
    finalOutput: "Here is the result, Sir.",
    newItems: outputs.map((output) => ({
      type: "tool_call_output_item",
      output,
    })),
  };
}

function setup({
  result = makeResult({ success: true }),
  configured = true,
  agent,
} = {}) {
  const messages = [];
  const emitted = [];
  const agentCalls = [];
  const business = { leads: { total: 2 } };

  const events = {};

  for (const name of [
    "emitStart",
    "emitThinking",
    "emitOffline",
    "emitConfirmationRequired",
    "emitError",
    "emitSuccess",
    "emitCompleted",
  ]) {
    events[name] = (...args) => {
      emitted.push({ name, args });
    };
  }

  const runner = createOscarRunner({
    isConfigured: () => configured,

    addMessage: async (userId, role, content) => {
      messages.push({ userId, role, content });
    },

    getConversation: async (userId) =>
      messages.filter((message) => message.userId === userId),

    getBusinessContext: async () => business,

    runAgent: async (history, context) => {
      agentCalls.push({ history, context });
      return agent ? agent(history, context) : result;
    },

    events,
  });

  return { runner, messages, emitted, agentCalls, business };
}

function terminalEvents(emitted) {
  return emitted.filter(({ name }) =>
    [
      "emitOffline",
      "emitConfirmationRequired",
      "emitError",
      "emitSuccess",
      "emitCompleted",
    ].includes(name),
  );
}

test("runner passes structured history and saves a successful response", async () => {
  const fixture = setup();

  const response = await fixture.runner("  Show my leads  ", {
    userId: "runner-success",
    role: "owner",
  });

  assert.equal(response.response, "Here is the result, Sir.");
  assert.equal(response.confirmation, null);

  assert.deepEqual(
    fixture.messages.map(({ role, content }) => ({ role, content })),
    [
      { role: "user", content: "Show my leads" },
      { role: "assistant", content: "Here is the result, Sir." },
    ],
  );

  assert.equal(fixture.agentCalls.length, 1);
  assert.deepEqual(fixture.agentCalls[0].history, [
    { role: "user", content: "Show my leads" },
  ]);
  assert.equal(
    fixture.agentCalls[0].context.business,
    fixture.business,
  );
  assert.equal(fixture.agentCalls[0].context.userId, "runner-success");

  assert.deepEqual(
    terminalEvents(fixture.emitted).map(({ name }) => name),
    ["emitSuccess"],
  );
});

test("failed tool emits an error while preserving the response", async () => {
  const fixture = setup({
    result: makeResult({ success: false, error: "Access denied." }),
  });

  const response = await fixture.runner("Read a record", {
    userId: "runner-failed-tool",
  });

  assert.equal(response.response, "Here is the result, Sir.");
  assert.equal(fixture.messages.at(-1).role, "assistant");

  const terminal = terminalEvents(fixture.emitted);
  assert.equal(terminal.length, 1);
  assert.equal(terminal[0].name, "emitError");
  assert.match(terminal[0].args[1].message, /operations failed/);
});

test("pending approval emits confirmation instead of success", async () => {
  const confirmation = { confirmationId: "test-approval" };

  const fixture = setup({
    result: makeResult({
      success: true,
      requiresConfirmation: true,
      confirmation,
    }),
  });

  const response = await fixture.runner("Prepare an action", {
    userId: "runner-approval",
  });

  assert.deepEqual(response.confirmation, confirmation);
  assert.deepEqual(terminalEvents(fixture.emitted), [
    {
      name: "emitConfirmationRequired",
      args: ["runner-approval", confirmation],
    },
  ]);
});

test("unknown output emits neutral completion instead of success", async () => {
  const fixture = setup({
    result: makeResult("unrecognized tool output"),
  });

  await fixture.runner("Check a record", {
    userId: "runner-unknown",
  });

  assert.deepEqual(
    terminalEvents(fixture.emitted).map(({ name }) => name),
    ["emitCompleted"],
  );
});

test("agent failure releases the lock and does not save an assistant reply", async () => {
  const failure = new Error("Simulated provider failure");
  let attempts = 0;

  const fixture = setup({
    agent: async () => {
      attempts += 1;
      if (attempts === 1) throw failure;
      return makeResult({ success: true });
    },
  });

  await assert.rejects(
    fixture.runner("First request", { userId: "runner-recovery" }),
    (error) => error === failure,
  );

  assert.equal(fixture.messages.length, 1);
  assert.equal(fixture.messages[0].role, "user");

  await fixture.runner("Second request", {
    userId: "runner-recovery",
  });

  assert.equal(attempts, 2);
  assert.deepEqual(
    terminalEvents(fixture.emitted).map(({ name }) => name),
    ["emitError", "emitSuccess"],
  );
});

test("missing AI configuration stops before memory writes or agent calls", async () => {
  const fixture = setup({ configured: false });

  await assert.rejects(
    fixture.runner("Hello", { userId: "runner-offline" }),
    (error) => error.statusCode === 503,
  );

  assert.equal(fixture.messages.length, 0);
  assert.equal(fixture.agentCalls.length, 0);
  assert.deepEqual(
    fixture.emitted.map(({ name }) => name),
    ["emitOffline"],
  );
});