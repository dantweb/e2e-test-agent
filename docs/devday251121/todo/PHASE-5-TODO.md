# Phase 5: Validation Timing & Language Handling - TODO List

**Date**: 2025-11-21
**Status**: Not Started
**Plan**: See `docs/devday251121/PHASE-5-VALIDATION-TIMING-LANGUAGE-FIX-PLAN.md`

---

## Overview

Fix critical issues discovered during Phase 4 integration testing:
1. **Language Handling**: German website not detected, generates English selectors
2. **Validation Timing**: Validates against current page, but commands target future pages
3. **Error Handling**: LLM timeouts and malformed responses

**Approach**: TDD-first with SOLID principles
**Estimated Time**: 6-8 hours (3 phases)

---

## Phase 5.1: Language Detection (2-3 hours)

### ✅ Planning
- [x] Root cause analysis complete
- [x] TDD plan documented
- [x] SOLID design defined

### ⏸️ Implementation
- [ ] **RED**: Write `LanguageDetectionService.test.ts` (15 tests)
  - Test `detectLanguage()` for German, English, meta tags
  - Test `getLanguageContext()` for translation mapping
  - Test `extractCommonUITerms()` from HTML
  - **Time**: 30 minutes

- [ ] **GREEN**: Implement `LanguageDetectionService.ts`
  - Parse `<html lang="...">` attribute
  - Parse `<meta content-language>` tag
  - Map language codes to names
  - Provide translation context (English ↔ German)
  - **Time**: 1 hour

- [ ] **RED**: Write `IterativeDecompositionEngine.language.test.ts` (10 tests)
  - Test language detection in decompose flow
  - Test German context passed to LLM
  - Test German selectors generated
  - **Time**: 30 minutes

- [ ] **GREEN**: Integrate language detection into engine
  - Add `LanguageDetectionService` to constructor
  - Detect language in `decompose()` method
  - Pass language context to planning prompt
  - Pass language context to command generation prompt
  - **Time**: 1 hour

- [ ] **REFACTOR**: Update `OxtestPromptBuilder`
  - Add optional `languageContext` parameter to prompts
  - Include context in system message
  - **Time**: 30 minutes

- [ ] **VALIDATE**: Integration test
  - Run against German website (PayPal)
  - Verify German selectors generated
  - Check validation pass rate
  - **Time**: 30 minutes

**Success Criteria**:
- ✓ 25 new unit tests passing
- ✓ German language detected from HTML
- ✓ German text selectors generated ("Anmelden", not "Login")
- ✓ Validation failures due to language <10% (from 60%)

---

## Phase 5.2: Smart Validation Timing (3-4 hours)

### ⏸️ Page State Tracking
- [ ] **RED**: Write `PageStateTracker.test.ts` (12 tests)
  - Test `recordStateChange()` tracking
  - Test `hasStateChanged()` detection
  - Test `shouldValidateNow()` logic
  - **Time**: 30 minutes

- [ ] **GREEN**: Implement `PageStateTracker.ts`
  - Track state changes per step
  - Determine if validation should happen
  - Maintain current step index
  - **Time**: 45 minutes

### ⏸️ State Change Detection
- [ ] **RED**: Write `StateChangeDetector.test.ts` (8 tests)
  - Test detection of clicks (state-changing)
  - Test detection of navigation (state-changing)
  - Test detection of type/fill (NOT state-changing)
  - Test detection of assertions (NOT state-changing)
  - **Time**: 20 minutes

- [ ] **GREEN**: Implement `StateChangeDetector.ts`
  - Keyword-based detection ("click", "navigate", "submit")
  - Returns true/false for state change
  - **Time**: 30 minutes

### ⏸️ Validation Strategy
- [ ] **RED**: Write `SmartValidationStrategy.test.ts` (10 tests)
  - Test validation for current page elements
  - Test skipping for future page elements
  - Test always validate navigate/wait
  - **Time**: 30 minutes

- [ ] **GREEN**: Implement `SmartValidationStrategy.ts`
  - Interface: `ValidationStrategy`
  - Implementation: `SmartValidationStrategy`
  - Check page state tracker before validation
  - **Time**: 45 minutes

### ⏸️ Integration
- [ ] **RED**: Write `IterativeDecompositionEngine.smart-validation.test.ts` (15 tests)
  - Test validation skipping for future states
  - Test validation for current states
  - Test state change recording from plan
  - **Time**: 45 minutes

- [ ] **GREEN**: Integrate into `IterativeDecompositionEngine`
  - Add `PageStateTracker` to constructor
  - Add `StateChangeDetector` to constructor
  - Add `ValidationStrategy` to constructor
  - Analyze plan steps for state changes
  - Check strategy before validating commands
  - **Time**: 1.5 hours

- [ ] **VALIDATE**: Integration test
  - Run against multi-step flow
  - Measure validation skip rate (target >50%)
  - Verify refinement rate decreased
  - **Time**: 30 minutes

**Success Criteria**:
- ✓ 45 new unit tests passing
- ✓ Validation skipped for future page states
- ✓ Validation skip rate >50%
- ✓ Refinement rate <20% (from 40%)
- ✓ Unnecessary LLM calls reduced by ~25%

---

## Phase 5.3: Error Handling & Robustness (1-2 hours)

### ⏸️ Resilient LLM Provider
- [ ] **RED**: Write `ResilientLLMProvider.test.ts` (12 tests)
  - Test retry on timeout
  - Test retry on "terminated" error
  - Test max retries exceeded
  - Test no retry on non-retryable errors
  - Test timeout handling
  - Test malformed response detection (incomplete xpath)
  - **Time**: 30 minutes

- [ ] **GREEN**: Implement `ResilientLLMProvider.ts`
  - Wrap base LLM provider
  - Retry logic (max 3 attempts)
  - Timeout handling (60s default)
  - Detect incomplete selectors
  - Exponential backoff
  - **Time**: 1 hour

- [ ] **GREEN**: Integrate into CLI
  - Wrap LLM provider in resilient wrapper
  - Configure retry/timeout settings
  - **Time**: 15 minutes

- [ ] **VALIDATE**: Integration test
  - Run against real API
  - Verify no "terminated" errors
  - Check retry behavior on timeout
  - **Time**: 15 minutes

**Success Criteria**:
- ✓ 12 new unit tests passing
- ✓ LLM timeouts trigger retry
- ✓ Malformed responses trigger retry
- ✓ Timeout error rate <5% (from 12.5%)
- ✓ No jobs fail mid-execution

---

## Final Validation

### Regression Testing
- [ ] Run full unit test suite
  - **Expected**: 775 existing + 82 new = 857 tests passing
  - **Time**: 5 minutes

### Integration Testing
- [ ] Test against German website (PayPal)
  - **Expected**: All 8 jobs complete, German selectors, <15% validation failures
  - **Time**: 10 minutes

- [ ] Test against English website
  - **Expected**: English selectors, tests execute successfully
  - **Time**: 10 minutes

### Metrics Collection
- [ ] Create `PHASE-5-METRICS.md`
  - Track validation skip rate
  - Track refinement rate
  - Track LLM call count
  - Track timeout/retry rate
  - Compare before/after
  - **Time**: 15 minutes

---

## Documentation

- [ ] Update `SESSION-STATUS.md`
  - Add Phase 5 completion
  - Update progress to 100%
  - **Time**: 10 minutes

- [ ] Create `PHASE-5-COMPLETE.md`
  - Document what was fixed
  - Show before/after metrics
  - List all tests passing
  - **Time**: 20 minutes

- [ ] Update main README
  - Add language support section
  - Document smart validation
  - Add troubleshooting guide
  - **Time**: 30 minutes

---

## Success Criteria Summary

### Quantitative Metrics

| Metric | Before | After (Target) | Status |
|--------|--------|----------------|--------|
| Validation failures (language) | 60% | <10% | ⏸️ Not Started |
| Validation failures (timing) | 37.5% | <15% | ⏸️ Not Started |
| Unnecessary refinement | 40% | <20% | ⏸️ Not Started |
| LLM timeout errors | 12.5% | <5% | ⏸️ Not Started |
| Total LLM calls per job | 1 + 1.4N | 1 + 1.2N | ⏸️ Not Started |
| Unit tests passing | 775 | 857 | ⏸️ Not Started |

### Qualitative Checks

- [ ] German website generates German selectors
- [ ] English website generates English selectors
- [ ] Commands targeting future pages skip validation
- [ ] Commands on current page validate normally
- [ ] LLM timeouts retry automatically
- [ ] Malformed responses retry automatically
- [ ] Zero regressions in existing tests
- [ ] Generated tests execute successfully

---

## Timeline

**Day 1**: Phase 5.1 - Language Detection (2-3 hours)
**Day 2**: Phase 5.2 - Smart Validation (3-4 hours)
**Day 3**: Phase 5.3 - Error Handling (1-2 hours)
**Total**: 6-8 hours over 2-3 days

---

## Next Action

**Start with**: Phase 5.1, Step 1 - Write `LanguageDetectionService.test.ts` (RED phase)

**Command**:
```bash
npm run test:unit -- LanguageDetectionService.test.ts --watch
```

**Goal**: See failing tests (RED), then implement to make them pass (GREEN).

---

**Status**: ⏸️ Ready to Start
**Confidence**: HIGH ✅ (TDD + SOLID ensures quality)
**Risk**: LOW (incremental, reversible, fully tested)
