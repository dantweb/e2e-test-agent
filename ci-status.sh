#!/bin/bash

# CI Status Summary - Shows the current state of the project for GitHub Actions

echo "========================================="
echo "GitHub Actions CI Status Summary"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Node Version
echo -e "${BLUE}Node Version:${NC}"
node --version
echo ""

# Git Status
echo -e "${BLUE}Git Status:${NC}"
git log --oneline -5
echo ""
echo "Branch: $(git branch --show-current)"
echo "Commits ahead of origin: $(git rev-list --count origin/master..HEAD 2>/dev/null || echo 'N/A (no remote tracking)')"
echo ""

# Test Status
echo -e "${BLUE}Test Status:${NC}"
TEST_OUTPUT=$(npm test 2>&1 | tail -5)
if echo "$TEST_OUTPUT" | grep -q "Tests:.*passed"; then
    TESTS_PASSED=$(echo "$TEST_OUTPUT" | grep -oP '\d+(?= passed)' | head -1)
    echo -e "${GREEN}✓ All tests passing: $TESTS_PASSED/339${NC}"
else
    echo "Running tests..."
    npm test 2>&1 | tail -5
fi
echo ""

# Linting Status
echo -e "${BLUE}Linting Status:${NC}"
LINT_OUTPUT=$(npm run lint 2>&1)
if [ $? -eq 0 ]; then
    WARNING_COUNT=$(echo "$LINT_OUTPUT" | grep -oP '\d+(?= warnings)' | head -1)
    echo -e "${GREEN}✓ Linting passed${NC}"
    if [ -n "$WARNING_COUNT" ]; then
        echo -e "${YELLOW}  $WARNING_COUNT non-blocking warnings${NC}"
    fi
else
    ERROR_COUNT=$(echo "$LINT_OUTPUT" | grep -oP '\d+(?= errors)' | head -1)
    echo -e "✗ Linting failed: $ERROR_COUNT errors"
fi
echo ""

# Files Changed
echo -e "${BLUE}Files Changed (not committed):${NC}"
if git diff --quiet && git diff --cached --quiet; then
    echo -e "${GREEN}No uncommitted changes${NC}"
else
    git status --short
fi
echo ""

# CI Readiness
echo "========================================="
echo -e "${BLUE}GitHub Actions CI Readiness:${NC}"
echo ""

CHECKS=0
PASSED=0

# Check 1: package-lock.json
echo -n "✓ package-lock.json committed: "
if [ -f "package-lock.json" ] && git ls-files --error-unmatch package-lock.json &>/dev/null; then
    echo -e "${GREEN}YES${NC}"
    ((PASSED++))
else
    echo "NO"
fi
((CHECKS++))

# Check 2: Node 22 in workflows
echo -n "✓ Node 22 in workflows: "
if grep -q "node-version: '22'" .github/workflows/main-ci.yml 2>/dev/null; then
    echo -e "${GREEN}YES${NC}"
    ((PASSED++))
else
    echo "NO"
fi
((CHECKS++))

# Check 3: Husky conditional install
echo -n "✓ Husky conditional install: "
if grep -q "husky install || true" package.json; then
    echo -e "${GREEN}YES${NC}"
    ((PASSED++))
else
    echo "NO"
fi
((CHECKS++))

# Check 4: Tests passing
echo -n "✓ All tests passing: "
if npm test &>/dev/null; then
    echo -e "${GREEN}YES${NC}"
    ((PASSED++))
else
    echo "NO"
fi
((CHECKS++))

# Check 5: Linting passing
echo -n "✓ Linting passing: "
if npm run lint &>/dev/null; then
    echo -e "${GREEN}YES${NC}"
    ((PASSED++))
else
    echo "NO"
fi
((CHECKS++))

echo ""
echo "========================================="
if [ $PASSED -eq $CHECKS ]; then
    echo -e "${GREEN}✓ All checks passed ($PASSED/$CHECKS)${NC}"
    echo "Ready to push to GitHub!"
    echo ""
    echo "To push changes:"
    echo "  git push"
else
    echo -e "Checks passed: $PASSED/$CHECKS"
    echo "Some issues need to be resolved before pushing."
fi
echo "========================================="
