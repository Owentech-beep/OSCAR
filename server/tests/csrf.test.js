import test from "node:test";
import assert from "node:assert/strict";
import { requireCsrf } from "../middleware/csrf.js";

function createMockRequest({ method = "POST", supplied, expected } = {}) {
  return {
    method,
    path: "/api/clients",
    body: supplied === undefined ? {} : { _csrf: supplied },
    session: expected === undefined
      ? {}
      : { csrfToken: expected },
    get(header) {
      return header.toLowerCase() === "x-csrf-token"
        ? supplied
        : undefined;
    },
  };
}

function createMockResponse() {
  const res = {
    statusCode: 200,
    body: null,
    contentType: null,
    nextCalled: false,

    status(code) {
      this.statusCode = code;
      return this;
    },

    json(body) {
      this.contentType = "json";
      this.body = body;
      return this;
    },

    render(view, body) {
      this.contentType = "html";
      this.body = { view, ...body };
      return this;
    },
  };

  return res;
}

function runMiddleware(req) {
  const res = createMockResponse();

  requireCsrf(req, res, () => {
    res.nextCalled = true;
  });

  return res;
}

test("accepts a matching CSRF token", () => {
  const token = "a".repeat(64);

  const res = runMiddleware(
    createMockRequest({
      supplied: token,
      expected: token,
    }),
  );

  assert.equal(res.nextCalled, true);
  assert.equal(res.statusCode, 200);
});

test("rejects a mismatched CSRF token", () => {
  const res = runMiddleware(
    createMockRequest({
      supplied: "a".repeat(64),
      expected: "b".repeat(64),
    }),
  );

  assert.equal(res.nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.equal(res.contentType, "json");
  assert.equal(res.body.success, false);
});

test("rejects a malformed CSRF token", () => {
  const res = runMiddleware(
    createMockRequest({
      supplied: "invalid-token",
      expected: "a".repeat(64),
    }),
  );

  assert.equal(res.nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.equal(res.contentType, "json");
});

test("allows safe GET requests without a CSRF token", () => {
  const res = runMiddleware(
    createMockRequest({ method: "GET" }),
  );

  assert.equal(res.nextCalled, true);
  assert.equal(res.statusCode, 200);
});