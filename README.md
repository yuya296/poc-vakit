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

- **音声処理**: OpenAI Realtime API
- **AI推論**: OpenAI Responses API (GPT-4.1-mini)
- **バックエンド**: AWS Lambda + API Gateway
- **外部連携**: Google Calendar API, Slack API
- **クライアント**: Raspberry Pi / PC（Python/Node.js）

## ドキュメント

- [設計書 v0](./docs/DESIGN_v0.md) - 詳細な設計仕様

## プロジェクト構成

```
poc-vakit/
├── docs/               # ドキュメント
│   └── DESIGN_v0.md   # v0設計書
├── lambda/            # Lambda関数（予定）
├── client/            # クライアント実装（予定）
├── cdk/               # AWS CDK定義（予定）
└── README.md          # このファイル
```

## 開発状況

現在のフェーズ: **設計完了**

次のステップ:
1. Intent判定用プロンプトの実テキスト作成
2. Google Calendar / Slack APIインターフェース定義
3. Lambda + API GatewayのCDK定義

## ライセンス

Private project - Not for public distribution

## Author

yuya
