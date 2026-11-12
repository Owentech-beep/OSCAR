export function requireOscarChannel(channel = "chat") {
  if (channel !== "chat" && channel !== "voice") {
    const error = new Error("Conversation channel must be chat or voice.");
    error.statusCode = 400;
    throw error;
  }
  return channel;
}
