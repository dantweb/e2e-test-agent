#!/bin/bash
# Docker Integration Test Script
# Tests the ability to call Docker commands to generate tests and .ox.test files
# using the given .env file

set -e  # Exit on error

echo "======================================"
echo "Docker Integration Test"
echo "======================================"
echo ""

# Configuration
DOCKER_IMAGE="e2e-test-agent:latest"
TEST_YAML="tests/realworld/shopping-flow.yaml"
OUTPUT_DIR="_generated"
ENV_FILE=".env.test"
CONTAINER_NAME="e2e-test-integration-$$"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Cleanup function
cleanup() {
    print_info "Cleaning up..."

    # Stop and remove container if it exists
    if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        docker rm -f "${CONTAINER_NAME}" > /dev/null 2>&1 || true
        print_success "Removed container: ${CONTAINER_NAME}"
    fi

    # Clean up generated files
    if [ -d "${OUTPUT_DIR}" ]; then
        rm -rf "${OUTPUT_DIR}"
        print_success "Cleaned up output directory: ${OUTPUT_DIR}"
    fi
}

# Register cleanup on exit
trap cleanup EXIT

# Step 1: Check if Docker is available
print_info "Step 1: Checking Docker availability..."
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed or not in PATH"
    exit 1
fi
print_success "Docker is available"

# Step 2: Check if Docker image exists
print_info "Step 2: Checking if Docker image exists..."
if ! docker image inspect "${DOCKER_IMAGE}" > /dev/null 2>&1; then
    print_info "Docker image not found. Building..."

    # Build the Docker image
    docker build -t "${DOCKER_IMAGE}" .

    if [ $? -eq 0 ]; then
        print_success "Docker image built successfully"
    else
        print_error "Failed to build Docker image"
        exit 1
    fi
else
    print_success "Docker image exists: ${DOCKER_IMAGE}"
fi

# Step 3: Check if .env file exists
print_info "Step 3: Checking for .env file..."
if [ ! -f "${ENV_FILE}" ]; then
    print_error ".env file not found: ${ENV_FILE}"
    print_info "Creating a test .env file from .env.example..."

    if [ -f ".env.example" ]; then
        cp .env.example "${ENV_FILE}"
        print_success "Created ${ENV_FILE} from .env.example"
        print_info "Note: You may need to add valid API keys for actual test execution"
    else
        print_error "Neither ${ENV_FILE} nor .env.example found"
        exit 1
    fi
else
    print_success "Found .env file: ${ENV_FILE}"
fi

# Step 4: Check if test YAML exists
print_info "Step 4: Checking for test YAML file..."
if [ ! -f "${TEST_YAML}" ]; then
    print_error "Test YAML file not found: ${TEST_YAML}"
    exit 1
fi
print_success "Found test YAML: ${TEST_YAML}"

# Step 5: Create output directory
print_info "Step 5: Preparing output directory..."
mkdir -p "${OUTPUT_DIR}"
print_success "Output directory ready: ${OUTPUT_DIR}"

# Step 6: Run Docker container to generate tests
print_info "Step 6: Running Docker container to generate tests..."
echo ""
print_info "Docker command:"
echo "  docker run --rm \\"
echo "    --name ${CONTAINER_NAME} \\"
echo "    --env-file ${ENV_FILE} \\"
echo "    -v \$(pwd):/workspace \\"
echo "    ${DOCKER_IMAGE} \\"
echo "    --src=${TEST_YAML} \\"
echo "    --output=${OUTPUT_DIR} \\"
echo "    --oxtest"
echo ""

# Execute Docker command
docker run --rm \
    --name "${CONTAINER_NAME}" \
    --env-file "${ENV_FILE}" \
    -v "$(pwd):/workspace" \
    "${DOCKER_IMAGE}" \
    --src="${TEST_YAML}" \
    --output="${OUTPUT_DIR}" \
    --oxtest

if [ $? -eq 0 ]; then
    print_success "Docker container executed successfully"
else
    print_error "Docker container execution failed"
    exit 1
fi

# Step 7: Verify generated files
print_info "Step 7: Verifying generated files..."

# Check if output directory exists
if [ ! -d "${OUTPUT_DIR}" ]; then
    print_error "Output directory not created: ${OUTPUT_DIR}"
    exit 1
fi

# Check for .ox.test files
OXTEST_FILES=$(find "${OUTPUT_DIR}" -name "*.ox.test" -type f)
if [ -z "${OXTEST_FILES}" ]; then
    print_error "No .ox.test files found in ${OUTPUT_DIR}"
    exit 1
fi

# Count generated files
OXTEST_COUNT=$(echo "${OXTEST_FILES}" | wc -l)
print_success "Found ${OXTEST_COUNT} .ox.test file(s):"

# List generated files
echo "${OXTEST_FILES}" | while read -r file; do
    echo "  - ${file}"

    # Verify file is not empty
    if [ ! -s "${file}" ]; then
        print_error "Generated file is empty: ${file}"
        exit 1
    fi
done

print_success "All generated files are valid"

# Step 8: Check for .spec.ts files (if any)
print_info "Step 8: Checking for .spec.ts files..."
SPEC_FILES=$(find "${OUTPUT_DIR}" -name "*.spec.ts" -type f 2>/dev/null || true)
if [ -n "${SPEC_FILES}" ]; then
    SPEC_COUNT=$(echo "${SPEC_FILES}" | wc -l)
    print_success "Found ${SPEC_COUNT} .spec.ts file(s):"
    echo "${SPEC_FILES}" | while read -r file; do
        echo "  - ${file}"
    done
else
    print_info "No .spec.ts files found (this is OK if only OXTest was requested)"
fi

# Step 9: Validate content of generated files
print_info "Step 9: Validating content of generated .ox.test files..."

# Check first .ox.test file for expected content
FIRST_OXTEST=$(echo "${OXTEST_FILES}" | head -n 1)
if [ -f "${FIRST_OXTEST}" ]; then
    # Check if file contains OXTest commands
    if grep -q "navigate\|click\|type\|assert" "${FIRST_OXTEST}"; then
        print_success "Generated .ox.test file contains valid OXTest commands"
    else
        print_error "Generated .ox.test file does not contain expected OXTest commands"
        print_info "File content:"
        cat "${FIRST_OXTEST}"
        exit 1
    fi
else
    print_error "Could not read generated .ox.test file"
    exit 1
fi

# Final summary
echo ""
echo "======================================"
echo "Test Summary"
echo "======================================"
print_success "Docker integration test PASSED"
echo ""
echo "Summary:"
echo "  ✓ Docker image available"
echo "  ✓ .env file loaded"
echo "  ✓ Container executed successfully"
echo "  ✓ Generated ${OXTEST_COUNT} .ox.test file(s)"
echo "  ✓ All files are valid and non-empty"
echo "  ✓ Files contain expected OXTest commands"
echo ""
print_success "All tests passed!"
echo ""

exit 0
