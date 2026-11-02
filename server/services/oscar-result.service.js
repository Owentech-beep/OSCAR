function parseToolOutput(output) {
  if (typeof output === "string") {
    try {
      output = JSON.parse(output);
    } catch {
      return null;
    }
  }

  if (!output || typeof output !== "object" || Array.isArray(output)) {
    return null;
  }

  return output;
}

export function classifyOscarToolResult(output) {
  const result = parseToolOutput(output);

  if (!result) {
    return { status: "unknown", success: null };
  }

  // An explicit failure takes precedence over other fields.
  if (result.success === false) {
    return { status: "failed", success: false };
  }

  // Requesting approval is not a completed business action.
  if (result.requiresConfirmation === true) {
    return { status: "awaiting_confirmation", success: null };
  }

  if (result.success === true) {
    return { status: "completed", success: true };
  }

  // Do not assume unrecognized output means success.
  return { status: "unknown", success: null };
}

export function extractOscarConfirmation(result) {
  for (const item of [...(result?.newItems ?? [])].reverse()) {
    if (item.type !== "tool_call_output_item") continue;

    const output = parseToolOutput(item.output);

    if (
      output?.success !== false &&
      output?.requiresConfirmation === true &&
      output?.confirmation
    ) {
      return output.confirmation;
    }
  }

  return null;
}

export function extractOscarResponse(result) {
  return result?.finalOutput ?? "";
}

export function classifyOscarRunResult(result) {
  const outcomes = (result?.newItems ?? [])
    .filter((item) => item.type === "tool_call_output_item")
    .map((item) => classifyOscarToolResult(item.output));

  if (outcomes.some((item) => item.status === "failed")) {
    return "failed";
  }

  if (
    outcomes.some((item) => item.status === "awaiting_confirmation")
  ) {
    return "awaiting_confirmation";
  }

  if (outcomes.some((item) => item.status === "unknown")) {
    return "unknown";
  }

  return "completed";
}