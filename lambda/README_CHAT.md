# VAKIT Chat Interface

対話型チャットインターフェース

## 使い方

### 通常モード（簡潔表示）

```bash
npm run chat
```

**表示内容**:
- ユーザー入力
- AIの応答のみ

**非表示**:
- Intent分類ログ
- Tool呼び出し詳細
- API応答の詳細
- デバッグ情報

### デバッグモード（詳細表示）

```bash
npm run chat:debug
```

**追加表示**（グレー色）:
- Intent名
- Slots（パラメータ）
- Tool Calls リスト
- 使用モデル名
- 内部処理ログ

## 表示例

### 通常モード

```
🤖 VAKIT Agent - チャットモード
終了するには 'exit' または 'quit' と入力してください

You: 今日の予定は？

🤖: 本日は予定がありません。

You: quit

👋 またね！
```

### デバッグモード

```
🤖 VAKIT Agent - チャットモード
(デバッグモード: 詳細情報を表示)
終了するには 'exit' または 'quit' と入力してください

You: 今日の予定は？
[CommandRegistry] Registered 11 commands: [...]  ← グレー
[IntentClassifier] Initialized with 11 enabled...  ← グレー
[GoogleCalendar] Found 7 calendars (3 owned)      ← グレー

🤖: 本日は予定がありません。

─────────────────────────────────────           ← グレー
Intent: QUERY_SCHEDULE                             ← グレー
Slots: {                                           ← グレー
  "range_start": "2025-11-25T00:00:00+09:00",    ← グレー
  "range_end": "2025-11-25T23:59:59+09:00"       ← グレー
}                                                  ← グレー
Tool Calls: 1件                                    ← グレー
  [1] google_calendar_list                        ← グレー
Model: openai/gpt-oss-120b                        ← グレー
─────────────────────────────────────           ← グレー

You: quit

👋 またね！
```

## 環境変数でのデバッグモード有効化

```bash
DEBUG=true npm run chat
```

## 実装詳細

### console.log のインターセプト

- **通常モード**: ユーザー向けメッセージ（🤖, ❌, 👋）のみ表示
- **デバッグモード**: 内部ログをグレー色で表示

### ANSI カラーコード

- `\x1b[90m` - グレー
- `\x1b[0m` - リセット
- `\x1b[1m` - ボールド

### デバッグフラグ検出

```typescript
const DEBUG_MODE = process.argv.includes("--debug") || process.env.DEBUG === "true";
```

## 終了方法

- `exit` または `quit` と入力
- `Ctrl+C`
