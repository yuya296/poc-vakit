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
 * テストケース
 */
async function runTests() {
  const config = loadConfig();
  const agent = new CalendarAgent(config);

  console.log('🧪 Running Agents Kit Tests\n');

  // Test 1: 予定追加（自然言語）
  console.log('=== Test 1: Create Event (Natural Language) ===');
  try {
    const response = await agent.chat('12月10日の午後2時から3時まで「プロジェクト会議」という予定を追加して');
    console.log(`✅ Response: ${response}\n`);
  } catch (error) {
    console.error('❌ Test 1 failed:', error);
  }

  // Test 2: 予定確認（今日）
  console.log('=== Test 2: List Today\'s Events ===');
  try {
    agent.clearHistory();
    const response = await agent.chat('今日の予定を教えて');
    console.log(`✅ Response: ${response}\n`);
  } catch (error) {
    console.error('❌ Test 2 failed:', error);
  }

  // Test 3: 予定確認（明日）
  console.log('=== Test 3: List Tomorrow\'s Events ===');
  try {
    agent.clearHistory();
    const response = await agent.chat('明日の予定は？');
    console.log(`✅ Response: ${response}\n`);
  } catch (error) {
    console.error('❌ Test 3 failed:', error);
  }

  // Test 4: 予定追加（具体的な日時）
  console.log('=== Test 4: Create Event (Specific Date) ===');
  try {
    agent.clearHistory();
    const response = await agent.chat('2025年12月15日の午前9時から9時30分まで「朝会」を追加');
    console.log(`✅ Response: ${response}\n`);
  } catch (error) {
    console.error('❌ Test 4 failed:', error);
  }

  // Test 5: 1週間の予定確認
  console.log('=== Test 5: List This Week\'s Events ===');
  try {
    agent.clearHistory();
    const response = await agent.chat('今週の予定を全部教えて');
    console.log(`✅ Response: ${response}\n`);
  } catch (error) {
    console.error('❌ Test 5 failed:', error);
  }

  console.log('🎉 All tests completed!');
}

runTests().catch(console.error);
