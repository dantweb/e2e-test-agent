#!/bin/bash

# Execute Example OXTest File and Generate Reports
# Usage: ./demo/execute-example-test.sh

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
OXTEST_FILE="demo/_generated_result/example_output.ox.test"
OUTPUT_DIR="demo/_generated_result"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   Execute OXTest: Shopping Cart Test${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo

# Check if OXTest file exists
if [ ! -f "$OXTEST_FILE" ]; then
    echo -e "${YELLOW}⚠️  OXTest file not found: $OXTEST_FILE${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} OXTest file: $OXTEST_FILE"
echo -e "${GREEN}✓${NC} Output directory: $OUTPUT_DIR"
echo

# Execute the test
echo -e "${BLUE}▶${NC} Executing test..."
echo

npm run e2e-test-agent -- \
  --src="$OXTEST_FILE" \
  --output="$OUTPUT_DIR" \
  --execute \
  --reporter=html,json,junit,console

echo
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓${NC} Test execution complete!"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo

# List generated reports
echo -e "${BLUE}📊 Generated Reports:${NC}"
echo

if [ -f "$OUTPUT_DIR/report.html" ]; then
    echo -e "${GREEN}✓${NC} HTML Report:  $OUTPUT_DIR/report.html"
fi

if [ -f "$OUTPUT_DIR/report.json" ]; then
    echo -e "${GREEN}✓${NC} JSON Report:  $OUTPUT_DIR/report.json"
fi

if [ -f "$OUTPUT_DIR/junit.xml" ]; then
    echo -e "${GREEN}✓${NC} JUnit Report: $OUTPUT_DIR/junit.xml"
fi

echo

# Offer to open HTML report
echo -e "${YELLOW}Open HTML report in browser?${NC}"
echo "  1) Yes (Linux)"
echo "  2) Yes (macOS)"
echo "  3) No"
read -p "Choose [1-3]: " choice

case $choice in
    1)
        xdg-open "$OUTPUT_DIR/report.html" 2>/dev/null || echo "Could not open browser"
        ;;
    2)
        open "$OUTPUT_DIR/report.html" 2>/dev/null || echo "Could not open browser"
        ;;
    *)
        echo "Skipping browser open"
        ;;
esac

echo
echo -e "${GREEN}✓${NC} Done!"
echo
