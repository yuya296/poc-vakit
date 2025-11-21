import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { IntentClassifier } from "./classifier";
import { IntentHandlers } from "./handlers";
import { AgentRequest, AgentResponse, AgentConfig } from "./types";

// ==================== Configuration ====================

function getConfig(): AgentConfig {
  const openRouterApiKey = process.env.OPENROUTER_API_KEY;
  const openRouterBaseUrl =
    process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
  const model = process.env.MODEL || "openai/gpt-4-turbo";
  const userId = process.env.DEFAULT_USER_ID || "default";

  if (!openRouterApiKey) {
    throw new Error("OPENROUTER_API_KEY environment variable is required");
  }

  return {
    openRouterApiKey,
    openRouterBaseUrl,
    model,
    userId,
  };
}

// ==================== Logging ====================

interface LogEntry {
  timestamp: string;
  user_id: string;
  text: string;
  intent?: string;
  slots?: Record<string, unknown>;
  service?: string;
  action?: string;
  status: "success" | "error";
  error?: string;
}

function logRequest(entry: LogEntry): void {
  console.log(JSON.stringify(entry));
}

// ==================== Main Handler ====================

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const startTime = new Date();

  try {
    // Parse request body
    const body: AgentRequest = JSON.parse(event.body || "{}");
    const { text, user_id, session_id } = body;

    if (!text) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ok: false,
          error: "Missing required field: text",
        }),
      };
    }

    // Get configuration
    const config = getConfig();
    const userId = user_id || config.userId;

    // Initialize classifier and handlers
    const classifier = new IntentClassifier(config);
    const handlers = new IntentHandlers(config);

    // Step 1: Classify intent
    const intentPayload = await classifier.classify(text, userId);

    // Step 2: Handle intent
    const result = await handlers.handle(intentPayload, userId);

    // Step 3: Build response
    const response: AgentResponse = {
      ok: true,
      intent: intentPayload.intent,
      slots: intentPayload.slots,
      reply: result.reply,
      meta: {
        model: config.model,
        tool_calls: result.toolCalls,
      },
    };

    // Log successful request
    logRequest({
      timestamp: startTime.toISOString(),
      user_id: userId,
      text,
      intent: intentPayload.intent,
      slots: intentPayload.slots,
      service: result.toolCalls[0]?.service,
      action: result.toolCalls[0]?.action,
      status: "success",
    });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error("Handler error:", error);

    // Log error
    logRequest({
      timestamp: startTime.toISOString(),
      user_id: "unknown",
      text: "",
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    });

    const response: AgentResponse = {
      ok: false,
      intent: "SMALL_TALK",
      slots: {},
      reply: "申し訳ありません。エラーが発生しました。",
      error: error instanceof Error ? error.message : "Unknown error",
    };

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(response),
    };
  }
};
