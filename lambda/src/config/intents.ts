/**
 * Intent有効/無効設定
 *
 * 各Intentのon/offを切り替えることで、分類対象と実行可能なIntentを制御できます。
 * falseにしたIntentは、分類時にLLMに提示されず、実行もされません。
 */
export const intentConfig = {
  SMALL_TALK: true,
  ASK_KNOWLEDGE: true,
  SET_TIMER: true,
  SET_ALARM: true,
  QUERY_SCHEDULE: true,
  ADD_EVENT: true,
  CANCEL_EVENT: true,
  SLACK_POST_MESSAGE: true,
  SLACK_SEND_DM: true,
  SLACK_SUMMARIZE_CHANNEL: true,
} as const;

export type IntentName = keyof typeof intentConfig;

/**
 * 有効なIntentのリストを取得
 */
export function getEnabledIntents(): IntentName[] {
  return Object.entries(intentConfig)
    .filter(([_, enabled]) => enabled)
    .map(([name, _]) => name as IntentName);
}
