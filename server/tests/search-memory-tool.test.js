import test from "node:test";
import assert from "node:assert/strict";

import { User } from "../models/User.js";
import { Memory } from "../models/Memory.js";
import { executeSearchMemory } from "../tools/search-memory.tool.js";

const userId = "507f1f77bcf86cd799439011";

const input = {
  query: "preferred contact",
  type: "preference",
  limit: 5,
};

function context(role = "owner") {
  return {
    context: { userId, role },
  };
}

function mockAccount(t, account) {
  return t.mock.method(User, "findById", (id) => {
    assert.equal(id, userId);

    return {
      select() {
        return this;
      },
      async lean() {
        return account;
      },
    };
  });
}

function blockMemoryAccess(t) {
  return t.mock.method(Memory, "find", () => {
    throw new Error("Memory must not be queried");
  });
}

test("memory tool rejects missing authenticated context", async (t) => {
  const lookup = t.mock.method(User, "findById", () => {
    throw new Error("Account must not be queried");
  });
  const memory = blockMemoryAccess(t);

  const result = await executeSearchMemory(input, { context: {} });

  assert.equal(result.success, false);
  assert.match(result.error, /context/i);
  assert.equal(lookup.mock.callCount(), 0);
  assert.equal(memory.mock.callCount(), 0);
});

test("memory tool rejects inactive accounts despite an owner session", async (t) => {
  mockAccount(t, { role: "owner", active: false });
  const memory = blockMemoryAccess(t);

  const result = await executeSearchMemory(input, context("owner"));

  assert.equal(result.success, false);
  assert.match(result.error, /not authorized/i);
  assert.equal(memory.mock.callCount(), 0);
});

test("memory tool rejects a missing account", async (t) => {
  mockAccount(t, null);
  const memory = blockMemoryAccess(t);

  const result = await executeSearchMemory(input, context());

  assert.equal(result.success, false);
  assert.match(result.error, /not authorized/i);
  assert.equal(memory.mock.callCount(), 0);
});

test("memory tool uses current database permissions and authenticated user scope", async (t) => {
  // The session role is stale; the active database role has read access.
  mockAccount(t, { role: "staff", active: true });

  const updatedAt = new Date("2026-10-28T12:00:00Z");

  t.mock.method(Memory, "find", (filter) => {
    assert.equal(filter.userId, userId);
    assert.equal(filter.type, "preference");

    return {
      sort() {
        return this;
      },
      limit(value) {
        assert.equal(value, 5);
        return this;
      },
      async lean() {
        return [{
          _id: "507f1f77bcf86cd799439012",
          type: "preference",
          content: "Preferred contact is email.",
          source: "user",
          importance: 0.8,
          updatedAt,
          metadata: { internalNote: "Not part of tool output" },
        }];
      },
    };
  });

  const result = await executeSearchMemory(
    {
      ...input,
      // Even an unexpected input field must not control user scope.
      userId: "507f1f77bcf86cd799439099",
    },
    context("outdated-role"),
  );

  assert.equal(result.success, true);
  assert.equal(result.data.count, 1);
  assert.equal(
    result.data.memories[0].content,
    "Preferred contact is email.",
  );
  assert.equal(result.data.memories[0].source, "user");
  assert.equal("metadata" in result.data.memories[0], false);
});