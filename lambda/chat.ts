import * as dotenv from "dotenv";
import * as readline from "readline";
import { handler } from "./src/index";
import { APIGatewayProxyEvent } from "aws-lambda";

// Load environment variables
dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log("🤖 VAKIT Agent - チャットモード");
console.log("終了するには 'exit' または 'quit' と入力してください\n");

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
      console.log(`\n🤖: ${response.reply}\n`);
    } else {
      console.log(`\n❌ エラー: ${response.error}\n`);
    }
  } catch (error) {
    console.error(`\n❌ エラー:`, error);
  }
}

function prompt(): void {
  rl.question("You: ", async (input) => {
    const text = input.trim();

    if (!text) {
      prompt();
      return;
    }

    if (text.toLowerCase() === "exit" || text.toLowerCase() === "quit") {
      console.log("\n👋 またね！");
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
