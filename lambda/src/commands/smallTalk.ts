import { BaseIntentCommand, HandlerResult } from "./base";
import { SmallTalkSlots } from "../types";
import { intentConfig } from "../config/intents";

/**
 * SMALL_TALK Intent - 雑談・挨拶
 */
export class SmallTalkCommand extends BaseIntentCommand<SmallTalkSlots> {
  readonly intentName = "SMALL_TALK";
  readonly description = "雑談・挨拶・感情表現など、カジュアルな会話";
  readonly enabled = intentConfig.SMALL_TALK;

  async execute(slots: SmallTalkSlots, _userId: string): Promise<HandlerResult> {
    // LLMで自然な返答を生成
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: "system",
          content: "あなたは音声アシスタントです。1-2文で簡潔に答えてください。絵文字は使わないでください。",
        },
        { role: "user", content: slots.free_text },
      ],
      temperature: 0.7,
    });

    return {
      reply: response.choices[0]?.message?.content || "そうですね。",
      toolCalls: [],
    };
  }
}
