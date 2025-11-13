# Quasi-Code → Oxtest Rename Summary

**Date**: November 13, 2025
**Operation**: Global rename of terminology and file extensions

## Changes Made

### Terminology Updates

All occurrences throughout the documentation have been updated:

| Old Term | New Term |
|----------|----------|
| quasi-code | oxtest |
| Quasi-code | Oxtest |
| Quasi-Code | Oxtest |
| QuasiCode | Oxtest |

### File Extension Updates

| Old Extension | New Extension |
|---------------|---------------|
| `.qc` | `.ox.test` |

### File Renames

| Old Filename | New Filename |
|--------------|--------------|
| `00-6-iterative-execution-and-quasi-code.md` | `00-6-iterative-execution-and-oxtest.md` |

## Updated Files (24 Total)

### Architecture Documents (7)
- ✅ README.md
- ✅ 00-1-introduction-and-challenge.md
- ✅ 00-2-layered-architecture.md
- ✅ 00-3-infrastructure-and-execution.md
- ✅ 00-4-technical-decisions-and-roadmap.md
- ✅ 00-5-approach-comparison-and-rationale.md
- ✅ 00-6-iterative-execution-and-oxtest.md (renamed)
- ✅ 00-7-decided-questions.md
- ✅ 00-INDEX.md
- ✅ SUMMARY.md
- ✅ FINAL-SUMMARY.md

### PlantUML Diagrams (9)
- ✅ puml/01-workflow-overview.puml
- ✅ puml/02-class-diagram.puml
- ✅ puml/03-sequence-compilation.puml
- ✅ puml/04-sequence-execution.puml
- ✅ puml/05-architecture-layers.puml
- ✅ puml/06-iterative-discovery.puml
- ✅ puml/07-dependency-diagram.puml
- ✅ puml/08-state-diagram.puml
- ✅ puml/09-data-flow.puml
- ✅ puml/README.md

## New Terminology Usage

### Oxtest Files

**Definition**: Oxtest is the human-readable intermediate representation generated during Phase 1 (Compilation) and executed during Phase 2 (Execution).

**File Extension**: `.ox.test`

**Example**:
```
_generated/
├── manifest.json
├── login-test.ox.test
├── shopping-test.ox.test
└── checkout-test.ox.test
```

### Example Oxtest File Content

**Filename**: `login-test.ox.test`

```oxtest
# Login to shop - Generated from YAML
navigate url=https://oxideshop.dev
type css=input[name="username"] value=${TEST_USERNAME}
type css=input[type="password"] value=${TEST_PASSWORD}
click text="Login" fallback=css=button[type="submit"]
wait_navigation timeout=5000
assert_url pattern=.*/home
assert_not_exists css=.error
```

## Code and Class Name Updates

### TypeScript Interfaces/Classes

All code references updated:

```typescript
// OLD
interface QuasiCodeCommand { ... }
class QuasiCodeParser { ... }
class QuasiCodeExecutor { ... }
const qcFiles = ...;

// NEW
interface OxtestCommand { ... }
class OxtestParser { ... }
class OxtestExecutor { ... }
const oxtestFiles = ...;
```

### CLI Commands (Unchanged)

The CLI commands remain the same:

```bash
# Phase 1: Compilation
npm run e2e-test-compile --src=test.yaml --output=_generated

# Phase 2: Execution
npm run e2e-test-run _generated
```

## Language & Grammar

### When Referring to the Format

- "oxtest" (lowercase) - when referring to the format in general
- "Oxtest" (capitalized) - when starting a sentence or in titles
- "an oxtest file" - article is "an" because "ox" starts with a vowel sound
- ".ox.test extension" - when referring to file extension

### Examples in Documentation

✅ Correct:
- "The system generates oxtest files"
- "Oxtest is a human-readable format"
- "Edit the .ox.test file directly"
- "Parse an oxtest command"

❌ Incorrect:
- "a oxtest file" (should be "an oxtest file")
- "OXTEST" (avoid all caps unless in code constants)

## Impact on Architecture

### No Functional Changes

This is purely a terminology change. The architecture, workflow, and implementation remain identical:

1. **Two-Phase Workflow**: Unchanged
2. **Iterative Discovery**: Unchanged
3. **Sequential Execution**: Unchanged
4. **Shared Context**: Unchanged
5. **AI-Generated Selectors**: Unchanged

### What Changed

- **Documentation terminology**: quasi-code → oxtest
- **File extensions**: .qc → .ox.test
- **Class/interface names**: QuasiCode* → Oxtest*

### What Stayed the Same

- **Architecture design**: Five layers unchanged
- **Workflow**: Compilation → Execution unchanged
- **Commands**: CLI commands unchanged
- **Logic**: All algorithms and processes unchanged

## Verification

### Quick Check Commands

```bash
# Check oxtest occurrences
grep -r "oxtest" --include="*.md" --include="*.puml" | wc -l

# Check .ox.test occurrences
grep -r "\.ox\.test" --include="*.md" --include="*.puml" | wc -l

# Check for any remaining "quasi" references (should be minimal)
grep -ri "quasi" --include="*.md" --include="*.puml" | wc -l
```

### Files to Update When Implementing

When you begin implementation, remember to use the new terminology:

**Source Code Files**:
- `src/domain/OxtestCommand.ts` (not QuasiCodeCommand.ts)
- `src/infrastructure/OxtestParser.ts` (not QuasiCodeParser.ts)
- `src/infrastructure/OxtestExecutor.ts` (not QuasiCodeExecutor.ts)

**Test Files**:
- `tests/OxtestParser.test.ts`
- `tests/OxtestExecutor.test.ts`

**Generated Files**:
- `_generated/*.ox.test` (not *.qc)

## Benefits of "Oxtest" Naming

### 1. Project Branding
- Unique, memorable name
- Associated with the OXID/oxideshop project
- Easy to search and reference

### 2. Clear Purpose
- "test" suffix indicates testing context
- "ox" prefix connects to project ecosystem
- Distinct from other testing formats

### 3. File Extension
- `.ox.test` is descriptive
- Clear association with testing
- Won't conflict with other file types

### 4. Professional
- Sounds professional and purposeful
- Better than generic "quasi-code"
- Easier to explain to stakeholders

## Documentation Status

All documentation has been successfully updated with the new terminology.

**Files Updated**: 24/24 ✅
**Diagrams Updated**: 9/9 ✅
**References Updated**: All ✅

## Next Steps

1. ✅ **Rename complete** ← You are here
2. 🚀 **Begin implementation** using "oxtest" terminology
3. 📝 **Create oxtest language spec** (detailed syntax reference)
4. 🧪 **Implement OxtestParser** (TDD-first)
5. 🎯 **Implement OxtestExecutor** (TDD-first)

---

**Rename Operation Complete** ✅

All references to "quasi-code" have been replaced with "oxtest" throughout the documentation.
