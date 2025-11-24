# POC-VAKIT (Personal AI Agent - Voice-Activated Knowledge & Integration Tool)

パーソナル秘書AIエージェントのプロトタイプ実装

## 概要

音声とテキストで対話できるパーソナル秘書エージェント。
予定管理、Slack連携、雑談など、日常的なタスクをサポートする。

### 主な機能（v0）

- **予定管理**: Googleカレンダーとの連携（予定確認・追加・削除）
- **Slack連携**: メッセージ送信・DM・チャンネル要約
- **雑談・質問**: 日常会話や一般的な知識への回答
- **タイマー・アラーム**: 時間管理のサポート

## アーキテクチャ

```
[音声入力] → [Raspberry Pi / PC]
    ↓
[OpenAI Realtime API] ← 音声⇔テキスト変換
    ↓
[AWS Lambda (Agent Brain)] ← Intent判定・実行
    ↓
[外部サービス] - Google Calendar, Slack
```

### 技術スタック

- **音声処理**: OpenAI Realtime API（予定）
- **AI推論**: OpenRouter（OpenAI互換API）
- **バックエンド**: AWS Lambda (TypeScript) + API Gateway
- **外部連携**: Google Calendar API, Slack API（実装予定）
- **クライアント**: Raspberry Pi / PC（予定）

## ドキュメント

- [設計書 v0](./docs/DESIGN_v0.md) - 詳細な設計仕様
- [Lambda README](./lambda/README.md) - Lambda実装の詳細
- [CDK README](./cdk/README.md) - デプロイ手順

## プロジェクト構成

```
poc-vakit/
├── docs/                    # ドキュメント
│   └── DESIGN_v0.md        # v0設計書
├── lambda/                  # Lambda関数 ✅ 実装完了
│   ├── src/
│   │   ├── index.ts        # Lambda handler
│   │   ├── types.ts        # Intent型定義
│   │   ├── classifier.ts   # Intent判定（OpenRouter）
│   │   └── handlers/       # Intent別ハンドラー
│   ├── package.json
│   └── README.md
├── cdk/                     # AWS CDK ✅ 実装完了
│   ├── bin/app.ts          # CDK app
│   ├── lib/vakit-stack.ts  # スタック定義
│   ├── package.json
│   └── README.md
├── client/                  # クライアント実装（予定）
└── README.md
```

## 開発状況

現在のフェーズ: **本番稼働中** 🚀

### ✅ 完了
- 設計書作成
- Lambda コアロジック実装
  - 10種類のIntent判定（OpenRouter統合）
  - Commandパターンでリファクタリング
  - TypeScript型安全実装
  - ログ機能
- **AWS 本番デプロイ**
  - Lambda + API Gateway
  - API Key認証
  - レート制限 (10 req/sec)
  - CloudWatch Logs

### 🚧 次のステップ
1. 外部サービス統合
   - Google Calendar API 実装
   - Slack API 実装
2. クライアント実装（音声 I/O）
3. マルチターン対話（セッション管理）
4. E2Eテスト

## 本番環境

### API エンドポイント

API Gatewayのエンドポイントとキーは `.env` ファイルを参照してください。

### 使用例

```bash
# .env ファイルから環境変数を読み込み
source .env

# 基本的な使い方
curl -X POST "$API_ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_GATEWAY_KEY" \
  -d '{"text": "こんにちは", "user_id": "yuya"}'

# 知識検索
curl -X POST "$API_ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_GATEWAY_KEY" \
  -d '{"text": "型理論って何？", "user_id": "yuya"}'

# タイマー設定
curl -X POST "$API_ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_GATEWAY_KEY" \
  -d '{"text": "5分タイマーセットして", "user_id": "yuya"}'
```

### レスポンス例

```json
{
  "ok": true,
  "intent": "SMALL_TALK",
  "slots": {"free_text": "こんにちは"},
  "reply": "こんにちは。ご用件をどうぞ。",
  "meta": {
    "model": "openai/gpt-oss-120b",
    "tool_calls": []
  }
}
```

### セキュリティ設定

- ✅ API Key認証（必須）
- ✅ レート制限: 10 req/sec、バースト 20
- ✅ 月間クォータ: 10,000リクエスト

## セットアップ

### 1. 環境変数の設定

```bash
# プロジェクトルートの.envファイルをコピー
cp .env.example .env

# .envファイルを編集して実際の値を設定
# - API_ENDPOINT: デプロイ後のAPI Gateway URL
# - API_GATEWAY_KEY: デプロイ後のAPI Key
# - AWS_PROFILE: 使用するAWSプロファイル
```

### 2. Lambda環境変数の設定

```bash
# lambda/.envファイルを作成
cd lambda
cat > .env << EOF
OPENROUTER_API_KEY=your-openrouter-api-key
MODEL=openai/gpt-oss-120b
DEFAULT_USER_ID=yuya
EOF
```

## デプロイ方法

```bash
# 1. Lambda のビルド
cd lambda
npm install && npm run build

# 2. CDK デプロイ
cd ../cdk
npm install
AWS_PROFILE=your-aws-profile npm run deploy

# 3. デプロイ後、出力されたAPI情報を .env に記録
```

詳細は [CLAUDE.md](./CLAUDE.md) を参照。

## ライセンス

Private project - Not for public distribution

## Author

yuya
