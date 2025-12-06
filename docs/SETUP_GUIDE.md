# n8n + Agents Kit PoC セットアップガイド

## 概要

このガイドでは、n8nとAgents Kitを使用したカレンダー管理AIエージェントのセットアップ手順を説明します。

## アーキテクチャ

```
Agent (Anthropic Claude)
        │  HTTP POST (JSON)
        ▼
n8n (セルフホスト)
  - Webhook ノード (POST)
  - Google Calendar ノード
  - 認証・変換処理
        │ JSON response
        ▼
Agent (会話処理)
```

## セットアップステップ

### ステップ1: n8nのセットアップ

#### 1-1. Docker環境の準備

```bash
cd n8n
cp .env.example .env
```

#### 1-2. 環境変数の設定

`.env` ファイルを編集:

```bash
# n8n管理画面のパスワード
N8N_BASIC_AUTH_PASSWORD=your_secure_password

# 暗号化キー（新規生成）
openssl rand -hex 32
# → 出力をN8N_ENCRYPTION_KEYにコピー

# Webhook認証用Bearer Token（新規生成）
openssl rand -base64 32
# → 出力をWEBHOOK_BEARER_TOKENにコピー
```

#### 1-3. n8nの起動

```bash
docker-compose up -d

# ログ確認
docker-compose logs -f n8n
```

#### 1-4. n8n管理画面へアクセス

1. ブラウザで `http://localhost:5678` を開く
2. ユーザー名: `admin`
3. パスワード: `.env` の `N8N_BASIC_AUTH_PASSWORD`

### ステップ2: Google Calendar OAuth設定

**全体の流れ**: GCPで「アプリの登録」をして、n8nで「ブラウザから許可」するだけです。

#### 2-1. GCPでアプリを登録（5分で完了）

**やること**: GoogleにあなたのアプリがOAuthを使うことを伝える

1. [Google Cloud Console](https://console.cloud.google.com/) へアクセス
2. **プロジェクトを作成**（初めての場合）:
   - 左上のプロジェクト名 > **新しいプロジェクト** をクリック
   - プロジェクト名: `n8n-calendar`（任意の名前でOK）
   - **作成** をクリック

3. **Google Calendar APIを有効化**:
   - 左メニュー > **APIとサービス** > **ライブラリ**
   - 検索ボックスに「calendar」と入力
   - **Google Calendar API** をクリック > **有効にする**

4. **OAuth認証情報を作成**:
   - 左メニュー > **APIとサービス** > **認証情報**
   - 上部の **+ 認証情報を作成** > **OAuth クライアント ID**

   **初回のみ**: 「同意画面の構成」が必要と表示された場合:
   - **同意画面を構成** をクリック
   - User Type: **外部** を選択 > **作成**
   - アプリ名: `n8n Calendar` > メールアドレスを入力
   - **保存して次へ** を3回クリック > **ダッシュボードに戻る**
   - 再度 **認証情報** タブへ移動

5. **OAuth クライアント ID の作成（続き）**:
   - アプリケーションの種類: **ウェブアプリケーション**
   - 名前: `n8n-calendar-integration`
   - **承認済みのリダイレクト URI** の **+ URI を追加** をクリック
   - 以下を入力: `http://localhost:5678/rest/oauth2-credential/callback`
   - **作成** をクリック

6. **Client ID と Client Secret をメモ**:
   - ポップアップに表示された値をコピー（後で使います）

#### 2-2. n8nでブラウザから「許可」する（2分で完了）

**やること**: ブラウザでGoogleアカウントにログインして「カレンダーへのアクセスを許可」するだけ

1. n8n管理画面 (`http://localhost:5678`) を開く
2. 左サイドバーの **Credentials** をクリック
3. **+ New Credential** をクリック
4. 検索ボックスに「google」と入力
5. **Google Calendar OAuth2 API** を選択
6. 以下を入力:
   - **Credential Name**: `Google Calendar`（任意の名前）
   - **Client ID**: 先ほどGCPでコピーした値を貼り付け
   - **Client Secret**: 先ほどGCPでコピーした値を貼り付け
7. **Sign in with Google** ボタンをクリック
   - → Googleログイン画面が開く
   - → Googleアカウントでログイン
   - → 「n8n Calendar がカレンダーへのアクセスを求めています」という画面が表示される
   - → **許可** をクリック
8. n8nの画面に戻ったら **Save** をクリック

**これで完了！** n8nがあなたのGoogleカレンダーにアクセスできるようになりました。

### ステップ3: n8nワークフローの作成

#### 3-1. calendar-create ワークフロー

1. n8n管理画面で **Workflows** > **Add Workflow** をクリック
2. ワークフロー名を `Calendar Create` に設定

**ノード1: Webhook**
1. **+** ボタン > **On app event** > **Webhook** を選択
2. 設定:
   - **HTTP Method**: `POST`
   - **Path**: `calendar-create`
   - **Authentication**: `None` (Bearer TokenはIFノードでチェック)
   - **Respond**: `Using 'Respond to Webhook' Node`
3. **Execute Node** をクリックして Webhook URL を確認

**ノード2: IF (認証チェック)**
1. Webhookノードの右端から線を引いて **+** > **IF** を選択
2. 設定:
   - **Conditions**: `String`
   - **Value 1**: `{{ $json.headers.authorization }}`
   - **Operation**: `Equal`
   - **Value 2**: `Bearer YOUR_BEARER_TOKEN_HERE` (`.env`の値)
3. **True** ブランチに進む

**ノード3: Google Calendar (Create Event)**
1. IFノードの **true** 出力から線を引いて **+** を選択
2. "Google Calendar" を検索して選択
3. 設定:
   - **Credential to connect with**: 先ほど作成した `Google Calendar`
   - **Resource**: `Event`
   - **Operation**: `Create`
   - **Calendar**: プライマリカレンダーを選択
   - **Start**: `{{ $json.body.start }}`
   - **End**: `{{ $json.body.end }}`
   - **Event Name**: `{{ $json.body.title }}`
   - **Description**: `{{ $json.body.description }}`
   - **Location**: `{{ $json.body.location }}`

**ノード4: Respond to Webhook (成功)**
1. Google Calendarノードから線を引いて **Respond to Webhook** を選択
2. 設定:
   - **Response Body**: `JSON`
   - **JSON**:
```json
{
  "success": true,
  "eventId": "={{ $json.id }}",
  "start": "={{ $json.start.dateTime }}",
  "end": "={{ $json.end.dateTime }}"
}
```

**ノード5: Respond to Webhook (失敗)**
1. IFノードの **false** 出力から線を引いて **Respond to Webhook** を選択
2. 設定:
   - **Response Code**: `401`
   - **Response Body**: `JSON`
   - **JSON**:
```json
{
  "success": false,
  "error": "Unauthorized: Invalid Bearer Token"
}
```

3. ワークフローを **Save** して **Activate** する

#### 3-2. calendar-list ワークフロー

同様の手順で以下を作成:

1. 新しいワークフロー `Calendar List` を作成

**Webhook ノード**:
- Path: `calendar-list`
- その他は同じ

**IF ノード**:
- 同じ認証チェック

**Google Calendar ノード**:
- Operation: `Get All`
- Calendar: プライマリカレンダー
- Start: `={{ $json.body.dateRangeStart }}`
- End: `={{ $json.body.dateRangeEnd }}`
- Return All: `true`

**Respond to Webhook (成功)**:
```json
{
  "success": true,
  "events": "={{ $json }}"
}
```

**Respond to Webhook (失敗)**:
- 同じ

### ステップ4: Webhook URLの確認

各ワークフローのWebhookノードをクリックして **Test URL** または **Production URL** をコピー:

- `http://localhost:5678/webhook/calendar-create`
- `http://localhost:5678/webhook/calendar-list`

### ステップ5: Agents Kitのセットアップ

#### 5-1. 依存関係のインストール

```bash
cd ../agents-kit
npm install
```

#### 5-2. 環境変数の設定

```bash
cp .env.example .env
```

`.env` ファイルを編集:

```env
# OpenRouter API Key（https://openrouter.ai/から取得）
OPENROUTER_API_KEY=sk-or-xxxxx

# n8n Webhook Configuration
N8N_WEBHOOK_BASE_URL=http://localhost:5678/webhook
N8N_BEARER_TOKEN=<n8nの.envと同じ値>

# Model Configuration (OpenRouter)
MODEL=openai/gpt-4o-mini
```

**重要**:
- `N8N_BEARER_TOKEN` は n8n の `.env` で設定した値と **完全に一致** させてください。
- OpenRouter API Keyは https://openrouter.ai/ で取得してください（無料クレジット付き）。

### ステップ6: 動作確認

#### 6-1. n8n Webhookの直接テスト

```bash
# 環境変数を読み込み
export BEARER_TOKEN="your_bearer_token_here"

# カレンダー作成テスト
curl -X POST http://localhost:5678/webhook/calendar-create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BEARER_TOKEN" \
  -d '{
    "title": "テストイベント",
    "start": "2025-12-10T14:00:00+09:00",
    "end": "2025-12-10T15:00:00+09:00",
    "description": "n8n動作確認"
  }'
```

期待される出力:
```json
{
  "success": true,
  "eventId": "abc123...",
  "start": "2025-12-10T14:00:00+09:00",
  "end": "2025-12-10T15:00:00+09:00"
}
```

```bash
# カレンダー一覧テスト
curl -X POST http://localhost:5678/webhook/calendar-list \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BEARER_TOKEN" \
  -d '{
    "dateRangeStart": "2025-12-01T00:00:00+09:00",
    "dateRangeEnd": "2025-12-31T23:59:59+09:00"
  }'
```

#### 6-2. Agents Kit テスト

```bash
cd agents-kit

# 定義済みテストケースを実行
npm run test
```

期待される動作:
1. エージェントが予定追加のテキストを理解
2. `createCalendarEvent` ツールを呼び出し
3. n8n経由でGoogle Calendarに追加
4. 成功メッセージを返す

#### 6-3. 対話モードでテスト

```bash
npm run chat
```

試してみるフレーズ:
- `明日の午後2時から3時までミーティングを追加して`
- `今週の予定を教えて`
- `12月15日の午前9時から朝会を追加`

### ステップ7: Google Calendarで確認

1. [Google Calendar](https://calendar.google.com/) を開く
2. 追加した予定が表示されることを確認

## トラブルシューティング

### n8nが起動しない

```bash
# コンテナのログを確認
docker-compose logs -f n8n

# コンテナを再起動
docker-compose restart n8n

# 完全に再構築
docker-compose down
docker-compose up -d
```

### 401 Unauthorized エラー

**原因**: Bearer Tokenが一致していない

**解決方法**:
1. n8n の `.env` の `WEBHOOK_BEARER_TOKEN` を確認
2. agents-kit の `.env` の `N8N_BEARER_TOKEN` を確認
3. 両方が完全に一致しているか確認
4. n8n のIFノードの条件を確認（`Bearer ` プレフィックス付き）

### Google Calendar API エラー

**原因1**: OAuth認証が完了していない

**解決方法**:
1. n8n管理画面 > Credentials で認証状態を確認
2. 再度 "Connect my account" をクリック

**原因2**: Calendar APIが有効化されていない

**解決方法**:
1. Google Cloud Console へアクセス
2. APIs & Services > Library
3. "Google Calendar API" を検索して有効化

### エージェントがツールを呼ばない

**原因**: 入力が曖昧

**解決方法**:
- より具体的な指示を出す（例: 「予定を追加して」→「明日の10時から会議を追加して」）
- 対話モードで会話履歴を確認（`/history`）

### TypeScriptビルドエラー

```bash
# node_modulesを削除して再インストール
cd agents-kit
rm -rf node_modules package-lock.json
npm install
npm run build
```

## 次のステップ

### 機能拡張

1. **Gmail送信機能**
   - n8n に Gmail ノードを追加
   - Agents Kit に `sendEmail` ツールを実装

2. **Slack通知機能**
   - n8n に Slack ノードを追加
   - Agents Kit に `postSlack` ツールを実装

3. **予定の編集・削除**
   - `updateCalendarEvent` ツール
   - `deleteCalendarEvent` ツール

### 本番環境へのデプロイ

1. **HTTPS化**（Cloudflare Tunnel推奨）
2. **環境変数の暗号化**（AWS Secrets Manager等）
3. **ロギング・モニタリング**
4. **レート制限の実装**

## 参考資料

- [n8n Documentation](https://docs.n8n.io/)
- [Anthropic Claude API](https://docs.anthropic.com/)
- [Google Calendar API](https://developers.google.com/calendar)
- [DESIGN_v0.md](./DESIGN_v0.md) - 設計書
