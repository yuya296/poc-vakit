# POC-VAKIT 開発進捗

## プロジェクト概要
音声対応パーソナルAIエージェント（VAKIT: Voice-Activated Knowledge & Integration Tool）のプロトタイプ開発

## 開発フェーズ: v0.3 (n8n + Agents Kit PoC実装完了)

### 完了した実装

#### 1. Lambda実装（v0.1-v0.2）✅
**詳細**: 既存の実装を維持
- Lambda + API Gateway アーキテクチャ
- Google Calendar API直接統合
- 10種類のIntent実装
- AWS CDKによるデプロイ自動化
- OpenRouter API使用 (`openai/gpt-4o-mini`)

#### 2. n8n + Agents Kit PoC（v0.3）✅

**アーキテクチャ**:
```
Agent (Anthropic Claude)
  → HTTP POST → n8n Webhook
  → Google Calendar API
  → JSON Response → Agent
```

**実装内容**:

##### n8nセットアップ
- **ファイル**:
  - `n8n/docker-compose.yml` - Docker環境定義
  - `n8n/.env.example` - 環境変数テンプレート
  - `n8n/README.md` - n8nセットアップガイド
  - `n8n/.gitignore` - Git除外設定

- **機能**:
  - Docker Composeによるセルフホスト
  - Bearer Token認証
  - HTTPS対応（Cloudflare Tunnel用設定）
  - Google Calendar OAuth統合
  - 2つのWebhookワークフロー:
    - `/webhook/calendar-create` - 予定作成
    - `/webhook/calendar-list` - 予定一覧取得

##### Agents Kit実装
- **技術スタック**:
  - TypeScript (strict mode)
  - OpenRouter API（OpenAI SDK使用）
  - Zod (スキーマバリデーション)
  - Node.js 20+ (ESModules)

- **ファイル構成**:
```
agents-kit/
├── src/
│   ├── types.ts              # 型定義・Zodスキーマ
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

- **実装機能**:
  - ✅ `createCalendarEvent` Tool - n8n経由で予定作成
  - ✅ `listCalendarEvents` Tool - n8n経由で予定取得
  - ✅ CalendarAgent - Claude Tool Calling実装
  - ✅ 対話型チャットインターフェース
  - ✅ テストスクリプト（5つのテストケース）
  - ✅ 会話履歴管理

- **使用モデル**: `openai/gpt-4o-mini` (OpenRouter経由)

##### セキュリティ
- Bearer Token認証（n8n Webhook）
- n8n Basic認証（管理画面）
- 環境変数による秘密情報管理
- OAuth 2.0（Google Calendar）

#### 3. ドキュメント ✅
- `docs/DESIGN_v0.md` - 元の設計書
- `docs/SETUP_GUIDE.md` - 包括的なセットアップガイド
- `n8n/README.md` - n8n特化ガイド
- `agents-kit/README.md` - Agents Kit APIドキュメント

### 技術的な特徴

#### n8nの利点
1. **外部API管理の一元化**
   - OAuth認証をn8nで管理
   - APIエンドポイントの抽象化
   - エラーハンドリングの統一

2. **視覚的なワークフロー**
   - ノーコード/ローコードで拡張可能
   - デバッグが容易
   - 非エンジニアでも管理可能

3. **拡張性**
   - 400+の統合サービス
   - カスタムノードの追加
   - 複雑なデータ変換

#### Agents Kit（Claude）の利点
1. **自然言語理解**
   - ユーザー発話からIntent抽出
   - 日時の自動解釈
   - マルチターン対話

2. **Tool Calling**
   - 適切なタイミングでツール呼び出し
   - パラメータの自動推論
   - エラーリカバリー

3. **音声対応**
   - 簡潔な応答生成（1-3文）
   - 絵文字なし（音声出力向け）
   - 自然な日本語

### 現在のステータス

**v0.3 実装・動作確認完了 ✅ (2025-12-06)**

**動作確認済み項目**:
- ✅ n8n Dockerコンテナ起動
- ✅ Google Calendar OAuth認証設定
- ✅ n8nワークフロー（calendar-create, calendar-list）JSONインポート & Active化
- ✅ Bearer Token認証動作確認
- ✅ curl経由でWebhook直接テスト成功
- ✅ **Agent経由でカレンダー一覧取得成功**（`npm run chat`）
- ✅ 対話型チャット動作確認

**確認されたイベント取得例**:
```
You> 来週の予定を教えて

Assistant> 12月8日 19:30〜22:00　忘年会
12月10日 14:00〜15:00　テストイベント
12月10日 20:00〜22:00　忘年会
12月13日 17:00〜20:15　同期と飲むかも？
```

**実装中に修正した技術的な問題**:
1. IFノードの`operation`を`"equals"`→`"equal"`に修正（n8n互換性）
2. Respond Successノードで`$json`→`$items()`に変更（複数イベント配列対応）
3. TypeScriptコードで`{json: {...}}`形式のn8nレスポンス処理に対応
4. Bearer Token認証の統一（agents-kit `.env`とn8n設定）
5. デバッグログ追加（レスポンス確認用）
6. OpenRouter無料モデルのレート制限回避（`gpt-4o-mini`に変更推奨）

### 未実装（今後の拡張）

- Slack API統合（n8n Slackノード + Agents Kit Tool）
- Gmail送信機能
- 本番環境デプロイ（HTTPS化）
- マルチユーザー対応
- 音声I/Oクライアント

### Git情報
- **ブランチ**: `claude/design-ai-agent-015vQxgpMh8gDf9AoE9g2Xd1`
- **最終更新**: n8n + Agents Kit PoC実装（v0.3）

### 両アーキテクチャの比較

| 項目 | Lambda (v0.1-v0.2) | n8n + Agents Kit (v0.3) |
|------|-------------------|------------------------|
| **デプロイ** | AWS CDK | Docker (セルフホスト) |
| **外部API** | Lambda内で直接呼び出し | n8nで管理 |
| **認証管理** | Lambda環境変数 | n8n Credentials |
| **拡張性** | コード変更必要 | GUIでノード追加 |
| **コスト** | Lambda実行時間課金 | サーバー固定費 |
| **適用場面** | 本番環境、スケール | PoC、迅速なプロトタイプ |

両方のアプローチを保持し、用途に応じて選択可能。

---

**最終更新**: 2025-12-06
