# Agents Kit for VAKIT

Anthropic Claude + n8n Webhookを使用したカレンダー管理エージェント

## 概要

このプロジェクトは、Claudeのエージェント機能とn8nのWebhookを組み合わせて、Google Calendarの操作を自然言語で行えるようにします。

## 機能

- **予定の追加**: 自然言語で予定を作成
- **予定の確認**: 指定期間の予定を取得

## 前提条件

- Node.js 20以上
- n8nが稼働していること（[n8nセットアップガイド](../n8n/README.md)参照）
- OpenRouter APIキー（https://openrouter.ai/）

## セットアップ

### 1. 依存関係のインストール

```bash
cd agents-kit
npm install
```

### 2. 環境変数の設定

```bash
cp .env.example .env
```

`.env` ファイルを編集:

```env
# OpenRouter API Key (https://openrouter.ai/)
OPENROUTER_API_KEY=sk-or-xxxxx

# n8n Webhook Configuration
N8N_WEBHOOK_BASE_URL=http://localhost:5678/webhook
N8N_BEARER_TOKEN=your_bearer_token_here

# Model Configuration (OpenRouter)
MODEL=openai/gpt-4o-mini
```

**注意**:
- `N8N_BEARER_TOKEN` は n8n の `.env` で設定した値と同じにしてください。
- OpenRouter API Keyは https://openrouter.ai/ で取得できます。

### 3. TypeScriptビルド（本番用）

```bash
npm run build
```

## 使い方

### テストモード

定義済みのテストケースを実行:

```bash
npm run test
```

出力例:
```
🧪 Running Agents Kit Tests

=== Test 1: Create Event (Natural Language) ===
🔧 Executing tool: createCalendarEvent
Input: {
  "title": "プロジェクト会議",
  "start": "2025-12-10T14:00:00+09:00",
  "end": "2025-12-10T15:00:00+09:00"
}
✅ Response: 予定を追加しました。12月10日の午後2時から3時まで「プロジェクト会議」です。
```

### 対話モード

インタラクティブなチャットインターフェース:

```bash
npm run chat
```

使用例:
```
You> 明日の午後2時から3時までミーティングを追加して

Assistant> 予定を追加しました。明日の午後2時から3時まで「ミーティング」です。

You> 今週の予定を教えて

Assistant> 今週の予定は以下の通りです。12月7日午前10時からチームミーティング、12月10日午後2時からプロジェクト会議があります。

You> /clear
✨ 会話履歴をクリアしました

You> /exit
👋 Goodbye!
```

### 開発モード

TypeScriptを直接実行（tsx使用）:

```bash
npm run dev
```

## プロジェクト構成

```
agents-kit/
├── src/
│   ├── types.ts              # 型定義（Zodスキーマ）
│   ├── tools/
│   │   └── n8nCalendar.ts    # n8n Webhook呼び出し
│   ├── agent.ts              # CalendarAgentクラス
│   ├── index.ts              # エントリーポイント
│   ├── test.ts               # テストスクリプト
│   └── chat.ts               # 対話型CLI
├── package.json
├── tsconfig.json
└── README.md
```

## API仕様

### CalendarAgent

```typescript
import { CalendarAgent } from './agent.js';

const agent = new CalendarAgent({
  apiKey: 'your-openrouter-api-key',
  model: 'openai/gpt-4o-mini',
  n8nWebhookBaseUrl: 'http://localhost:5678/webhook',
  n8nBearerToken: 'your-bearer-token',
});

// チャット
const response = await agent.chat('明日の午後2時から会議を追加して');

// 会話履歴クリア
agent.clearHistory();

// 会話履歴取得
const history = agent.getHistory();
```

### Tools

#### createCalendarEvent

n8n経由でGoogle Calendarに予定を追加

**Input**:
```json
{
  "title": "ミーティング",
  "start": "2025-12-07T14:00:00+09:00",
  "end": "2025-12-07T15:00:00+09:00",
  "description": "プロジェクトレビュー"
}
```

**Output**:
```json
{
  "success": true,
  "eventId": "abc123",
  "start": "2025-12-07T14:00:00+09:00",
  "end": "2025-12-07T15:00:00+09:00"
}
```

#### listCalendarEvents

n8n経由でGoogle Calendarの予定一覧を取得

**Input**:
```json
{
  "dateRangeStart": "2025-12-06T00:00:00+09:00",
  "dateRangeEnd": "2025-12-13T23:59:59+09:00"
}
```

**Output**:
```json
{
  "success": true,
  "events": [
    {
      "title": "チームミーティング",
      "start": "2025-12-07T10:00:00+09:00",
      "end": "2025-12-07T11:00:00+09:00",
      "description": "週次レビュー"
    }
  ]
}
```

## トラブルシューティング

### エージェントがツールを呼ばない

- システムプロンプトが適切か確認
- ユーザーの入力が明確か確認（「予定を追加して」など具体的に）

### n8n Webhookに接続できない

```bash
# n8nが起動しているか確認
docker ps | grep n8n

# Webhookが有効化されているか確認（n8n管理画面で）
curl -X POST http://localhost:5678/webhook/calendar-list \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dateRangeStart": "2025-12-06T00:00:00+09:00", "dateRangeEnd": "2025-12-06T23:59:59+09:00"}'
```

### Bearer Token認証エラー

- `.env` の `N8N_BEARER_TOKEN` が n8n 側と一致しているか確認
- n8n ワークフローのIF条件が正しいか確認

## 次のステップ

- [ ] Gmail送信機能の追加
- [ ] Slack通知機能の追加
- [ ] マルチターン対話の改善
- [ ] エラーハンドリングの強化
- [ ] ロギング機能の追加

## 参考資料

- [Anthropic Claude API Documentation](https://docs.anthropic.com/)
- [n8n Documentation](https://docs.n8n.io/)
- [Google Calendar API](https://developers.google.com/calendar)
