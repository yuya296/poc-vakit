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
}

export class VakitStack extends cdk.Stack {
  public readonly apiUrl: cdk.CfnOutput;

  constructor(scope: Construct, id: string, props: VakitStackProps) {
    super(scope, id, props);

    // Lambda function
    const agentFunction = new lambda.Function(this, "AgentBrainFunction", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "../../lambda"), {
        bundling: {
          image: lambda.Runtime.NODEJS_20_X.bundlingImage,
          command: [
            "bash",
            "-c",
            [
              "npm install",
              "npm run build",
              "cp -r dist/* /asset-output/",
              "cp package.json /asset-output/",
              "cd /asset-output",
              "npm install --production",
            ].join(" && "),
          ],
        },
      }),
      environment: {
        OPENROUTER_API_KEY: props.openRouterApiKey,
        OPENROUTER_BASE_URL: "https://openrouter.ai/api/v1",
        MODEL: props.model || "openai/gpt-4-turbo",
        DEFAULT_USER_ID: props.defaultUserId || "yuya",
      },
      timeout: cdk.Duration.seconds(30),
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

    // /agent endpoint
    const agentResource = api.root.addResource("agent");
    const integration = new apigateway.LambdaIntegration(agentFunction, {
      proxy: true,
      allowTestInvoke: true,
    });

    agentResource.addMethod("POST", integration, {
      apiKeyRequired: false, // v0: No API key required
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
  }
}
