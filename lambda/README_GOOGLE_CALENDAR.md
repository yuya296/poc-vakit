# Google Calendar API 連携ガイド

## 概要

VAKITエージェントがGoogleカレンダーと連携し、予定の確認・追加・編集が可能になります。

## セットアップ手順

### 1. Google Cloud Consoleの設定

#### 1.1 プロジェクトの作成（未作成の場合）
1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. 新しいプロジェクトを作成

#### 1.2 Google Calendar APIの有効化
1. 「APIとサービス」→「ライブラリ」
2. "Google Calendar API" を検索
3. 「有効にする」をクリック

#### 1.3 OAuth 2.0 認証情報の作成
1. 「APIとサービス」→「認証情報」
2. 「認証情報を作成」→「OAuth クライアント ID」
3. アプリケーションの種類: **デスクトップアプリ**（または「ウェブアプリケーション」）
4. 名前: 任意（例: "VAKIT Agent"）
5. 承認済みのリダイレクトURIに以下を追加:
   ```
   http://localhost:3000/oauth/callback
   ```
6. 「作成」をクリック
7. **Client ID** と **Client Secret** をメモ

#### 1.4 OAuth同意画面の設定
1. 「OAuth同意画面」タブ
2. User Type: **外部**（個人用Googleアカウントの場合）
3. アプリ名、ユーザーサポートメール、デベロッパー連絡先を入力
4. スコープの追加:
   - `https://www.googleapis.com/auth/calendar.events`（イベント管理）
   - または `https://www.googleapis.com/auth/calendar`（フルアクセス）
5. テストユーザーに自分のGmailアドレスを追加
6. 公開ステータスは「テスト」のままでOK（個人利用のため）

### 2. OAuth認証の実行（ローカルで一度だけ）

#### 2.1 Client IDとSecretを.envに設定

`lambda/.env`ファイルを編集:

```bash
# OpenRouter設定（既存）
OPENROUTER_API_KEY=your-existing-key
MODEL=openai/gpt-oss-120b
DEFAULT_USER_ID=yuya

# Google Calendar API 認証情報
GOOGLE_CLIENT_ID=406146365928-0mv2ig9nstc69g2sl64ld3lsh85l30u4.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxx
# GOOGLE_REFRESH_TOKEN=（後で追加）
```

#### 2.2 OAuth認証スクリプトの実行

```bash
cd lambda
npx ts-node scripts/google-oauth-setup.ts
```

実行すると:
1. ブラウザが自動で開き、Googleログイン画面が表示
2. Googleアカウントでログイン
3. VAKITエージェントにカレンダーへのアクセス許可を承認
4. ターミナルに **GOOGLE_REFRESH_TOKEN** が表示される

#### 2.3 Refresh Tokenを.envに保存

表示されたrefresh tokenを`lambda/.env`に追加:

```bash
GOOGLE_REFRESH_TOKEN=1//0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 3. デプロイ

#### 3.1 Lambda関数のビルド

```bash
cd lambda
npm run build
```

#### 3.2 CDKデプロイ

```bash
cd ../cdk
npm run deploy
```

デプロイスクリプトが自動的に:
- `lambda/.env`から環境変数を読み込み
- Google認証情報の有無をチェック
- Lambda関数に環境変数を設定

### 4. 動作確認

#### 4.1 予定の確認

```bash
curl -X POST "$API_ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_GATEWAY_KEY" \
  -d '{"text": "今日の予定は？", "user_id": "yuya"}'
```

期待されるレスポンス:
```json
{
  "ok": true,
  "intent": "QUERY_SCHEDULE",
  "reply": "今日の予定は2件です。朝会、ランチミーティング。",
  "meta": {
    "tool_calls": [
      {
        "tool": "google_calendar_list",
        "result": { "events": [...] }
      }
    ]
  }
}
```

#### 4.2 予定の追加

```bash
curl -X POST "$API_ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_GATEWAY_KEY" \
  -d '{"text": "明日の14時にミーティングを追加して", "user_id": "yuya"}'
```

#### 4.3 予定の編集

```bash
curl -X POST "$API_ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_GATEWAY_KEY" \
  -d '{"text": "明日のミーティングを15時に変更して", "user_id": "yuya"}'
```

## トラブルシューティング

### エラー: "Google Calendar認証が失敗しました"

**原因**: Refresh tokenが無効化されている可能性があります。

**対処法**:
1. OAuth認証を再実行
   ```bash
   cd lambda
   npx ts-node scripts/google-oauth-setup.ts
   ```
2. 新しいrefresh tokenを`.env`に保存
3. 再デプロイ
   ```bash
   cd cdk && npm run deploy
   ```

### エラー: "該当する予定が見つかりませんでした"

**原因**: 検索キーワードや日時が正確でない可能性があります。

**対処法**:
- より具体的なキーワードや日時を指定
- カレンダーに実際に予定が存在するか確認

### Refresh tokenが6ヶ月で無効化される

Googleは非アクティブなrefresh tokenを6ヶ月後に無効化します。

**対処法**:
- 定期的（6ヶ月以内に1回以上）にVAKITエージェントでカレンダー操作を実行
- または、再度OAuth認証を実行してrefresh tokenを更新

## セキュリティ注意事項

### Refresh Tokenの管理

- **Refresh tokenは非常に機密性の高い情報です**
- Githubなどの公開リポジトリにコミットしないこと
- `.gitignore`に`.env`が含まれていることを確認
- 本番環境では AWS Secrets Manager の使用を推奨

### Lambda環境変数の可視性

- Lambda環境変数はAWSコンソールで閲覧可能
- IAMアクセス権限を適切に設定すること
- より高いセキュリティが必要な場合は AWS Secrets Manager を利用

## API使用制限

Google Calendar APIの制限:
- **無料枠**: 1,000,000 クエリ/日
- VAKITの個人利用では十分な範囲内

## 関連ファイル

- `lambda/src/services/googleCalendar.ts` - Calendar API統合
- `lambda/src/commands/querySchedule.ts` - 予定確認
- `lambda/src/commands/addEvent.ts` - 予定追加
- `lambda/src/commands/updateEvent.ts` - 予定編集
- `lambda/scripts/google-oauth-setup.ts` - OAuth認証スクリプト
