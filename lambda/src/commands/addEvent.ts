import { BaseIntentCommand, HandlerResult } from "./base";
import { AddEventSlots } from "../types";
import { intentConfig } from "../config/intents";

/**
 * ADD_EVENT Intent - 予定追加
 */
export class AddEventCommand extends BaseIntentCommand<AddEventSlots> {
  readonly intentName = "ADD_EVENT";
  readonly description = "Google Calendarに予定を追加";
  readonly enabled = intentConfig.ADD_EVENT;

  async execute(slots: AddEventSlots, _userId: string): Promise<HandlerResult> {
    // TODO: Google Calendar API統合
    return {
      reply: `${slots.start}に「${slots.title}」を追加しました。`,
      toolCalls: [
        {
          tool: "google_calendar_add",
          args: {
            title: slots.title,
            start: slots.start,
            end: slots.end,
            location: slots.location,
          },
          result: { success: true, event_id: "dummy-event-id" },
        },
      ],
    };
  }
}
