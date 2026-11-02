import test from "node:test";
import assert from "node:assert/strict";

import { Memory } from "../models/Memory.js";
import {
  saveMemory,
  searchMemory,
} from "../services/memory.service.js";

const userId = "507f1f77bcf86cd799439011";

test("memory operations reject missing user IDs before database access", async (t) => {
  const find = t.mock.method(Memory, "find", () => {
    throw new Error("Database must not be called");
  });

  const create = t.mock.method(Memory, "create", () => {
    throw new Error("Database must not be called");
  });

  await assert.rejects(
    searchMemory({ query: "test" }),
    (error) => error.statusCode === 400,
  );

  await assert.rejects(
    saveMemory({ type: "preference", content: "Test memory" }),
    (error) => error.statusCode === 400,
  );

  assert.equal(find.mock.callCount(), 0);
  assert.equal(create.mock.callCount(), 0);
});

test("memory search is user-scoped and treats regex characters literally", async (t) => {
  const query = "Client (A).*";
  const expected = [{ content: "Client (A).* prefers email" }];

  t.mock.method(Memory, "find", (filter) => {
    assert.equal(filter.userId, userId);
    assert.equal(filter.type, "client");

    const pattern = new RegExp(
      filter.content.$regex,
      filter.content.$options,
    );

    assert.equal(pattern.test("Client (A).* prefers email"), true);
    assert.equal(pattern.test("Client A anything"), false);

    return {
      sort() {
        return this;
      },
      limit(value) {
        assert.equal(value, 5);
        return this;
      },
      async lean() {
        return expected;
      },
    };
  });

  const result = await searchMemory({
    userId,
    query,
    type: "client",
    limit: 5,
  });

  assert.deepEqual(result, expected);
});

test("memory search rejects invalid limits", async () => {
  for (const limit of [0, -1, 51, 1.5, NaN]) {
    await assert.rejects(
      searchMemory({ userId, limit }),
      (error) => error.statusCode === 400,
    );
  }
});

test("memory save trims content and removes empty linked IDs", async (t) => {
  t.mock.method(Memory, "create", async (data) => {
    assert.equal(data.userId, userId);
    assert.equal(data.content, "Address me as Sir");
    assert.equal(data.importance, 0.5);
    assert.equal(data.source, "oscar");
    assert.equal("clientId" in data, false);
    assert.equal("leadId" in data, false);

    return data;
  });

  await saveMemory({
    userId,
    type: "preference",
    content: "  Address me as Sir  ",
    clientId: "",
    leadId: "",
  });
});