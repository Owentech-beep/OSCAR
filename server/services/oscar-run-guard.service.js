const activeUsers = new Set();

export async function withOscarRunLock(userId, operation) {
  if (typeof userId !== "string" || !userId.trim()) {
    throw new Error("OSCAR user context is missing.");
  }

  if (activeUsers.has(userId)) {
    const error = new Error(
      "OSCAR is still processing your previous request. Please wait.",
    );

    error.statusCode = 409;
    error.code = "OSCAR_RUN_IN_PROGRESS";
    throw error;
  }

  activeUsers.add(userId);

  try {
    return await operation();
  } finally {
    activeUsers.delete(userId);
  }
}

export function buildOscarHistory(conversation) {
  return conversation.map((message) => {
    if (
      !["user", "assistant"].includes(message.role) ||
      typeof message.content !== "string"
    ) {
      throw new Error("Invalid stored conversation message.");
    }

    if (message.role === "user") {
      return {
        role: "user",
        content: message.content,
      };
    }

    return {
      type: "message",
      role: "assistant",
      status: "completed",
      content: [
        {
          type: "output_text",
          text: message.content,
          annotations: [],
        },
      ],
    };
  });
}