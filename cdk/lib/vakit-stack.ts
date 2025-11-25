import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import * as path from "path";

export interface VakitStackProps extends cdk.StackProps {
  openRouterApiKey: string;
  model?: string;
  defaultUserId?: string;
  googleClientId?: string;
  googleClientSecret?: string;
  googleRefreshToken?: string;
}

export class VakitStack extends cdk.Stack {
  public readonly apiUrl: cdk.CfnOutput;

  constructor(scope: Construct, id: string, props: VakitStackProps) {
    super(scope, id, props);

    // Lambda function
    // NOTE: Lambda code must be pre-built in lambda/dist/ directory
    // Run `cd lambda && npm run build` before deployment
    const agentFunction = new lambda.Function(this, "AgentBrainFunction", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "../../lambda/dist")),
      environment: {
        OPENROUTER_API_KEY: props.openRouterApiKey,
        OPENROUTER_BASE_URL: "https://openrouter.ai/api/v1",
        MODEL: props.model || "openai/gpt-4-turbo",
        DEFAULT_USER_ID: props.defaultUserId || "yuya",
        // Google Calendar API credentials
        ...(props.googleClientId && { GOOGLE_CLIENT_ID: props.googleClientId }),
        ...(props.googleClientSecret && { GOOGLE_CLIENT_SECRET: props.googleClientSecret }),
        ...(props.googleRefreshToken && { GOOGLE_REFRESH_TOKEN: props.googleRefreshToken }),
      },
      timeout: cdk.Duration.seconds(45), // Increased for external API calls
      memorySize: 512,
      logRetention: logs.RetentionDays.ONE_WEEK,
      description: "VAKIT Agent Brain - Intent classification and handling",
    });

    // API Gateway
    const api = new apigateway.RestApi(this, "AgentApi", {
      restApiName: "VAKIT Agent API",
      description: "Personal AI Agent API",
      deployOptions: {
        stageName: "v1",
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        metricsEnabled: true,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: ["POST", "OPTIONS"],
        allowHeaders: [
          "Content-Type",
          "X-Amz-Date",
          "Authorization",
          "X-Api-Key",
          "X-Amz-Security-Token",
        ],
      },
    });

    // API Key for authentication
    const apiKey = api.addApiKey("VakitApiKey", {
      apiKeyName: "vakit-agent-key",
      description: "API Key for VAKIT Agent access",
    });

    // Usage Plan with rate limiting
    const usagePlan = api.addUsagePlan("VakitUsagePlan", {
      name: "VAKIT Agent Usage Plan",
      description: "Usage plan with rate limiting for VAKIT Agent API",
      throttle: {
        rateLimit: 10, // requests per second
        burstLimit: 20, // max concurrent requests
      },
      quota: {
        limit: 10000, // max requests per month
        period: apigateway.Period.MONTH,
      },
    });

    usagePlan.addApiKey(apiKey);
    usagePlan.addApiStage({
      stage: api.deploymentStage,
    });

    // /agent endpoint with API Key required
    const agentResource = api.root.addResource("agent");
    const integration = new apigateway.LambdaIntegration(agentFunction, {
      proxy: true,
      allowTestInvoke: true,
    });

    agentResource.addMethod("POST", integration, {
      apiKeyRequired: true, // API Key required for security
    });

    // Outputs
    this.apiUrl = new cdk.CfnOutput(this, "ApiUrl", {
      value: api.url,
      description: "API Gateway endpoint URL",
      exportName: "VakitAgentApiUrl",
    });

    new cdk.CfnOutput(this, "ApiEndpoint", {
      value: `${api.url}agent`,
      description: "Full agent endpoint URL",
    });

    new cdk.CfnOutput(this, "FunctionName", {
      value: agentFunction.functionName,
      description: "Lambda function name",
    });

    new cdk.CfnOutput(this, "ApiKeyId", {
      value: apiKey.keyId,
      description: "API Key ID (use AWS Console or CLI to get the actual key value)",
    });
  }
}
