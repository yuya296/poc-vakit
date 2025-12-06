# n8n セットアップガイド

## 前提条件

- Docker & Docker Compose がインストール済み
- (オプション) ドメイン名とHTTPS証明書（本番環境用）

## セットアップ手順

### 1. 環境変数の設定

```bash
cd n8n
cp .env.example .env
```

`.env` ファイルを編集して以下を設定:

- `N8N_BASIC_AUTH_PASSWORD`: n8n管理画面のパスワード
- `N8N_ENCRYPTION_KEY`: 暗号化キー（生成方法は下記参照）
- `WEBHOOK_BEARER_TOKEN`: Agent認証用トークン

#### 暗号化キーの生成

```bash
openssl rand -hex 32
```

#### Bearer Tokenの生成

```bash
openssl rand -base64 32
```

### 2. n8nの起動

```bash
docker-compose up -d
```

### 3. n8n管理画面へアクセス

ブラウザで `http://localhost:5678` を開く

- ユーザー名: `admin` (デフォルト)
- パスワード: `.env` で設定した値

### 4. Google Calendar OAuth設定

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクトを作成または選択
3. **APIs & Services** > **Credentials** へ移動
4. **Create Credentials** > **OAuth client ID** を選択
5. Application type: **Web application**
6. Authorized redirect URIs に追加:
   - `http://localhost:5678/rest/oauth2-credential/callback`
   - (本番環境の場合は `https://your-domain.com/rest/oauth2-credential/callback`)
7. Client ID と Client Secret をコピー
8. n8n管理画面で **Credentials** > **Create New** > **Google** を選択
9. Client ID と Client Secret を入力して保存

### 5. Webhookワークフローの作成

#### calendar-create ワークフロー

1. n8n管理画面で **New Workflow** を作成
2. 以下のノードを追加:

**Webhook ノード**:
- HTTP Method: `POST`
- Path: `calendar-create`
- Authentication: `Header Auth`
- Header Name: `Authorization`
- Header Value: `Bearer ${WEBHOOK_BEARER_TOKEN}` (.envの値を使用)

**IF ノード** (認証チェック):
- Condition: `{{ $json.headers.authorization }}` equals `Bearer YOUR_TOKEN_HERE`

**Google Calendar ノード** (Create Event):
- Calendar: プライマリカレンダー選択
- Event Title: `{{ $json.body.title }}`
- Start: `{{ $json.body.start }}`
- End: `{{ $json.body.end || $json.body.start }}`
- Description: `{{ $json.body.description }}`

**Respond to Webhook ノード**:
```json
{
  "success": true,
  "eventId": "{{ $json.id }}",
  "start": "{{ $json.start }}",
  "end": "{{ $json.end }}"
}
```

3. Workflow を保存して **Activate** する

#### calendar-list ワークフロー

同様の手順で以下を作成:

**Webhook ノード**:
- Path: `calendar-list`
- 認証設定は同じ

**Google Calendar ノード** (List Events):
- Calendar: プライマリカレンダー
- Start: `{{ $json.body.dateRangeStart }}`
- End: `{{ $json.body.dateRangeEnd }}`

**Respond to Webhook**:
```json
{
  "events": "{{ $json }}"
}
```

### 6. Webhook URLの確認

各ワークフローのWebhookノードをクリックして **Production URL** をコピー

例:
- `http://localhost:5678/webhook/calendar-create`
- `http://localhost:5678/webhook/calendar-list`

### 7. 動作テスト

```bash
# Bearer Tokenを環境変数に設定
export BEARER_TOKEN="your_bearer_token_here"

# カレンダー作成テスト
curl -X POST http://localhost:5678/webhook/calendar-create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BEARER_TOKEN" \
  -d '{
    "title": "テストミーティング",
    "start": "2025-12-07T10:00:00+09:00",
    "end": "2025-12-07T11:00:00+09:00",
    "description": "n8n経由のテスト"
  }'

# カレンダー一覧テスト
curl -X POST http://localhost:5678/webhook/calendar-list \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BEARER_TOKEN" \
  -d '{
    "dateRangeStart": "2025-12-06T00:00:00+09:00",
    "dateRangeEnd": "2025-12-08T23:59:59+09:00"
  }'
```

## 本番環境（HTTPS）

### Cloudflare Tunnelを使用する場合

1. Cloudflare アカウントを作成
2. `cloudflared` をインストール
3. トンネルを作成して設定:

```bash
cloudflared tunnel create n8n
cloudflared tunnel route dns n8n n8n.yourdomain.com
```

4. `config.yml` を作成:

```yaml
tunnel: <TUNNEL_ID>
credentials-file: /path/to/credentials.json

ingress:
  - hostname: n8n.yourdomain.com
    service: http://localhost:5678
  - service: http_status:404
```

5. トンネルを起動:

```bash
cloudflared tunnel run n8n
```

6. `.env` ファイルを更新:

```env
N8N_HOST=n8n.yourdomain.com
N8N_PROTOCOL=https
WEBHOOK_URL=https://n8n.yourdomain.com/
```

7. n8nを再起動:

```bash
docker-compose down
docker-compose up -d
```

## トラブルシューティング

### n8nが起動しない

```bash
# ログを確認
docker-compose logs -f n8n

# コンテナを再起動
docker-compose restart n8n
```

### Webhookが401エラーを返す

- Bearer Tokenが正しいか確認
- IFノードの条件が正しいか確認
- Headerの大文字小文字が一致しているか確認

### Google Calendar接続エラー

- OAuth認証が完了しているか確認
- Redirect URIが正しく設定されているか確認
- Google Calendar APIが有効化されているか確認

## 参考リンク

- [n8n Documentation](https://docs.n8n.io/)
- [Google Calendar API](https://developers.google.com/calendar)
- [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
