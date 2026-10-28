import { EventEmitter } from "node:events";

export const OSCAR_EVENTS = {
  START: "oscar:start",
  THINKING: "oscar:thinking",
  TOOL_CALL: "oscar:tool_call",
  TOOL_RESULT: "oscar:tool_result",
  CONFIRMATION_REQUIRED: "oscar:confirmation_required",
  SUCCESS: "oscar:success",
  ERROR: "oscar:error",
  OFFLINE: "oscar:offline",
};

class OscarEventService extends EventEmitter {
  emitStart(userId) {
    this.emit(OSCAR_EVENTS.START, {
      userId,
      timestamp: new Date().toISOString(),
    });
  }

  emitThinking(userId) {
    this.emit(OSCAR_EVENTS.THINKING, {
      userId,
      timestamp: new Date().toISOString(),
    });
  }

  emitToolCall(userId, tool) {
    this.emit(OSCAR_EVENTS.TOOL_CALL, {
      userId,
      tool,
      timestamp: new Date().toISOString(),
    });
  }

  emitToolResult(userId, tool, success = true) {
    this.emit(OSCAR_EVENTS.TOOL_RESULT, {
      userId,
      tool,
      success,
      timestamp: new Date().toISOString(),
    });
  }

  emitConfirmationRequired(userId, confirmation) {
    this.emit(OSCAR_EVENTS.CONFIRMATION_REQUIRED, {
      userId,
      confirmation,
      timestamp: new Date().toISOString(),
    });
  }

  emitSuccess(userId) {
    this.emit(OSCAR_EVENTS.SUCCESS, {
      userId,
      timestamp: new Date().toISOString(),
    });
  }

  emitError(userId, error) {
    this.emit(OSCAR_EVENTS.ERROR, {
      userId,
      error: error?.message || "OSCAR encountered an error.",
      timestamp: new Date().toISOString(),
    });
  }

  emitOffline(userId) {
    this.emit(OSCAR_EVENTS.OFFLINE, {
      userId,
      timestamp: new Date().toISOString(),
    });
  }
}

export const oscarEvents = new OscarEventService();