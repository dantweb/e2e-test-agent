# Self-Healing Tests Proposal

**Status**: Proposed Feature
**Date**: November 17, 2025
**Priority**: High (User-Requested)

---

## 🎯 **Problem Statement**

**Current workflow**:
```
YAML → LLM → .ox.test → Execute → ❌ FAILS → Manual fix required
```

**User Question**:
> "Can I create a working test? It implies that if the test fails, then ox.test should be recreated again, maybe with new steps or more precise CSS selector... does it work like this?"

**Answer**: No, it doesn't work like this YET, but it should!

---

## 💡 **Proposed Solution: Self-Healing Test Generation**

### Desired Workflow

```
YAML → LLM → .ox.test → Execute → ❌ FAILS
                ↑                      ↓
                └──────[Analyze]───────┘
                       ↓
              LLM Refinement with failure context
                       ↓
              New .ox.test with fixes
                       ↓
              Execute → ✅ PASSES
```

---

## 🏗️ **Architecture**

### New Components Needed

1. **FailureAnalyzer** (`src/application/analyzers/FailureAnalyzer.ts`)
   - Captures failure context (error, screenshot, HTML)
   - Extracts relevant page information
   - Identifies failure type (selector, timeout, assertion)

2. **RefinementEngine** (`src/application/engines/RefinementEngine.ts`)
   - Takes failure context + original YAML
   - Calls LLM with enriched prompt
   - Generates improved .ox.test

3. **SelfHealingOrchestrator** (`src/application/orchestrators/SelfHealingOrchestrator.ts`)
   - Coordinates generation → execution → analysis → refinement loop
   - Tracks attempt history
   - Decides when to stop trying

4. **CLI Integration** (modify `src/cli.ts`)
   - Add `--self-healing` flag
   - Add `--max-healing-attempts=3` option
   - Wire up the new orchestrator

---

## 📋 **Detailed Design**

### 1. FailureAnalyzer

```typescript
export interface FailureContext {
  error: string;
  failedCommand: OxtestCommand;
  commandIndex: number;
  screenshot?: Buffer;
  pageHTML?: string;
  pageURL?: string;
  availableSelectors?: string[];
}

export class FailureAnalyzer {
  async analyze(
    subtask: Subtask,
    result: ExecutionResult,
    page: Page
  ): Promise<FailureContext> {
    return {
      error: result.error || 'Unknown error',
      failedCommand: subtask.commands[result.failedCommandIndex],
      commandIndex: result.failedCommandIndex,
      screenshot: await page.screenshot(),
      pageHTML: await page.content(),
      pageURL: page.url(),
      availableSelectors: await this.extractSelectors(page)
    };
  }

  private async extractSelectors(page: Page): Promise<string[]> {
    // Extract common selectors from page
    return page.evaluate(() => {
      const selectors: string[] = [];
      // Get all elements with IDs
      document.querySelectorAll('[id]').forEach(el => {
        selectors.push(`#${el.id}`);
      });
      // Get all elements with common classes
      document.querySelectorAll('[class]').forEach(el => {
        el.classList.forEach(cls => {
          selectors.push(`.${cls}`);
        });
      });
      return [...new Set(selectors)].slice(0, 50);
    });
  }
}
```

---

### 2. RefinementEngine

```typescript
export class RefinementEngine {
  constructor(
    private llmProvider: ILLMProvider,
    private oxtestParser: OxtestParser
  ) {}

  async refine(
    originalYAML: TestSuiteYaml,
    failureContext: FailureContext,
    attemptHistory: FailureContext[]
  ): Promise<string> {
    const prompt = this.buildRefinementPrompt(
      originalYAML,
      failureContext,
      attemptHistory
    );

    const response = await this.llmProvider.generate(prompt, {
      systemPrompt: this.buildSystemPrompt()
    });

    return response.content;
  }

  private buildRefinementPrompt(
    yaml: TestSuiteYaml,
    failure: FailureContext,
    history: FailureContext[]
  ): string {
    return `
# Test Refinement Request

## Original Test Specification
${JSON.stringify(yaml, null, 2)}

## Execution Failure
**Error**: ${failure.error}
**Failed Command**: ${failure.failedCommand.type} at step ${failure.commandIndex}
**Page URL**: ${failure.pageURL}

## Page Analysis
Available selectors on the page:
${failure.availableSelectors?.join('\n')}

${history.length > 0 ? `
## Previous Attempts (Failed)
${history.map((h, i) => `
Attempt ${i + 1}:
- Error: ${h.error}
- Failed command: ${h.failedCommand.type}
`).join('\n')}
` : ''}

## Task
Generate an improved OXTest file that fixes the selector issue.
Use selectors that actually exist on the page.
Consider using fallback selectors.

Output ONLY the OXTest commands, no explanation.
`;
  }
}
```

---

### 3. SelfHealingOrchestrator

```typescript
export interface SelfHealingOptions {
  maxAttempts: number;
  enableScreenshots: boolean;
  enableHTMLAnalysis: boolean;
}

export class SelfHealingOrchestrator {
  constructor(
    private yamlParser: YamlParser,
    private refinementEngine: RefinementEngine,
    private failureAnalyzer: FailureAnalyzer,
    private executor: PlaywrightExecutor,
    private contextManager: ExecutionContextManager
  ) {}

  async generateAndExecuteWithHealing(
    yamlPath: string,
    outputDir: string,
    options: SelfHealingOptions
  ): Promise<SelfHealingResult> {
    const yaml = await this.yamlParser.parseFile(yamlPath);
    const attemptHistory: FailureContext[] = [];

    for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
      console.log(`🔄 Attempt ${attempt}/${options.maxAttempts}`);

      // Generate .ox.test file
      let oxtestContent: string;
      if (attempt === 1) {
        // First attempt: use standard generation
        oxtestContent = await this.generateInitial(yaml);
      } else {
        // Subsequent attempts: use refinement
        const lastFailure = attemptHistory[attemptHistory.length - 1];
        oxtestContent = await this.refinementEngine.refine(
          yaml,
          lastFailure,
          attemptHistory
        );
      }

      // Write to file
      const oxtestPath = path.join(outputDir, `test-attempt-${attempt}.ox.test`);
      await fs.promises.writeFile(oxtestPath, oxtestContent);

      // Parse and execute
      const parser = new OxtestParser();
      const commands = await parser.parseFile(oxtestPath);
      const subtask = new Subtask(
        `test-attempt-${attempt}`,
        yaml.name,
        commands
      );

      const orchestrator = new TestOrchestrator(this.executor, this.contextManager);
      const result = await orchestrator.executeSubtaskWithStateTracking(subtask);

      if (result.success) {
        console.log(`✅ Test PASSED on attempt ${attempt}`);
        return {
          success: true,
          attempts: attempt,
          finalOxtestPath: oxtestPath,
          history: attemptHistory
        };
      }

      // Test failed - analyze
      console.log(`❌ Attempt ${attempt} failed, analyzing...`);
      const failureContext = await this.failureAnalyzer.analyze(
        subtask,
        result,
        this.executor.page
      );
      attemptHistory.push(failureContext);
    }

    console.log(`❌ All ${options.maxAttempts} attempts failed`);
    return {
      success: false,
      attempts: options.maxAttempts,
      history: attemptHistory
    };
  }
}
```

---

### 4. CLI Integration

```typescript
// src/cli.ts (additions)

program
  .option('--self-healing', 'Enable self-healing test generation', false)
  .option('--max-healing-attempts <number>', 'Maximum refinement attempts', '3')
  .option('--save-all-attempts', 'Save all attempt files (for debugging)', false);

// In main execution:
if (options.selfHealing) {
  const healingOrchestrator = new SelfHealingOrchestrator(
    yamlParser,
    refinementEngine,
    failureAnalyzer,
    executor,
    contextManager
  );

  const result = await healingOrchestrator.generateAndExecuteWithHealing(
    options.src,
    options.output,
    {
      maxAttempts: parseInt(options.maxHealingAttempts),
      enableScreenshots: true,
      enableHTMLAnalysis: true
    }
  );

  if (result.success) {
    console.log(`✅ Test passed after ${result.attempts} attempts`);
    console.log(`Final working test: ${result.finalOxtestPath}`);
  } else {
    console.log(`❌ Test failed after ${result.attempts} attempts`);
    console.log(`Failure history saved to ${options.output}/failure-analysis.json`);
  }
}
```

---

## 📊 **Usage Examples**

### Example 1: Basic Self-Healing

```bash
# Original YAML with potentially wrong selectors
node dist/cli.js \
  --env=.env \
  --src=shopping-cart.yaml \
  --output=_generated \
  --oxtest \
  --self-healing \
  --max-healing-attempts=3
```

**Expected Output**:
```
🔄 Attempt 1/3
  Generating initial test...
  Executing test...
  ❌ Failed: Element not found with selector: css=.logo

🔄 Attempt 2/3
  Analyzing failure...
  Available selectors: .site-logo, #header-logo, [data-testid="logo"]
  Refining test with LLM...
  Executing test...
  ❌ Failed: Element not found with selector: css=.site-logo

🔄 Attempt 3/3
  Analyzing failure...
  Refining test with LLM...
  Executing test...
  ✅ Test PASSED!

✅ Test passed after 3 attempts
📄 Final working test: _generated/test-attempt-3.ox.test
```

---

### Example 2: With Detailed Analysis

```bash
node dist/cli.js \
  --env=.env \
  --src=login-flow.yaml \
  --output=_generated \
  --oxtest \
  --self-healing \
  --max-healing-attempts=5 \
  --save-all-attempts \
  --reporter=html,json
```

**Generated Files**:
```
_generated/
├── test-attempt-1.ox.test  (failed - wrong selector)
├── test-attempt-2.ox.test  (failed - missing wait)
├── test-attempt-3.ox.test  (passed ✅)
├── failure-analysis.json   (detailed failure history)
├── report.html            (final test report)
└── report.json
```

---

## 🎯 **Benefits**

### 1. **Automatic Selector Discovery**
- LLM sees actual available selectors
- Can choose better alternatives
- Learns from page structure

### 2. **Reduced Manual Effort**
- No need to manually fix tests
- Automatic retry with improvements
- Saves developer time

### 3. **Better Test Quality**
- Multiple refinement iterations
- Learns from failure patterns
- More robust selectors

### 4. **Cost Optimization**
- Uses failure context to avoid repeated mistakes
- Caches successful patterns
- Limits maximum attempts

---

## 📈 **Performance Characteristics**

### Cost Analysis

```
Scenario: Shopping cart test with 5 steps

Without self-healing:
- 1 LLM call for generation: $0.05
- Manual fix time: 15 minutes
- Total cost: $0.05 + developer time

With self-healing (3 attempts):
- Attempt 1: $0.05 (generation)
- Attempt 2: $0.03 (refinement with context)
- Attempt 3: $0.03 (refinement with context)
- Total: $0.11
- Developer time: 0 minutes ✅
```

**ROI**: Saves 15 minutes per failed test at cost of $0.06

---

## 🚀 **Implementation Plan**

### Phase 1: Core Components (1-2 days)
- [ ] Implement FailureAnalyzer
- [ ] Implement RefinementEngine
- [ ] Add tests for both

### Phase 2: Orchestration (1 day)
- [ ] Implement SelfHealingOrchestrator
- [ ] Add integration tests

### Phase 3: CLI Integration (1 day)
- [ ] Add CLI flags
- [ ] Wire up orchestrator
- [ ] Update documentation

### Phase 4: Testing & Polish (1 day)
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Documentation updates

**Total Estimated Time**: 4-5 days

---

## 🔮 **Future Enhancements**

### Phase 2 Features
- **Pattern Learning**: Remember successful fixes for similar failures
- **Selector Scoring**: Use ML to score selector reliability
- **Visual Regression**: Use screenshots to detect layout changes
- **Multi-Step Refinement**: Refine multiple steps at once

---

## 📚 **Related Work**

### Existing Tools with Self-Healing
- **Testim.io**: AI-powered self-healing tests
- **Mabl**: Machine learning test maintenance
- **Applitools**: Visual AI testing with auto-maintenance

### Our Differentiator
- **Open source**: No vendor lock-in
- **LLM-powered**: Uses state-of-the-art AI
- **Transparent**: Full control over refinement process
- **Cost-effective**: Pay only for LLM API calls

---

## ✅ **Acceptance Criteria**

### Must Have
- [ ] Generate test from YAML
- [ ] Execute and detect failures
- [ ] Analyze failure context
- [ ] Refine test with LLM
- [ ] Retry execution
- [ ] Success after ≤3 attempts for simple selector issues

### Nice to Have
- [ ] Save all attempt files
- [ ] Detailed failure analysis report
- [ ] Configurable max attempts
- [ ] Progress indicators

---

## 🎊 **Conclusion**

This feature would complete the **full AI-driven testing loop**:
```
Human writes YAML → AI generates test → AI fixes failures → Working test ✅
```

**User's exact request**: ✅ Fulfilled
**Implementation complexity**: Medium
**Value to users**: Very High
**Recommended priority**: High

---

**Status**: Ready for implementation
**Estimated effort**: 4-5 days
**Would you like me to implement this?** 🚀
