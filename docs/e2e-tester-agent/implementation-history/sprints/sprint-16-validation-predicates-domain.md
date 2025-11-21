# Sprint 16: Move Validation Predicates to Domain Layer

**Priority**: HIGH (Critical Gap)
**Duration**: 2-3 days
**Dependencies**: None
**Status**: PLANNED
**Addresses**: Architecture Deviation - Missing Domain-Level Validation Predicates

---

## 🎯 Sprint Goals

Move validation logic from `PredicateValidationEngine` (Layer 3) to proper domain-level `ValidationPredicate` implementations (Layer 2) as documented in architecture.

**Current State**:
- PredicateValidationEngine has hardcoded validation types
- Validation logic scattered in Application layer
- Not extensible

**Target State**:
- Rich ValidationPredicate interface in domain
- Concrete implementations (DomExistsValidation, TextContainsValidation, etc.)
- PredicateValidationEngine orchestrates domain validations
- Easily extensible for new validation types

---

## 📋 Key Tasks

### 1. Create ValidationType Enum (0.5 days)
```typescript
// src/domain/enums/ValidationType.ts
export enum ValidationType {
  Exists = 'exists',
  NotExists = 'not_exists',
  Visible = 'visible',
  Text = 'text',
  Value = 'value',
  Url = 'url',
  Count = 'count',
  Custom = 'custom', // For LLM-based validation
}
```

### 2. Create ValidationPredicate Interface (0.5 days)
```typescript
// src/domain/interfaces/ValidationPredicate.ts
export interface ValidationContext {
  readonly page: Page;
  readonly html?: string;
  readonly url?: string;
}

export interface ValidationResult {
  readonly passed: boolean;
  readonly message?: string;
  readonly actualValue?: unknown;
  readonly expectedValue?: unknown;
}

export interface ValidationPredicate {
  readonly type: ValidationType;
  readonly description: string;
  readonly params: Record<string, unknown>;

  evaluate(context: ValidationContext): Promise<ValidationResult>;
  toString(): string;
}
```

### 3. Implement Concrete Validation Classes (1-2 days)

Create these validation classes:
- **ExistsValidation**: Check if element exists
- **NotExistsValidation**: Check if element doesn't exist
- **VisibleValidation**: Check if element is visible
- **TextValidation**: Check element text content
- **ValueValidation**: Check input/select value
- **UrlValidation**: Check URL matches pattern
- **CountValidation**: Check element count

Each class should:
- Implement ValidationPredicate interface
- Have clear constructor with typed params
- Provide detailed error messages
- Be fully unit tested

**Example**:
```typescript
export class ExistsValidation implements ValidationPredicate {
  readonly type = ValidationType.Exists;
  readonly description: string;
  readonly params: { selector: string };

  constructor(selector: string, description?: string) {
    this.params = { selector };
    this.description = description || `Element ${selector} should exist`;
  }

  async evaluate(context: ValidationContext): Promise<ValidationResult> {
    try {
      const element = await context.page.locator(this.params.selector).first();
      const count = await element.count();

      return {
        passed: count > 0,
        message: count > 0
          ? `Element ${this.params.selector} exists`
          : `Element ${this.params.selector} not found`,
        actualValue: count,
        expectedValue: 'at least 1',
      };
    } catch (error) {
      return {
        passed: false,
        message: `Error checking existence: ${(error as Error).message}`,
      };
    }
  }

  toString(): string {
    return `Exists(${this.params.selector})`;
  }
}
```

### 4. Update Subtask Entity (0.5 days)
Add `acceptance` field to Subtask:
```typescript
export interface SubtaskConstructorParams {
  // ... existing fields
  readonly acceptance?: ReadonlyArray<ValidationPredicate>;
}
```

### 5. Refactor PredicateValidationEngine (1 day)
- Keep as orchestrator only
- Use domain ValidationPredicates
- Remove hardcoded validation logic
- Delegate to predicate.evaluate()

### 6. Update ConfigValidator (0.5 days)
Parse acceptance criteria from YAML and create ValidationPredicate instances.

---

## 🧪 Testing Strategy

- **Unit Tests**: Each validation class has 10+ tests
- **Integration Tests**: ValidationEngine + Domain Predicates
- **Edge Cases**: Error handling, timeouts, invalid selectors

---

## 📊 Success Metrics

- ✅ 80+ new tests passing
- ✅ Validation logic moved to domain layer
- ✅ PredicateValidationEngine simplified (< 100 lines)
- ✅ Architecture alignment: 90% → 95%

---

## 🚀 Deliverables

1. ValidationPredicate interface
2. 7 concrete validation classes
3. Updated Subtask entity
4. Refactored PredicateValidationEngine
5. 80+ tests
6. Documentation

---

**Files to Create** (9 files):
- `src/domain/enums/ValidationType.ts`
- `src/domain/interfaces/ValidationPredicate.ts`
- `src/domain/validation/ExistsValidation.ts`
- `src/domain/validation/NotExistsValidation.ts`
- `src/domain/validation/VisibleValidation.ts`
- `src/domain/validation/TextValidation.ts`
- `src/domain/validation/ValueValidation.ts`
- `src/domain/validation/UrlValidation.ts`
- `src/domain/validation/CountValidation.ts`

**Files to Modify** (3 files):
- `src/domain/entities/Subtask.ts`
- `src/application/orchestrators/PredicateValidationEngine.ts`
- `src/configuration/ConfigValidator.ts`

---

**Sprint Owner**: TBD
**Start Date**: TBD
**Target End Date**: TBD
