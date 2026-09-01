import type { TelegramForumTopic, TelegramMessage } from "@/features/messages/types";

/** Forum topic id stored on TDLib-ingested rows (`telegram_data.forum_topic_id`). */
export function resolveTelegramMessageForumTopicId(message: TelegramMessage): number | null {
  const data = message.telegram_data;
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  if (typeof record.forum_topic_id === "number" && Number.isFinite(record.forum_topic_id)) {
    return record.forum_topic_id;
  }
  const topicId = record.topic_id;
  if (topicId && typeof topicId === "object") {
    const nested = topicId as Record<string, unknown>;
    if (typeof nested.forum_topic_id === "number" && Number.isFinite(nested.forum_topic_id)) {
      return nested.forum_topic_id;
    }
  }
  if (typeof record.message_thread_id === "number" && Number.isFinite(record.message_thread_id)) {
    return record.message_thread_id;
  }
  return null;
}

/** Keep only messages belonging to the selected forum topic. General topic
 * also includes legacy rows ingested before topic ids were stored. */
export function filterTelegramMessagesByTopic(
  messages: TelegramMessage[],
  topic: TelegramForumTopic | null,
): TelegramMessage[] {
  if (!topic) return messages;
  return messages.filter((m) => {
    const msgTopicId = resolveTelegramMessageForumTopicId(m);
    if (msgTopicId == null) return topic.is_general;
    return msgTopicId === topic.forum_topic_id;
  });
}

export function pickDefaultForumTopic(topics: TelegramForumTopic[]): TelegramForumTopic | null {
  if (!topics.length) return null;
  return topics.find((t) => t.is_general) ?? topics[0] ?? null;
}
