# Rebase Conflict Resolution Guide

## Current Situation

You encountered rebase conflicts because:
1. Git history was rewritten locally to remove exposed API key
2. Remote repository still contains the old history with the secret
3. Attempting to rebase causes conflicts between diverged histories

## What Happened

### Timeline
1. **14:19:53 UTC**: API key committed in `tests/.env.test` (commit `3352877`)
2. **~14:20:00 UTC**: Pushed to `origin/master`
3. **~15:50:00 UTC**: Gitleaks detected the secret in CI/CD
4. **~15:51:00 UTC**: Git history rewritten with `git filter-branch`
5. **~15:52:00 UTC**: Rebase attempted → CONFLICTS
6. **~15:52:30 UTC**: Rebase aborted with `git rebase --abort`

### Current State
```bash
# Local commits (cleaned history)
aa543bd feat: Add force push script and pre-rebase hook
2f0e1cc docs: Add security incident report
b0b1ffa feat: Add PayPal payment integration test
4c91487 test: Add PayPal integration test
6d8db75 feat: Add PayPal payment integration test
2aa30c2 refactor: Preserve historical test results

# Remote commits (contains secret!)
11c8bea feat: Add PayPal payment integration test  ← OLD HASH
195dde8 test: Add PayPal integration test          ← OLD HASH
45de713 feat: Add PayPal payment integration test  ← OLD HASH
607df46 refactor: Preserve historical test results  ← OLD HASH
3352877 feat: Add complete shopping payment        ← HAS THE SECRET!
```

## Resolution Steps

### ✅ Already Completed
1. ✅ Aborted the rebase with `git rebase --abort`
2. ✅ Git history cleaned with `git filter-branch`
3. ✅ Created security incident report
4. ✅ Created force push helper script
5. ✅ Created pre-rebase hook to prevent future conflicts

### 🚨 Action Required

#### Step 1: Force Push (Use Helper Script)
The safe way to force push:

```bash
cd /home/dtkachev/osc/strpwt7-oct21/e2e-agent

# Run the helper script
./force-push-clean-history.sh
```

The script will:
- Verify you're on master branch
- Show you what will be pushed
- Ask for confirmation (type "yes")
- Force push master and tags
- Verify the secret is removed

#### Step 2: Revoke the API Key
**IMMEDIATELY after force push:**

1. Login to DeepSeek: https://platform.deepseek.com/
2. Go to API Keys section
3. Find and **REVOKE**: `sk-15d75dc3b55148e7b98cdaf755b989bb`
4. Generate a new API key
5. Update your local `.env` file:
   ```bash
   # Edit .env (NOT committed to git)
   OPENAI_API_KEY=your-new-key-here
   ```

#### Step 3: Verify Secret Is Gone
After force push, verify:

```bash
# Clone fresh copy to test
git clone https://github.com/dantweb/e2e-test-agent.git /tmp/verify-clean
cd /tmp/verify-clean

# Search for the secret in entire history
git log --all -S "sk-15d75dc3b55148e7b98cdaf755b989bb" --oneline

# Should only show SECURITY-INCIDENT report, not the actual .env.test file
```

#### Step 4: Notify Team Members
If anyone else has cloned the repository, they need to:

```bash
cd /path/to/e2e-agent
git fetch origin
git reset --hard origin/master
git clean -fd
```

⚠️ **WARNING**: This will DISCARD all local changes!

## Preventing Future Rebase Conflicts

### Pre-rebase Hook (Already Installed)
The `.husky/pre-rebase` hook will now:
- Check for uncommitted changes
- Warn if security incident is in progress
- Prevent accidental rebases during history cleanup

### Best Practices
1. **Never rebase after `git filter-branch`** - Use force push instead
2. **Always commit before rebasing** - The pre-rebase hook checks this
3. **Never commit secrets** - Pre-commit hook should catch this
4. **Use `.env` files** - Never `.env.test` or similar

### When to Use Rebase vs Force Push
- ✅ **Rebase**: Normal development, clean up local commits before pushing
- ❌ **DON'T Rebase**: After `git filter-branch`, `git filter-repo`, or BFG
- ✅ **Force Push**: After rewriting history to remove secrets

## FAQ

### Q: Why did the rebase fail?
**A**: After `git filter-branch` rewrote commit hashes, local and remote histories diverged. Rebase tried to replay commits on the old remote history, causing conflicts.

### Q: Is it safe to force push?
**A**: Yes, in this case it's **necessary** to remove the exposed secret from public history. The helper script makes it safer by:
- Asking for confirmation
- Showing what will change
- Verifying the result

### Q: What if someone already cloned the repository?
**A**: They need to fetch and hard reset (see Step 4 above). Their local copies will have the old history with the secret until they do this.

### Q: Will this break CI/CD?
**A**: No. After force push:
- CI/CD will pull the new history
- Gitleaks will stop reporting the secret
- All tests should pass normally

### Q: How do I know the secret is really gone?
**A**: Use the verification step (Step 3) to clone fresh and search the entire git history.

## Summary

**DON'T**:
- ❌ Don't rebase after `git filter-branch`
- ❌ Don't commit secrets
- ❌ Don't skip the force push

**DO**:
- ✅ Use `./force-push-clean-history.sh` to safely force push
- ✅ Revoke the exposed API key immediately
- ✅ Verify the secret is gone
- ✅ Notify team members to reset

---

**Status**: Rebase aborted ✅ | Force push pending 🚨 | Key revocation pending 🚨

See also: `SECURITY-INCIDENT-2025-11-17.md`
