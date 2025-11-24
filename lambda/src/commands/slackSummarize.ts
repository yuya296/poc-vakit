import { BaseIntentCommand, HandlerResult } from "./base";
import { SlackSummarizeChannelSlots } from "../types";
import { intentConfig } from "../config/intents";

/**
 * SLACK_SUMMARIZE_CHANNEL Intent - Slackチャンネルを要約
 */
export class SlackSummarizeCommand extends BaseIntentCommand<SlackSummarizeChannelSlots> {
  readonly intentName = "SLACK_SUMMARIZE_CHANNEL";
  readonly description = "Slackチャンネルの最近のメッセージを要約";
  readonly enabled = intentConfig.SLACK_SUMMARIZE_CHANNEL;

  async execute(slots: SlackSummarizeChannelSlots, _userId: string): Promise<HandlerResult> {
    // TODO: Slack API統合 + LLM要約
    return {
      reply: `${slots.channel}チャンネルの要約です。現在、メッセージはありません。`,
      toolCalls: [
        {
          tool: "slack_summarize_channel",
          args: {
            channel: slots.channel,
            range_hours: slots.range_hours,
          },
          result: { summary: "メッセージなし", message_count: 0 },
        },
      ],
    };
  }
}
