import test from "node:test";
import assert from "node:assert/strict";

import {
  createOscarAccountMiddleware,
} from "../middleware/oscar-auth.js";

import {
  createConfirmation,
  getConfirmation,
  consumeConfirmation,
  cancelConfirmation,
} from "../services/confirmation.service.js";

test("an inactive account is blocked before its approval is consumed", async (t) => {
  const userId = "507f1f77bcf86cd799439011";

  const confirmation = createConfirmation({
    userId,
    action: "create_client",
    description: "Test approval only",
    payload: {},
  });

  t.after(() => {
    cancelConfirmation(confirmation.confirmationId, userId);
  });

  const middleware = createOscarAccountMiddleware({
    UserModel: {
      findById(id) {
        assert.equal(id, userId);

        return {
          select() {
            return {
              async lean() {
                return {
                  _id: userId,
                  role: "owner",
                  active: false,
                };
              },
            };
          },
        };
      },
    },
  });

  const req = {
    session: {
      user: {
        id: userId,
        role: "owner",
        active: true,
      },
    },
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

  let actionReached = false;

  await middleware(req, res, (error) => {
    if (error) throw error;

    actionReached = true;
    consumeConfirmation(confirmation.confirmationId, userId);
  });

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.success, false);
  assert.equal(actionReached, false);

  assert.equal(
    getConfirmation(confirmation.confirmationId)?.confirmationId,
    confirmation.confirmationId,
  );
});