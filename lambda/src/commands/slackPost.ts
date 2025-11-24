import { BaseIntentCommand, HandlerResult } from "./base";
import { SlackPostMessageSlots } from "../types";
import { intentConfig } from "../config/intents";

/**
 * SLACK_POST_MESSAGE Intent - Slackチャンネルにメッセージ投稿
 */
export class SlackPostCommand extends BaseIntentCommand<SlackPostMessageSlots> {
  readonly intentName = "SLACK_POST_MESSAGE";
  readonly description = "Slackの特定チャンネルにメッセージを投稿";
  readonly enabled = intentConfig.SLACK_POST_MESSAGE;

  async execute(slots: SlackPostMessageSlots, _userId: string): Promise<HandlerResult> {
    // TODO: Slack API統合
    return {
      reply: `${slots.channel}チャンネルに投稿しました。`,
      toolCalls: [
        {
          tool: "slack_post_message",
          args: {
            channel: slots.channel,
            message: slots.message,
          },
          result: { success: true, ts: "dummy-timestamp" },
        },
      ],
    };
  }
}
