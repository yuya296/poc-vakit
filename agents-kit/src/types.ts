import { z } from 'zod';

/**
 * Tool Input Schemas
 */

export const CreateCalendarEventInputSchema = z.object({
  title: z.string().describe('イベントのタイトル'),
  start: z.string().describe('開始日時 (ISO 8601形式: YYYY-MM-DDTHH:mm:ss+09:00)'),
  end: z.string().optional().describe('終了日時 (ISO 8601形式、省略時はstartと同じ)'),
  description: z.string().optional().describe('イベントの説明'),
});

export const ListCalendarEventsInputSchema = z.object({
  dateRangeStart: z.string().describe('検索開始日時 (ISO 8601形式: YYYY-MM-DDTHH:mm:ss+09:00)'),
  dateRangeEnd: z.string().describe('検索終了日時 (ISO 8601形式: YYYY-MM-DDTHH:mm:ss+09:00)'),
});

export type CreateCalendarEventInput = z.infer<typeof CreateCalendarEventInputSchema>;
export type ListCalendarEventsInput = z.infer<typeof ListCalendarEventsInputSchema>;

/**
 * Tool Output Types
 */

export interface CreateCalendarEventOutput {
  success: boolean;
  eventId?: string;
  start?: string;
  end?: string;
  error?: string;
}

export interface CalendarEvent {
  title: string;
  start: string;
  end: string;
  description?: string;
}

export interface ListCalendarEventsOutput {
  success: boolean;
  events?: CalendarEvent[];
  error?: string;
}

/**
 * Agent Configuration
 */

export interface AgentConfig {
  apiKey: string;
  model: string;
  n8nWebhookBaseUrl: string;
  n8nBearerToken: string;
}

/**
 * Conversation Message
 */

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}
