#!/usr/bin/env bash

#
# E2E Test Agent - Playwright Test Runner
#
# Usage:
#   ./bin/run_tests.sh                    # Run tests with UI
#   ./bin/run_tests.sh --no-ui            # Run tests without UI (headless)
#   ./bin/run_tests.sh --tests <pattern>  # Run specific tests with UI
#   ./bin/run_tests.sh --help             # Show help
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default configuration
TESTS_DIR="_generated"
TEST_PATTERN=""
UI_MODE=true

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Function to show usage
show_usage() {
    cat << EOF
${GREEN}E2E Test Agent - Playwright Test Runner${NC}

${BLUE}Usage:${NC}
  ./bin/run_tests.sh [options]

${BLUE}Options:${NC}
  --tests <dir>         Test directory or pattern (default: _generated)
  --no-ui               Run tests in headless mode (default: UI mode)
  --help                Show this help message

${BLUE}Examples:${NC}
  # Run all tests in _generated with UI (default)
  ./bin/run_tests.sh

  # Run tests without UI (headless mode)
  ./bin/run_tests.sh --no-ui

  # Run specific test file with UI
  ./bin/run_tests.sh --tests _generated/paypal-payment-test.spec.ts

  # Run specific test pattern without UI
  ./bin/run_tests.sh --tests "_generated/paypal*.spec.ts" --no-ui

  # Run tests from custom directory with UI
  ./bin/run_tests.sh --tests _custom_output

${BLUE}Notes:${NC}
  - UI mode uses Playwright's interactive UI (--ui flag)
  - Headless mode runs tests in the background without UI
  - Test files must be .spec.ts Playwright test files
  - The script runs from your current directory

EOF
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --tests)
            TESTS_DIR="$2"
            shift 2
            ;;
        --tests=*)
            TESTS_DIR="${1#*=}"
            shift
            ;;
        --no-ui)
            UI_MODE=false
            shift
            ;;
        --help|-h)
            show_usage
            exit 0
            ;;
        -*)
            echo -e "${RED}Error: Unknown option: $1${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
        *)
            # Positional argument - test pattern
            if [ -z "$TEST_PATTERN" ]; then
                TEST_PATTERN="$1"
                shift
            else
                echo -e "${RED}Error: Multiple test patterns specified: $TEST_PATTERN and $1${NC}"
                echo "Use --help for usage information"
                exit 1
            fi
            ;;
    esac
done

# Use test pattern if provided, otherwise use tests directory
if [ -n "$TEST_PATTERN" ]; then
    TESTS_ARG="$TEST_PATTERN"
else
    TESTS_ARG="$TESTS_DIR"
fi

# Check if tests directory/file exists
if [ ! -e "$TESTS_ARG" ]; then
    echo -e "${RED}Error: Test path not found: $TESTS_ARG${NC}"
    echo -e "${YELLOW}Make sure you have generated tests first${NC}"
    echo -e "${YELLOW}Run: ./bin/run.sh tests/realworld/paypal.yaml${NC}"
    exit 1
fi

# Build Playwright command
if [ "$UI_MODE" = true ]; then
    echo -e "${BLUE}🎭 Running Playwright tests with UI...${NC}"
    CMD="npx playwright test $TESTS_ARG --ui"
else
    echo -e "${BLUE}🎭 Running Playwright tests (headless)...${NC}"
    CMD="npx playwright test $TESTS_ARG"
fi

# Display command
echo -e "${YELLOW}Command: $CMD${NC}"
echo ""

# Execute command
eval "$CMD"

# Check exit code
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Tests completed successfully!${NC}"
else
    echo ""
    echo -e "${RED}❌ Tests failed with exit code: $EXIT_CODE${NC}"
    exit $EXIT_CODE
fi
