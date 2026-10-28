export function extractOscarConfirmation(result) {
  const confirmationItem = [...(result?.newItems ?? [])]
    .reverse()
    .find(
      (item) =>
        item.type === "tool_call_output_item" &&
        item.output?.requiresConfirmation === true &&
        item.output?.confirmation,
    );

  return confirmationItem?.output?.confirmation ?? null;
}

export function extractOscarResponse(result) {
  return result?.finalOutput ?? "";
}
