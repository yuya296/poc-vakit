import { BaseIntentCommand, HandlerResult } from "./base";
import { QueryScheduleSlots } from "../types";
import { intentConfig } from "../config/intents";

/**
 * QUERY_SCHEDULE Intent - 予定確認
 */
export class QueryScheduleCommand extends BaseIntentCommand<QueryScheduleSlots> {
  readonly intentName = "QUERY_SCHEDULE";
  readonly description = "Google Calendarから予定を取得";
  readonly enabled = intentConfig.QUERY_SCHEDULE;

  async execute(slots: QueryScheduleSlots, _userId: string): Promise<HandlerResult> {
    // TODO: Google Calendar API統合
    const focusLabel = slots.focus || "指定期間";
    return {
      reply: `${focusLabel}の予定を確認しています。現在、予定はありません。`,
      toolCalls: [
        {
          tool: "google_calendar_list",
          args: { range_start: slots.range_start, range_end: slots.range_end },
          result: { events: [] },
        },
      ],
    };
  }
}
