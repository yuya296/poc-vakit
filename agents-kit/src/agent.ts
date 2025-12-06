import OpenAI from 'openai';
import type { AgentConfig, Message } from './types.js';
import { createCalendarEvent, listCalendarEvents } from './tools/n8nCalendar.js';
import {
  CreateCalendarEventInputSchema,
  ListCalendarEventsInputSchema,
} from './types.js';

export class CalendarAgent {
  private client: OpenAI;
  private config: AgentConfig;
  private conversationHistory: Message[] = [];

  constructor(config: AgentConfig) {
    this.config = config;
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': 'https://github.com/your-repo/vakit',
        'X-Title': 'VAKIT Calendar Agent',
      },
    });
  }

  /**
   * ユーザーメッセージを処理してレスポンスを生成
   */
  async chat(userMessage: string): Promise<string> {
    // 会話履歴に追加
    this.conversationHistory.push({
      role: 'user',
      content: userMessage,
    });

    try {
      // OpenRouter APIに送信（Tool Calling付き）
      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt(),
          },
          ...this.conversationHistory,
        ],
        tools: this.getToolDefinitions(),
        tool_choice: 'auto',
      });

      const message = response.choices[0]?.message;
      if (!message) {
        throw new Error('No response from OpenRouter');
      }

      // Tool呼び出しがある場合
      if (message.tool_calls && message.tool_calls.length > 0) {
        const toolResults: any[] = [];

        // すべてのTool呼び出しを実行
        for (const toolCall of message.tool_calls) {
          const toolName = toolCall.function.name;
          const toolInput = JSON.parse(toolCall.function.arguments);

          console.log(`\n🔧 Executing tool: ${toolName}`);
          console.log('Input:', JSON.stringify(toolInput, null, 2));

          const result = await this.executeTool(toolName, toolInput);

          toolResults.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result),
          });
        }

        // Tool実行結果を含めて再度APIを呼び出し
        const followUpResponse = await this.client.chat.completions.create({
          model: this.config.model,
          messages: [
            {
              role: 'system',
              content: this.getSystemPrompt(),
            },
            ...this.conversationHistory,
            message as any,
            ...toolResults as any,
          ],
        });

        const finalMessage = followUpResponse.choices[0]?.message?.content || '';

        // 会話履歴に追加
        this.conversationHistory.push({
          role: 'assistant',
          content: finalMessage,
        });

        return finalMessage;
      }

      // Tool呼び出しがない場合は直接レスポンス
      const assistantMessage = message.content || '';

      this.conversationHistory.push({
        role: 'assistant',
        content: assistantMessage,
      });

      return assistantMessage;
    } catch (error) {
      console.error('Agent chat error:', error);
      throw error;
    }
  }

  /**
   * システムプロンプト
   */
  private getSystemPrompt(): string {
    return `あなたは音声アシスタントです。ユーザーのカレンダー管理をサポートします。

以下の機能を提供できます：
1. カレンダーに予定を追加する
2. 指定した期間の予定を確認する

回答は簡潔に、1-3文程度でまとめてください。音声出力を想定しているため、絵文字は使わず、自然な日本語で話してください。

日時の入力は必ずISO 8601形式（例: 2025-12-07T10:00:00+09:00）で行ってください。
ユーザーが「明日の10時」などと言った場合は、現在時刻を基準に計算してください。

現在の日時: ${new Date().toISOString()}
現在のタイムゾーン: Asia/Tokyo (UTC+9)`;
  }

  /**
   * Tool定義（OpenAI互換形式）
   */
  private getToolDefinitions(): OpenAI.Chat.Completions.ChatCompletionTool[] {
    return [
      {
        type: 'function',
        function: {
          name: 'createCalendarEvent',
          description: 'Google Calendarに新しい予定を追加します。タイトル、開始日時、終了日時（オプション）、説明（オプション）を指定できます。',
          parameters: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                description: 'イベントのタイトル',
              },
              start: {
                type: 'string',
                description: '開始日時 (ISO 8601形式: YYYY-MM-DDTHH:mm:ss+09:00)',
              },
              end: {
                type: 'string',
                description: '終了日時 (ISO 8601形式、省略時はstartと同じ)',
              },
              description: {
                type: 'string',
                description: 'イベントの説明',
              },
            },
            required: ['title', 'start'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'listCalendarEvents',
          description: '指定した期間のGoogle Calendar予定一覧を取得します。開始日時と終了日時を指定します。',
          parameters: {
            type: 'object',
            properties: {
              dateRangeStart: {
                type: 'string',
                description: '検索開始日時 (ISO 8601形式: YYYY-MM-DDTHH:mm:ss+09:00)',
              },
              dateRangeEnd: {
                type: 'string',
                description: '検索終了日時 (ISO 8601形式: YYYY-MM-DDTHH:mm:ss+09:00)',
              },
            },
            required: ['dateRangeStart', 'dateRangeEnd'],
          },
        },
      },
    ];
  }

  /**
   * Tool実行
   */
  private async executeTool(toolName: string, input: any): Promise<any> {
    try {
      if (toolName === 'createCalendarEvent') {
        const validatedInput = CreateCalendarEventInputSchema.parse(input);
        const result = await createCalendarEvent(
          validatedInput,
          this.config.n8nWebhookBaseUrl,
          this.config.n8nBearerToken
        );
        console.log('Result:', JSON.stringify(result, null, 2));
        return result;
      }

      if (toolName === 'listCalendarEvents') {
        const validatedInput = ListCalendarEventsInputSchema.parse(input);
        const result = await listCalendarEvents(
          validatedInput,
          this.config.n8nWebhookBaseUrl,
          this.config.n8nBearerToken
        );
        console.log('Result:', JSON.stringify(result, null, 2));
        return result;
      }

      throw new Error(`Unknown tool: ${toolName}`);
    } catch (error) {
      console.error(`Tool execution error:`, error);
      throw error;
    }
  }

  /**
   * 会話履歴をクリア
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * 会話履歴を取得
   */
  getHistory(): Message[] {
    return [...this.conversationHistory];
  }
}
