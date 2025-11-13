#!/bin/bash

# Test CI Lint - Simulates GitHub Actions linting
# This script runs the same linting checks that GitHub Actions runs

echo "========================================="
echo "Testing CI Linting (simulating GitHub Actions)"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check Node version
echo "Step 1: Checking Node version..."
NODE_VERSION=$(node --version)
echo "Node version: $NODE_VERSION"
if [[ "$NODE_VERSION" != v22* ]]; then
    echo -e "${YELLOW}Warning: Expected Node 22, got $NODE_VERSION${NC}"
fi
echo ""

# Step 2: Check dependencies
echo "Step 2: Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo -e "${RED}Error: node_modules not found. Run 'npm ci' first.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Step 3: Run linting
echo "Step 3: Running ESLint (same as GitHub Actions)..."
echo "Command: npm run lint"
echo "========================================="
echo ""

npm run lint 2>&1

EXIT_CODE=$?

echo ""
echo "========================================="
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ Linting passed!${NC}"
    echo "GitHub Actions CI should pass the linting step."
else
    echo -e "${RED}✗ Linting failed with exit code $EXIT_CODE${NC}"
    echo ""
    echo "To fix formatting errors automatically, run:"
    echo "  npm run lint:fix"
    echo ""
    echo "To format all files with prettier, run:"
    echo "  npm run format"
fi
echo "========================================="

exit $EXIT_CODE
