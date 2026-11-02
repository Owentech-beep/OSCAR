import test from "node:test";
import assert from "node:assert/strict";
import {
  createOscarAccountMiddleware,
} from "../middleware/oscar-auth.js";

const USER_ID = "507f1f77bcf86cd799439011";

async function check({
  sessionUser = { id: USER_ID, role: "owner", active: true },
  account = { _id: USER_ID, role: "staff", active: true },
  databaseError,
} = {}) {
  let queries = 0;
  const nextCalls = [];

  const middleware = createOscarAccountMiddleware({
    UserModel: {
      findById(id) {
        queries += 1;
        assert.equal(id, USER_ID);

        return {
          select(fields) {
            assert.equal(fields, "_id role active");

            return {
              async lean() {
                if (databaseError) throw databaseError;
                return account;
              },
            };
          },
        };
      },
    },
  });

  const req = {
    session: { user: sessionUser },
  };

  const res = {
    statusCode: 200,
    body: null,

    status(code) {
      this.statusCode = code;
      return this;
    },

    json(body) {
      this.body = body;
      return this;
    },
  };

  await middleware(req, res, (error) => {
    nextCalls.push(error);
  });

  return { req, res, nextCalls, queries };
}

test("OSCAR account check rejects missing or malformed session IDs", async () => {
  for (const sessionUser of [null, { id: "invalid" }]) {
    const result = await check({ sessionUser });

    assert.equal(result.res.statusCode, 401);
    assert.equal(result.queries, 0);
    assert.equal(result.nextCalls.length, 0);
    assert.equal(result.req.oscarPrincipal, undefined);
  }
});

test("OSCAR account check rejects deleted and inactive accounts", async () => {
  for (const account of [
    null,
    { _id: USER_ID, role: "owner", active: false },
  ]) {
    const result = await check({ account });

    assert.equal(result.res.statusCode, 403);
    assert.equal(result.nextCalls.length, 0);
    assert.equal(result.req.oscarPrincipal, undefined);
  }
});

test("OSCAR account check uses the current database role", async () => {
  const result = await check();

  assert.deepEqual(result.req.oscarPrincipal, {
    userId: USER_ID,
    role: "staff",
    active: true,
  });

  assert.deepEqual(result.nextCalls, [undefined]);
});

test("OSCAR account check rejects an unrecognized role", async () => {
  const result = await check({
    account: { _id: USER_ID, role: "unexpected", active: true },
  });

  assert.equal(result.res.statusCode, 403);
  assert.equal(result.nextCalls.length, 0);
});

test("OSCAR account check propagates database failure without granting access", async () => {
  const failure = new Error("Database unavailable");
  const result = await check({ databaseError: failure });

  assert.deepEqual(result.nextCalls, [failure]);
  assert.equal(result.req.oscarPrincipal, undefined);
});