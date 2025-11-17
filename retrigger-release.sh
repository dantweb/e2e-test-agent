#!/bin/bash
# Retrigger Release for v1.1.1
#
# This script deletes and re-creates the v1.1.1 tag to retrigger the release workflow

set -e

TAG="v1.1.1"

echo "🏷️  Retriggering release for $TAG"
echo "================================="
echo ""

# Confirm with user
read -p "This will delete and recreate tag $TAG. Continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "❌ Aborted."
    exit 1
fi

# Delete tag locally
echo "🗑️  Deleting local tag $TAG..."
git tag -d $TAG || echo "   (tag not found locally)"

# Delete tag remotely
echo "🗑️  Deleting remote tag $TAG..."
git push origin :refs/tags/$TAG || echo "   (tag not found remotely)"

# Get current commit
COMMIT=$(git rev-parse HEAD)
echo ""
echo "📍 Current commit: $COMMIT"

# Create tag
echo "🏷️  Creating tag $TAG..."
git tag $TAG

# Push tag
echo "⬆️  Pushing tag to remote..."
git push origin $TAG

echo ""
echo "✅ Tag $TAG recreated and pushed!"
echo "🚀 GitHub Actions will now run the release workflow"
echo ""
echo "Check status at:"
echo "https://github.com/dantweb/e2e-test-agent/actions"
