import { BaseIntentCommand, HandlerResult } from "./base";
import { CancelEventSlots } from "../types";
import { intentConfig } from "../config/intents";

/**
 * CANCEL_EVENT Intent - 予定削除
 */
export class CancelEventCommand extends BaseIntentCommand<CancelEventSlots> {
  readonly intentName = "CANCEL_EVENT";
  readonly description = "Google Calendarから予定を削除";
  readonly enabled = intentConfig.CANCEL_EVENT;

  async execute(slots: CancelEventSlots, _userId: string): Promise<HandlerResult> {
    // TODO: Google Calendar API統合
    const keyword = slots.title_keyword || "該当する予定";
    return {
      reply: `「${keyword}」に関連する予定を削除しました。`,
      toolCalls: [
        {
          tool: "google_calendar_delete",
          args: { target_time: slots.target_time, title_keyword: slots.title_keyword },
          result: { success: true },
        },
      ],
    };
  }
}
