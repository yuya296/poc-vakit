import { BaseIntentCommand, HandlerResult } from "./base";
import { QueryScheduleSlots } from "../types";
import { intentConfig } from "../config/intents";
import { listEvents } from "../services/googleCalendar";

/**
 * QUERY_SCHEDULE Intent - 予定確認
 */
export class QueryScheduleCommand extends BaseIntentCommand<QueryScheduleSlots> {
  readonly intentName = "QUERY_SCHEDULE";
  readonly description = "Google Calendarから予定を取得";
  readonly enabled = intentConfig.QUERY_SCHEDULE;

  async execute(slots: QueryScheduleSlots, _userId: string): Promise<HandlerResult> {
    const focusLabel = slots.focus || "指定期間";

    try {
      const events = await listEvents(slots.range_start, slots.range_end);

      if (events.length === 0) {
        return {
          reply: `${focusLabel}の予定はありません。`,
          toolCalls: [
            {
              tool: "google_calendar_list",
              args: { range_start: slots.range_start, range_end: slots.range_end },
              result: { events: [] },
            },
          ],
        };
      }

      // LLMを使って自然な応答を生成
      const eventList = events
        .slice(0, 10)
        .map((e) => {
          const start = new Date(e.start);
          const dateStr = start.toLocaleDateString("ja-JP", {
            month: "short",
            day: "numeric",
            weekday: "short",
          });
          const timeStr = start.toLocaleTimeString("ja-JP", {
            hour: "2-digit",
            minute: "2-digit",
          });
          return `- ${dateStr} ${timeStr}: ${e.summary}`;
        })
        .join("\n");

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content:
              "あなたは音声アシスタントです。予定リストを見て、ユーザーに分かりやすく簡潔に伝えてください。" +
              "1-3文程度で要点を伝え、必要に応じて日時や予定名を含めてください。",
          },
          {
            role: "user",
            content: `${focusLabel}の予定は以下の通りです:\n\n${eventList}\n\n${
              events.length > 10 ? `\n他${events.length - 10}件あります。` : ""
            }\n\nこれをユーザーに分かりやすく伝えてください。`,
          },
        ],
        temperature: 0.7,
        max_tokens: 200,
      });

      return {
        reply:
          response.choices[0]?.message?.content ||
          `${focusLabel}の予定は${events.length}件あります。`,
        toolCalls: [
          {
            tool: "google_calendar_list",
            args: { range_start: slots.range_start, range_end: slots.range_end },
            result: { events },
          },
        ],
      };
    } catch (error: any) {
      console.error("[QueryScheduleCommand] Error:", error);
      return {
        reply: `予定の取得に失敗しました。${error.message}`,
        toolCalls: [],
      };
    }
  }
}
