# VAKIT CDK Infrastructure

AWS CDKでVAKIT Agent Brain（Lambda + API Gateway）をデプロイします。

## 構成

- **Lambda**: Agent Brain（TypeScript実装）
- **API Gateway**: REST API（`/v1/agent` エンドポイント）
- **CloudWatch Logs**: ログ保持（7日間）

## 前提条件

1. AWS CLI がインストール・設定済み
2. AWS認証情報が設定済み（`aws configure` または環境変数）
3. Node.js 20.x 以上
4. OpenRouter API キー

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. Lambda コードのビルド

```bash
cd ../lambda
npm install
npm run build
cd ../cdk
```

### 3. 環境変数の設定

OpenRouter API キーを環境変数にセット：

```bash
export OPENROUTER_API_KEY="your-api-key-here"
```

または、デプロイ時にコンテキスト経由で指定：

```bash
npm run deploy -- -c openRouterApiKey=your-api-key-here
```

### 4. CDK Bootstrap（初回のみ）

AWSアカウント・リージョンで初めてCDKを使う場合：

```bash
npx cdk bootstrap
```

## デプロイ

### 方法1: 環境変数を使用

```bash
export OPENROUTER_API_KEY="your-api-key-here"
npm run deploy
```

### 方法2: コンテキストを使用

```bash
npm run deploy -- -c openRouterApiKey=your-api-key-here
```

### オプション設定

```bash
npm run deploy -- \
  -c openRouterApiKey=your-key \
  -c model=openai/gpt-4-turbo \
  -c userId=yuya
```

## デプロイ後

デプロイが完了すると、以下の情報が出力されます：

```
Outputs:
VakitStack.ApiUrl = https://xxxxx.execute-api.ap-northeast-1.amazonaws.com/v1/
VakitStack.ApiEndpoint = https://xxxxx.execute-api.ap-northeast-1.amazonaws.com/v1/agent
VakitStack.FunctionName = VakitStack-AgentBrainFunctionXXXXX
```

## テスト

### curlでテスト

```bash
API_ENDPOINT="<デプロイ時に出力されたApiEndpoint>"

curl -X POST "$API_ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "今日の予定教えて",
    "user_id": "yuya"
  }'
```

### レスポンス例

```json
{
  "ok": true,
  "intent": "QUERY_SCHEDULE",
  "slots": {
    "range_start": "2025-11-22T00:00:00+09:00",
    "range_end": "2025-11-22T23:59:59+09:00",
    "focus": "today"
  },
  "reply": "今日の予定を確認しています... (Google Calendar連携は実装予定)",
  "meta": {
    "model": "openai/gpt-4-turbo",
    "tool_calls": [
      {
        "service": "google_calendar",
        "action": "list_events"
      }
    ]
  }
}
```

## ログの確認

```bash
# Lambda関数のログを確認
aws logs tail /aws/lambda/VakitStack-AgentBrainFunctionXXXXX --follow

# または CloudWatch Logsコンソールから確認
```

## スタックの削除

```bash
npm run destroy
```

## トラブルシューティング

### デプロイエラー: "OpenRouter API Key is required"

環境変数またはコンテキストでAPIキーを指定してください：

```bash
export OPENROUTER_API_KEY="your-key"
# または
npm run deploy -- -c openRouterApiKey=your-key
```

### Lambda のビルドエラー

Lambda コードを先にビルドしてください：

```bash
cd ../lambda
npm install
npm run build
cd ../cdk
```

### API Gateway のタイムアウト

デフォルトは30秒です。より長い処理が必要な場合は、
`lib/vakit-stack.ts` の `timeout` を調整してください。

## 次のステップ

1. **認証追加**: API Keyまたは Cognito での認証
2. **カスタムドメイン**: Route53 + ACM でカスタムドメイン設定
3. **モニタリング**: CloudWatch Alarms、X-Ray トレース
4. **ステージング環境**: dev/prod など複数環境の構築

## 関連ドキュメント

- [Lambda実装](../lambda/README.md)
- [設計書](../docs/DESIGN_v0.md)
