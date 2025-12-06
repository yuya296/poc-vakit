

# n8n + Agents Kit PoC 設計書

## 1. 全体アーキテクチャ

```
Agent (AgentsKit / OpenAI Agents)
        │  HTTP POST (JSON)
        ▼
n8n (セルフホスト)
  - Webhook ノード (POST)
  - Google Calendar / Gmail / その他ノード
  - 任意の変換処理
        │ JSON response
        ▼
Agent (会話処理)
```

**役割分担**

* **Agent**：自然言語の理解、Tool 呼び出し、レスポンス生成
* **n8n**：外部 API 連携、OAuth 管理、データの整形
* **接続方式**：Agent → n8n Webhook（HTTP POST）で統一

---

## 2. PoC で実現する代表機能

1. 「予定を追加して」
   → Agent が intent → Tool → n8n → Google Calendar 追加
2. 「今日の予定を知りたい」
   → n8n で Google Calendar 取得 → Agent に返却
3. 「メールを送って」
   → n8n → Gmail API

最初は **Calendar の Create/Get** の2つだけでよい。

---

## 3. n8n 側の構成（PoC 版）

### 3.1 Webhook ワークフロー（例：/calendar-create）

```
[Webhook: POST /calendar-create]
      │ body(JSON): { title, date, description, ... }
      ▼
[Google Calendar Node: Create Event]
      ▼
[Respond to Webhook: { success: true, eventId, start, end }]
```

### 3.2 Webhook ワークフロー（/calendar-list）

```
[Webhook: POST /calendar-list]
      │ body(JSON): { dateRangeStart, dateRangeEnd }
      ▼
[Google Calendar Node: List Events]
      ▼
[Respond to Webhook: { events: [...] }]
```

OAuth 認証は n8n 内で設定する。

---

## 4. Agent 側（Agents Kit）設計

### 4.1 Tool の定義（HTTP 呼び出し）

* **createCalendarEvent(input)**
  → `POST https://<YOUR_N8N>/webhook/calendar-create`

* **listCalendarEvents(input)**
  → `POST https://<YOUR_N8N>/webhook/calendar-list`

### 4.2 Tool の入出力（JSON）

```
createCalendarEvent:
  input: { title: string, start: string, end?: string, description?: string }
  output: { success: boolean, eventId: string }

listCalendarEvents:
  input: { date: string }
  output: { events: Array<{title, start, end}> }
```

### 4.3 Agent の振る舞い

* ユーザの発話から intent を判断
* 必要な Tool を呼ぶ
* n8n のレスポンスを自然言語で返す

---

## 5. セルフホスト n8n の基本セットアップ

### 5.1 Docker Compose（概要）

```
services:
  n8n:
    image: n8nio/n8n
    ports:
      - "5678:5678"
    environment:
      - GENERIC_TIMEZONE=Asia/Tokyo
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=****
      - N8N_HOST=<domain>
      - N8N_PROTOCOL=https
    volumes:
      - ./n8n_data:/home/node/.n8n
```

### 5.2 公開 URL

* Cloudflare Tunnel / nginx / Caddy のどれかで HTTPS 化
* Webhook は `https://your-n8n-domain/webhook/...` に統一

---

## 6. セキュリティ最小構成

* Webhook に **Bearer Token** を要求
* n8n 側で Header チェック（IF 条件）
* 外部公開する場合は IP 制限も可能

---

## 7. PoC タスク一覧（ClaudeCode 用）

### 7.1 インフラ

* [ ] Docker Compose で n8n セルフホストを立ち上げる
* [ ] 公開 URL（Cloudflare Tunnel or nginx）を設定
* [ ] HTTPS 化
* [ ] Webhook に Basic/Bearer 認証を付与

### 7.2 n8n ワークフロー

* [ ] `POST /calendar-create` ワークフロー作成
* [ ] Google Calendar OAuth を n8n 内で設定
* [ ] Create Event ノードを配置
* [ ] レスポンス用 JSON を整形
* [ ] `POST /calendar-list` ワークフロー作成
* [ ] Get/List Events ノードを配置

### 7.3 Agents Kit 側

* [ ] Agents Kit プロジェクト初期化
* [ ] Tool: createCalendarEvent を実装（fetch POST）
* [ ] Tool: listCalendarEvents を実装
* [ ] Agent に Tool を登録
* [ ] 会話プロンプト（意図抽出 / 予定作成）を設定
* [ ] n8n のレスポンスを自然言語に変換する処理

### 7.4 動作テスト

* [ ] curl で Webhook 直接叩いて動作確認
* [ ] Agent 経由で「予定作って」とテスト
* [ ] カレンダー側で作成結果を確認
* [ ] ログとレスポンスの整形

---

## 8. 任意（PoC 拡張）

* メール送信（Gmail Node）
* Slack 通知
* SwitchBot 操作
* 天気 API 連携
* Structured Output で予定の抜け漏れ防止

