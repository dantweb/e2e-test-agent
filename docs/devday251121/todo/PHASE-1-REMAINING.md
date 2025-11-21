# Phase 1: Planning Implementation - Remaining Tasks

**Current Status**: RED Phase Complete
**Progress**: 30% (3/10 tasks)
**Estimated Time Remaining**: 2h 5min

---

## Next Immediate Task 🎯

### Task 4: Implement createPlan() Method
**Priority**: HIGH
**Estimated Time**: 30 minutes

**File**: `src/application/engines/IterativeDecompositionEngine.ts`

**What to do**:
1. Add private method `createPlan(instruction: string): Promise<string[]>`
2. Extract HTML using `this.htmlExtractor.extractSimplified()`
3. Build prompts using `this.promptBuilder.buildPlanningSystemPrompt()` and `buildPlanningPrompt()`
4. Call LLM with `this.llmProvider.generate()`
5. Parse response with `this.parsePlanSteps()`
6. Return steps array (or [instruction] if empty)

**Code template**:
```typescript
private async createPlan(instruction: string): Promise<string[]> {
  if (this.verbose) {
    console.log('Creating plan for instruction:', instruction);
  }

  // 1. Extract HTML
  const html = await this.htmlExtractor.extractSimplified();

  // 2. Build planning prompts
  const systemPrompt = this.promptBuilder.buildPlanningSystemPrompt();
  const userPrompt = this.promptBuilder.buildPlanningPrompt(instruction, html);

  if (this.verbose) {
    console.log('Planning prompt:', userPrompt.substring(0, 200) + '...');
  }

  // 3. Call LLM
  const response = await this.llmProvider.generate(userPrompt, {
    systemPrompt,
    model: this.model,
  });

  // 4. Parse steps
  const steps = this.parsePlanSteps(response.content);

  if (this.verbose) {
    console.log(`Plan created with ${steps.length} steps:`, steps);
  }

  // 5. Fallback if empty
  if (steps.length === 0) {
    return [instruction];
  }

  return steps;
}
```

---

## Remaining Tasks

### Task 5: Implement parsePlanSteps() Method
**Priority**: HIGH
**Estimated Time**: 20 minutes

**File**: `src/application/engines/IterativeDecompositionEngine.ts`

**What to do**:
1. Add private method `parsePlanSteps(response: string): string[]`
2. Split response into lines
3. Parse numbered lists (1. 2. 3.)
4. Parse bullet points (- *)
5. Skip headers and empty lines
6. Return array of step strings

**Code template**:
```typescript
private parsePlanSteps(response: string): string[] {
  const lines = response.split('\n');
  const steps: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and short lines
    if (!trimmed || trimmed.length < 5) continue;

    // Skip headers
    if (trimmed.toLowerCase().startsWith('plan')) continue;
    if (trimmed.toLowerCase().startsWith('step')) continue;

    // Match numbered lists: "1. Step text"
    const numberedMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (numberedMatch) {
      steps.push(numberedMatch[1].trim());
      continue;
    }

    // Match bullet points: "- Step text" or "* Step text"
    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      steps.push(bulletMatch[1].trim());
      continue;
    }

    // If line is substantial (>10 chars), treat as step
    if (trimmed.length > 10 && !trimmed.endsWith(':')) {
      steps.push(trimmed);
    }
  }

  return steps;
}
```

---

### Task 6: Add Planning Prompts to OxtestPromptBuilder
**Priority**: HIGH
**Estimated Time**: 30 minutes

**File**: `src/infrastructure/prompts/OxtestPromptBuilder.ts`

**What to do**:
1. Add `buildPlanningSystemPrompt(): string` method
2. Add `buildPlanningPrompt(instruction: string, html: string): string` method
3. Follow patterns from existing prompt methods

**Code template for buildPlanningSystemPrompt()**:
```typescript
public buildPlanningSystemPrompt(): string {
  return `You are an expert test automation planner. Your job is to break down high-level test instructions into atomic, sequential steps.

GUIDELINES:
- Each step should be a single, clear action or verification
- Steps should be in logical order
- Be specific about what to click, fill, or verify
- Include wait steps where page transitions occur
- Include verification steps to confirm success

OUTPUT FORMAT:
Return a numbered list of steps, one per line:
1. First step description
2. Second step description
3. Third step description

Do not include code, selectors, or technical details - just describe what needs to happen.`;
}
```

**Code template for buildPlanningPrompt()**:
```typescript
public buildPlanningPrompt(instruction: string, html: string): string {
  return `Break down this test instruction into atomic steps:

INSTRUCTION: ${instruction}

CURRENT PAGE HTML:
${html}

Analyze the HTML and the instruction. Create a step-by-step plan that accomplishes the instruction.

Return ONLY a numbered list of steps, nothing else.`;
}
```

---

### Task 7: Run Tests - GREEN Phase
**Priority**: HIGH
**Estimated Time**: 20 minutes

**What to do**:
```bash
# Run tests
npx jest tests/unit/engines/IterativeDecompositionEngine.planning.test.ts

# Expected: All 14 tests pass ✅
```

**If tests fail**:
1. Check error messages
2. Debug implementation
3. Fix issues
4. Re-run tests
5. Repeat until green

---

### Task 8: Test in Docker
**Priority**: MEDIUM
**Estimated Time**: 10 minutes

**What to do**:
```bash
./bin/test-docker.sh unit
```

**Expected**: Tests pass in Docker environment

---

### Task 9: Run Pre-Commit Checks
**Priority**: MEDIUM
**Estimated Time**: 10 minutes

**What to do**:
```bash
./bin/pre-commit-check.sh
```

**Expected**:
- ✅ ESLint passes
- ✅ TypeScript type check passes
- ✅ Format check passes
- ✅ Unit tests pass

---

### Task 10: Update Documentation
**Priority**: LOW
**Estimated Time**: 15 minutes

**Files to update**:
- `docs/devday251121/status/PHASE-1-PLANNING.md` - Update with GREEN phase results
- `docs/devday251121/done/PHASE-1-COMPLETE.md` - Create completion summary
- `docs/devday251121/todo/PHASE-2-COMMAND-GENERATION.md` - Create next phase tasks

---

## Phase 1 Completion Criteria

Phase 1 is complete when:
- [x] Planning test file created ✅
- [x] Tests compile ✅
- [x] Tests fail (RED phase) ✅
- [ ] `createPlan()` implemented 🔄 **NEXT**
- [ ] `parsePlanSteps()` implemented
- [ ] Planning prompts added
- [ ] Tests pass (GREEN phase)
- [ ] Tested in Docker
- [ ] Documentation updated

**Current**: 3/9 criteria met (33%)

---

## Time Estimate Summary

| Task | Time | Status |
|------|------|--------|
| 4. Implement createPlan() | 30min | 🔄 Next |
| 5. Implement parsePlanSteps() | 20min | 📋 Pending |
| 6. Add planning prompts | 30min | 📋 Pending |
| 7. GREEN phase | 20min | 📋 Pending |
| 8. Test in Docker | 10min | 📋 Pending |
| 9. Pre-commit checks | 10min | 📋 Pending |
| 10. Update docs | 15min | 📋 Pending |
| **Total Remaining** | **2h 5min** | |

---

## Notes

- Keep verbose logging consistent with existing code
- Follow existing code style and patterns
- Don't over-engineer - implement minimal code to pass tests
- Test after each method implementation
- Commit after GREEN phase achieved

---

**Last Updated**: 2025-11-21
**Next Task**: Implement createPlan() method
