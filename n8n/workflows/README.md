# n8n ワークフローのインポート手順

このディレクトリには、n8nで使用するワークフロー定義（JSON）が含まれています。

## ワークフロー一覧

- **calendar-create.json** - Google Calendarに予定を追加
- **calendar-list.json** - Google Calendarの予定一覧を取得

## インポート方法

### 1. n8n管理画面を開く

```bash
# n8nを起動していない場合
cd ../
docker-compose up -d

# ブラウザで開く
open http://localhost:5678
```

### 2. ワークフローをインポート

#### calendar-create のインポート

1. n8n管理画面で **Workflows** タブを開く
2. 右上の **⋮** (メニュー) > **Import from File** をクリック
3. `n8n/workflows/calendar-create.json` を選択
4. ワークフローが読み込まれる

#### Bearer Token の設定

1. **Check Auth** ノードをクリック
2. `value2` フィールドの `YOUR_BEARER_TOKEN_HERE` を実際のトークンに変更
   - 例: `Bearer abc123xyz...`
3. **Save** をクリック

#### Google Calendar Credential の設定

1. **Google Calendar** ノードをクリック
2. **Credential to connect with** で設定済みの Google Calendar 認証情報を選択
   - まだ作成していない場合は、[SETUP_GUIDE.md](../docs/SETUP_GUIDE.md#ステップ2-google-calendar-oauth設定) を参照
3. **Save** をクリック

#### ワークフローを有効化

1. 右上の **Inactive** トグルをクリックして **Active** にする
2. Webhook URLが生成される（例: `http://localhost:5678/webhook/calendar-create`）

---

#### calendar-list のインポート

同じ手順で `calendar-list.json` をインポート:

1. **Import from File** > `calendar-list.json` を選択
2. **Check Auth** ノードで Bearer Token を設定
3. **Google Calendar** ノードで認証情報を選択
4. ワークフローを **Active** にする

## 動作確認

### calendar-create のテスト

```bash
export BEARER_TOKEN="your_bearer_token_here"

curl -X POST http://localhost:5678/webhook/calendar-create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BEARER_TOKEN" \
  -d '{
    "title": "テストイベント",
    "start": "2025-12-10T14:00:00+09:00",
    "end": "2025-12-10T15:00:00+09:00",
    "description": "n8n経由のテスト"
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

### calendar-list のテスト

```bash
curl -X POST http://localhost:5678/webhook/calendar-list \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BEARER_TOKEN" \
  -d '{
    "dateRangeStart": "2025-12-01T00:00:00+09:00",
    "dateRangeEnd": "2025-12-31T23:59:59+09:00"
  }'
```

## トラブルシューティング

### インポートエラー

**エラー**: "Invalid workflow format"

**解決方法**:
- JSONファイルが正しくダウンロードされているか確認
- n8nのバージョンが古い場合は更新

### 401 Unauthorized

**原因**: Bearer Token が一致していない

**解決方法**:
1. `Check Auth` ノードを開く
2. `value2` フィールドの値を確認
3. `.env` の `WEBHOOK_BEARER_TOKEN` と一致しているか確認
4. 先頭に `Bearer ` （スペース含む）が付いているか確認

### Google Calendar API エラー

**エラー**: "Invalid credentials"

**解決方法**:
1. n8n管理画面 > **Credentials** で認証情報を確認
2. **Reconnect** をクリックしてブラウザから再認証
3. Google Calendar API が有効化されているか GCP で確認

### Webhook が動作しない

**原因**: ワークフローが Inactive

**解決方法**:
1. n8n管理画面でワークフローを開く
2. 右上のトグルを **Active** にする
3. Webhook URL が表示されることを確認

## ワークフローのカスタマイズ

### Bearer Token をハードコードしたくない場合

環境変数を使用できます:

1. n8n の `.env` に追加:
   ```env
   WEBHOOK_BEARER_TOKEN=your_bearer_token_here
   ```

2. `Check Auth` ノードの `value2` を以下に変更:
   ```
   Bearer {{ $env.WEBHOOK_BEARER_TOKEN }}
   ```

### 複数カレンダーに対応

`Google Calendar` ノードの `calendarId` を変更:

```json
"calendarId": {
  "__rl": true,
  "value": "other-calendar-id@group.calendar.google.com",
  "mode": "id"
}
```

### エラーハンドリングの追加

1. `Google Calendar` ノードの後に `IF` ノードを追加
2. エラーの場合は `Respond Error` ノードで適切なメッセージを返す

## 参考資料

- [n8n Workflow Documentation](https://docs.n8n.io/workflows/)
- [Google Calendar Node](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.googlecalendar/)
- [Webhook Node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/)
