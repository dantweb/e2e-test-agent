#!/bin/bash
# Manual pre-commit checks - run this before committing
# This mirrors what the husky pre-commit hook does

set -e

echo "🔍 Pre-Commit Checks"
echo "===================="
echo ""

# Track failures
FAILED=0

# 1. ESLint Check
echo "1. Running ESLint..."
if npm run lint -- --max-warnings=0; then
  echo "   ✅ ESLint passed"
else
  echo "   ❌ ESLint failed"
  FAILED=1
fi

echo ""

# 2. TypeScript Type Check
echo "2. Running TypeScript type check..."
if npm run type-check; then
  echo "   ✅ Type check passed"
else
  echo "   ❌ Type check failed"
  FAILED=1
fi

echo ""

# 3. Format Check
echo "3. Checking code formatting..."
if npm run format:check; then
  echo "   ✅ Format check passed"
else
  echo "   ❌ Format check failed"
  echo "   💡 Run: npm run format"
  FAILED=1
fi

echo ""

# 4. Unit Tests (optional but recommended)
echo "4. Running unit tests..."
if npm run test:unit; then
  echo "   ✅ Unit tests passed"
else
  echo "   ⚠️  Unit tests failed"
  echo "   (This won't block commit, but please fix)"
fi

echo ""
echo "===================="

if [ $FAILED -eq 0 ]; then
  echo "✅ All checks passed! Ready to commit."
  exit 0
else
  echo "❌ Some checks failed. Please fix before committing."
  echo ""
  echo "Quick fixes:"
  echo "  npm run lint:fix    # Auto-fix ESLint issues"
  echo "  npm run format      # Format code with Prettier"
  echo "  npm run build       # Fix TypeScript errors"
  echo ""
  exit 1
fi
