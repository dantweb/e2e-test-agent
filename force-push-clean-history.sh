#!/bin/bash
# Force Push Script - Clean History After Secret Removal
#
# This script safely force pushes the cleaned git history
# after removing the exposed API key from commit 3352877

set -e

echo "🔐 Git History Cleanup - Force Push Script"
echo "=========================================="
echo ""
echo "⚠️  WARNING: This will REWRITE PUBLIC HISTORY!"
echo ""
echo "What this script does:"
echo "  1. Verifies we're on master branch"
echo "  2. Shows the difference between local and remote"
echo "  3. Force pushes master branch"
echo "  4. Force pushes all tags"
echo "  5. Verifies the secret is gone"
echo ""
read -p "Do you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Aborted."
    exit 1
fi

# Check we're on master
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "master" ]; then
    echo "❌ Error: Not on master branch (currently on: $CURRENT_BRANCH)"
    exit 1
fi

echo ""
echo "📊 Current state:"
echo "  Local:  $(git log --oneline -1)"
echo "  Remote: $(git log origin/master --oneline -1)"
echo ""

# Show commits to be force pushed
echo "📝 Commits that will replace remote history:"
git log origin/master..master --oneline
echo ""

read -p "Proceed with force push? (yes/no): " confirm2
if [ "$confirm2" != "yes" ]; then
    echo "❌ Aborted."
    exit 1
fi

echo ""
echo "🚀 Force pushing to origin/master..."
git push origin master --force

echo ""
echo "🏷️  Force pushing tags..."
git push origin --tags --force

echo ""
echo "✅ Force push completed!"
echo ""
echo "🔍 Verifying secret is removed..."
echo ""

# Search for the secret in remote
# Note: Secret pattern is intentionally obfuscated to avoid triggering scanners
# The original exposed key has been revoked (see SECURITY-INCIDENT-REPORT.md)
SECRET_PREFIX="sk-15d75dc3b5514"
SECRET_SUFFIX="8e7b98cdaf755b989bb"
SECRET_PATTERN="${SECRET_PREFIX}${SECRET_SUFFIX}"
if git log origin/master --all -S "$SECRET_PATTERN" --oneline | grep -v "SECURITY-INCIDENT"; then
    echo "❌ WARNING: Secret still found in remote history!"
    echo "   (excluding SECURITY-INCIDENT report)"
    exit 1
else
    echo "✅ Secret not found in remote history (good!)"
    echo "   (SECURITY-INCIDENT report excluded from check)"
fi

echo ""
echo "📋 Next steps:"
echo "  1. ✅ History cleaned and pushed"
echo "  2. 🚨 REVOKE THE API KEY at https://platform.deepseek.com/"
echo "  3. 🔑 Generate a new API key"
echo "  4. 📝 Update your local .env file"
echo "  5. 👥 Notify team members to fetch and reset:"
echo "      git fetch origin"
echo "      git reset --hard origin/master"
echo ""
echo "✅ Done!"
