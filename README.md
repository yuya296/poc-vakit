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

現在のフェーズ: **デプロイ可能**

### ✅ 完了
- 設計書作成
- Lambda コアロジック実装
  - 10種類のIntent判定（OpenRouter統合）
  - TypeScript型安全実装
  - ログ機能
- **AWS CDK インフラ定義**
  - Lambda + API Gateway
  - CloudWatch Logs
  - 1コマンドでデプロイ可能

### 🚧 次のステップ
1. 外部サービス統合
   - Google Calendar API 実装
   - Slack API 実装
2. クライアント実装（音声 I/O）
3. 認証・認可（API Key / Cognito）
4. E2Eテスト

## クイックスタート

### デプロイ

```bash
# 1. Lambda のビルド
cd lambda
npm install && npm run build

# 2. CDK のセットアップ
cd ../cdk
npm install

# 3. デプロイ
export OPENROUTER_API_KEY="your-api-key"
npm run deploy

# 4. テスト
curl -X POST "https://xxxxx.execute-api.ap-northeast-1.amazonaws.com/v1/agent" \
  -H "Content-Type: application/json" \
  -d '{"text": "今日の予定教えて", "user_id": "yuya"}'
```

詳細は [CDK README](./cdk/README.md) を参照。

## ライセンス

Private project - Not for public distribution

## Author

yuya
