import 'dotenv/config';
import { CalendarAgent } from './agent.js';
import type { AgentConfig } from './types.js';

/**
 * 環境変数から設定を読み込み
 */
function loadConfig(): AgentConfig {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const n8nWebhookBaseUrl = process.env.N8N_WEBHOOK_BASE_URL;
  const n8nBearerToken = process.env.N8N_BEARER_TOKEN;
  const model = process.env.MODEL || 'openai/gpt-4o-mini';

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not set');
  }

  if (!n8nWebhookBaseUrl) {
    throw new Error('N8N_WEBHOOK_BASE_URL is not set');
  }

  if (!n8nBearerToken) {
    throw new Error('N8N_BEARER_TOKEN is not set');
  }

  return {
    apiKey,
    model,
    n8nWebhookBaseUrl,
    n8nBearerToken,
  };
}

/**
 * メイン関数
 */
async function main() {
  try {
    const config = loadConfig();
    const agent = new CalendarAgent(config);

    console.log('📅 Calendar Agent initialized');
    console.log(`Model: ${config.model}`);
    console.log(`n8n Base URL: ${config.n8nWebhookBaseUrl}\n`);

    // 例: 予定を追加
    console.log('=== Test 1: Create Event ===');
    const response1 = await agent.chat('明日の午前10時から11時までチームミーティングの予定を追加して');
    console.log(`Assistant: ${response1}\n`);

    // 例: 予定を確認
    console.log('=== Test 2: List Events ===');
    const response2 = await agent.chat('今週の予定を教えて');
    console.log(`Assistant: ${response2}\n`);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// 直接実行された場合のみmainを実行
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { CalendarAgent };
export type { AgentConfig, Message } from './types.js';
