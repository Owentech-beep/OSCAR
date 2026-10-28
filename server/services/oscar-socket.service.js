import { oscarEvents, OSCAR_EVENTS } from "./oscar-events.service.js";

let io = null;
let registeredHandlers = [];

export function initializeOscarSocket(socketServer) {
  if (io === socketServer && registeredHandlers.length > 0) {
    return;
  }

  removeOscarSocketListeners();

  io = socketServer;

  for (const eventName of new Set(Object.values(OSCAR_EVENTS))) {
    const handler = (payload) => {
      emitToUser(eventName, payload);
    };

    oscarEvents.on(eventName, handler);
    registeredHandlers.push([eventName, handler]);
  }
}

function emitToUser(eventName, payload) {
  if (!io || !payload?.userId) {
    return;
  }

  io.to(`user:${payload.userId}`).emit(eventName, payload);
}

function removeOscarSocketListeners() {
  for (const [eventName, handler] of registeredHandlers) {
    oscarEvents.off(eventName, handler);
  }

  registeredHandlers = [];
}

export function shutdownOscarSocket() {
  removeOscarSocketListeners();
  io = null;
}