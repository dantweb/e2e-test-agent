#!/usr/bin/env bash

#
# E2E Test Agent - Test Generation Runner
#
# Usage:
#   ./bin/run.sh <yaml-path>                  # Generate and execute tests
#   ./bin/run.sh path/to/test.yaml            # Use specific YAML file
#   ./bin/run.sh --generate-only              # Only generate tests
#   ./bin/run.sh --execute-only               # Only execute existing tests
#   ./bin/run.sh tests/my.yaml --output=_out  # Custom YAML and output
#   ./bin/run.sh --help                       # Show help
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default configuration - .env in current working directory
# By default: EVERYTHING is ON (generate OXTest, generate Playwright, execute, all reports)
ENV_FILE=".env"
SRC_FILE=""
OUTPUT_DIR="_generated"
REPORTER="html,json,junit,console"  # All report formats by default
VERBOSE="--verbose"
GENERATE_OXTEST=true
GENERATE_PLAYWRIGHT=true
EXECUTE=true
TESTS_PATTERN=""

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Function to show usage
show_usage() {
    cat << EOF
${GREEN}E2E Test Agent - Test Generation Runner${NC}

${BLUE}Usage:${NC}
  ./bin/run.sh <yaml-path> [options]

${BLUE}Arguments:${NC}
  <yaml-path>                  Path to YAML test specification (positional argument)

${BLUE}Options:${NC}
  --no-oxtest                  Skip OXTest generation (only generate Playwright)
  --no-execute                 Skip test execution (only generate files)
  --no-playwright              Skip Playwright generation (only generate OXTest)
  --output <path>              Output directory (default: _generated)
  --tests <pattern>            Test file pattern to execute (e.g., "paypal*.ox.test")
  --reporter <formats>         Report formats: json,html,junit,console (default: all formats)
  --no-verbose                 Disable verbose logging
  --help                       Show this help message

${BLUE}Examples:${NC}
  # Default: Generate OXTest + Playwright, execute, create all reports
  ./bin/run.sh tests/realworld/paypal.yaml

  # Generate files only (no execution)
  ./bin/run.sh tests/login.yaml --no-execute

  # Only generate OXTest (skip Playwright generation)
  ./bin/run.sh tests/checkout.yaml --no-playwright

  # Only generate Playwright (skip OXTest generation)
  ./bin/run.sh tests/test.yaml --no-oxtest

  # Custom output directory
  ./bin/run.sh tests/checkout.yaml --output=_checkout

  # Generate with specific reporters only
  ./bin/run.sh tests/test.yaml --reporter=json,junit

  # Only execute existing tests (no generation)
  ./bin/run.sh tests/test.yaml --no-oxtest --no-playwright

${BLUE}Environment:${NC}
  The script looks for .env file in the current working directory.
  Ensure it contains:
    - OPENAI_API_KEY (required)
    - OPENAI_MODEL (required, e.g., gpt-4o, deepseek-reasoner)
    - OPENAI_API_URL (optional, defaults to https://api.openai.com/v1)

${BLUE}Default Behavior:${NC}
  - Generates .ox.test files (OXTest format)
  - Generates .spec.ts files (Playwright format)
  - Executes the .ox.test files
  - Creates all report formats: HTML, JSON, JUnit, Console

${BLUE}Notes:${NC}
  - The script runs from YOUR current directory, not the script's location
  - .env file is loaded from the current working directory
  - All relative paths are relative to the current directory

EOF
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --no-oxtest)
            GENERATE_OXTEST=false
            shift
            ;;
        --no-execute)
            EXECUTE=false
            shift
            ;;
        --no-playwright)
            GENERATE_PLAYWRIGHT=false
            shift
            ;;
        --output)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        --output=*)
            OUTPUT_DIR="${1#*=}"
            shift
            ;;
        --tests)
            TESTS_PATTERN="$2"
            shift 2
            ;;
        --tests=*)
            TESTS_PATTERN="${1#*=}"
            shift
            ;;
        --reporter)
            REPORTER="$2"
            shift 2
            ;;
        --reporter=*)
            REPORTER="${1#*=}"
            shift
            ;;
        --no-verbose)
            VERBOSE=""
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
            # Positional argument - YAML file path
            if [ -z "$SRC_FILE" ]; then
                SRC_FILE="$1"
                shift
            else
                echo -e "${RED}Error: Multiple YAML files specified: $SRC_FILE and $1${NC}"
                echo "Use --help for usage information"
                exit 1
            fi
            ;;
    esac
done

# Check if we need a YAML file for this operation
if ( [ "$GENERATE_OXTEST" = true ] || [ "$GENERATE_PLAYWRIGHT" = true ] ) && [ -z "$SRC_FILE" ]; then
    echo -e "${RED}Error: No YAML file specified${NC}"
    echo -e "${YELLOW}Usage: ./bin/run.sh <yaml-path>${NC}"
    echo -e "${YELLOW}Example: ./bin/run.sh tests/realworld/paypal.yaml${NC}"
    echo ""
    echo "Use --help for more information"
    exit 1
fi

# Check if .env file exists in CURRENT directory (not project root)
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}Error: Environment file not found: $ENV_FILE${NC}"
    echo -e "${YELLOW}The script looks for .env in your current working directory${NC}"
    echo -e "${YELLOW}Current directory: $(pwd)${NC}"
    echo ""
    echo -e "${YELLOW}Please create .env file with your API keys${NC}"
    echo -e "${YELLOW}See $PROJECT_ROOT/.env.example for reference${NC}"
    exit 1
fi

# Check if dist directory exists (app built) - check in project root
if [ ! -d "$PROJECT_ROOT/dist" ]; then
    echo -e "${YELLOW}⚠️  dist directory not found in $PROJECT_ROOT${NC}"
    echo -e "${YELLOW}Running npm run build...${NC}"
    cd "$PROJECT_ROOT"
    npm run build
    cd - > /dev/null
fi

# Build command - use absolute path to dist
CMD="node $PROJECT_ROOT/dist/index.js"

# Add env file (absolute path from current directory)
CMD="$CMD --env=$(pwd)/$ENV_FILE"

# Build command based on flags
# Add YAML source if any generation is requested
if [ "$GENERATE_OXTEST" = true ] || [ "$GENERATE_PLAYWRIGHT" = true ]; then
    echo -e "${BLUE}🧠 Generating tests from: $SRC_FILE${NC}"
    CMD="$CMD --src=$SRC_FILE"
fi

# Add output directory
CMD="$CMD --output=$OUTPUT_DIR"

# Add OXTest generation flag if enabled
if [ "$GENERATE_OXTEST" = true ]; then
    CMD="$CMD --oxtest"
fi

# Add execution flag if enabled
if [ "$EXECUTE" = true ]; then
    echo -e "${BLUE}🚀 Executing tests${NC}"
    CMD="$CMD --execute --reporter=$REPORTER"

    # Add test pattern if specified
    if [ -n "$TESTS_PATTERN" ]; then
        CMD="$CMD --tests=$TESTS_PATTERN"
    fi
fi

# Add verbose flag
CMD="$CMD $VERBOSE"

# Display command
echo -e "${YELLOW}Command: $CMD${NC}"
echo ""

# Execute command
eval "$CMD"

# Check exit code
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Success!${NC}"

    if [ "$GENERATE_OXTEST" = true ] || [ "$GENERATE_PLAYWRIGHT" = true ]; then
        echo -e "${GREEN}Generated files in: $OUTPUT_DIR${NC}"
        if [ "$GENERATE_OXTEST" = true ]; then
            echo -e "${GREEN}  - OXTest files (.ox.test)${NC}"
        fi
        if [ "$GENERATE_PLAYWRIGHT" = true ]; then
            echo -e "${GREEN}  - Playwright files (.spec.ts)${NC}"
        fi
    fi

    if [ "$EXECUTE" = true ]; then
        echo -e "${GREEN}Test execution complete${NC}"
    fi
else
    echo ""
    echo -e "${RED}❌ Failed with exit code: $EXIT_CODE${NC}"
    exit $EXIT_CODE
fi
