const conversations = new Map();

const MAX_MESSAGES = 20;

export function getConversation(userId) {
  if (!conversations.has(userId)) {
    conversations.set(userId, []);
  }

  return conversations.get(userId);
}

export function addMessage(userId, role, content) {
  const conversation = getConversation(userId);

  conversation.push({
    role,
    content,
    createdAt: new Date(),
  });

  if (conversation.length > MAX_MESSAGES) {
    conversation.splice(
      0,
      conversation.length - MAX_MESSAGES
    );
  }

  return conversation;
}

export function clearConversation(userId) {
  conversations.delete(userId);
}