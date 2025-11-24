import * as dotenv from "dotenv";
import { handler } from "./src/index";
import { APIGatewayProxyEvent } from "aws-lambda";

// Load environment variables from .env file
dotenv.config();

async function test() {
  // Mock API Gateway event
  const event: APIGatewayProxyEvent = {
    body: JSON.stringify({
      text: "こんにちは",
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

  console.log("📤 Request:");
  console.log(JSON.parse(event.body!));
  console.log("\n⏳ Processing...\n");

  const result = await handler(event);

  console.log("📥 Response:");
  console.log(`Status: ${result.statusCode}`);
  console.log(JSON.stringify(JSON.parse(result.body), null, 2));
}

test().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
