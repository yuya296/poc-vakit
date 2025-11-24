#!/bin/bash

# VAKIT CDK Deployment Script
# This script loads environment variables and deploys the CDK stack

set -e  # Exit on error

# Load environment variables from lambda/.env
if [ -f "../lambda/.env" ]; then
  echo "📦 Loading environment variables from lambda/.env..."
  export $(cat ../lambda/.env | grep -v '^#' | xargs)
else
  echo "⚠️  Warning: lambda/.env file not found"
fi

# Check required environment variables
if [ -z "$OPENROUTER_API_KEY" ]; then
  echo "❌ Error: OPENROUTER_API_KEY is not set"
  echo "Please set it in lambda/.env or as an environment variable"
  exit 1
fi

if [ -z "$AWS_PROFILE" ]; then
  echo "⚠️  Warning: AWS_PROFILE is not set, using default profile"
fi

# Set defaults
MODEL="${MODEL:-openai/gpt-4-turbo}"
DEFAULT_USER_ID="${DEFAULT_USER_ID:-yuya}"

echo "🚀 Deploying VAKIT Stack..."
echo "   Model: $MODEL"
echo "   AWS Profile: ${AWS_PROFILE:-default}"
echo ""

# Deploy with CDK
npx cdk deploy --require-approval never "$@"

echo ""
echo "✅ Deployment complete!"
