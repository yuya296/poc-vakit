import { IntentCommand, HandlerResult } from "./commands/base";
import { IntentPayload } from "./types";

// 全Commandをインポート
import { SmallTalkCommand } from "./commands/smallTalk";
import { AskKnowledgeCommand } from "./commands/askKnowledge";
import { SetTimerCommand } from "./commands/timer";
import { SetAlarmCommand } from "./commands/alarm";
import { QueryScheduleCommand } from "./commands/querySchedule";
import { AddEventCommand } from "./commands/addEvent";
import { UpdateEventCommand } from "./commands/updateEvent";
import { CancelEventCommand } from "./commands/cancelEvent";
import { SlackPostCommand } from "./commands/slackPost";
import { SlackDmCommand } from "./commands/slackDm";
import { SlackSummarizeCommand } from "./commands/slackSummarize";

/**
 * CommandRegistry - 有効なIntentCommandを管理
 */
export class CommandRegistry {
  private commands: Map<string, IntentCommand> = new Map();

  constructor(apiKey: string, model: string) {
    // 全Commandを初期化
    const allCommands: IntentCommand[] = [
      new SmallTalkCommand(apiKey, model),
      new AskKnowledgeCommand(apiKey, model),
      new SetTimerCommand(apiKey, model),
      new SetAlarmCommand(apiKey, model),
      new QueryScheduleCommand(apiKey, model),
      new AddEventCommand(apiKey, model),
      new UpdateEventCommand(apiKey, model),
      new CancelEventCommand(apiKey, model),
      new SlackPostCommand(apiKey, model),
      new SlackDmCommand(apiKey, model),
      new SlackSummarizeCommand(apiKey, model),
    ];

    // 有効なCommandのみを登録
    for (const command of allCommands) {
      if (command.enabled) {
        this.commands.set(command.intentName, command);
      }
    }

    console.log(`[CommandRegistry] Registered ${this.commands.size} commands:`, [
      ...this.commands.keys(),
    ]);
  }

  /**
   * 有効なIntentのリストを取得
   */
  getEnabledIntents(): Array<{ name: string; description: string }> {
    return Array.from(this.commands.values()).map((cmd) => ({
      name: cmd.intentName,
      description: cmd.description,
    }));
  }

  /**
   * Intentを実行
   */
  async execute(intent: IntentPayload, userId: string): Promise<HandlerResult> {
    const command = this.commands.get(intent.intent);

    if (!command) {
      throw new Error(`Intent not enabled or not found: ${intent.intent}`);
    }

    return command.execute(intent.slots, userId);
  }

  /**
   * Intentが有効かチェック
   */
  isEnabled(intentName: string): boolean {
    return this.commands.has(intentName);
  }
}
