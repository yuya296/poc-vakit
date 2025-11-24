import { z } from "zod";

// ==================== Intent Names ====================

export const IntentName = z.enum([
  "SMALL_TALK",
  "ASK_KNOWLEDGE",
  "SET_TIMER",
  "SET_ALARM",
  "QUERY_SCHEDULE",
  "ADD_EVENT",
  "CANCEL_EVENT",
  "SLACK_POST_MESSAGE",
  "SLACK_SEND_DM",
  "SLACK_SUMMARIZE_CHANNEL",
]);

export type IntentName = z.infer<typeof IntentName>;

// ==================== Intent Slots Schemas ====================

// 1. SMALL_TALK
export const SmallTalkSlots = z.object({
  free_text: z.string(),
});
export type SmallTalkSlots = z.infer<typeof SmallTalkSlots>;

// 2. ASK_KNOWLEDGE
export const AskKnowledgeSlots = z.object({
  question: z.string(),
});
export type AskKnowledgeSlots = z.infer<typeof AskKnowledgeSlots>;

// 3. SET_TIMER
export const SetTimerSlots = z.object({
  duration_seconds: z.number().int().positive(),
  label: z.string().optional(),
});
export type SetTimerSlots = z.infer<typeof SetTimerSlots>;

// 4. SET_ALARM
export const SetAlarmSlots = z.object({
  datetime: z.string().datetime(), // ISO 8601 format
  label: z.string().optional(),
});
export type SetAlarmSlots = z.infer<typeof SetAlarmSlots>;

// 5. QUERY_SCHEDULE
export const QueryScheduleSlots = z.object({
  range_start: z.string().datetime(),
  range_end: z.string().datetime(),
  focus: z.string().optional(), // e.g., "today", "tomorrow", "next_week"
});
export type QueryScheduleSlots = z.infer<typeof QueryScheduleSlots>;

// 6. ADD_EVENT
export const AddEventSlots = z.object({
  title: z.string(),
  start: z.string().datetime(),
  end: z.string().datetime(),
  location: z.string().nullable().optional(),
});
export type AddEventSlots = z.infer<typeof AddEventSlots>;

// 7. CANCEL_EVENT
export const CancelEventSlots = z.object({
  target_time: z.string().datetime(),
  title_keyword: z.string().optional(),
});
export type CancelEventSlots = z.infer<typeof CancelEventSlots>;

// 8. SLACK_POST_MESSAGE
export const SlackPostMessageSlots = z.object({
  channel: z.string(), // e.g., "#random"
  message: z.string(),
});
export type SlackPostMessageSlots = z.infer<typeof SlackPostMessageSlots>;

// 9. SLACK_SEND_DM
export const SlackSendDMSlots = z.object({
  user_display_name: z.string(),
  message: z.string(),
});
export type SlackSendDMSlots = z.infer<typeof SlackSendDMSlots>;

// 10. SLACK_SUMMARIZE_CHANNEL
export const SlackSummarizeChannelSlots = z.object({
  channel: z.string(),
  range_hours: z.number().int().positive().default(12),
});
export type SlackSummarizeChannelSlots = z.infer<
  typeof SlackSummarizeChannelSlots
>;

// ==================== Union Type for All Intents ====================

export type IntentPayload =
  | { intent: "SMALL_TALK"; slots: SmallTalkSlots }
  | { intent: "ASK_KNOWLEDGE"; slots: AskKnowledgeSlots }
  | { intent: "SET_TIMER"; slots: SetTimerSlots }
  | { intent: "SET_ALARM"; slots: SetAlarmSlots }
  | { intent: "QUERY_SCHEDULE"; slots: QueryScheduleSlots }
  | { intent: "ADD_EVENT"; slots: AddEventSlots }
  | { intent: "CANCEL_EVENT"; slots: CancelEventSlots }
  | { intent: "SLACK_POST_MESSAGE"; slots: SlackPostMessageSlots }
  | { intent: "SLACK_SEND_DM"; slots: SlackSendDMSlots }
  | { intent: "SLACK_SUMMARIZE_CHANNEL"; slots: SlackSummarizeChannelSlots };

// ==================== API Request/Response Types ====================

export interface AgentRequest {
  text: string;
  user_id?: string;
  session_id?: string;
}

export interface ToolCall {
  tool: string;
  args: Record<string, unknown>;
  result: unknown;
}

export interface AgentResponse {
  ok: boolean;
  intent: IntentName;
  slots: Record<string, unknown>;
  reply: string;
  meta?: {
    model: string;
    tool_calls: ToolCall[];
  };
  error?: string;
}

// ==================== Zod Schema for Intent Classification Response ====================

// This schema is for validating LLM's JSON output
export const IntentClassificationSchema = z.object({
  intent: IntentName,
  slots: z.record(z.unknown()),
});

export type IntentClassificationResponse = z.infer<
  typeof IntentClassificationSchema
>;

// ==================== Config ====================

export interface AgentConfig {
  openRouterApiKey: string;
  openRouterBaseUrl: string;
  model: string;
  userId: string;
}
