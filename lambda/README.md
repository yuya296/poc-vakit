# Agent Brain Lambda

パーソナル秘書エージェントのコアロジック（Lambda実装）

## 概要

OpenRouter経由でLLMを使用し、ユーザーの発話からIntentを判定して適切な処理を実行します。

### 実装済み機能

- **Intent分類**: 10種類のIntentを自動判定
  - 雑談・知識質問
  - タイマー・アラーム
  - カレンダー操作（予定確認・追加・削除）
  - Slack操作（投稿・DM・要約）

- **OpenRouter統合**: OpenAI互換APIで柔軟なモデル選択
- **型安全**: TypeScript + Zod でランタイム検証
- **構造化ログ**: CloudWatch Logs 対応

### 未実装（TODO）

- Google Calendar API 実装
- Slack API 実装
- 認証・認可
- レート制限
- キャッシング

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.example` をコピーして `.env` を作成：

```bash
cp .env.example .env
```

以下の値を設定：

```bash
OPENROUTER_API_KEY=your-api-key-here
MODEL=openai/gpt-4-turbo  # または他のモデル
```

### 3. ビルド

```bash
npm run build
```

## 開発

### ローカルテスト（準備中）

```bash
# テストを実行
npm test

# ウォッチモード
npm run watch
```

### API仕様

#### リクエスト

```bash
POST /v1/agent
Content-Type: application/json

{
  "text": "明日の10時にミーティング入れて",
  "user_id": "yuya",
  "session_id": "optional-session-id"
}
```

#### レスポンス

```json
{
  "ok": true,
  "intent": "ADD_EVENT",
  "slots": {
    "title": "ミーティング",
    "start": "2025-11-22T10:00:00+09:00",
    "end": "2025-11-22T10:30:00+09:00",
    "location": null
  },
  "reply": "明日の10時から「ミーティング」の予定をカレンダーに入れておきました。",
  "meta": {
    "model": "openai/gpt-4-turbo",
    "tool_calls": [
      {
        "service": "google_calendar",
        "action": "create_event"
      }
    ]
  }
}
```

## プロジェクト構成

```
lambda/
├── src/
│   ├── index.ts          # Lambda handler
│   ├── types.ts          # 型定義（Intent, Slots, etc）
│   ├── classifier.ts     # Intent判定ロジック
│   ├── handlers/         # Intent別のハンドラー
│   │   └── index.ts      # 全Intentのハンドラー実装
│   └── services/         # 外部サービス連携（予定）
├── package.json
├── tsconfig.json
└── README.md
```

## Intent一覧

| Intent | 説明 | 例 |
|--------|------|-----|
| `SMALL_TALK` | 雑談 | 「今日は眠い」 |
| `ASK_KNOWLEDGE` | 知識質問 | 「型理論って何？」 |
| `SET_TIMER` | タイマー | 「3分タイマーセット」 |
| `SET_ALARM` | アラーム | 「明日7時にアラーム」 |
| `QUERY_SCHEDULE` | 予定確認 | 「今日の予定教えて」 |
| `ADD_EVENT` | 予定追加 | 「明日10時にミーティング」 |
| `CANCEL_EVENT` | 予定削除 | 「明日10時のミーティングキャンセル」 |
| `SLACK_POST_MESSAGE` | Slack投稿 | 「#randomに送って」 |
| `SLACK_SEND_DM` | Slack DM | 「田中さんにDM送って」 |
| `SLACK_SUMMARIZE_CHANNEL` | Slack要約 | 「#backendの今日の流れ教えて」 |

## 環境変数

| 変数名 | 必須 | 説明 | デフォルト |
|--------|------|------|-----------|
| `OPENROUTER_API_KEY` | ✅ | OpenRouter APIキー | - |
| `OPENROUTER_BASE_URL` | ❌ | OpenRouter エンドポイント | `https://openrouter.ai/api/v1` |
| `MODEL` | ❌ | 使用するモデル | `openai/gpt-4-turbo` |
| `DEFAULT_USER_ID` | ❌ | デフォルトユーザーID | `default` |

## デプロイ（AWS Lambda）

CDKまたはSAMを使用してデプロイします（詳細は `/cdk` を参照）。

```bash
# ビルド
npm run build

# CDKでデプロイ（準備中）
cd ../cdk
npm run deploy
```

## 次のステップ

1. **外部サービス統合**
   - Google Calendar API 実装
   - Slack API 実装

2. **セキュリティ強化**
   - 認証・認可（API Key, JWT）
   - ホワイトリスト（Slackチャンネル、危険な操作）

3. **テスト**
   - ユニットテスト
   - 統合テスト
   - E2Eテスト

4. **パフォーマンス**
   - レスポンスキャッシュ
   - レート制限
   - タイムアウト処理

## ライセンス

Private project - Not for public distribution
