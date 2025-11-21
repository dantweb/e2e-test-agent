#!/bin/bash
# Quick Docker test - just builds and verifies setup
set -e

echo "🐳 Quick Docker Setup Test"
echo "=========================="
echo ""

# Test 1: Docker available
echo -n "1. Checking Docker... "
if command -v docker &> /dev/null; then
  echo "✅ Available"
else
  echo "❌ Not found"
  echo "Please install Docker: https://docs.docker.com/get-docker/"
  exit 1
fi

# Test 2: Docker Compose available
echo -n "2. Checking Docker Compose... "
if docker-compose --version &> /dev/null; then
  echo "✅ Available"
else
  echo "❌ Not found"
  echo "Please install Docker Compose"
  exit 1
fi

# Test 3: Dockerfile.test exists
echo -n "3. Checking Dockerfile.test... "
if [ -f Dockerfile.test ]; then
  echo "✅ Found"
else
  echo "❌ Missing"
  exit 1
fi

# Test 4: docker-compose.test.yml exists
echo -n "4. Checking docker-compose.test.yml... "
if [ -f docker-compose.test.yml ]; then
  echo "✅ Found"
else
  echo "❌ Missing"
  exit 1
fi

# Test 5: Build test image
echo ""
echo "5. Building test image..."
docker-compose -f docker-compose.test.yml build unit-test

echo ""
echo "✅ Docker setup is ready!"
echo ""
echo "Usage:"
echo "  ./bin/test-docker.sh unit         # Run unit tests"
echo "  ./bin/test-docker.sh integration  # Run integration tests"
echo "  ./bin/test-docker.sh all          # Run all tests"
echo "  ./bin/test-docker.sh e2e          # Run E2E generation"
