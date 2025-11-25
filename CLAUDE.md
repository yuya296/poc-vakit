# POC-VAKIT 開発進捗

## プロジェクト概要
音声対応パーソナルAIエージェント（VAKIT: Voice-Activated Knowledge & Integration Tool）のプロトタイプ開発

## 開発フェーズ: v0.2 (Google Calendar連携実装完了)

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

### Google Calendar連携実装 ✅ (v0.2)

#### 実装内容

**新規ファイル**:
- `lambda/src/services/googleCalendar.ts` - Google Calendar API統合サービス
  - `listEvents()` - 予定一覧取得
  - `createEvent()` - 予定追加
  - `updateEvent()` - 予定編集
  - `deleteEvent()` - 予定削除
  - `searchEvents()` - キーワード検索
- `lambda/src/commands/updateEvent.ts` - UPDATE_EVENT Intent実装
- `lambda/scripts/google-oauth-setup.ts` - OAuth認証セットアップスクリプト
- `lambda/README_GOOGLE_CALENDAR.md` - セットアップガイド

**更新ファイル**:
- `lambda/src/types.ts` - UPDATE_EVENT Intent型定義追加
- `lambda/src/commands/querySchedule.ts` - Google Calendar API統合
- `lambda/src/commands/addEvent.ts` - Google Calendar API統合
- `lambda/src/config/intents.ts` - UPDATE_EVENT有効化
- `lambda/src/registry.ts` - UpdateEventCommand登録
- `cdk/lib/vakit-stack.ts` - Google認証情報の環境変数追加、タイムアウト45秒に延長
- `cdk/bin/app.ts` - Google認証情報の環境変数読み込み
- `cdk/deploy.sh` - Google認証情報のチェック追加

**依存関係**:
- `googleapis` - Google公式Node.jsクライアント

#### OAuth認証フロー

1. Google Cloud Consoleで OAuth 2.0 Client ID作成
2. ローカルで`google-oauth-setup.ts`を実行
3. ブラウザでGoogle認証を完了
4. refresh tokenを取得して`lambda/.env`に保存
5. CDKデプロイでLambda環境変数に設定

**OAuth Scope**: `https://www.googleapis.com/auth/calendar.readonly`
- 全カレンダーリストの読み取り権限
- イベント読み取り権限

#### 環境変数

`lambda/.env`:
```bash
# 既存
OPENROUTER_API_KEY=...
MODEL=openai/gpt-oss-120b
DEFAULT_USER_ID=yuya

# 新規追加
GOOGLE_CLIENT_ID=406146365928-0mv2ig9nstc69g2sl64ld3lsh85l30u4.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
GOOGLE_REFRESH_TOKEN=1//0xxxxx
```

#### サポート機能

1. **予定の確認** (QUERY_SCHEDULE) ✅
   - **所有カレンダー対応**: デフォルトで所有カレンダーのみから取得
   - 全カレンダー統合取得機能（2025-11-25実装）
   - 日時範囲指定で予定を取得
   - LLMによる自然な応答生成（template不使用）
   - 音声出力向けに1-3文で簡潔に要約

2. **予定の追加** (ADD_EVENT)
   - タイトル、開始・終了日時、場所を指定
   - 日時の自然言語理解（LLMによるIntent分類で実現）

3. **予定の編集** (UPDATE_EVENT) - 新機能
   - イベントID指定または日時・キーワードで検索
   - タイトル、日時、場所などを部分更新可能
   - 複数マッチ時はユーザーに再確認

#### セキュリティ

- **Refresh token**: Lambda環境変数に保存（個人用のため許容）
- 本番環境では AWS Secrets Manager 推奨
- OAuth同意画面は「テスト」ステータス（個人利用）

#### 技術的改善点

- **マルチカレンダー対応** (2025-11-25): `calendar.calendarList.list()` API使用
  - **デフォルト**: 所有カレンダー（accessRole="owner"）のみ
  - オプションで全カレンダーから取得可能
  - 開始時刻でソート
  - 個別カレンダーエラー時も継続処理
- **DateTime精度向上** (2025-11-25):
  - システムプロンプトに詳細な日時コンテキスト追加（UTC/JST両方表示）
  - 具体的な計算例を追加（「明日」「今週」「来週」の計算方法）
  - 自動修正機能 (`sanitizeDateTime`)：`++09:00` → `+09:00` など
  - 正規表現による厳密なバリデーション
- **環境変数読み込み順序修正**: `dotenv.config()` を全importより前に実行
- Lambda タイムアウト: 30秒 → 45秒（外部API呼び出しのため）
- グローバルスコープでOAuth2クライアントをキャッシュ（Lambdaコンテナ再利用）
- エラーハンドリング: 401エラー時にrefresh token無効化を検出

### 現在のステータス

**本番稼働中**: AWS Lambda + API Gateway でデプロイ済み、動作確認完了

**実装済み**:
- ✅ Google Calendar API連携（予定確認・追加・編集）
- ✅ UPDATE_EVENT Intent（予定編集機能）
- ✅ OAuth 2.0認証フロー

**未実装**:
- Slack API実装（メッセージ送信・DM・要約）
- マルチターン対話（セッション管理）
- 音声I/Oクライアント

### Git情報
- **ブランチ**: `claude/design-ai-agent-015vQxgpMh8gDf9AoE9g2Xd1`
- **最終更新**: Google Calendar連携実装（v0.2）

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

**最終更新**: 2025-11-25

## v0.2.1 アップデート (2025-11-25)

### マルチカレンダー対応実装 ✅

**解決した課題**:
1. ❌ **OAuth Scope不足**: `calendar.events` → `calendar.readonly` に変更
2. ✅ **全カレンダー読み取り**: 7カレンダーから統合取得成功
3. ✅ **DateTime検証強化**: 正規表現による厳密チェック
4. ✅ **自然な応答**: LLMによる要約生成

**テスト結果**:
```bash
$ npm run test:local
# Input: "直近1週間の予定を教えて"
#
# [GoogleCalendar] Found 7 calendars
# [GoogleCalendar] Found 34 total events
#
# Reply: "来週の予定は以下の通りです。
#   - 11月12日（水）14:00に「EP:Mare-2nd」。
#   - 11月18日（火）は多くの予定があり、09:00に「ころん色校データ入稿」、
#     続いて10:00に「いばらき原子力防災」、11:00に「推し旅task」..."
```

**変更ファイル**:
- `lambda/scripts/google-oauth-setup.ts`: OAuth scope更新
- `lambda/.env`: 新しいrefresh token (calendar.readonly scope)
- `lambda/test.ts`: 環境変数読み込み順序修正
- `lambda/chat.ts`: 環境変数読み込み順序修正
- `lambda/src/services/googleCalendar.ts`: マルチカレンダー対応
- `lambda/src/classifier.ts`: DateTime精度向上（自動修正、詳細な例）

## 次に必要な作業

### AWS Lambda へのデプロイ

ローカルでの動作確認が完了したため、次はAWSへデプロイ：

1. **Lambda関数をビルド**:
   ```bash
   cd lambda
   npm run build
   ```

2. **CDKデプロイ**:
   ```bash
   cd ../cdk
   ./deploy.sh
   ```
   ※ Google認証情報が環境変数に設定されているか自動チェック

3. **本番環境での動作確認**:
   ```bash
   curl -X POST "https://ti261jguu2.execute-api.ap-northeast-1.amazonaws.com/v1/agent" \
     -H "Content-Type: application/json" \
     -H "x-api-key: AV2AvH3bdb5kZTIIL6y1g1HOMAQDIr4u5fMplb6k" \
     -d '{"text": "今週の予定は？", "user_id": "yuya"}'
   ```

詳細は `lambda/README_GOOGLE_CALENDAR.md` を参照してください。
