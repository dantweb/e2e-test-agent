# Sprint 2: Configuration Layer - REMAINING TASKS

**Status:** Partially complete (YAML schema done)
**Priority:** HIGH (Required for Sprint 3)
**Estimated Effort:** 9-13 hours

---

## Tasks Remaining

### 1. YAML File Parser ⏸️
**Priority:** HIGH
**Estimated Time:** 2-3 hours
**Dependencies:** YamlSchema (completed)

#### Files to Create
- `src/configuration/YamlParser.ts`
- `tests/unit/configuration/YamlParser.test.ts`

#### Implementation Requirements
```typescript
export class YamlParser {
  /**
   * Parses a YAML file and validates against schema.
   * @throws {YamlParseError} If file cannot be read or parsed
   * @throws {ZodError} If validation fails
   */
  parseFile(filePath: string): TestSuiteYaml;

  /**
   * Parses YAML string content.
   * @throws {YamlParseError} If string cannot be parsed
   * @throws {ZodError} If validation fails
   */
  parseString(yamlString: string): TestSuiteYaml;

  /**
   * Validates file without throwing (returns result object).
   */
  validateFile(filePath: string): {
    valid: boolean;
    data?: TestSuiteYaml;
    errors?: string[]
  };
}
```

#### Test Cases (Minimum)
- ✓ Parse valid YAML file
- ✓ Parse YAML string
- ✓ Reject malformed YAML
- ✓ Reject invalid schema
- ✓ Handle file not found
- ✓ Handle permission errors
- ✓ Provide helpful error messages with line numbers
- ✓ Support both .yaml and .yml extensions
- ✓ Handle UTF-8 encoding
- ✓ Parse large files (>1MB)

#### Error Handling
- Custom `YamlParseError` class
- Include file path in error messages
- Include line/column numbers for YAML syntax errors
- Pretty-print Zod validation errors

---

### 2. Environment Variable Resolver ⏸️
**Priority:** MEDIUM
**Estimated Time:** 2-3 hours
**Dependencies:** YamlParser

#### Files to Create
- `src/configuration/EnvironmentResolver.ts`
- `tests/unit/configuration/EnvironmentResolver.test.ts`

#### Implementation Requirements
```typescript
export class EnvironmentResolver {
  /**
   * Resolves environment variables in test suite configuration.
   * Supports ${VAR_NAME} and ${VAR_NAME:-default} syntax.
   */
  resolve(config: TestSuiteYaml): TestSuiteYaml;

  /**
   * Resolves variables in a single string.
   */
  resolveString(value: string, envVars?: Record<string, string>): string;

  /**
   * Validates all required environment variables are set.
   * @returns Array of missing variable names
   */
  validateRequiredVars(config: TestSuiteYaml): string[];

  /**
   * Loads variables from .env file.
   */
  loadEnvFile(filePath: string): Record<string, string>;
}
```

#### Features to Implement
- Variable substitution: `${BASE_URL}` → `https://example.com`
- Default values: `${PORT:-8080}` → `8080` if PORT not set
- Nested resolution: `${API_URL}/${ENDPOINT}`
- Environment precedence:
  1. Process environment variables
  2. .env file
  3. YAML env section
  4. Default values
- Circular reference detection
- Undefined variable warnings

#### Test Cases (Minimum)
- ✓ Resolve simple variable
- ✓ Resolve variable with default
- ✓ Resolve nested variables
- ✓ Use process.env values
- ✓ Use .env file values
- ✓ Use YAML env section values
- ✓ Respect precedence order
- ✓ Detect circular references
- ✓ Warn on undefined variables
- ✓ Leave non-variable strings unchanged
- ✓ Handle special characters in values
- ✓ Handle empty values

---

### 3. Configuration Validator ⏸️
**Priority:** HIGH
**Estimated Time:** 3-4 hours
**Dependencies:** EnvironmentResolver

#### Files to Create
- `src/configuration/ConfigValidator.ts`
- `tests/unit/configuration/ConfigValidator.test.ts`

#### Implementation Requirements
```typescript
export class ConfigValidator {
  /**
   * Performs semantic validation beyond schema validation.
   */
  validate(config: TestSuiteYaml): ValidationResult;

  /**
   * Converts YAML config to domain entities.
   */
  convertToDomainEntities(config: TestSuiteYaml): {
    subtasks: Map<string, Subtask>;
    tasks: Map<string, Task>;
  };

  /**
   * Validates subtask references in tasks.
   * @returns Array of error messages for invalid references
   */
  validateSubtaskReferences(config: TestSuiteYaml): string[];

  /**
   * Detects circular dependencies in task/subtask graph.
   * @returns Array of cycles found
   */
  detectCircularDependencies(config: TestSuiteYaml): string[][];

  /**
   * Validates selector requirements for commands.
   */
  validateCommandSelectors(config: TestSuiteYaml): string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}
```

#### Validation Rules to Implement
1. **Subtask Reference Validation**
   - All task.subtasks IDs must exist in subtasks array
   - No dangling references

2. **Circular Dependency Detection**
   - Future-proofing for subtask nesting
   - Clear error messages with cycle path

3. **Command-Selector Validation**
   - Interaction commands must have selectors
   - Navigate commands must have url parameter
   - Fill commands must have value parameter

4. **ID Uniqueness**
   - All subtask IDs must be unique
   - All task IDs must be unique

5. **Semantic Validation**
   - Warn if task has no subtasks
   - Warn if subtask has only navigation commands
   - Warn if no assertions in subtask

#### Test Cases (Minimum)
- ✓ Validate correct configuration
- ✓ Detect missing subtask reference
- ✓ Detect duplicate subtask IDs
- ✓ Detect duplicate task IDs
- ✓ Validate interaction command selectors
- ✓ Validate navigation command URLs
- ✓ Validate fill command values
- ✓ Convert to domain entities successfully
- ✓ Handle empty subtasks array
- ✓ Handle empty tasks array
- ✓ Provide helpful error messages
- ✓ Generate warnings for suspicious patterns

---

## Integration Points

### With Domain Layer
```typescript
// ConfigValidator converts YAML to domain entities
const { subtasks, tasks } = validator.convertToDomainEntities(yamlConfig);

// Each subtask becomes a Subtask entity
subtasks.forEach((subtask, id) => {
  console.log(subtask.commands); // Array of OxtestCommand
});

// Each task becomes a Task entity
tasks.forEach((task, id) => {
  console.log(task.subtasks); // Array of subtask IDs
});
```

### With Future Layers
- **Sprint 3 (Oxtest Parser):** Generates YAML structures
- **Sprint 4 (Playwright Executor):** Consumes domain entities
- **Sprint 7 (Orchestration):** Uses validated configuration

---

## Testing Strategy

### Unit Tests
- Each class tested independently
- Mock file system for YamlParser
- Mock process.env for EnvironmentResolver
- Test all validation rules in ConfigValidator

### Integration Tests
- End-to-end: File → Parsed → Resolved → Validated → Domain Entities
- Test with sample YAML files from fixtures/
- Test error propagation through layers

### Test Data
Create test fixtures:
- `tests/fixtures/valid-test-suite.yaml`
- `tests/fixtures/invalid-schema.yaml`
- `tests/fixtures/missing-references.yaml`
- `tests/fixtures/circular-deps.yaml`
- `tests/fixtures/with-env-vars.yaml`
- `tests/fixtures/.env.test`

---

## Acceptance Criteria

### YamlParser
- [ ] Can parse valid YAML files
- [ ] Validates against Zod schema
- [ ] Provides helpful error messages
- [ ] Handles file system errors gracefully
- [ ] 100% test coverage

### EnvironmentResolver
- [ ] Resolves ${VAR} syntax
- [ ] Supports default values with ${VAR:-default}
- [ ] Respects environment precedence
- [ ] Loads .env files
- [ ] Detects circular references
- [ ] 100% test coverage

### ConfigValidator
- [ ] Validates subtask references
- [ ] Detects duplicate IDs
- [ ] Validates command requirements
- [ ] Converts to domain entities
- [ ] Provides helpful errors and warnings
- [ ] 100% test coverage

### Integration
- [ ] All three modules work together
- [ ] End-to-end flow tested
- [ ] Sample YAML files validate correctly
- [ ] Error messages are actionable

---

## Estimated Test Count
- **YamlParser:** ~12-15 tests
- **EnvironmentResolver:** ~15-18 tests
- **ConfigValidator:** ~15-20 tests
- **Total:** ~42-53 new tests

---

## Success Metrics
- All tests passing (84 + 42-53 = 126-137 total)
- Can load example YAML file and convert to domain entities
- Helpful error messages for common mistakes
- Ready to integrate with Sprint 3 (Oxtest Parser)
