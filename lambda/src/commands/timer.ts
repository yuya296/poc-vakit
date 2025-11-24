import { BaseIntentCommand, HandlerResult } from "./base";
import { SetTimerSlots } from "../types";
import { intentConfig } from "../config/intents";

/**
 * SET_TIMER Intent - タイマー設定
 */
export class SetTimerCommand extends BaseIntentCommand<SetTimerSlots> {
  readonly intentName = "SET_TIMER";
  readonly description = "指定時間後に通知するタイマーをセット";
  readonly enabled = intentConfig.SET_TIMER;

  async execute(slots: SetTimerSlots, _userId: string): Promise<HandlerResult> {
    // TODO: 実際のタイマー機能実装（SQS, EventBridgeなど）
    const minutes = Math.floor(slots.duration_seconds / 60);
    return {
      reply: `${minutes}分のタイマーをセットしました。`,
      toolCalls: [
        {
          tool: "set_timer",
          args: { duration_seconds: slots.duration_seconds },
          result: { success: true, timer_id: "dummy-timer-id" },
        },
      ],
    };
  }
}
