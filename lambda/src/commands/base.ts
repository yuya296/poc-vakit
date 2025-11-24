import OpenAI from "openai";

/**
 * Intent処理の結果
 */
export interface HandlerResult {
  reply: string;
  toolCalls: Array<{
    tool: string;
    args: Record<string, unknown>;
    result: unknown;
  }>;
}

/**
 * IntentCommand - すべてのIntentハンドラーが実装すべきインターフェース
 */
export interface IntentCommand<TSlots = unknown> {
  /**
   * Intentの名前
   */
  readonly intentName: string;

  /**
   * Intentの説明（分類時にLLMに渡される）
   */
  readonly description: string;

  /**
   * Intentが有効かどうか
   */
  readonly enabled: boolean;

  /**
   * Intent処理を実行
   * @param slots - Intent固有のスロット情報
   * @param userId - ユーザーID
   * @returns 処理結果（返信テキストとツール呼び出し情報）
   */
  execute(slots: TSlots, userId: string): Promise<HandlerResult>;
}

/**
 * IntentCommandの基底クラス
 * OpenAI clientを共通で保持
 */
export abstract class BaseIntentCommand<TSlots = unknown> implements IntentCommand<TSlots> {
  protected client: OpenAI;
  protected model: string;

  abstract readonly intentName: string;
  abstract readonly description: string;
  abstract readonly enabled: boolean;

  constructor(apiKey: string, model: string) {
    this.client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey,
    });
    this.model = model;
  }

  abstract execute(slots: TSlots, userId: string): Promise<HandlerResult>;
}
