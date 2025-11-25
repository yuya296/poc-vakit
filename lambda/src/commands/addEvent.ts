import { BaseIntentCommand, HandlerResult } from "./base";
import { AddEventSlots } from "../types";
import { intentConfig } from "../config/intents";
import { createEvent } from "../services/googleCalendar";

/**
 * ADD_EVENT Intent - 予定追加
 */
export class AddEventCommand extends BaseIntentCommand<AddEventSlots> {
  readonly intentName = "ADD_EVENT";
  readonly description = "Google Calendarに予定を追加";
  readonly enabled = intentConfig.ADD_EVENT;

  async execute(slots: AddEventSlots, _userId: string): Promise<HandlerResult> {
    try {
      const event = await createEvent(
        slots.title,
        slots.start,
        slots.end,
        undefined, // description
        slots.location || undefined
      );

      // 日時をわかりやすく整形（簡易版）
      const startDate = new Date(slots.start);
      const timeStr = startDate.toLocaleString("ja-JP", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      return {
        reply: `${timeStr}に「${slots.title}」を追加しました。`,
        toolCalls: [
          {
            tool: "google_calendar_add",
            args: {
              title: slots.title,
              start: slots.start,
              end: slots.end,
              location: slots.location,
            },
            result: { success: true, event_id: event.id },
          },
        ],
      };
    } catch (error: any) {
      console.error("[AddEventCommand] Error:", error);
      return {
        reply: `予定の追加に失敗しました。${error.message}`,
        toolCalls: [],
      };
    }
  }
}
