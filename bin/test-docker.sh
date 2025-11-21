#!/bin/bash
# Run tests in Docker isolation
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🐳 Running tests in Docker...${NC}\n"

# Check if .env file exists
if [ ! -f .env ]; then
  echo -e "${YELLOW}⚠️  No .env file found. Using .env.example as template...${NC}"
  if [ -f .env.example ]; then
    cp .env.example .env
    echo -e "${YELLOW}📝 Created .env from .env.example. Please configure API keys.${NC}"
  else
    echo -e "${RED}❌ No .env.example found. Please create .env with required variables.${NC}"
    exit 1
  fi
fi

# Default to unit tests (fast, no API calls)
SERVICE="${1:-unit-test}"

# Run the appropriate service
case "$SERVICE" in
  unit|unit-test)
    echo -e "${BLUE}🧪 Running unit tests (fast, no LLM calls)...${NC}\n"
    docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit unit-test
    ;;
  integration|integration-test)
    echo -e "${BLUE}🔗 Running integration tests (with real LLM)...${NC}\n"
    docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit integration-test
    ;;
  all|test-runner)
    echo -e "${BLUE}🚀 Running all tests...${NC}\n"
    docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit test-runner
    ;;
  e2e|e2e-generator)
    echo -e "${BLUE}🎯 Running E2E test generation...${NC}\n"
    docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit e2e-generator
    ;;
  *)
    echo -e "${RED}❌ Unknown service: $SERVICE${NC}"
    echo ""
    echo "Usage: $0 [unit|integration|all|e2e]"
    echo ""
    echo "  unit         - Run unit tests only (fast, no API calls)"
    echo "  integration  - Run integration tests (with real LLM)"
    echo "  all          - Run all tests"
    echo "  e2e          - Run E2E test generation"
    echo ""
    exit 1
    ;;
esac

# Get exit code from container
CONTAINER_NAME="e2e-agent-${SERVICE}-1"
EXIT_CODE=$(docker-compose -f docker-compose.test.yml ps -q $SERVICE 2>/dev/null | xargs docker inspect -f '{{.State.ExitCode}}' 2>/dev/null || echo "1")

echo ""
if [ "$EXIT_CODE" = "0" ]; then
  echo -e "${GREEN}✅ Tests passed!${NC}"
else
  echo -e "${RED}❌ Tests failed with exit code $EXIT_CODE${NC}"
fi

# Cleanup containers
echo -e "${BLUE}🧹 Cleaning up...${NC}"
docker-compose -f docker-compose.test.yml down

exit $EXIT_CODE
