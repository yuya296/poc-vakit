import { BaseIntentCommand, HandlerResult } from "./base";
import { SetAlarmSlots } from "../types";
import { intentConfig } from "../config/intents";

/**
 * SET_ALARM Intent - アラーム設定
 */
export class SetAlarmCommand extends BaseIntentCommand<SetAlarmSlots> {
  readonly intentName = "SET_ALARM";
  readonly description = "指定時刻にアラームをセット";
  readonly enabled = intentConfig.SET_ALARM;

  async execute(slots: SetAlarmSlots, _userId: string): Promise<HandlerResult> {
    // TODO: 実際のアラーム機能実装
    return {
      reply: `${slots.datetime}にアラームをセットしました。`,
      toolCalls: [
        {
          tool: "set_alarm",
          args: { datetime: slots.datetime },
          result: { success: true, alarm_id: "dummy-alarm-id" },
        },
      ],
    };
  }
}
