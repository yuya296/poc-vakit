#!/usr/bin/env ts-node
/**
 * Google Calendar OAuth Setup Script
 *
 * このスクリプトは一度だけローカルで実行し、refresh tokenを取得します。
 *
 * 実行方法:
 * 1. Google Cloud Consoleで以下の設定を確認:
 *    - OAuth 2.0 Client ID作成済み
 *    - Redirect URI: http://localhost:3000/oauth/callback を追加
 *    - スコープ: https://www.googleapis.com/auth/calendar.readonly (全カレンダー読み取り)
 *
 * 2. このスクリプトを実行:
 *    npx ts-node scripts/google-oauth-setup.ts
 *
 * 3. ブラウザでGoogle認証を完了
 *
 * 4. 表示されるrefresh tokenをlambda/.envに保存:
 *    GOOGLE_REFRESH_TOKEN=<表示されたtoken>
 */

import * as readline from "readline";
import * as http from "http";
import { URL } from "url";
import * as dotenv from "dotenv";

// .envファイルから環境変数を読み込み
dotenv.config();

// 環境変数から読み込み（または直接入力）
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const REDIRECT_URI = "http://localhost:3000/oauth/callback";
// 全カレンダーのリスト取得に必要な権限
const SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"];

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
  expires_in: number;
}

async function main() {
  console.log("🔐 Google Calendar OAuth Setup\n");

  // Client IDとSecretの確認
  let clientId = CLIENT_ID;
  let clientSecret = CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    if (!clientId) {
      clientId = await new Promise((resolve) => {
        rl.question("Google Client ID: ", resolve);
      });
    }

    if (!clientSecret) {
      clientSecret = await new Promise((resolve) => {
        rl.question("Google Client Secret: ", resolve);
      });
    }

    rl.close();
  }

  console.log("\n✅ Client ID:", clientId);
  console.log("✅ Client Secret:", clientSecret.substring(0, 10) + "...\n");

  // OAuth URLを生成
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.append("client_id", clientId);
  authUrl.searchParams.append("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.append("response_type", "code");
  authUrl.searchParams.append("scope", SCOPES.join(" "));
  authUrl.searchParams.append("access_type", "offline"); // refresh token取得に必須
  authUrl.searchParams.append("prompt", "consent"); // 毎回consent画面を表示

  console.log("📋 以下のURLをブラウザで開いてください:\n");
  console.log(authUrl.toString());
  console.log("\n");

  // ローカルサーバーを起動してコールバックを待つ
  const authorizationCode = await waitForCallback();

  console.log("\n✅ Authorization code取得: " + authorizationCode.substring(0, 20) + "...\n");

  // Tokenを交換
  console.log("🔄 Refresh tokenを取得中...\n");
  const tokens = await exchangeCodeForTokens(
    authorizationCode,
    clientId,
    clientSecret
  );

  console.log("✅ 認証成功！\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("以下の環境変数をlambda/.envに追加してください:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  console.log(`GOOGLE_CLIENT_ID=${clientId}`);
  console.log(`GOOGLE_CLIENT_SECRET=${clientSecret}`);
  console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

/**
 * ローカルサーバーを起動してOAuthコールバックを待つ
 */
function waitForCallback(): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url || "", `http://${req.headers.host}`);

      if (url.pathname === "/oauth/callback") {
        const code = url.searchParams.get("code");
        const error = url.searchParams.get("error");

        if (error) {
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end(`<html><body><h1>認証エラー</h1><p>${error}</p></body></html>`);
          server.close();
          reject(new Error(`OAuth error: ${error}`));
          return;
        }

        if (!code) {
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end("<html><body><h1>エラー</h1><p>Authorization codeが見つかりません</p></body></html>");
          server.close();
          reject(new Error("No authorization code"));
          return;
        }

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(`
          <html>
            <body style="font-family: sans-serif; text-align: center; padding: 50px;">
              <h1>✅ 認証成功</h1>
              <p>ターミナルに戻ってrefresh tokenを確認してください。</p>
              <p>このウィンドウを閉じて構いません。</p>
            </body>
          </html>
        `);

        server.close();
        resolve(code);
      }
    });

    server.listen(3000, () => {
      console.log("🌐 ローカルサーバー起動: http://localhost:3000");
      console.log("⏳ コールバックを待っています...\n");
    });

    server.on("error", (err) => {
      reject(err);
    });
  });
}

/**
 * Authorization codeをaccess token & refresh tokenに交換
 */
async function exchangeCodeForTokens(
  code: string,
  clientId: string,
  clientSecret: string
): Promise<TokenResponse> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Token exchange failed: ${response.status} ${errorData}`);
  }

  return (await response.json()) as TokenResponse;
}

// 実行
main().catch((err) => {
  console.error("\n❌ エラー:", err.message);
  process.exit(1);
});
