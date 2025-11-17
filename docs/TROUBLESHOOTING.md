# Troubleshooting Guide

This guide helps you resolve common issues when using the E2E Test Agent.

---

## Table of Contents

- [LLM and API Issues](#llm-and-api-issues)
- [Test Generation Issues](#test-generation-issues)
- [Execution Issues](#execution-issues)
- [Dependency and Graph Issues](#dependency-and-graph-issues)
- [State Machine Issues](#state-machine-issues)
- [Report Generation Issues](#report-generation-issues)
- [Docker Issues](#docker-issues)
- [Performance Issues](#performance-issues)
- [CI/CD Issues](#cicd-issues)

---

## LLM and API Issues

### Error: "Missing API key"

**Symptoms**:
```
Error: OPENAI_API_KEY environment variable is not set
```

**Solutions**:
1. **Check your .env file**:
   ```bash
   cat .env
   # Should contain: OPENAI_API_KEY=sk-...
   ```

2. **Verify environment variable is loaded**:
   ```bash
   echo $OPENAI_API_KEY
   ```

3. **Pass .env explicitly with Docker**:
   ```bash
   docker run --rm \
     -v $(pwd):/workspace \
     --env-file .env \
     dantweb/e2e-test-agent:latest \
     --src=test.yaml --output=_generated
   ```

4. **Set environment variable directly**:
   ```bash
   export OPENAI_API_KEY=sk-your-key-here
   npm run e2e-test-agent -- --src=test.yaml --output=_generated
   ```

---

### Error: "LLM request failed" or "Rate limit exceeded"

**Symptoms**:
```
Error: OpenAI API request failed with status 429
Error: Rate limit exceeded
```

**Solutions**:
1. **Wait and retry**: OpenAI has rate limits based on your tier
   - Free tier: 3 requests/minute
   - Pay-as-you-go: 60 requests/minute

2. **Use a different model**:
   ```bash
   # Use cheaper/faster model
   export OPENAI_MODEL=gpt-3.5-turbo
   ```

3. **Switch to Anthropic**:
   ```bash
   # In .env
   LLM_PROVIDER=anthropic
   ANTHROPIC_API_KEY=sk-ant-...
   ```

4. **Add retry logic** (development):
   ```typescript
   // Custom retry wrapper
   async function retryLLMCall(fn, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await fn();
       } catch (error) {
         if (i === maxRetries - 1) throw error;
         await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
       }
     }
   }
   ```

---

### Error: "Invalid response from LLM"

**Symptoms**:
```
Error: LLM response does not match expected format
Error: Failed to parse LLM output
```

**Solutions**:
1. **Check your prompt**: Ensure YAML is well-formatted
   ```yaml
   # Good
   - name: Login Test
     jobs:
       - name: Navigate
         prompt: Go to the login page

   # Bad (missing structure)
   - Login Test: Go to login page
   ```

2. **Simplify complex prompts**: Break down into smaller steps
   ```yaml
   # Instead of:
   - prompt: Navigate to site, find login, enter credentials, submit

   # Use:
   - prompt: Navigate to the login page
   - prompt: Enter username in the username field
   - prompt: Enter password in the password field
   - prompt: Click the login button
   ```

3. **Try a more capable model**:
   ```bash
   export OPENAI_MODEL=gpt-4  # More reliable parsing
   ```

---

## Test Generation Issues

### Error: "Failed to decompose task"

**Symptoms**:
```
Error: Task decomposition failed: Unable to generate subtasks
```

**Solutions**:
1. **Make prompts more specific**:
   ```yaml
   # Vague (may fail)
   - prompt: Do the login thing

   # Specific (better)
   - prompt: Navigate to https://example.com/login
   - prompt: Type "admin" into the username field
   - prompt: Click the blue Login button
   ```

2. **Check for ambiguous language**:
   ```yaml
   # Ambiguous
   - prompt: Click the button  # Which button?

   # Clear
   - prompt: Click the Submit button in the login form
   ```

3. **Verify URL accessibility**:
   ```bash
   curl -I https://your-site.com/page
   # Should return 200 OK
   ```

---

### Error: "Selector generation failed"

**Symptoms**:
```
Error: Could not generate selector for element
Warning: Fallback selector used
```

**Solutions**:
1. **Use explicit selectors in YAML**:
   ```yaml
   jobs:
     - name: Click button
       prompt: Click the login button
       selector: 'button[type="submit"]'  # Explicit selector
   ```

2. **Check multi-strategy selector logs**:
   ```bash
   # Enable verbose mode
   npm run e2e-test-agent -- --src=test.yaml --output=_gen --verbose
   ```

3. **Verify element exists**:
   ```typescript
   // In browser console
   document.querySelector('your-selector')  // Should not be null
   ```

---

## Execution Issues

### Error: "Command execution failed"

**Symptoms**:
```
Error: Playwright command failed: click
Error: Timeout waiting for selector
```

**Solutions**:
1. **Increase timeout**:
   ```yaml
   # In YAML
   timeout: 30000  # 30 seconds (default: 10000)
   ```

2. **Check selector visibility**:
   ```bash
   # Ensure element is visible
   # Try headful mode to see what's happening
   docker run --rm \
     -v $(pwd):/workspace \
     -e HEADLESS=false \
     dantweb/e2e-test-agent:latest \
     --src=test.yaml --output=_gen --execute
   ```

3. **Add wait conditions**:
   ```yaml
   jobs:
     - name: Wait for page load
       prompt: Wait for the page to fully load
     - name: Click button
       prompt: Click the login button
   ```

4. **Check for dynamic content**:
   ```yaml
   # Wait for AJAX/dynamic content
   jobs:
     - prompt: Wait for 2 seconds
     - prompt: Click the dynamically loaded button
   ```

---

### Error: "Browser launch failed"

**Symptoms**:
```
Error: Failed to launch browser
Error: Executable doesn't exist at /path/to/chromium
```

**Solutions**:
1. **Install Playwright browsers**:
   ```bash
   npx playwright install chromium
   npx playwright install-deps chromium  # Linux dependencies
   ```

2. **Use Docker (recommended)**:
   ```bash
   # Docker includes all browser dependencies
   docker run --rm \
     -v $(pwd):/workspace \
     dantweb/e2e-test-agent:latest \
     --src=test.yaml --output=_gen --execute
   ```

3. **Check system dependencies** (Linux):
   ```bash
   # Ubuntu/Debian
   sudo apt-get install -y \
     libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 \
     libcups2 libdrm2 libxkbcommon0 libxcomposite1 \
     libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2
   ```

---

## Dependency and Graph Issues

### Error: "Cycle detected in task dependencies"

**Symptoms**:
```
Error: Task dependencies contain a cycle
Error: Circular dependency detected: task-1 → task-2 → task-1
```

**Solutions**:
1. **Review your dependency chain**:
   ```typescript
   // Bad: Circular dependency
   const dependencies = new Map([
     ['task-1', ['task-2']],
     ['task-2', ['task-1']]  // ❌ Cycle!
   ]);

   // Good: Linear dependency
   const dependencies = new Map([
     ['task-2', ['task-1']],
     ['task-3', ['task-2']]  // ✅ No cycle
   ]);
   ```

2. **Visualize your graph**:
   ```typescript
   // Log the dependency structure
   console.log('Dependencies:', Array.from(dependencies.entries()));
   ```

3. **Use topological sort**:
   ```typescript
   // Build graph and check for cycles
   const graph = decomposer.buildTaskGraph(subtasks, dependencies);
   if (graph.hasCycle()) {
     console.error('Cycle detected!');
   }
   const order = graph.topologicalSort();
   console.log('Execution order:', order);
   ```

---

### Error: "Dependency does not exist"

**Symptoms**:
```
Error: Dependency 'task-3' does not exist in graph
Error: Cannot find dependent task
```

**Solutions**:
1. **Verify all dependencies exist**:
   ```typescript
   const subtasks = [
     new Subtask('task-1', 'First', commands1),
     new Subtask('task-2', 'Second', commands2),
     // task-3 is missing!
   ];

   const dependencies = new Map([
     ['task-2', ['task-1']],
     ['task-4', ['task-3']]  // ❌ task-3 doesn't exist
   ]);
   ```

2. **Check subtask IDs match**:
   ```typescript
   // Ensure IDs in dependencies match subtask IDs exactly
   const subtaskIds = subtasks.map(s => s.id);
   console.log('Available subtasks:', subtaskIds);
   ```

3. **Use consistent naming**:
   ```typescript
   // Use a constant for IDs to avoid typos
   const TASK_IDS = {
     SETUP: 'setup-task',
     LOGIN: 'login-task',
     VERIFY: 'verify-task'
   };

   const dependencies = new Map([
     [TASK_IDS.LOGIN, [TASK_IDS.SETUP]],
     [TASK_IDS.VERIFY, [TASK_IDS.LOGIN]]
   ]);
   ```

---

## State Machine Issues

### Error: "Invalid state transition"

**Symptoms**:
```
Error: Invalid state transition: Completed → InProgress
Error: Cannot transition from terminal state
```

**Solutions**:
1. **Understand state machine rules**:
   ```
   Valid transitions:
   Pending → InProgress → Completed ✅
   Pending → InProgress → Failed ✅
   Pending → Blocked ✅

   Invalid transitions:
   Completed → InProgress ❌ (terminal state)
   Failed → InProgress ❌ (terminal state)
   ```

2. **Don't reuse subtasks**:
   ```typescript
   // Bad: Reusing completed subtask
   const subtask = new Subtask('test', 'Test', commands);
   await orchestrator.executeSubtaskWithStateTracking(subtask);  // Completes
   await orchestrator.executeSubtaskWithStateTracking(subtask);  // ❌ Error!

   // Good: Create new instance
   const subtask1 = new Subtask('test-1', 'Test', commands);
   const subtask2 = new Subtask('test-2', 'Test', commands);
   await orchestrator.executeSubtaskWithStateTracking(subtask1);
   await orchestrator.executeSubtaskWithStateTracking(subtask2);
   ```

3. **Check subtask state before execution**:
   ```typescript
   if (subtask.isPending()) {
     await orchestrator.executeSubtaskWithStateTracking(subtask);
   } else {
     console.log('Subtask already executed:', subtask.status);
   }
   ```

---

### Issue: "Blocked subtasks not being skipped"

**Symptoms**:
- Subtasks marked as Blocked are still being executed
- Expected automatic blocking not happening

**Solutions**:
1. **Use `executeTaskWithStateTracking`** (not individual subtask execution):
   ```typescript
   // Good: Automatic blocking on failure
   const result = await orchestrator.executeTaskWithStateTracking(task, subtasks);

   // If subtask 2 fails:
   // - subtask 1: Completed
   // - subtask 2: Failed
   // - subtask 3: Blocked (automatically)
   // - subtask 4: Blocked (automatically)
   ```

2. **Check execution results**:
   ```typescript
   const result = await orchestrator.executeTaskWithStateTracking(task, subtasks);

   subtasks.forEach((subtask, index) => {
     console.log(`Subtask ${index}: ${subtask.status}`);
     if (subtask.isBlocked()) {
       console.log(`  Reason: ${subtask.result?.error?.message}`);
     }
   });
   ```

---

## Report Generation Issues

### Error: "Failed to generate report"

**Symptoms**:
```
Error: Report generation failed
Error: Cannot write report to file
```

**Solutions**:
1. **Check output directory permissions**:
   ```bash
   ls -la _generated/
   chmod 755 _generated/  # Ensure write permissions
   ```

2. **Verify report format**:
   ```bash
   # Valid formats: html, json, junit, console
   npm run e2e-test-agent -- \
     --src=test.yaml \
     --output=_gen \
     --execute \
     --reporter=html,json,junit
   ```

3. **Check disk space**:
   ```bash
   df -h
   # Ensure enough space for reports
   ```

---

### Issue: "HTML report not showing all data"

**Symptoms**:
- Report is generated but missing test results
- Incomplete execution data

**Solutions**:
1. **Ensure execution completed**:
   ```typescript
   // Wait for all subtasks to finish
   const result = await orchestrator.executeTaskWithStateTracking(task, subtasks);

   // Verify all subtasks have terminal state
   const allComplete = subtasks.every(s => s.isTerminal());
   console.log('All subtasks completed:', allComplete);
   ```

2. **Check ExecutionReport structure**:
   ```typescript
   const executionReport = ReportAdapter.taskToExecutionReport(
     'Test Name',
     taskResult,
     subtaskResults,
     subtasks
   );

   console.log('Report structure:', {
     testName: executionReport.testName,
     totalSubtasks: executionReport.totalSubtasks,
     passed: executionReport.passed,
     failed: executionReport.failed
   });
   ```

---

## Docker Issues

### Error: "Docker container exits immediately"

**Symptoms**:
```
docker run exits with code 1
No output from container
```

**Solutions**:
1. **Check file paths are absolute in container**:
   ```bash
   # Bad
   docker run --rm dantweb/e2e-test-agent --src=test.yaml

   # Good
   docker run --rm \
     -v $(pwd):/workspace \
     dantweb/e2e-test-agent --src=/workspace/test.yaml
   ```

2. **Verify .env file is mounted**:
   ```bash
   docker run --rm \
     -v $(pwd):/workspace \
     --env-file /workspace/.env \
     dantweb/e2e-test-agent \
     --src=/workspace/test.yaml --output=/workspace/_gen
   ```

3. **Check Docker logs**:
   ```bash
   docker logs <container-id>
   ```

---

## Performance Issues

### Issue: "Test generation is slow"

**Symptoms**:
- Taking > 30 seconds per test
- LLM calls timing out

**Solutions**:
1. **Use faster model**:
   ```bash
   # GPT-3.5 is faster than GPT-4
   export OPENAI_MODEL=gpt-3.5-turbo
   ```

2. **Reduce complexity**:
   ```yaml
   # Break large tests into smaller ones
   # Instead of 1 test with 20 steps:
   # Use 4 tests with 5 steps each
   ```

3. **Cache results** (development):
   ```typescript
   // Implement simple LLM response cache
   const cache = new Map<string, any>();

   async function cachedLLMCall(prompt: string) {
     if (cache.has(prompt)) {
       return cache.get(prompt);
     }
     const result = await llm.call(prompt);
     cache.set(prompt, result);
     return result;
   }
   ```

---

### Issue: "Test execution is slow"

**Symptoms**:
- Tests taking > 5 seconds per command
- Browser operations laggy

**Solutions**:
1. **Use headless mode** (faster):
   ```bash
   docker run --rm \
     -v $(pwd):/workspace \
     -e HEADLESS=true \
     dantweb/e2e-test-agent --src=test.yaml --execute
   ```

2. **Reduce wait times**:
   ```yaml
   # Avoid unnecessary waits
   timeout: 5000  # Reduce from default 10000
   ```

3. **Optimize selectors**:
   ```yaml
   # Use fast selectors (ID > Class > CSS > XPath)
   # Fast
   selector: '#login-button'

   # Slow
   selector: 'div > div > div > button.login'
   ```

4. **Disable animations** (in test setup):
   ```typescript
   await page.addStyleTag({
     content: '* { animation: none !important; transition: none !important; }'
   });
   ```

---

## CI/CD Issues

### Error: "Tests fail in CI but pass locally"

**Symptoms**:
- GitHub Actions failing
- Local tests pass

**Solutions**:
1. **Check environment variables in CI**:
   ```yaml
   # .github/workflows/ci.yml
   env:
     OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
     HEADLESS: true
   ```

2. **Use same Node version**:
   ```yaml
   # CI config
   - uses: actions/setup-node@v3
     with:
       node-version: '22'  # Match local version
   ```

3. **Install browser dependencies in CI**:
   ```yaml
   - name: Install Playwright
     run: |
       npx playwright install --with-deps chromium
   ```

4. **Add retry logic for flaky tests**:
   ```yaml
   # In CI config
   - name: Run tests
     run: npm test
     timeout-minutes: 10
     continue-on-error: false
   ```

---

## Getting Help

If you're still experiencing issues:

1. **Check existing issues**: [GitHub Issues](https://github.com/your-org/e2e-agent/issues)

2. **Create a minimal reproduction**:
   ```yaml
   # Minimal test case
   simple-test:
     url: https://example.com
     jobs:
       - name: Navigate
         prompt: Go to the homepage
   ```

3. **Gather logs**:
   ```bash
   # Enable verbose mode
   npm run e2e-test-agent -- --src=test.yaml --verbose 2>&1 | tee debug.log
   ```

4. **Check versions**:
   ```bash
   node --version    # Should be v22+
   npm --version
   npx playwright --version
   ```

5. **Open an issue** with:
   - Error message and stack trace
   - Minimal reproduction case
   - Environment details (OS, Node version)
   - Logs from verbose mode

---

## Additional Resources

- [README.md](../README.md) - Main documentation
- [Getting Started Guide](./e2e-tester-agent/GETTING_STARTED.md) - Setup instructions
- [API Documentation](./e2e-tester-agent/implementation/done/) - Sprint completion docs
- [Docker Guide](./DOCKER.md) - Docker-specific help

---

**Last Updated**: November 17, 2025
**Version**: 1.0.0
