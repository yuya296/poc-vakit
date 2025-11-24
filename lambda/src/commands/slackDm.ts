import { BaseIntentCommand, HandlerResult } from "./base";
import { SlackSendDMSlots } from "../types";
import { intentConfig } from "../config/intents";

/**
 * SLACK_SEND_DM Intent - SlackでDM送信
 */
export class SlackDmCommand extends BaseIntentCommand<SlackSendDMSlots> {
  readonly intentName = "SLACK_SEND_DM";
  readonly description = "Slackで特定ユーザーにDMを送信";
  readonly enabled = intentConfig.SLACK_SEND_DM;

  async execute(slots: SlackSendDMSlots, _userId: string): Promise<HandlerResult> {
    // TODO: Slack API統合
    return {
      reply: `${slots.user_display_name}さんにDMを送信しました。`,
      toolCalls: [
        {
          tool: "slack_send_dm",
          args: {
            user_display_name: slots.user_display_name,
            message: slots.message,
          },
          result: { success: true, ts: "dummy-timestamp" },
        },
      ],
    };
  }
}
