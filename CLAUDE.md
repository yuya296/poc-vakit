# POC-VAKIT 開発進捗

## プロジェクト概要
音声対応パーソナルAIエージェント（VAKIT: Voice-Activated Knowledge & Integration Tool）のプロトタイプ開発

## 開発フェーズ: v0.1 (Commandパターン + AWS デプロイ完了)

### 完了した実装

#### 1. 設計フェーズ ✅
- **ファイル**: `docs/DESIGN_v0.md`
- **内容**:
  - 10種類のIntent定義（SMALL_TALK, ASK_KNOWLEDGE, タイマー/アラーム, 予定管理, Slack連携）
  - アーキテクチャ設計（Lambda + API Gateway）
  - API仕様、セキュリティ要件
  - 外部サービス連携仕様（Google Calendar, Slack）

#### 2. Lambda実装 ✅
**技術スタック**:
- TypeScript (strict mode)
- OpenRouter API (OpenAI互換)
- Zod (ランタイムバリデーション)
- AWS Lambda + API Gateway

**実装ファイル**:
- `lambda/src/types.ts`: 全Intentのスキーマ定義（Zod）
- `lambda/src/classifier.ts`: Intent分類エンジン（LLM使用）
- `lambda/src/handlers/index.ts`: Intent別ハンドラー実装
- `lambda/src/index.ts`: Lambda エントリーポイント

**最適化**:
- 音声アシスタント向けに応答を最適化
  - SMALL_TALK: 1-2文で簡潔
  - ASK_KNOWLEDGE: 2-3文で簡潔
  - 絵文字を使わない（音声出力に適さないため）

**使用モデル**: `openai/gpt-oss-120b` (OpenRouter経由)

#### 3. インフラ実装 (AWS CDK) ✅
**ファイル**: `cdk/lib/vakit-stack.ts`, `cdk/bin/app.ts`

**構成**:
- Lambda Function (Node.js 20, 30秒タイムアウト)
- API Gateway REST API (CORS有効)
- CloudWatch Logs (7日間保持)
- 環境変数でモデル・APIキー設定

#### 4. ローカルテスト環境 ✅
**ファイル**:
- `lambda/test.ts`: 単発テストスクリプト
- `lambda/chat.ts`: 対話型CLIチャットアプリ

**実行方法**:
```bash
cd lambda
npm run test:local  # 単発テスト
npm run chat        # 対話モード
```

**テスト結果**:
- "こんにちは" → 簡潔な応答確認 ✅
- Intent分類動作確認 ✅

### 技術的な解決済み課題

#### TypeScript型安全性
- 未使用変数エラーを `_userId`, `_slots` プレフィックスで解決
- 将来の外部サービス統合のためにパラメータは保持

#### 環境変数管理
- `.env` ファイルで管理
- `OPENROUTER_API_KEY`, `MODEL`, `DEFAULT_USER_ID`

### アーキテクチャ改善 ✅

#### Commandパターンへのリファクタリング
各Intentを独立したCommandクラスとして実装し、設定ファイルで有効/無効を切り替え可能に:

**新しい構成**:
```
lambda/src/
├── commands/
│   ├── base.ts              # IntentCommand interface
│   ├── smallTalk.ts
│   ├── askKnowledge.ts
│   ├── timer.ts
│   ├── alarm.ts
│   ├── querySchedule.ts
│   ├── addEvent.ts
│   ├── cancelEvent.ts
│   ├── slackPost.ts
│   ├── slackDm.ts
│   └── slackSummarize.ts
├── config/
│   └── intents.ts           # Intent有効/無効設定
├── registry.ts              # CommandRegistry
├── classifier.ts            # 有効なIntentのみを分類
└── index.ts                 # Registry使用
```

**利点**:
- Intentの追加・削除が容易
- `config/intents.ts`で簡単にon/off切り替え
- テストしやすい独立したクラス
- 分類時に有効なIntentのみをLLMに伝達

### AWS デプロイ ✅

**デプロイ情報**:
- **API エンドポイント**: `https://ti261jguu2.execute-api.ap-northeast-1.amazonaws.com/v1/agent`
- **Lambda関数**: `VakitStack-AgentBrainFunction0609ACCE-ryNEfMYQFYOv`
- **リージョン**: `ap-northeast-1`
- **プロファイル**: `cdk-348103270100`

**セキュリティ設定**:
- ✅ API Key認証（必須）
- ✅ レート制限: 10 req/sec、バースト 20
- ✅ 月間クォータ: 10,000リクエスト
- **API Key**: `AV2AvH3bdb5kZTIIL6y1g1HOMAQDIr4u5fMplb6k`
- **API Key ID**: `gtae50dw89`

**動作確認**:
```bash
# API Keyありでリクエスト（成功）
curl -X POST "https://ti261jguu2.execute-api.ap-northeast-1.amazonaws.com/v1/agent" \
  -H "Content-Type: application/json" \
  -H "x-api-key: AV2AvH3bdb5kZTIIL6y1g1HOMAQDIr4u5fMplb6k" \
  -d '{"text": "こんにちは", "user_id": "yuya"}'

# API Keyなしでリクエスト（403 Forbidden）
curl -X POST "https://ti261jguu2.execute-api.ap-northeast-1.amazonaws.com/v1/agent" \
  -H "Content-Type: application/json" \
  -d '{"text": "こんにちは", "user_id": "yuya"}'
```

レスポンス例:
```json
{
  "ok": true,
  "intent": "SMALL_TALK",
  "slots": {"free_text": "こんにちは"},
  "reply": "こんにちは。ご用件をどうぞ。",
  "meta": {"model": "openai/gpt-oss-120b", "tool_calls": []}
}
```

### 現在のステータス

**本番稼働中**: AWS Lambda + API Gateway でデプロイ済み、動作確認完了

**未実装**:
- 外部サービス統合（Google Calendar API, Slack API）
- マルチターン対話（セッション管理）
- 音声I/Oクライアント

### Git情報
- **ブランチ**: `claude/design-ai-agent-015vQxgpMh8gDf9AoE9g2Xd1`
- **最終更新**: Commandパターンリファクタリング + AWS デプロイ

---

## 次のステップ候補

### A. 外部サービス統合
- Google Calendar API実装（予定確認・追加・削除）
- Slack API実装（メッセージ送信・DM・要約）

### B. セッション管理
- DynamoDB等を使用したマルチターン対話
- スロット不足時の追加情報収集

### C. デプロイ & 本番環境
- AWS環境へのデプロイ
- API認証・認可（API Key / Cognito）
- CloudWatch監視設定

### D. クライアント実装
- Raspberry Pi / PCでの音声I/O
- OpenAI Realtime API統合

---

**最終更新**: 2025-11-24
