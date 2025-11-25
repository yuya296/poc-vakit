import * as dotenv from "dotenv";

// Load environment variables FIRST, before importing any other modules
dotenv.config();

import * as readline from "readline";
import { handler } from "./src/index";
import { APIGatewayProxyEvent } from "aws-lambda";
import { logger, setDebugMode } from "./src/logger";

// ANSI color codes
const GRAY = "\x1b[90m";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

// Debug mode: node chat.ts --debug または DEBUG=true node chat.ts
const DEBUG_MODE = process.argv.includes("--debug") || process.env.DEBUG === "true";

// Loggerのデバッグモードを設定
setDebugMode(DEBUG_MODE);

// Console.logをLoggerに置き換え（内部ログをlogger.debugに移行すべき）
// 一時的な措置：既存のconsole.logを抑制
const originalLog = console.log;
console.log = (...args: any[]) => {
  // chat.ts内のログのみ通常通り表示（他のファイルのログは抑制）
  const stack = new Error().stack || "";
  if (stack.includes("chat.ts")) {
    originalLog(...args);
  } else if (DEBUG_MODE) {
    // デバッグモードでは他のログもグレーで表示
    originalLog(GRAY + args.join(" ") + RESET);
  }
  // デバッグモードOFFでは他のログは非表示
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

logger.info("🤖 VAKIT Agent - チャットモード");
if (DEBUG_MODE) {
  logger.debug("(デバッグモード: 詳細情報を表示)");
}
logger.info("終了するには 'exit' または 'quit' と入力してください\n");

async function chat(text: string): Promise<void> {
  // Mock API Gateway event
  const event: APIGatewayProxyEvent = {
    body: JSON.stringify({
      text,
      user_id: "yuya",
    }),
    headers: {},
    multiValueHeaders: {},
    httpMethod: "POST",
    isBase64Encoded: false,
    path: "/agent",
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {} as any,
    resource: "",
  };

  try {
    const result = await handler(event);
    const response = JSON.parse(result.body);

    if (response.ok) {
      logger.info(`\n🤖: ${response.reply}\n`);

      // デバッグモードの場合、追加情報を表示
      if (DEBUG_MODE) {
        logger.debug("─────────────────────────────────────");
        logger.debug(`Intent: ${response.intent}`);

        if (response.slots && Object.keys(response.slots).length > 0) {
          logger.debug(`Slots: ${JSON.stringify(response.slots, null, 2)}`);
        }

        if (response.meta?.tool_calls && response.meta.tool_calls.length > 0) {
          logger.debug(`Tool Calls: ${response.meta.tool_calls.length}件`);
          response.meta.tool_calls.forEach((tool: any, i: number) => {
            logger.debug(`  [${i + 1}] ${tool.tool}`);
          });
        }

        if (response.meta?.model) {
          logger.debug(`Model: ${response.meta.model}`);
        }

        logger.debug("─────────────────────────────────────\n");
      }
    } else {
      logger.info(`\n❌ エラー: ${response.error}\n`);
    }
  } catch (error) {
    logger.error(`\n❌ エラー:`, error);
  }
}

function prompt(): void {
  rl.question(`${BOLD}You:${RESET} `, async (input) => {
    const text = input.trim();

    if (!text) {
      prompt();
      return;
    }

    if (text.toLowerCase() === "exit" || text.toLowerCase() === "quit") {
      logger.info("\n👋 またね！");
      rl.close();
      process.exit(0);
      return;
    }

    await chat(text);
    prompt();
  });
}

// Start
prompt();
