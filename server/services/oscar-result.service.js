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

export function extractOscarConfirmations(result) {
  const confirmations = [];
  const seen = new Set();
  for (const item of result?.newItems ?? []) {
    if (item.type !== "tool_call_output_item") continue;
    const output = parseToolOutput(item.output);
    const confirmation = output?.confirmation;
    const id = confirmation?.confirmationId;
    if (output?.success === false || output?.requiresConfirmation !== true ||
        typeof id !== "string" || !id.trim() || seen.has(id)) continue;
    seen.add(id);
    confirmations.push(confirmation);
  }
  return confirmations;
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

export function extractOscarCitations(result) {
  const response = extractOscarResponse(result);

  if (typeof response !== "string") return [];

  const citations = [];
  const seen = new Set();

  for (const item of result?.newItems ?? []) {
    if (item.type !== "message_output_item") continue;

    for (const part of item.rawItem?.content ?? []) {
      if (part.type !== "output_text" || typeof part.text !== "string") {
        continue;
      }

      const offset = response.indexOf(part.text);
      if (offset < 0) continue;

      const annotations =
        part.annotations ?? part.providerData?.annotations ?? [];

      if (!Array.isArray(annotations)) continue;

      for (const annotation of annotations) {
        if (annotation.type !== "url_citation") continue;

        const start = annotation.start_index;
        const end = annotation.end_index;

        if (
          !Number.isInteger(start) ||
          !Number.isInteger(end) ||
          start < 0 ||
          end < start ||
          end > part.text.length
        ) {
          continue;
        }

        let url;

        try {
          url = new URL(annotation.url);
        } catch {
          continue;
        }

        if (!["https:", "http:"].includes(url.protocol)) continue;
        if (url.username || url.password) continue;

        const key = `${offset + end}:${url.href}`;
        if (seen.has(key)) continue;
        seen.add(key);

        citations.push({
          start: offset + start,
          end: offset + end,
          url: url.href,
          title:
            typeof annotation.title === "string"
              ? annotation.title
              : url.hostname,
        });
      }
    }
  }

  return citations.sort((a, b) => a.end - b.end);
}