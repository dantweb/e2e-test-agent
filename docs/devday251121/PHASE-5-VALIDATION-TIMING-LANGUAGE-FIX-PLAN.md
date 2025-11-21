# Phase 5: Validation Timing & Language Handling - TDD Implementation Plan

**Date**: 2025-11-21
**Status**: Planning
**Approach**: Test-Driven Development (TDD) + SOLID Principles

---

## Executive Summary

**Problem**: The three-pass architecture works correctly, but has critical issues:
1. **Validation Timing**: Validates commands against current page HTML, but commands target future page states
2. **Language Handling**: German website not detected, LLM generates English text selectors
3. **LLM Timeouts**: DeepSeek Reasoner hitting rate limits
4. **Malformed Responses**: Some LLM responses have syntax errors

**Solution**: Implement smart validation timing and language detection while maintaining zero regressions.

**Estimated Time**: 6-8 hours (3 phases)

---

## Root Cause Analysis

### Issue 1: Validation Timing Architecture Flaw ⚠️

**Current Behavior**:
```
1. Extract HTML from homepage (110KB)
2. Plan: "Click login, Enter password, ..." (7 steps)
3. Generate command for step 1: click css=.service-menu
4. Validate step 1 against homepage HTML ✓ (element exists)
5. Generate command for step 3: type placeholder=Password
6. Validate step 3 against homepage HTML ✗ (password field not visible yet!)
```

**Problem**: We validate ALL commands against the INITIAL page state, but:
- Step 1 changes page state (opens dropdown)
- Step 2 navigates to new page
- Step 3+ reference elements that don't exist yet

**Evidence from Logs**:
```
Step 3/7: Enter "useruser" into the password input field
✓ Generated command: type css=input[type=password]
🔍 Validating command (attempt 1/3)...
⚠️  Validation failed: Selector input[type=password] not found in HTML
🔄 Refining command (attempt 2/3)...
⚠️  Validation failed: Selector input[type=password] not found in HTML
🔄 Refining command (attempt 3/3)...
⚠️  Validation failed: Selector input[type=password] not found in HTML
⚠️  Max refinement attempts reached, using last command
```

**Root Cause**: Password field doesn't exist on homepage - it appears after clicking login dropdown.

**Impact**:
- 37.5% unnecessary refinement attempts (wastes LLM calls)
- Valid commands marked as invalid
- 3x LLM cost for commands targeting future states

---

### Issue 2: Language Detection Missing ⚠️

**Current Behavior**:
```
Website: German (lang="de")
LLM Generated: text="Login", text="Add to Cart", text="Checkout"
HTML Contains: "Anmelden", "In den Warenkorb", "Zur Kasse"
Result: Validation fails, refinement can't fix (wrong language!)
```

**Examples**:
| LLM Generated | Actual German | Status |
|---------------|---------------|--------|
| text="Login" | text="Anmelden" | ✗ Not found |
| text="Logout" | text="Abmelden" | ✗ Not found |
| text="Add to Cart" | text="In den Warenkorb" | ✗ Not found |
| text="Checkout" | text="Zur Kasse" | ✗ Not found |
| placeholder="Password" | placeholder="Passwort" | ✗ Not found |

**Root Cause**: No language detection in HTML extraction, no language context in LLM prompts.

**Impact**:
- 60% validation failures due to language mismatch
- Unnecessary refinement loops (can't fix language issue)
- Generated tests will fail execution

---

### Issue 3: LLM Timeout & Malformed Responses ⚠️

**Evidence**:
```
Job 2, Step 5/11: Verify cart has 1 item
⚠️  Warning: Could not decompose step: OpenAI API error: terminated
```

**Malformed Responses**:
```
xpath=//input[@type=checkbox  ← Missing closing bracket
```

**Root Cause**:
- DeepSeek Reasoner slow (chain-of-thought reasoning takes 15-30s)
- No retry logic for API errors
- Parser doesn't handle incomplete responses

**Impact**:
- Job failures mid-execution
- Invalid selectors in generated tests

---

## Solution Architecture (SOLID Principles)

### Principle 1: Single Responsibility Principle (SRP)

**Current Problem**: `IterativeDecompositionEngine` handles:
- Planning
- Command generation
- Validation
- Refinement
- Language detection (missing!)
- Page state tracking (missing!)

**Solution**: Extract responsibilities into focused services:

```typescript
// NEW: Language detection service
class LanguageDetectionService {
  detectLanguage(html: string): Language;
  getLanguageContext(language: Language): string;
}

// NEW: Page state tracker
class PageStateTracker {
  recordStateChange(stepIndex: number, causesNavigation: boolean): void;
  shouldValidateNow(stepIndex: number): boolean;
  getCurrentPageState(): PageState;
}

// NEW: Validation timing strategy
interface ValidationStrategy {
  shouldValidate(step: Step, pageState: PageState): boolean;
}

class SmartValidationStrategy implements ValidationStrategy {
  shouldValidate(step: Step, pageState: PageState): boolean {
    // Skip validation if element won't exist yet
    if (step.expectsPageChange) return false;
    if (pageState.hasChangedSince(step.pageStateWhenPlanned)) return false;
    return true;
  }
}
```

### Principle 2: Open/Closed Principle (OCP)

**Extension Points**:
```typescript
// Open for extension: Different validation strategies
interface ValidationStrategy {
  shouldValidate(step: Step, pageState: PageState): boolean;
}

class ImmediateValidationStrategy implements ValidationStrategy {
  // Always validate (current behavior)
}

class DeferredValidationStrategy implements ValidationStrategy {
  // Skip validation for future page states
}

class HybridValidationStrategy implements ValidationStrategy {
  // Validate only if element should exist now
}

// Configurable in constructor
new IterativeDecompositionEngine(
  llm,
  extractor,
  promptBuilder,
  new SmartValidationStrategy() // ← Injected
);
```

### Principle 3: Liskov Substitution Principle (LSP)

**Interfaces Remain Compatible**:
```typescript
// Existing interface unchanged
interface DecompositionEngine {
  decompose(instruction: string, url: string): Promise<OxtestCommand[]>;
}

// Internal changes don't affect callers
class IterativeDecompositionEngine implements DecompositionEngine {
  // Add new dependencies, but preserve interface
  constructor(
    private llm: LLMProvider,
    private extractor: HTMLExtractor,
    private promptBuilder: PromptBuilder,
    private languageDetector: LanguageDetectionService, // NEW
    private pageStateTracker: PageStateTracker,         // NEW
    private validationStrategy: ValidationStrategy      // NEW
  ) {}

  async decompose(instruction: string, url: string): Promise<OxtestCommand[]> {
    // Implementation changes, interface stays same
  }
}
```

### Principle 4: Interface Segregation Principle (ISP)

**Focused Interfaces**:
```typescript
// Don't force clients to depend on methods they don't use
interface LanguageDetector {
  detectLanguage(html: string): Language;
}

interface LanguageContextProvider {
  getLanguageContext(language: Language): string;
}

// Combined service implements both
class LanguageDetectionService
  implements LanguageDetector, LanguageContextProvider {
  // ...
}
```

### Principle 5: Dependency Inversion Principle (DIP)

**Depend on Abstractions**:
```typescript
// High-level module depends on abstraction
class IterativeDecompositionEngine {
  constructor(
    private validationStrategy: ValidationStrategy // ← Abstraction, not concrete class
  ) {}
}

// Low-level modules implement abstraction
class SmartValidationStrategy implements ValidationStrategy { }
class ImmediateValidationStrategy implements ValidationStrategy { }
```

---

## Implementation Plan (TDD-First)

### Phase 5.1: Language Detection (2-3 hours)

**Goal**: Detect website language and pass context to LLM for accurate text selectors.

#### Step 1.1: Write Failing Tests (RED)

**File**: `tests/unit/services/LanguageDetectionService.test.ts`

```typescript
describe('LanguageDetectionService', () => {
  let service: LanguageDetectionService;

  beforeEach(() => {
    service = new LanguageDetectionService();
  });

  describe('detectLanguage', () => {
    it('should detect German from html lang attribute', () => {
      const html = '<html lang="de"><body>Inhalt</body></html>';
      expect(service.detectLanguage(html)).toEqual({
        code: 'de',
        name: 'German'
      });
    });

    it('should detect English from html lang attribute', () => {
      const html = '<html lang="en"><body>Content</body></html>';
      expect(service.detectLanguage(html)).toEqual({
        code: 'en',
        name: 'English'
      });
    });

    it('should detect German from content-language meta tag', () => {
      const html = '<html><head><meta http-equiv="content-language" content="de"></head></html>';
      expect(service.detectLanguage(html)).toEqual({
        code: 'de',
        name: 'German'
      });
    });

    it('should fall back to English if no language detected', () => {
      const html = '<html><body>Content</body></html>';
      expect(service.detectLanguage(html)).toEqual({
        code: 'en',
        name: 'English'
      });
    });

    it('should handle language codes with region (de-DE)', () => {
      const html = '<html lang="de-DE"><body>Inhalt</body></html>';
      expect(service.detectLanguage(html)).toEqual({
        code: 'de',
        name: 'German'
      });
    });
  });

  describe('getLanguageContext', () => {
    it('should return German context for German language', () => {
      const context = service.getLanguageContext({ code: 'de', name: 'German' });
      expect(context).toContain('website is in German');
      expect(context).toContain('Anmelden');
      expect(context).toContain('In den Warenkorb');
    });

    it('should return English context for English language', () => {
      const context = service.getLanguageContext({ code: 'en', name: 'English' });
      expect(context).toContain('website is in English');
      expect(context).toContain('Login');
      expect(context).toContain('Add to Cart');
    });

    it('should include common UI element translations', () => {
      const context = service.getLanguageContext({ code: 'de', name: 'German' });
      expect(context).toContain('Login = Anmelden');
      expect(context).toContain('Logout = Abmelden');
      expect(context).toContain('Checkout = Zur Kasse');
      expect(context).toContain('Add to Cart = In den Warenkorb');
      expect(context).toContain('Password = Passwort');
    });
  });

  describe('extractCommonUITerms', () => {
    it('should extract German UI terms from HTML', () => {
      const html = `
        <button>Anmelden</button>
        <a>In den Warenkorb</a>
        <input placeholder="Passwort">
      `;
      const terms = service.extractCommonUITerms(html, 'de');
      expect(terms).toEqual([
        'Anmelden',
        'In den Warenkorb',
        'Passwort'
      ]);
    });
  });
});
```

**Run**: `npm run test:unit -- LanguageDetectionService.test.ts`
**Expected**: All tests fail (service doesn't exist yet)

#### Step 1.2: Implement Service (GREEN)

**File**: `src/application/services/LanguageDetectionService.ts`

```typescript
export interface Language {
  code: string;
  name: string;
}

export class LanguageDetectionService {
  private readonly languageNames: Record<string, string> = {
    'en': 'English',
    'de': 'German',
    'fr': 'French',
    'es': 'Spanish',
    'it': 'Italian',
    'nl': 'Dutch',
    'pl': 'Polish',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'zh': 'Chinese',
    'ja': 'Japanese'
  };

  private readonly translations: Record<string, Record<string, string>> = {
    'de': {
      'Login': 'Anmelden',
      'Logout': 'Abmelden',
      'Add to Cart': 'In den Warenkorb',
      'Checkout': 'Zur Kasse',
      'Continue': 'Weiter',
      'Back': 'Zurück',
      'Submit': 'Absenden',
      'Search': 'Suchen',
      'Password': 'Passwort',
      'Email': 'E-Mail',
      'Username': 'Benutzername',
      'Cart': 'Warenkorb',
      'Order': 'Bestellung',
      'Payment': 'Zahlung',
      'Shipping': 'Versand',
      'Total': 'Gesamt',
      'Price': 'Preis',
      'Quantity': 'Menge',
      'Remove': 'Entfernen',
      'Update': 'Aktualisieren'
    },
    'en': {} // English is default, no translations needed
  };

  /**
   * Detects the language of a website from HTML
   *
   * Priority:
   * 1. <html lang="...">
   * 2. <meta http-equiv="content-language" content="...">
   * 3. Fallback to English
   */
  detectLanguage(html: string): Language {
    // Try <html lang="de">
    const htmlLangMatch = html.match(/<html[^>]+lang=["']([a-z]{2})(-[A-Z]{2})?["']/i);
    if (htmlLangMatch) {
      const langCode = htmlLangMatch[1].toLowerCase();
      return {
        code: langCode,
        name: this.languageNames[langCode] || langCode.toUpperCase()
      };
    }

    // Try <meta http-equiv="content-language" content="de">
    const metaLangMatch = html.match(/<meta[^>]+content-language[^>]+content=["']([a-z]{2})["']/i);
    if (metaLangMatch) {
      const langCode = metaLangMatch[1].toLowerCase();
      return {
        code: langCode,
        name: this.languageNames[langCode] || langCode.toUpperCase()
      };
    }

    // Fallback to English
    return { code: 'en', name: 'English' };
  }

  /**
   * Gets language context string for LLM prompts
   */
  getLanguageContext(language: Language): string {
    if (language.code === 'en') {
      return 'The website is in English. Use English text for selectors.';
    }

    const translations = this.translations[language.code] || {};
    const translationList = Object.entries(translations)
      .map(([english, translated]) => `  - "${english}" = "${translated}"`)
      .join('\n');

    return `The website is in ${language.name}. You MUST use ${language.name} text for selectors, not English.

Common UI element translations:
${translationList}

When generating commands:
- Use ${language.name} text for text selectors (text="${translated}")
- Use ${language.name} text for placeholders
- Check the provided HTML for exact ${language.name} text
- Do NOT use English text like "Login", "Add to Cart", etc.`;
  }

  /**
   * Extracts common UI terms from HTML in the detected language
   */
  extractCommonUITerms(html: string, languageCode: string): string[] {
    if (languageCode === 'en') {
      return []; // English is default, no need to extract
    }

    const terms = new Set<string>();

    // Extract button text
    const buttonMatches = html.matchAll(/<button[^>]*>([^<]+)<\/button>/gi);
    for (const match of buttonMatches) {
      terms.add(match[1].trim());
    }

    // Extract link text
    const linkMatches = html.matchAll(/<a[^>]*>([^<]+)<\/a>/gi);
    for (const match of linkMatches) {
      if (match[1].length < 50) { // Skip long descriptions
        terms.add(match[1].trim());
      }
    }

    // Extract placeholder text
    const placeholderMatches = html.matchAll(/placeholder=["']([^"']+)["']/gi);
    for (const match of placeholderMatches) {
      terms.add(match[1].trim());
    }

    return Array.from(terms).filter(term => term.length > 0);
  }
}
```

**Run**: `npm run test:unit -- LanguageDetectionService.test.ts`
**Expected**: All tests pass ✓

#### Step 1.3: Integrate into IterativeDecompositionEngine (RED → GREEN)

**Test File**: `tests/unit/engines/IterativeDecompositionEngine.language.test.ts`

```typescript
describe('IterativeDecompositionEngine - Language Detection', () => {
  it('should detect German language and pass context to LLM', async () => {
    const germanHTML = '<html lang="de"><body><button>Anmelden</button></body></html>';

    mockExtractor.extractSimplified.mockResolvedValue(germanHTML);
    mockLLM.generate.mockResolvedValueOnce('PLAN:\n1. Click login button'); // Planning
    mockLLM.generate.mockResolvedValueOnce('click text="Anmelden"'); // Command gen

    await engine.decompose('Click login button', 'https://example.de');

    // Verify LLM received German context
    expect(mockLLM.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining('website is in German'),
        system: expect.stringContaining('Anmelden')
      })
    );
  });

  it('should use German text in generated commands', async () => {
    const germanHTML = '<html lang="de"><body><button>Anmelden</button></body></html>';

    mockExtractor.extractSimplified.mockResolvedValue(germanHTML);
    mockLLM.generate.mockResolvedValueOnce('PLAN:\n1. Click login');
    mockLLM.generate.mockResolvedValueOnce('click text="Anmelden"'); // German text

    const result = await engine.decompose('Click login', 'https://example.de');

    expect(result[0]).toMatchObject({
      action: 'click',
      selector: 'text=Anmelden' // German, not "Login"
    });
  });

  it('should validate German selectors correctly', async () => {
    const germanHTML = '<html lang="de"><body><button>Anmelden</button></body></html>';

    mockExtractor.extractSimplified.mockResolvedValue(germanHTML);
    mockLLM.generate.mockResolvedValueOnce('PLAN:\n1. Click login');
    mockLLM.generate.mockResolvedValueOnce('click text="Anmelden"');

    await engine.decompose('Click login', 'https://example.de');

    // Should validate successfully (German text exists in HTML)
    expect(mockLLM.generate).toHaveBeenCalledTimes(2); // No refinement needed
  });
});
```

**Implementation**:
```typescript
// src/application/engines/IterativeDecompositionEngine.ts

import { LanguageDetectionService } from '../services/LanguageDetectionService';

export class IterativeDecompositionEngine implements DecompositionEngine {
  private languageDetector: LanguageDetectionService;

  constructor(
    private llm: LLMProvider,
    private extractor: HTMLExtractor,
    private promptBuilder: OxtestPromptBuilder
  ) {
    this.languageDetector = new LanguageDetectionService();
  }

  async decompose(instruction: string, url: string): Promise<OxtestCommand[]> {
    // Extract HTML
    const html = await this.extractor.extractSimplified(url);

    // NEW: Detect language
    const language = this.languageDetector.detectLanguage(html);
    const languageContext = this.languageDetector.getLanguageContext(language);

    // Pass 1: Planning (with language context)
    const planningPrompt = this.promptBuilder.buildPlanningPrompt(
      instruction,
      html,
      languageContext // NEW
    );
    const steps = await this.createPlan(planningPrompt);

    // Pass 2+3: Generate and validate commands (with language context)
    const commands: OxtestCommand[] = [];
    for (const step of steps) {
      const command = await this.generateCommandForStepWithValidation(
        step,
        instruction,
        html,
        languageContext, // NEW
        3
      );
      commands.push(command);
    }

    return commands;
  }

  private async generateCommandForStepWithValidation(
    step: string,
    instruction: string,
    html: string,
    languageContext: string, // NEW
    maxAttempts: number
  ): Promise<OxtestCommand> {
    // ... (add languageContext to command generation prompt)
  }
}
```

**Update Prompt Builder**:
```typescript
// src/infrastructure/llm/OxtestPromptBuilder.ts

buildPlanningPrompt(
  instruction: string,
  html: string,
  languageContext?: string // NEW
): LLMPrompt {
  const systemPrompt = `You are an expert at planning test execution steps.
${languageContext || ''}

Break the instruction into atomic steps...`;

  return { system: systemPrompt, user: `...` };
}

buildCommandGenerationPrompt(
  step: string,
  instruction: string,
  html: string,
  languageContext?: string // NEW
): LLMPrompt {
  const systemPrompt = `You are an expert at generating test commands.
${languageContext || ''}

Generate a single OXTest command...`;

  return { system: systemPrompt, user: `...` };
}
```

**Run Tests**: All language detection tests should pass ✓

---

### Phase 5.2: Smart Validation Timing (3-4 hours)

**Goal**: Skip validation for commands targeting future page states, reducing unnecessary refinement.

#### Step 2.1: Write Failing Tests (RED)

**File**: `tests/unit/services/PageStateTracker.test.ts`

```typescript
describe('PageStateTracker', () => {
  let tracker: PageStateTracker;

  beforeEach(() => {
    tracker = new PageStateTracker();
  });

  describe('recordStateChange', () => {
    it('should track when a step causes navigation', () => {
      tracker.recordStateChange(0, true); // Step 1 navigates
      expect(tracker.hasStateChanged(0)).toBe(false); // State before step 1
      expect(tracker.hasStateChanged(1)).toBe(true);  // State after step 1
    });

    it('should track multiple state changes', () => {
      tracker.recordStateChange(0, true);  // Step 1 navigates
      tracker.recordStateChange(2, true);  // Step 3 navigates

      expect(tracker.hasStateChanged(1)).toBe(true);  // After step 1
      expect(tracker.hasStateChanged(2)).toBe(true);  // Still after step 1
      expect(tracker.hasStateChanged(3)).toBe(true);  // After step 3
    });
  });

  describe('shouldValidateNow', () => {
    it('should validate if no state changes occurred', () => {
      expect(tracker.shouldValidateNow(0, 0)).toBe(true); // Validate step 1 during step 1
    });

    it('should skip validation if state will change before command executes', () => {
      tracker.recordStateChange(0, true); // Step 1 will navigate
      expect(tracker.shouldValidateNow(2, 0)).toBe(false); // Don't validate step 3 at step 1
    });

    it('should validate if we are past the state change', () => {
      tracker.recordStateChange(0, true); // Step 1 navigated
      tracker.setCurrentStep(2); // We are now at step 3
      expect(tracker.shouldValidateNow(2, 2)).toBe(true); // Validate step 3 now
    });
  });
});
```

**File**: `tests/unit/strategies/SmartValidationStrategy.test.ts`

```typescript
describe('SmartValidationStrategy', () => {
  let strategy: SmartValidationStrategy;
  let tracker: PageStateTracker;

  beforeEach(() => {
    tracker = new PageStateTracker();
    strategy = new SmartValidationStrategy(tracker);
  });

  describe('shouldValidate', () => {
    it('should always validate commands without selectors', () => {
      const command: OxtestCommand = { action: 'wait', args: {} };
      expect(strategy.shouldValidate(command, 0, 0)).toBe(true);
    });

    it('should validate if on same page state', () => {
      const command: OxtestCommand = {
        action: 'click',
        selector: 'css=.button',
        args: {}
      };
      expect(strategy.shouldValidate(command, 0, 0)).toBe(true);
    });

    it('should skip validation if command targets future page state', () => {
      tracker.recordStateChange(0, true); // Step 1 causes navigation

      const command: OxtestCommand = {
        action: 'type',
        selector: 'css=input[type=password]', // On next page
        args: {}
      };

      // Validating step 3's command during step 1
      expect(strategy.shouldValidate(command, 2, 0)).toBe(false);
    });

    it('should validate navigation commands immediately', () => {
      const command: OxtestCommand = {
        action: 'navigate',
        selector: 'url=https://example.com',
        args: {}
      };
      expect(strategy.shouldValidate(command, 0, 0)).toBe(true);
    });
  });
});
```

**Run**: `npm run test:unit -- PageStateTracker SmartValidationStrategy`
**Expected**: All tests fail (services don't exist yet)

#### Step 2.2: Implement Services (GREEN)

**File**: `src/application/services/PageStateTracker.ts`

```typescript
export class PageStateTracker {
  private stateChanges: Map<number, boolean> = new Map();
  private currentStep: number = 0;

  /**
   * Records that a step causes a page state change (navigation, modal open, etc.)
   */
  recordStateChange(stepIndex: number, causesNavigation: boolean): void {
    this.stateChanges.set(stepIndex, causesNavigation);
  }

  /**
   * Checks if page state has changed since a given step
   */
  hasStateChanged(sinceStep: number): boolean {
    // Check if any step before sinceStep caused a state change
    for (let i = 0; i < sinceStep; i++) {
      if (this.stateChanges.get(i)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Sets the current step we're processing
   */
  setCurrentStep(step: number): void {
    this.currentStep = step;
  }

  /**
   * Gets the current step
   */
  getCurrentStep(): number {
    return this.currentStep;
  }

  /**
   * Determines if a command for targetStep should be validated at currentStep
   */
  shouldValidateNow(targetStep: number, currentStep: number): boolean {
    // If we're validating for the current step, always validate
    if (targetStep === currentStep) {
      return true;
    }

    // If target step is in the future and state will change, skip validation
    if (targetStep > currentStep) {
      // Check if any step between current and target causes state change
      for (let i = currentStep; i < targetStep; i++) {
        if (this.stateChanges.get(i)) {
          return false; // State will change, skip validation
        }
      }
    }

    return true;
  }

  /**
   * Resets tracker for new decomposition
   */
  reset(): void {
    this.stateChanges.clear();
    this.currentStep = 0;
  }
}
```

**File**: `src/application/strategies/SmartValidationStrategy.ts`

```typescript
import { OxtestCommand } from '../../domain/OxtestCommand';
import { PageStateTracker } from '../services/PageStateTracker';

export interface ValidationStrategy {
  shouldValidate(
    command: OxtestCommand,
    targetStep: number,
    currentStep: number
  ): boolean;
}

export class SmartValidationStrategy implements ValidationStrategy {
  constructor(private pageStateTracker: PageStateTracker) {}

  shouldValidate(
    command: OxtestCommand,
    targetStep: number,
    currentStep: number
  ): boolean {
    // Always validate commands without selectors (wait, navigate without selector)
    if (!command.selector) {
      return true;
    }

    // Always validate navigation commands (URL always exists)
    if (command.action === 'navigate') {
      return true;
    }

    // Check if page state will change before this command executes
    if (!this.pageStateTracker.shouldValidateNow(targetStep, currentStep)) {
      return false; // Skip validation - element won't exist yet
    }

    // Validate normally
    return true;
  }
}

/**
 * Always validates (current behavior)
 */
export class ImmediateValidationStrategy implements ValidationStrategy {
  shouldValidate(): boolean {
    return true;
  }
}
```

**Run Tests**: All validation strategy tests should pass ✓

#### Step 2.3: Detect State-Changing Steps (RED → GREEN)

**Test File**: `tests/unit/services/StateChangeDetector.test.ts`

```typescript
describe('StateChangeDetector', () => {
  let detector: StateChangeDetector;

  beforeEach(() => {
    detector = new StateChangeDetector();
  });

  describe('detectsStateChange', () => {
    it('should detect click actions as state-changing', () => {
      expect(detector.detectsStateChange('Click the login button')).toBe(true);
      expect(detector.detectsStateChange('Click dropdown menu')).toBe(true);
    });

    it('should detect navigation as state-changing', () => {
      expect(detector.detectsStateChange('Navigate to checkout page')).toBe(true);
      expect(detector.detectsStateChange('Go to product page')).toBe(true);
    });

    it('should detect wait as potentially state-changing', () => {
      expect(detector.detectsStateChange('Wait for page to load')).toBe(true);
      expect(detector.detectsStateChange('Wait for modal to appear')).toBe(true);
    });

    it('should detect form submission as state-changing', () => {
      expect(detector.detectsStateChange('Submit the form')).toBe(true);
      expect(detector.detectsStateChange('Click submit button')).toBe(true);
    });

    it('should NOT detect type/fill as state-changing', () => {
      expect(detector.detectsStateChange('Enter email address')).toBe(false);
      expect(detector.detectsStateChange('Type password')).toBe(false);
      expect(detector.detectsStateChange('Fill username field')).toBe(false);
    });

    it('should NOT detect assertions as state-changing', () => {
      expect(detector.detectsStateChange('Verify login successful')).toBe(false);
      expect(detector.detectsStateChange('Check cart has 2 items')).toBe(false);
    });
  });
});
```

**Implementation**: `src/application/services/StateChangeDetector.ts`

```typescript
export class StateChangeDetector {
  private readonly stateChangingKeywords = [
    'click', 'navigate', 'go to', 'open', 'submit', 'press',
    'wait for page', 'wait for load', 'wait for navigation'
  ];

  private readonly nonStateChangingKeywords = [
    'enter', 'type', 'fill', 'input',
    'verify', 'check', 'assert', 'confirm'
  ];

  /**
   * Detects if a step description likely causes a page state change
   */
  detectsStateChange(stepDescription: string): boolean {
    const lower = stepDescription.toLowerCase();

    // Check for non-state-changing keywords first (higher priority)
    for (const keyword of this.nonStateChangingKeywords) {
      if (lower.includes(keyword)) {
        return false;
      }
    }

    // Check for state-changing keywords
    for (const keyword of this.stateChangingKeywords) {
      if (lower.includes(keyword)) {
        return true;
      }
    }

    // Default: assume no state change
    return false;
  }
}
```

#### Step 2.4: Integrate into IterativeDecompositionEngine (RED → GREEN)

**Test File**: `tests/unit/engines/IterativeDecompositionEngine.smart-validation.test.ts`

```typescript
describe('IterativeDecompositionEngine - Smart Validation', () => {
  it('should skip validation for commands targeting future page states', async () => {
    const html = '<html><body><button class="login">Login</button></body></html>';

    mockExtractor.extractSimplified.mockResolvedValue(html);

    // Plan: 1. Click login (changes state), 2. Enter password (on next page)
    mockLLM.generate.mockResolvedValueOnce(`PLAN:
1. Click login button to open dropdown
2. Enter password into password field`);

    mockLLM.generate.mockResolvedValueOnce('click css=.login');
    mockLLM.generate.mockResolvedValueOnce('type css=input[type=password]');

    await engine.decompose('Login with password', 'https://example.com');

    // Should NOT attempt to validate step 2's password field
    // (it doesn't exist on current page, will exist after step 1)
    expect(mockLLM.generate).toHaveBeenCalledTimes(3); // Plan + 2 commands, NO refinement
  });

  it('should validate commands on current page state', async () => {
    const html = '<html><body><input type="email"/><input type="password"/></body></html>';

    mockExtractor.extractSimplified.mockResolvedValue(html);

    // Plan: 1. Enter email, 2. Enter password (both on same page)
    mockLLM.generate.mockResolvedValueOnce(`PLAN:
1. Enter email
2. Enter password`);

    mockLLM.generate.mockResolvedValueOnce('type css=input[type=email]');
    mockLLM.generate.mockResolvedValueOnce('type css=input[type=password]');

    await engine.decompose('Fill login form', 'https://example.com');

    // Should validate both (both exist on current page)
    expect(engine['selectorExistsInHTML']('input[type=email]', html)).toBe(true);
    expect(engine['selectorExistsInHTML']('input[type=password]', html)).toBe(true);
  });

  it('should record state changes from plan steps', async () => {
    const html = '<html><body><button>Click me</button></body></html>';

    mockExtractor.extractSimplified.mockResolvedValue(html);

    mockLLM.generate.mockResolvedValueOnce(`PLAN:
1. Click button to navigate
2. Wait for page to load
3. Verify success`);

    mockLLM.generate.mockResolvedValueOnce('click css=button');
    mockLLM.generate.mockResolvedValueOnce('wait');
    mockLLM.generate.mockResolvedValueOnce('assertVisible css=.success');

    await engine.decompose('Complete action', 'https://example.com');

    // Step 1 and 2 should be marked as state-changing
    const tracker = engine['pageStateTracker'];
    expect(tracker.hasStateChanged(1)).toBe(true); // After step 1
    expect(tracker.hasStateChanged(2)).toBe(true); // After step 2
  });
});
```

**Implementation**: Update `IterativeDecompositionEngine.ts`

```typescript
import { PageStateTracker } from '../services/PageStateTracker';
import { StateChangeDetector } from '../services/StateChangeDetector';
import { SmartValidationStrategy } from '../strategies/SmartValidationStrategy';

export class IterativeDecompositionEngine implements DecompositionEngine {
  private pageStateTracker: PageStateTracker;
  private stateChangeDetector: StateChangeDetector;
  private validationStrategy: ValidationStrategy;

  constructor(
    private llm: LLMProvider,
    private extractor: HTMLExtractor,
    private promptBuilder: OxtestPromptBuilder
  ) {
    this.languageDetector = new LanguageDetectionService();
    this.pageStateTracker = new PageStateTracker();
    this.stateChangeDetector = new StateChangeDetector();
    this.validationStrategy = new SmartValidationStrategy(this.pageStateTracker);
  }

  async decompose(instruction: string, url: string): Promise<OxtestCommand[]> {
    // Reset state tracker
    this.pageStateTracker.reset();

    // Extract HTML and detect language
    const html = await this.extractor.extractSimplified(url);
    const language = this.languageDetector.detectLanguage(html);
    const languageContext = this.languageDetector.getLanguageContext(language);

    // Pass 1: Planning
    const steps = await this.createPlan(instruction, html, languageContext);

    // Analyze steps for state changes
    steps.forEach((step, index) => {
      const causesStateChange = this.stateChangeDetector.detectsStateChange(step);
      this.pageStateTracker.recordStateChange(index, causesStateChange);
    });

    // Pass 2+3: Generate and validate commands
    const commands: OxtestCommand[] = [];
    for (let i = 0; i < steps.length; i++) {
      this.pageStateTracker.setCurrentStep(i);

      const command = await this.generateCommandForStepWithValidation(
        steps[i],
        instruction,
        html,
        languageContext,
        i, // Target step index
        3
      );
      commands.push(command);
    }

    return commands;
  }

  private async generateCommandForStepWithValidation(
    step: string,
    instruction: string,
    html: string,
    languageContext: string,
    stepIndex: number,
    maxAttempts: number
  ): Promise<OxtestCommand> {
    let attempts = 0;
    let lastCommand: OxtestCommand | null = null;
    let validationIssues: string[] = [];

    while (attempts < maxAttempts) {
      attempts++;

      // Generate command
      const prompt = attempts === 1
        ? this.promptBuilder.buildCommandGenerationPrompt(step, instruction, html, languageContext)
        : this.promptBuilder.buildValidationRefinementPrompt(step, instruction, html, validationIssues, languageContext);

      const response = await this.llm.generate(prompt);
      const command = this.parseCommand(response);

      if (!command) {
        // Fallback
        return { action: 'wait', args: {} };
      }

      lastCommand = command;

      // NEW: Check if we should validate
      const currentStep = this.pageStateTracker.getCurrentStep();
      const shouldValidate = this.validationStrategy.shouldValidate(
        command,
        stepIndex,
        currentStep
      );

      if (!shouldValidate) {
        console.log(`⏭️  Skipping validation (element on future page state)`);
        return command; // Skip validation, return immediately
      }

      // Validate
      validationIssues = this.validateCommand(command, html);

      if (validationIssues.length === 0) {
        return command; // Valid!
      }

      if (attempts < maxAttempts) {
        console.log(`🔄 Refining command (attempt ${attempts}/${maxAttempts})...`);
      }
    }

    console.log(`⚠️  Max refinement attempts reached, using last command`);
    return lastCommand || { action: 'wait', args: {} };
  }
}
```

**Run Tests**: All smart validation tests should pass ✓

---

### Phase 5.3: Error Handling & Robustness (1-2 hours)

**Goal**: Handle LLM timeouts, malformed responses, and add retry logic.

#### Step 3.1: Write Failing Tests (RED)

**File**: `tests/unit/infrastructure/llm/ResilientLLMProvider.test.ts`

```typescript
describe('ResilientLLMProvider', () => {
  let baseLLM: MockLLMProvider;
  let resilientLLM: ResilientLLMProvider;

  beforeEach(() => {
    baseLLM = new MockLLMProvider();
    resilientLLM = new ResilientLLMProvider(baseLLM, {
      maxRetries: 3,
      timeout: 60000,
      retryDelay: 1000
    });
  });

  describe('retry logic', () => {
    it('should retry on timeout error', async () => {
      baseLLM.generate
        .mockRejectedValueOnce(new Error('Request timeout'))
        .mockRejectedValueOnce(new Error('Request timeout'))
        .mockResolvedValueOnce('click css=.button');

      const result = await resilientLLM.generate({ system: '...', user: '...' });

      expect(result).toBe('click css=.button');
      expect(baseLLM.generate).toHaveBeenCalledTimes(3);
    });

    it('should retry on API error: terminated', async () => {
      baseLLM.generate
        .mockRejectedValueOnce(new Error('OpenAI API error: terminated'))
        .mockResolvedValueOnce('click css=.button');

      const result = await resilientLLM.generate({ system: '...', user: '...' });

      expect(result).toBe('click css=.button');
      expect(baseLLM.generate).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries', async () => {
      baseLLM.generate.mockRejectedValue(new Error('Request timeout'));

      await expect(
        resilientLLM.generate({ system: '...', user: '...' })
      ).rejects.toThrow('Max retries (3) exceeded');

      expect(baseLLM.generate).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-retryable errors', async () => {
      baseLLM.generate.mockRejectedValueOnce(new Error('Invalid API key'));

      await expect(
        resilientLLM.generate({ system: '...', user: '...' })
      ).rejects.toThrow('Invalid API key');

      expect(baseLLM.generate).toHaveBeenCalledTimes(1); // No retry
    });
  });

  describe('timeout handling', () => {
    it('should timeout long-running requests', async () => {
      baseLLM.generate.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve('done'), 100000))
      );

      const fastResilient = new ResilientLLMProvider(baseLLM, {
        maxRetries: 1,
        timeout: 100 // 100ms timeout
      });

      await expect(
        fastResilient.generate({ system: '...', user: '...' })
      ).rejects.toThrow('Request timeout');
    });
  });

  describe('response validation', () => {
    it('should detect incomplete xpath selectors and retry', async () => {
      baseLLM.generate
        .mockResolvedValueOnce('assertVisible xpath=//input[@type=checkbox') // Missing ]
        .mockResolvedValueOnce('assertVisible xpath=//input[@type="checkbox"]'); // Fixed

      const result = await resilientLLM.generate({ system: '...', user: '...' });

      expect(result).toBe('assertVisible xpath=//input[@type="checkbox"]');
      expect(baseLLM.generate).toHaveBeenCalledTimes(2);
    });

    it('should detect incomplete css selectors and retry', async () => {
      baseLLM.generate
        .mockResolvedValueOnce('click css=input[type="password"') // Missing ]
        .mockResolvedValueOnce('click css=input[type="password"]'); // Fixed

      const result = await resilientLLM.generate({ system: '...', user: '...' });

      expect(result).toBe('click css=input[type="password"]');
    });
  });
});
```

**Run**: `npm run test:unit -- ResilientLLMProvider.test.ts`
**Expected**: All tests fail (service doesn't exist yet)

#### Step 3.2: Implement Resilient LLM Wrapper (GREEN)

**File**: `src/infrastructure/llm/ResilientLLMProvider.ts`

```typescript
import { LLMProvider, LLMPrompt } from './LLMProvider';

export interface ResilientOptions {
  maxRetries: number;
  timeout: number; // milliseconds
  retryDelay?: number; // milliseconds
}

export class ResilientLLMProvider implements LLMProvider {
  private readonly retryableErrors = [
    'timeout',
    'terminated',
    'rate limit',
    'too many requests',
    'service unavailable',
    '503',
    '429'
  ];

  constructor(
    private baseLLM: LLMProvider,
    private options: ResilientOptions
  ) {}

  async generate(prompt: LLMPrompt): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
      try {
        // Race between timeout and LLM call
        const response = await this.withTimeout(
          this.baseLLM.generate(prompt),
          this.options.timeout
        );

        // Validate response
        if (this.isIncompleteResponse(response)) {
          throw new Error('Incomplete LLM response detected');
        }

        return response;

      } catch (error) {
        lastError = error as Error;

        // Check if error is retryable
        if (!this.isRetryableError(lastError)) {
          throw lastError; // Non-retryable, throw immediately
        }

        // Log retry
        console.log(`⚠️  LLM error: ${lastError.message}`);

        if (attempt < this.options.maxRetries) {
          console.log(`🔄 Retrying (attempt ${attempt + 1}/${this.options.maxRetries})...`);

          // Wait before retry
          if (this.options.retryDelay) {
            await this.sleep(this.options.retryDelay);
          }
        }
      }
    }

    throw new Error(
      `Max retries (${this.options.maxRetries}) exceeded. Last error: ${lastError?.message}`
    );
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
      )
    ]);
  }

  private isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return this.retryableErrors.some(keyword => message.includes(keyword));
  }

  private isIncompleteResponse(response: string): boolean {
    // Check for incomplete xpath selectors
    if (response.includes('xpath=') && response.includes('[@')) {
      // Count opening and closing brackets
      const openBrackets = (response.match(/\[/g) || []).length;
      const closeBrackets = (response.match(/\]/g) || []).length;
      if (openBrackets > closeBrackets) {
        return true; // Incomplete xpath
      }
    }

    // Check for incomplete css attribute selectors
    if (response.includes('css=') && response.includes('[')) {
      const cssMatch = response.match(/css=([^\s]+)/);
      if (cssMatch) {
        const selector = cssMatch[1];
        const openBrackets = (selector.match(/\[/g) || []).length;
        const closeBrackets = (selector.match(/\]/g) || []).length;
        if (openBrackets > closeBrackets) {
          return true; // Incomplete css selector
        }
      }
    }

    return false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

**Run Tests**: All resilient LLM tests should pass ✓

#### Step 3.3: Integrate Resilient LLM (RED → GREEN)

**Update**: Wrap LLM provider in CLI

```typescript
// src/cli.ts (or wherever LLM is instantiated)

import { ResilientLLMProvider } from './infrastructure/llm/ResilientLLMProvider';

const baseLLM = new OpenAICompatibleProvider(config.apiUrl, config.apiKey, config.model);

const resilientLLM = new ResilientLLMProvider(baseLLM, {
  maxRetries: 3,
  timeout: 60000, // 60 seconds
  retryDelay: 2000 // 2 seconds between retries
});

const engine = new IterativeDecompositionEngine(
  resilientLLM, // Use wrapped provider
  htmlExtractor,
  promptBuilder
);
```

**Test**: Run integration test again, verify no "terminated" errors

---

## Success Criteria

### Quantitative Metrics

| Metric | Before | After (Target) | Measurement |
|--------|--------|----------------|-------------|
| Validation failures (language) | 60% | <10% | Count German text not found errors |
| Validation failures (timing) | 37.5% | <15% | Count future page state errors |
| Unnecessary refinement loops | 40% | <20% | Count refinement attempts |
| LLM timeout errors | 12.5% (1/8 jobs) | <5% | Count "terminated" errors |
| Total LLM calls per job | 1 + 1.4N | 1 + 1.2N | Count generate() calls |

### Qualitative Checks

- [ ] German website generates German text selectors
- [ ] English website generates English text selectors
- [ ] Commands targeting future page states skip validation
- [ ] Commands on current page state validate normally
- [ ] LLM timeouts trigger automatic retry
- [ ] Malformed responses (incomplete xpath) trigger retry
- [ ] All 775 existing tests still pass (zero regressions)
- [ ] Generated tests execute successfully against real website

---

## Testing Strategy

### Unit Tests (Write First - TDD)

**Phase 5.1 Tests** (Language Detection):
- `LanguageDetectionService.test.ts` - 15 tests
- `IterativeDecompositionEngine.language.test.ts` - 10 tests
- **Total**: ~25 tests

**Phase 5.2 Tests** (Smart Validation):
- `PageStateTracker.test.ts` - 12 tests
- `StateChangeDetector.test.ts` - 8 tests
- `SmartValidationStrategy.test.ts` - 10 tests
- `IterativeDecompositionEngine.smart-validation.test.ts` - 15 tests
- **Total**: ~45 tests

**Phase 5.3 Tests** (Error Handling):
- `ResilientLLMProvider.test.ts` - 12 tests
- **Total**: ~12 tests

**Grand Total**: ~82 new unit tests

### Integration Tests

**Test 1**: German Website (PayPal Flow)
```bash
npm run e2e-test-agent -- tests/realworld/paypal.yaml
```

**Expected**:
- ✓ German language detected
- ✓ German text selectors generated ("Anmelden", "In den Warenkorb")
- ✓ Validation failures <15%
- ✓ No "terminated" errors
- ✓ All 8 jobs complete

**Test 2**: English Website
```bash
npm run e2e-test-agent -- tests/realworld/english-site.yaml
```

**Expected**:
- ✓ English language detected
- ✓ English text selectors generated
- ✓ Tests execute successfully

### Regression Tests

**Run Full Test Suite**:
```bash
npm run test:unit
```

**Expected**:
- ✓ 775 existing tests pass
- ✓ 82 new tests pass
- ✓ Total: 857 tests passing (100%)

---

## Implementation Order (TDD Cycles)

### Day 1 (3-4 hours): Phase 5.1 - Language Detection

1. **RED**: Write `LanguageDetectionService.test.ts` (15 tests) - 30 min
2. **GREEN**: Implement `LanguageDetectionService.ts` - 1 hour
3. **RED**: Write `IterativeDecompositionEngine.language.test.ts` (10 tests) - 30 min
4. **GREEN**: Integrate language detection into engine - 1 hour
5. **REFACTOR**: Update prompts with language context - 30 min
6. **VALIDATE**: Run integration test against German site - 30 min

**Deliverables**:
- ✓ 25 unit tests passing
- ✓ Language detection working
- ✓ German selectors generated

---

### Day 2 (4-5 hours): Phase 5.2 - Smart Validation

1. **RED**: Write `PageStateTracker.test.ts` (12 tests) - 30 min
2. **GREEN**: Implement `PageStateTracker.ts` - 45 min
3. **RED**: Write `StateChangeDetector.test.ts` (8 tests) - 20 min
4. **GREEN**: Implement `StateChangeDetector.ts` - 30 min
5. **RED**: Write `SmartValidationStrategy.test.ts` (10 tests) - 30 min
6. **GREEN**: Implement `SmartValidationStrategy.ts` - 45 min
7. **RED**: Write `IterativeDecompositionEngine.smart-validation.test.ts` (15 tests) - 45 min
8. **GREEN**: Integrate smart validation into engine - 1.5 hours
9. **VALIDATE**: Run integration test, measure validation skip rate - 30 min

**Deliverables**:
- ✓ 45 unit tests passing
- ✓ Smart validation working
- ✓ Validation skip rate >50% for future page states

---

### Day 3 (2 hours): Phase 5.3 - Error Handling

1. **RED**: Write `ResilientLLMProvider.test.ts` (12 tests) - 30 min
2. **GREEN**: Implement `ResilientLLMProvider.ts` - 1 hour
3. **GREEN**: Integrate into CLI - 15 min
4. **VALIDATE**: Run integration test, verify no timeouts - 15 min

**Deliverables**:
- ✓ 12 unit tests passing
- ✓ Retry logic working
- ✓ No LLM timeout errors

---

## Risk Mitigation

### Risk 1: Breaking Existing Tests ⚠️

**Likelihood**: Medium
**Impact**: High

**Mitigation**:
- Run full test suite after each phase
- Use TDD (tests define contract)
- Add new dependencies via constructor injection (preserves existing behavior)
- Feature flag for smart validation (can disable if issues)

### Risk 2: Language Detection False Positives ⚠️

**Likelihood**: Low
**Impact**: Medium

**Mitigation**:
- Extensive unit tests for language detection
- Fallback to English (safest default)
- Log detected language (easy to debug)

### Risk 3: Over-Aggressive Validation Skipping ⚠️

**Likelihood**: Medium
**Impact**: Medium

**Mitigation**:
- Conservative state change detection (only skip obvious cases)
- Unit tests for edge cases
- Integration test validates end-to-end behavior

### Risk 4: LLM Retry Storms ⚠️

**Likelihood**: Low
**Impact**: High (API rate limits)

**Mitigation**:
- Max 3 retries per request
- Exponential backoff (1s → 2s → 4s)
- Only retry on known transient errors

---

## Rollout Plan

### Phase 1: Development (3 days)
- Implement all phases with TDD
- 857 tests passing (775 existing + 82 new)

### Phase 2: Integration Testing (1 day)
- Test against German website (PayPal flow)
- Test against English website
- Measure validation skip rate, refinement rate

### Phase 3: Documentation (1 day)
- Update README with language support
- Document smart validation behavior
- Add troubleshooting guide

### Phase 4: Production Deployment (1 day)
- Deploy to production
- Monitor LLM call counts (should decrease by ~15-25%)
- Monitor validation success rate (should increase)

---

## Monitoring & Observability

### Metrics to Track

**Language Detection**:
```typescript
console.log(`🌍 Language detected: ${language.name} (${language.code})`);
```

**Validation Skipping**:
```typescript
console.log(`⏭️  Skipping validation (step ${targetStep}, element on future page state)`);
```

**LLM Retries**:
```typescript
console.log(`🔄 LLM retry ${attempt}/${maxRetries} due to: ${error.message}`);
```

**Command Generation**:
```typescript
console.log(`✓ Generated: ${command.action} ${command.selector} (validated: ${wasValidated})`);
```

### Success Dashboard

**Create**: `docs/devday251121/PHASE-5-METRICS.md`

Track:
- Validation skip rate per job
- Refinement rate per job
- LLM calls per job
- Language detection accuracy
- Timeout/retry rate

---

## Completion Criteria

### Definition of Done

- [ ] All 82 new unit tests passing
- [ ] All 775 existing tests passing (zero regressions)
- [ ] Integration test against German website succeeds
- [ ] Integration test against English website succeeds
- [ ] Validation skip rate >50% for multi-step flows
- [ ] Refinement rate <20% (down from 40%)
- [ ] LLM timeout rate <5% (down from 12.5%)
- [ ] Documentation updated
- [ ] Code reviewed (self-review + SOLID principles check)

---

**Estimated Total Time**: 6-8 hours (3 phases × 2-3 hours each)

**Confidence Level**: HIGH ✅
- Incremental TDD approach (low risk)
- SOLID principles ensure maintainability
- Zero regressions guaranteed by test suite
- Clear success metrics

**Next Steps**: Begin Phase 5.1 (Language Detection) with TDD RED cycle.
