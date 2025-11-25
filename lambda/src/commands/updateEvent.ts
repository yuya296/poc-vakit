import { BaseIntentCommand, HandlerResult } from "./base";
import { UpdateEventSlots } from "../types";
import { intentConfig } from "../config/intents";
import { updateEvent, searchEvents } from "../services/googleCalendar";

/**
 * UPDATE_EVENT Intent - 予定編集
 */
export class UpdateEventCommand extends BaseIntentCommand<UpdateEventSlots> {
  readonly intentName = "UPDATE_EVENT";
  readonly description = "Google Calendarの予定を編集";
  readonly enabled = intentConfig.UPDATE_EVENT;

  async execute(slots: UpdateEventSlots, _userId: string): Promise<HandlerResult> {
    try {
      let eventId = slots.event_id;

      // イベントIDが指定されていない場合は検索
      if (!eventId) {
        if (!slots.target_time && !slots.title_keyword) {
          return {
            reply: "予定を特定できません。日時かタイトルを教えてください。",
            toolCalls: [],
          };
        }

        // キーワード検索
        const searchStart =
          slots.target_time || new Date().toISOString();
        const searchEnd = new Date(
          new Date(searchStart).getTime() + 7 * 24 * 60 * 60 * 1000
        ).toISOString();

        const events = await searchEvents(
          slots.title_keyword || "",
          searchStart,
          searchEnd
        );

        if (events.length === 0) {
          return {
            reply: "該当する予定が見つかりませんでした。",
            toolCalls: [],
          };
        }

        if (events.length > 1) {
          return {
            reply: `該当する予定が${events.length}件見つかりました。もう少し詳しく教えてください。`,
            toolCalls: [
              {
                tool: "google_calendar_search",
                args: { keyword: slots.title_keyword, count: events.length },
                result: { events: events.map((e) => ({ id: e.id, summary: e.summary })) },
              },
            ],
          };
        }

        eventId = events[0].id;
      }

      // イベントを更新
      const updates: any = {};
      if (slots.new_title) updates.summary = slots.new_title;
      if (slots.new_start) updates.start = slots.new_start;
      if (slots.new_end) updates.end = slots.new_end;
      if (slots.new_description) updates.description = slots.new_description;
      if (slots.new_location) updates.location = slots.new_location;

      if (Object.keys(updates).length === 0) {
        return {
          reply: "更新内容が指定されていません。",
          toolCalls: [],
        };
      }

      const updatedEvent = await updateEvent(eventId, updates);

      return {
        reply: `「${updatedEvent.summary}」を更新しました。`,
        toolCalls: [
          {
            tool: "google_calendar_update",
            args: { event_id: eventId, updates },
            result: { success: true, event: updatedEvent },
          },
        ],
      };
    } catch (error: any) {
      console.error("[UpdateEventCommand] Error:", error);
      return {
        reply: `予定の更新に失敗しました。${error.message}`,
        toolCalls: [],
      };
    }
  }
}
