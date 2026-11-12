import test from "node:test";
import assert from "node:assert/strict";
import { requireOscarChannel } from "../services/oscar-channel.service.js";
import { createOscarConversationStore } from "../services/oscar-conversation-store.service.js";
import { withOscarRunLock } from "../services/oscar-run-guard.service.js";

function fixture() {
  const records = new Map([["a", { _id: "a", messages: [{ role: "user", content: "Legacy chat" }] }]]);
  let accesses = 0;
  const store = createOscarConversationStore({
    validateUserId(id) { assert.ok(id); },
    Conversation: {
      findById(id) {
        accesses++;
        return { select() { return { async lean() { return structuredClone(records.get(id)); } }; } };
      },
      findOneAndUpdate({ _id }, update) {
        accesses++;
        return { async lean() {
          const record = records.get(_id) ?? { _id };
          for (const [field, operation] of Object.entries(update.$push)) {
            record[field] = [...(record[field] ?? []), ...operation.$each].slice(operation.$slice);
          }
          records.set(_id, record);
          return structuredClone(record);
        } };
      },
      async updateOne({ _id }, update) {
        accesses++;
        if (records.has(_id)) Object.assign(records.get(_id), update.$set);
      },
    },
  });
  return { ...store, accesses: () => accesses };
}

test("channel defaults preserve legacy chat and reject unknown channels", () => {
  assert.equal(requireOscarChannel(), "chat");
  assert.equal(requireOscarChannel("voice"), "voice");
  for (const value of [null, "other", {}, "", 1]) {
    assert.throws(() => requireOscarChannel(value), { statusCode: 400 });
  }
});

test("legacy text history remains readable and voice starts empty", async () => {
  const store = fixture();
  assert.equal((await store.getConversation("a"))[0].content, "Legacy chat");
  assert.deepEqual(await store.getConversation("a", "voice"), []);
});

test("writes retain the latest 20 per channel and isolate users", async () => {
  const store = fixture();
  await store.addMessage("b", "user", "Other user", "voice");
  for (let i = 0; i < 25; i++) await store.addMessage("a", "user", `Voice ${i}`, "voice");
  assert.equal((await store.getConversation("a"))[0].content, "Legacy chat");
  const voice = await store.getConversation("a", "voice");
  assert.equal(voice.length, 20);
  assert.equal(voice[0].content, "Voice 5");
  assert.equal((await store.getConversation("b", "voice"))[0].content, "Other user");
  assert.deepEqual(await store.getConversation("b", "chat"), []);
});

test("clearing either channel preserves the other", async () => {
  const store = fixture();
  await store.addMessage("a", "assistant", "Voice reply", "voice");
  await store.clearConversation("a");
  assert.deepEqual(await store.getConversation("a"), []);
  assert.equal((await store.getConversation("a", "voice")).length, 1);
  await store.addMessage("a", "user", "New text");
  await store.clearConversation("a", "voice");
  assert.equal((await store.getConversation("a"))[0].content, "New text");
  assert.deepEqual(await store.getConversation("a", "voice"), []);
});

test("invalid channel is rejected before database access", async () => {
  const store = fixture();
  await assert.rejects(store.getConversation("a", "invalid"), { statusCode: 400 });
  await assert.rejects(store.addMessage("a", "user", "hello", "invalid"), { statusCode: 400 });
  await assert.rejects(store.clearConversation("a", "invalid"), { statusCode: 400 });
  assert.equal(store.accesses(), 0);
});

test("one user's voice and chat can overlap, duplicate same-channel runs cannot", async () => {
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  const chat = withOscarRunLock("channel-test", () => pending);
  try {
    assert.equal(await withOscarRunLock("channel-test", async () => "Voice", "voice"), "Voice");
    await assert.rejects(withOscarRunLock("channel-test", async () => "Duplicate"), { code: "OSCAR_RUN_IN_PROGRESS" });
  } finally { release(); await chat; }
  await assert.rejects(withOscarRunLock("channel-test", async () => { throw new Error("Failure"); }, "voice"), /Failure/);
  assert.equal(await withOscarRunLock("channel-test", async () => "Recovered", "voice"), "Recovered");
});
