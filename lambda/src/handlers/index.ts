import OpenAI from "openai";
import {
  IntentPayload,
  SmallTalkSlots,
  AskKnowledgeSlots,
  SetTimerSlots,
  SetAlarmSlots,
  QueryScheduleSlots,
  AddEventSlots,
  CancelEventSlots,
  SlackPostMessageSlots,
  SlackSendDMSlots,
  SlackSummarizeChannelSlots,
  AgentConfig,
  ToolCall,
} from "../types";

export interface HandlerResult {
  reply: string;
  toolCalls: ToolCall[];
}

// ==================== Handler Class ====================

export class IntentHandlers {
  private client: OpenAI;
  private model: string;

  constructor(config: AgentConfig) {
    this.client = new OpenAI({
      apiKey: config.openRouterApiKey,
      baseURL: config.openRouterBaseUrl,
    });
    this.model = config.model;
  }

  async handle(
    intent: IntentPayload,
    userId: string
  ): Promise<HandlerResult> {
    switch (intent.intent) {
      case "SMALL_TALK":
        return this.handleSmallTalk(intent.slots);

      case "ASK_KNOWLEDGE":
        return this.handleAskKnowledge(intent.slots);

      case "SET_TIMER":
        return this.handleSetTimer(intent.slots);

      case "SET_ALARM":
        return this.handleSetAlarm(intent.slots);

      case "QUERY_SCHEDULE":
        return this.handleQuerySchedule(userId, intent.slots);

      case "ADD_EVENT":
        return this.handleAddEvent(userId, intent.slots);

      case "CANCEL_EVENT":
        return this.handleCancelEvent(userId, intent.slots);

      case "SLACK_POST_MESSAGE":
        return this.handleSlackPostMessage(userId, intent.slots);

      case "SLACK_SEND_DM":
        return this.handleSlackSendDM(userId, intent.slots);

      case "SLACK_SUMMARIZE_CHANNEL":
        return this.handleSlackSummarizeChannel(userId, intent.slots);

      default:
        return {
          reply: "すみません、よくわかりませんでした。",
          toolCalls: [],
        };
    }
  }

  // ==================== Individual Handlers ====================

  private async handleSmallTalk(slots: SmallTalkSlots): Promise<HandlerResult> {
    // Generate a conversational response using LLM
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: "system",
          content:
            "あなたは親しみやすいパーソナル秘書です。ユーザーとカジュアルに会話してください。",
        },
        {
          role: "user",
          content: slots.free_text,
        },
      ],
      temperature: 0.7,
    });

    return {
      reply: response.choices[0]?.message?.content || "そうですね。",
      toolCalls: [],
    };
  }

  private async handleAskKnowledge(
    slots: AskKnowledgeSlots
  ): Promise<HandlerResult> {
    // Answer knowledge questions using LLM
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: "system",
          content:
            "あなたは知識豊富なアシスタントです。質問に対して簡潔かつ正確に答えてください。",
        },
        {
          role: "user",
          content: slots.question,
        },
      ],
      temperature: 0.3,
    });

    return {
      reply: response.choices[0]?.message?.content || "わかりません。",
      toolCalls: [],
    };
  }

  private async handleSetTimer(slots: SetTimerSlots): Promise<HandlerResult> {
    // v0: Client-side implementation
    const minutes = Math.floor(slots.duration_seconds / 60);
    const seconds = slots.duration_seconds % 60;
    const timeStr =
      minutes > 0 ? `${minutes}分${seconds}秒` : `${seconds}秒`;

    return {
      reply: `${timeStr}のタイマーをセットしました。`,
      toolCalls: [{ service: "timer", action: "set" }],
    };
  }

  private async handleSetAlarm(slots: SetAlarmSlots): Promise<HandlerResult> {
    // v0: Client-side implementation or calendar event
    const datetime = new Date(slots.datetime);
    const timeStr = datetime.toLocaleString("ja-JP", {
      timeZone: "Asia/Tokyo",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    return {
      reply: `${timeStr}にアラームをセットしました。`,
      toolCalls: [{ service: "alarm", action: "set" }],
    };
  }

  private async handleQuerySchedule(
    _userId: string,
    slots: QueryScheduleSlots
  ): Promise<HandlerResult> {
    // TODO: Implement Google Calendar integration
    // For now, return a placeholder

    const focusStr = slots.focus === "today" ? "今日" : "その期間";

    return {
      reply: `${focusStr}の予定を確認しています... (Google Calendar連携は実装予定)`,
      toolCalls: [{ service: "google_calendar", action: "list_events" }],
    };
  }

  private async handleAddEvent(
    _userId: string,
    slots: AddEventSlots
  ): Promise<HandlerResult> {
    // TODO: Implement Google Calendar integration

    const startDate = new Date(slots.start);
    const timeStr = startDate.toLocaleString("ja-JP", {
      timeZone: "Asia/Tokyo",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    return {
      reply: `${timeStr}から「${slots.title}」の予定をカレンダーに入れておきました。(Google Calendar連携は実装予定)`,
      toolCalls: [{ service: "google_calendar", action: "create_event" }],
    };
  }

  private async handleCancelEvent(
    _userId: string,
    _slots: CancelEventSlots
  ): Promise<HandlerResult> {
    // TODO: Implement Google Calendar integration

    return {
      reply: `予定をキャンセルしました。(Google Calendar連携は実装予定)`,
      toolCalls: [{ service: "google_calendar", action: "delete_event" }],
    };
  }

  private async handleSlackPostMessage(
    _userId: string,
    slots: SlackPostMessageSlots
  ): Promise<HandlerResult> {
    // TODO: Implement Slack integration

    return {
      reply: `${slots.channel} にメッセージを送っておきました。(Slack連携は実装予定)`,
      toolCalls: [{ service: "slack", action: "post_message" }],
    };
  }

  private async handleSlackSendDM(
    _userId: string,
    slots: SlackSendDMSlots
  ): Promise<HandlerResult> {
    // TODO: Implement Slack integration

    return {
      reply: `${slots.user_display_name}さんにDMを送っておきました。(Slack連携は実装予定)`,
      toolCalls: [{ service: "slack", action: "send_dm" }],
    };
  }

  private async handleSlackSummarizeChannel(
    _userId: string,
    slots: SlackSummarizeChannelSlots
  ): Promise<HandlerResult> {
    // TODO: Implement Slack integration + summarization

    return {
      reply: `${slots.channel} の直近${slots.range_hours}時間の要約を作成中... (Slack連携は実装予定)`,
      toolCalls: [
        { service: "slack", action: "get_messages" },
        { service: "llm", action: "summarize" },
      ],
    };
  }
}
