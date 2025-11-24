import OpenAI from "openai";
import {
  IntentPayload,
  IntentClassificationSchema,
  AgentConfig,
} from "./types";

// ==================== Intent Definitions ====================

/**
 * 各Intentの詳細定義（システムプロンプト生成用）
 */
const INTENT_DEFINITIONS: Record<string, string> = {
  SMALL_TALK: `### SMALL_TALK
雑談・日常会話
例: 「今日は眠い」「元気？」

slots:
- free_text: string (ユーザーの発話そのまま)`,

  ASK_KNOWLEDGE: `### ASK_KNOWLEDGE
一般的な知識・質問への回答
例: 「型理論って何？」「イタリアの首都は？」

slots:
- question: string (質問内容)`,

  SET_TIMER: `### SET_TIMER
タイマーのセット
例: 「3分タイマーセットして」「5分後に教えて」

slots:
- duration_seconds: number (秒数)
- label?: string (タイマーのラベル)`,

  SET_ALARM: `### SET_ALARM
アラームのセット
例: 「明日の7時にアラームセットして」

slots:
- datetime: string (ISO 8601形式、例: "2025-11-22T07:00:00+09:00")
- label?: string (アラームのラベル)`,

  QUERY_SCHEDULE: `### QUERY_SCHEDULE
予定の確認
例: 「今日の予定教えて」「明日の午前って空いてる？」

slots:
- range_start: string (ISO 8601形式)
- range_end: string (ISO 8601形式)
- focus?: string ("today", "tomorrow", "next_week" など)`,

  ADD_EVENT: `### ADD_EVENT
予定の追加
例: 「明日の10時から30分、ミーティング入れて」

slots:
- title: string (予定のタイトル)
- start: string (ISO 8601形式)
- end: string (ISO 8601形式)
- location?: string | null (場所)`,

  CANCEL_EVENT: `### CANCEL_EVENT
予定のキャンセル
例: 「明日の10時のミーティングキャンセルして」

slots:
- target_time: string (ISO 8601形式)
- title_keyword?: string (予定のキーワード)`,

  SLACK_POST_MESSAGE: `### SLACK_POST_MESSAGE
Slackチャンネルへの投稿
例: 「#random に『今日は在宅勤務します』って送って」

slots:
- channel: string (例: "#random")
- message: string (送信するメッセージ)`,

  SLACK_SEND_DM: `### SLACK_SEND_DM
SlackでDM送信
例: 「田中さんに『あとで10分話せますか？』って送って」

slots:
- user_display_name: string (表示名)
- message: string (送信するメッセージ)`,

  SLACK_SUMMARIZE_CHANNEL: `### SLACK_SUMMARIZE_CHANNEL
Slackチャンネルの要約
例: 「#backend の今日の流れざっくり教えて」

slots:
- channel: string (例: "#backend")
- range_hours: number (デフォルト: 12)`,
};

// ==================== System Prompt Generator ====================

/**
 * 有効なIntentのみを含むシステムプロンプトを動的生成
 */
function generateSystemPrompt(enabledIntents: string[]): string {
  const intentSections = enabledIntents
    .map((name) => INTENT_DEFINITIONS[name])
    .filter(Boolean)
    .join("\n\n");

  return `あなたはパーソナル秘書エージェントのIntent分類器です。

ユーザーの発話から、以下のIntentのいずれかに分類し、必要なslots（パラメータ）を抽出してください。

## Intent一覧

${intentSections}

## 重要な指示

1. **日時の解釈**
   - 現在時刻を基準に相対的な時刻を計算してください
   - タイムゾーンは常に +09:00 (JST) を使用
   - 「明日」「来週」などの相対表現を具体的な日時に変換

2. **曖昧性の処理**
   - 情報が不足している場合は、合理的な推測を行う
   - 例: 終了時刻が指定されていない場合は、開始時刻から30分後

3. **出力形式**
   - 必ずJSON形式で出力
   - フォーマット: {"intent": "INTENT_NAME", "slots": {...}}

## 現在時刻
${new Date().toISOString()}

## 例

入力: 「明日の10時にミーティング入れて」
出力:
{
  "intent": "ADD_EVENT",
  "slots": {
    "title": "ミーティング",
    "start": "2025-11-22T10:00:00+09:00",
    "end": "2025-11-22T10:30:00+09:00",
    "location": null
  }
}

入力: 「今日の予定どうなってる？」
出力:
{
  "intent": "QUERY_SCHEDULE",
  "slots": {
    "range_start": "2025-11-21T00:00:00+09:00",
    "range_end": "2025-11-21T23:59:59+09:00",
    "focus": "today"
  }
}
`;
}

// ==================== Classifier ====================

export class IntentClassifier {
  private client: OpenAI;
  private model: string;
  private systemPrompt: string;

  constructor(config: AgentConfig, enabledIntents: string[]) {
    this.client = new OpenAI({
      apiKey: config.openRouterApiKey,
      baseURL: config.openRouterBaseUrl,
    });
    this.model = config.model;
    this.systemPrompt = generateSystemPrompt(enabledIntents);

    console.log(`[IntentClassifier] Initialized with ${enabledIntents.length} enabled intents:`, enabledIntents);
  }

  async classify(text: string, _userId: string): Promise<IntentPayload> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content: this.systemPrompt,
          },
          {
            role: "user",
            content: text,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response from LLM");
      }

      // Parse and validate JSON
      const parsed = JSON.parse(content);
      const validated = IntentClassificationSchema.parse(parsed);

      // Return as IntentPayload
      return validated as IntentPayload;
    } catch (error) {
      console.error("Intent classification failed:", error);

      // Fallback to SMALL_TALK on error
      return {
        intent: "SMALL_TALK",
        slots: {
          free_text: text,
        },
      };
    }
  }
}
