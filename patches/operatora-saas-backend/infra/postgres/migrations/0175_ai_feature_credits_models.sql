-- Per-feature AI credit budgets + fixed models on billing_plans.
-- Safe to re-run: jsonb || merges; existing keys preserved.
--
-- Credit scale: 1 credit = $0.00001 USD (CREDITS_PER_USD = 100000).
-- Defaults approx. old invocation caps × ~200 credits/call for flash-tier.

UPDATE public.billing_plans
SET limits = limits
  || jsonb_build_object(
    'credits_ai_chat', COALESCE((limits->>'ai_chat_messages')::int, 50) * 200,
    'credits_ai_transcript', COALESCE((limits->>'calls_per_month')::int, 100) * 200,
    'credits_ai_conversation', COALESCE((limits->>'ai_lead_assist')::int, 50) * 100,
    'credits_ai_agent_reply', CASE WHEN slug IN ('max', 'corporate') THEN 2000000 ELSE 0 END,
    'credits_ai_agent_suggest', COALESCE((limits->>'ai_inbox_summaries')::int, 50) * 100,
    'credits_ai_inbox_recap', COALESCE((limits->>'ai_inbox_summaries')::int, 50) * 100,
    'credits_ai_agent_copilot', CASE WHEN slug IN ('max', 'corporate') THEN 500000 ELSE 0 END,
    'credits_ai_ranker', 25000,
    'credits_ai_lead_distribution', 10000,
    'credits_ai_lead_assist', COALESCE((limits->>'ai_lead_assist')::int, 50) * 100,
    'credits_ai_custom_dashboard', 25000,
    'credits_ai_ads_copilot', CASE WHEN slug = 'free' THEN 0 ELSE COALESCE((limits->>'ai_chat_messages')::int, 50) * 100 END
  )
WHERE slug IN ('free', 'pro', 'max', 'corporate');

-- Corporate: unlimited credits (null).
UPDATE public.billing_plans
SET limits = limits
  || jsonb_build_object(
    'credits_ai_chat', NULL,
    'credits_ai_transcript', NULL,
    'credits_ai_conversation', NULL,
    'credits_ai_agent_reply', NULL,
    'credits_ai_agent_suggest', NULL,
    'credits_ai_inbox_recap', NULL,
    'credits_ai_agent_copilot', NULL,
    'credits_ai_ranker', NULL,
    'credits_ai_lead_distribution', NULL,
    'credits_ai_lead_assist', NULL,
    'credits_ai_custom_dashboard', NULL,
    'credits_ai_ads_copilot', NULL
  )
WHERE slug = 'corporate';

UPDATE public.billing_plans
SET features = features
  || jsonb_build_object(
    'ai_feature_models', jsonb_build_object(
      'ai_chat', 'gemini-flash',
      'ai_transcript', 'gemini-flash',
      'ai_conversation', 'gemini-flash',
      'ai_agent_reply', 'gemini-pro',
      'ai_agent_suggest', 'gemini-flash',
      'ai_inbox_recap', 'gemini-flash',
      'ai_agent_copilot', 'gemini-flash',
      'ai_ranker', 'local',
      'ai_lead_distribution', 'openai-mini',
      'ai_lead_assist', 'gemini-flash',
      'ai_custom_dashboard', 'gemini-flash',
      'ai_ads_copilot', 'gemini-flash'
    )
  )
WHERE slug IN ('free', 'pro', 'max', 'corporate');
