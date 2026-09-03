/**
 * APPLY AS helper near call sites, or methods on AiCreditsService.
 * Pattern for every LLM call site:
 *
 *   await this.aiCredits.assertCreditsRemaining(workspaceId, feature);
 *   const modelId = await this.aiCredits.getModel(workspaceId, feature);
 *   const providerModel = await this.aiCredits.getProviderModel(workspaceId, feature);
 *   const result = await this.llm....({ model: providerModel, ... });
 *   await this.aiCredits.consumeCredits(workspaceId, feature, {
 *     model: modelId,
 *     inputTokens: result.usage?.input_tokens,
 *     outputTokens: result.usage?.output_tokens,
 *   });
 */

export const CALL_SITE_MAP = [
  {
    feature: 'ai_chat',
    files: ['app/backend/src/ai-chat/ai-chat.service.ts'],
    notes: 'Honor body.feature; default ai_chat. Ignore client model; use getProviderModel.',
  },
  {
    feature: 'ai_ads_copilot',
    files: ['app/backend/src/ai-chat/ai-chat.service.ts'],
    notes: 'When body.feature === ai_ads_copilot, meter this key instead of ai_chat.',
  },
  {
    feature: 'ai_conversation',
    files: ['app/backend/src/ai-ext/handlers/ai-chat.service.ts'],
    notes: 'mode === conversation → ai_conversation (split from ai_lead_assist).',
  },
  {
    feature: 'ai_lead_assist',
    files: ['app/backend/src/ai-ext/handlers/ai-chat.service.ts'],
    notes: 'mode === lead-assist → ai_lead_assist.',
  },
  {
    feature: 'ai_inbox_recap',
    files: [
      'app/backend/src/telegram-controller/telegram-agentic/inbox-recap.service.ts',
      'app/backend/src/telegram-controller/telegram-agentic/chat-memory.service.ts',
      'app/backend/src/instagram/instagram-agentic/*',
    ],
    notes: 'Recap, catch-up, memory, takeover/window follow-ups.',
  },
  {
    feature: 'ai_agent_suggest',
    files: [
      'app/backend/src/telegram-controller/telegram-agentic/telegram-agentic.service.ts',
      'app/backend/src/instagram/instagram-agentic/*',
    ],
    notes: 'suggestComposerReply / suggestReply.',
  },
  {
    feature: 'ai_agent_reply',
    files: [
      'app/backend/src/telegram-controller/telegram-agentic/telegram-agentic.service.ts',
      'app/backend/src/instagram/instagram-agentic/*',
    ],
    notes: 'generate() customer replies — previously unmetered.',
  },
  {
    feature: 'ai_agent_copilot',
    files: [
      'app/backend/src/telegram-controller/telegram-agentic/telegram-agentic.service.ts',
    ],
    notes: 'copilotCommand Agent tab.',
  },
  {
    feature: 'ai_ranker',
    files: ['app/backend/src/signals-worker/signal-extractor.service.ts'],
    notes: 'buying_intent_score extraction.',
  },
  {
    feature: 'ai_lead_distribution',
    files: ['app/backend/src/ai-lead-distribution/*'],
    notes: 'NL classify only (gpt mini).',
  },
  {
    feature: 'ai_custom_dashboard',
    files: ['app/backend/src/custom-dashboards/dashboard-ai.service.ts'],
    notes: 'Generate + edit LLM turns (seat cap stays custom_dashboards).',
  },
  {
    feature: 'ai_transcript',
    files: [
      'app/backend/src/conversations-controllers/audio-upload/audio-processing.service.ts',
    ],
    notes: 'STT + analysis. calls_per_month still gates uploads.',
  },
] as const;
