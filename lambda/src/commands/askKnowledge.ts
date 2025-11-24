import { BaseIntentCommand, HandlerResult } from "./base";
import { AskKnowledgeSlots } from "../types";
import { intentConfig } from "../config/intents";

/**
 * ASK_KNOWLEDGE Intent - 知識・情報の質問
 */
export class AskKnowledgeCommand extends BaseIntentCommand<AskKnowledgeSlots> {
  readonly intentName = "ASK_KNOWLEDGE";
  readonly description = "事実・知識・情報を尋ねる質問";
  readonly enabled = intentConfig.ASK_KNOWLEDGE;

  async execute(slots: AskKnowledgeSlots, _userId: string): Promise<HandlerResult> {
    // LLMで回答を生成
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: "system",
          content:
            "あなたは音声アシスタントです。質問に対して2-3文で簡潔に答えてください。絵文字は使わないでください。",
        },
        { role: "user", content: slots.question },
      ],
      temperature: 0.5,
    });

    return {
      reply: response.choices[0]?.message?.content || "申し訳ございません。わかりません。",
      toolCalls: [],
    };
  }
}
