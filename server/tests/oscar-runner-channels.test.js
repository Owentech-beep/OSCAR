import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { buildOscarHistory, withOscarRunLock } from "../services/oscar-run-guard.service.js";
import { requireOscarChannel } from "../services/oscar-channel.service.js";

// Isolate the runner's channel routing from provider-result parsing and SDK imports.
// The project's oscar-result.test.js covers the real result helpers separately.
const source = fs.readFileSync(new URL("../services/oscar-runner.service.js", import.meta.url), "utf8")
  .replace(/import\s+[\s\S]*?from\s+"[^"]+";/g, "")
  .replace("export function createOscarRunner", "function createOscarRunner");
function factory() {
  const scope = vm.createContext({
    buildOscarHistory, withOscarRunLock, requireOscarChannel,
    extractOscarResponse: result => result.finalOutput,
    extractOscarConfirmation: result => result.confirmation ?? null,
    extractOscarConfirmations: result => result.confirmations ?? (result.confirmation ? [result.confirmation] : []),
    classifyOscarRunResult: () => "completed",
    extractOscarCitations: result => result.citations ?? [],
  });
  vm.runInContext(source, scope);
  return scope.createOscarRunner;
}

test("runner keeps text and voice histories separate and preserves citations", async () => {
  const history = { chat: [], voice: [] };
  const observed = [];
  const citations = [{ end: 5, url: "https://example.com", title: "Source" }];
  const run = factory()({
    isConfigured: () => true,
    getConversation: async (userId, channel) => history[channel],
    addMessage: async (userId, role, content, channel) => { history[channel].push({role,content}); },
    getBusinessContext: async () => ({ leads: 1 }),
    runAgent: async (messages, context) => {
      observed.push({ messages: structuredClone(messages), context });
      return { finalOutput: `${context.channel} reply`, citations };
    },
    events: new Proxy({}, { get: () => () => {} }),
  });
  await run("Typed only", { userId: "runner-channel-user" });
  const result = await run("Spoken only", { userId: "runner-channel-user", channel: "voice" });
  assert.equal(history.chat.length, 2);
  assert.equal(history.voice.length, 2);
  assert.equal(observed[0].context.channel, "chat");
  assert.equal(observed[1].context.channel, "voice");
  assert.equal(observed[1].messages.length, 1);
  assert.equal(observed[1].messages[0].content, "Spoken only");
  assert.equal(result.citations, citations);
});

test("runner rejects invalid channel before any dependency runs", async () => {
  let called = false;
  const run = factory()({isConfigured() { called = true; return true; }});
  await assert.rejects(run("Hello", {userId:"user",channel:"invalid"}), {statusCode:400});
  assert.equal(called, false);
});
