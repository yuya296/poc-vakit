#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { VakitStack } from "../lib/vakit-stack";

const app = new cdk.App();

// Get OpenRouter API Key from context or environment
const openRouterApiKey =
  app.node.tryGetContext("openRouterApiKey") ||
  process.env.OPENROUTER_API_KEY;

if (!openRouterApiKey) {
  throw new Error(
    "OpenRouter API Key is required. Set via context (-c openRouterApiKey=xxx) or OPENROUTER_API_KEY env var"
  );
}

const model = app.node.tryGetContext("model") || process.env.MODEL;
const userId = app.node.tryGetContext("userId") || process.env.DEFAULT_USER_ID;

// Google Calendar credentials (optional)
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const googleRefreshToken = process.env.GOOGLE_REFRESH_TOKEN;

new VakitStack(app, "VakitStack", {
  openRouterApiKey,
  model,
  defaultUserId: userId,
  googleClientId,
  googleClientSecret,
  googleRefreshToken,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || "ap-northeast-1",
  },
  description: "VAKIT Personal AI Agent - Lambda + API Gateway",
});

app.synth();
