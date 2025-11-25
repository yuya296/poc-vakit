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
例: 「今日の予定教えて」「明日の午前って空いてる？」「11/28の予定見て」

slots:
- range_start: string (ISO 8601形式、例: "2025-11-25T00:00:00+09:00")
- range_end: string (ISO 8601形式、例: "2025-11-25T23:59:59+09:00")
- focus?: string ("today", "tomorrow", "next_week" など)`,

  ADD_EVENT: `### ADD_EVENT
予定の追加
例: 「明日の10時から30分、ミーティング入れて」

slots:
- title: string (予定のタイトル)
- start: string (ISO 8601形式、例: "2025-11-25T10:00:00+09:00")
- end: string (ISO 8601形式、例: "2025-11-25T10:30:00+09:00")
- location?: string | null (場所)`,

  UPDATE_EVENT: `### UPDATE_EVENT
予定の編集
例: 「明日のミーティングを15時に変更して」

slots:
- event_id?: string (イベントID、不明な場合は省略)
- target_time?: string (ISO 8601形式、対象イベントの時刻)
- title_keyword?: string (タイトルのキーワード)
- new_title?: string (新しいタイトル)
- new_start?: string (ISO 8601形式、新しい開始時刻)
- new_end?: string (ISO 8601形式、新しい終了時刻)
- new_description?: string (新しい説明)
- new_location?: string (新しい場所)`,

  CANCEL_EVENT: `### CANCEL_EVENT
予定のキャンセル
例: 「明日の10時のミーティングキャンセルして」

slots:
- target_time: string (ISO 8601形式、例: "2025-11-25T10:00:00+09:00")
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
   - タイムゾーンは **必ず +09:00 (JST) のみ** を使用
   - ISO 8601形式: YYYY-MM-DDTHH:MM:SS+09:00
   - 「明日」「来週」「11/28」などを具体的な日時に変換
   - **重要**: タイムゾーンは +09:00 以外を使用しないこと（+10:00やその他は禁止）

2. **曖昧性の処理**
   - 情報が不足している場合は、合理的な推測を行う
   - 例: 終了時刻が指定されていない場合は、開始時刻から30分後

3. **出力形式**
   - 必ずJSON形式で出力
   - フォーマット: {"intent": "INTENT_NAME", "slots": {...}}
   - **禁止**: 存在しないフィールド名を作らないこと（例: range_cancel は存在しない）

## 現在時刻情報
現在のUTC時刻: ${new Date().toISOString()}
現在のJST時刻: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(/\//g, '-').replace(',', '')}
現在の日付: ${new Date().toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}

## 日時計算の例

**例1: 「明日」の計算**
今日が2025年11月25日の場合:
- 「明日の10時」→ "2025-11-26T10:00:00+09:00"
- 「明日の午前」→ "2025-11-26T09:00:00+09:00" から "2025-11-26T12:00:00+09:00"

**例2: 「今週」「来週」の計算**
今日が2025年11月25日(月曜)の場合:
- 「今週の予定」→ range_start: "2025-11-25T00:00:00+09:00", range_end: "2025-12-01T23:59:59+09:00"
- 「来週の予定」→ range_start: "2025-12-02T00:00:00+09:00", range_end: "2025-12-08T23:59:59+09:00"

**例3: 「11/28」などの日付指定**
- 「11/28の予定」→ range_start: "2025-11-28T00:00:00+09:00", range_end: "2025-11-28T23:59:59+09:00"

**重要なフォーマット規則**:
- タイムゾーンは常に "+09:00" (プラス記号1個のみ、++は禁止)
- 年月日の区切りは "-" (ハイフン)
- 日時の区切りは "T"
- 時刻は24時間表記で "HH:MM:SS"

## Intent分類の例

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

  /**
   * 日時文字列のよくあるエラーを自動修正
   */
  private sanitizeDateTime(dateTimeStr: string): string {
    if (!dateTimeStr) return dateTimeStr;

    let sanitized = dateTimeStr;

    // 1. 二重のタイムゾーン記号を修正 (++09:00 → +09:00)
    sanitized = sanitized.replace(/\+\+(\d{2}:\d{2})/, '+$1');
    sanitized = sanitized.replace(/--(\d{2}:\d{2})/, '-$1');

    // 2. スペースを除去
    sanitized = sanitized.trim();

    // 3. タイムゾーンが欠けている場合は追加
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(sanitized)) {
      sanitized += '+09:00';
    }

    // 4. 不正な文字を除去（例: ???）
    sanitized = sanitized.replace(/\?+/g, '');

    return sanitized;
  }

  /**
   * ISO 8601日時文字列をバリデーション
   */
  private validateDateTime(dateTimeStr: string): boolean {
    const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+09:00$/;
    return iso8601Regex.test(dateTimeStr);
  }

  /**
   * Intent payloadの日時フィールドをサニタイズ＆バリデーション
   */
  private validatePayload(payload: IntentPayload): void {
    const dateTimeFields: Record<string, string[]> = {
      QUERY_SCHEDULE: ['range_start', 'range_end'],
      ADD_EVENT: ['start', 'end'],
      UPDATE_EVENT: ['target_time', 'new_start', 'new_end'],
      SET_ALARM: ['datetime'],
      CANCEL_EVENT: ['target_time'],
    };

    const fields = dateTimeFields[payload.intent];
    if (!fields) return;

    for (const field of fields) {
      const value = (payload.slots as any)[field];
      if (value && typeof value === 'string') {
        // 自動修正を試みる
        const sanitized = this.sanitizeDateTime(value);
        (payload.slots as any)[field] = sanitized;

        // バリデーション
        if (!this.validateDateTime(sanitized)) {
          throw new Error(`Invalid date/time format in ${field}: ${value} (sanitized: ${sanitized}). Expected ISO 8601 format with +09:00 timezone.`);
        }
      }
    }
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

      // Validate date/time fields
      const payload = validated as IntentPayload;
      this.validatePayload(payload);

      // Return as IntentPayload
      return payload;
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
