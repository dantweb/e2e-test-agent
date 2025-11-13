# Sprint 0: Project Setup

**Duration**: 3 days
**Status**: ⏸️ Not Started
**Dependencies**: None

## Goal

Set up the project infrastructure, development environment, and tooling to support TDD-first development.

## Tasks

### Day 1: Project Initialization

#### Task 1: Initialize Node.js Project ⏸️
```bash
mkdir e2e-tester-agent
cd e2e-tester-agent
npm init -y
git init
```

**Acceptance Criteria**:
- [ ] package.json created
- [ ] Git repository initialized
- [ ] .gitignore configured

**Estimated Time**: 30 min

---

#### Task 2: TypeScript Configuration ⏸️
```bash
npm install --save-dev typescript @types/node
npx tsc --init
```

**tsconfig.json**:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": false,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "**/*.test.ts"]
}
```

**Acceptance Criteria**:
- [ ] TypeScript installed
- [ ] tsconfig.json configured with strict mode
- [ ] Successfully compiles empty TypeScript file

**Estimated Time**: 1 hour

---

#### Task 3: Jest Testing Framework ⏸️
```bash
npm install --save-dev jest ts-jest @types/jest jest-extended
npx ts-jest config:init
```

**jest.config.js**:
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.interface.ts',
    '!src/**/index.ts'
  ],
  coverageThresholds: {
    global: {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  setupFilesAfterEnv: ['jest-extended/all'],
  verbose: true,
  testTimeout: 10000
};
```

**package.json scripts**:
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:unit": "jest tests/unit",
    "test:integration": "jest tests/integration",
    "test:e2e": "jest tests/e2e"
  }
}
```

**Acceptance Criteria**:
- [ ] Jest installed and configured
- [ ] Test scripts in package.json
- [ ] Coverage thresholds set
- [ ] Can run empty test suite

**Estimated Time**: 1 hour

---

### Day 2: Development Tools

#### Task 4: ESLint & Prettier ⏸️
```bash
npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
npm install --save-dev prettier eslint-config-prettier eslint-plugin-prettier
```

**.eslintrc.js**:
```javascript
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.json'
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'prettier'
  ],
  plugins: ['@typescript-eslint', 'prettier'],
  rules: {
    'prettier/prettier': 'error',
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-floating-promises': 'error'
  },
  env: {
    node: true,
    jest: true
  }
};
```

**.prettierrc**:
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "arrowParens": "avoid"
}
```

**package.json scripts**:
```json
{
  "scripts": {
    "lint": "eslint src tests --ext .ts",
    "lint:fix": "eslint src tests --ext .ts --fix",
    "format": "prettier --write \"src/**/*.ts\" \"tests/**/*.ts\""
  }
}
```

**Acceptance Criteria**:
- [ ] ESLint configured
- [ ] Prettier configured
- [ ] Lint and format scripts work
- [ ] No any types allowed
- [ ] Strict type checking enforced

**Estimated Time**: 1.5 hours

---

#### Task 5: Git Hooks (Husky) ⏸️
```bash
npm install --save-dev husky lint-staged
npx husky install
```

**.husky/pre-commit**:
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npx lint-staged
```

**package.json**:
```json
{
  "lint-staged": {
    "*.ts": [
      "eslint --fix",
      "prettier --write",
      "jest --bail --findRelatedTests"
    ]
  },
  "scripts": {
    "prepare": "husky install"
  }
}
```

**Acceptance Criteria**:
- [ ] Husky installed
- [ ] Pre-commit hook runs lint and tests
- [ ] Only staged files tested

**Estimated Time**: 1 hour

---

### Day 3: Project Structure

#### Task 6: Directory Structure ⏸️

Create directories:
```bash
mkdir -p src/{domain,application,infrastructure,presentation,configuration}
mkdir -p tests/{unit/{domain,application,infrastructure},integration,e2e,fixtures,helpers}
mkdir -p docs
```

**Structure**:
```
e2e-tester-agent/
├── src/
│   ├── domain/
│   │   ├── models/
│   │   ├── interfaces/
│   │   └── enums/
│   ├── application/
│   │   ├── engines/
│   │   ├── orchestrators/
│   │   └── validators/
│   ├── infrastructure/
│   │   ├── parsers/
│   │   ├── executors/
│   │   ├── llm/
│   │   └── database/
│   ├── presentation/
│   │   ├── cli/
│   │   └── reporters/
│   └── configuration/
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   ├── fixtures/
│   └── helpers/
├── docs/
├── dist/
└── coverage/
```

**Acceptance Criteria**:
- [ ] All directories created
- [ ] Structure matches Clean Architecture
- [ ] README with structure explanation

**Estimated Time**: 30 min

---

#### Task 7: Dependencies Installation ⏸️

**Core Dependencies**:
```bash
npm install playwright yaml commander winston zod
```

**Dev Dependencies**:
```bash
npm install --save-dev @types/yaml @playwright/test
```

**package.json dependencies**:
```json
{
  "dependencies": {
    "@playwright/test": "^1.40.0",
    "commander": "^11.1.0",
    "playwright": "^1.40.0",
    "winston": "^3.11.0",
    "yaml": "^2.3.4",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/jest": "^29.5.10",
    "@types/node": "^20.10.0",
    "@types/yaml": "^1.9.7",
    "@typescript-eslint/eslint-plugin": "^6.15.0",
    "@typescript-eslint/parser": "^6.15.0",
    "eslint": "^8.56.0",
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-prettier": "^5.0.1",
    "husky": "^8.0.3",
    "jest": "^29.7.0",
    "jest-extended": "^4.0.2",
    "lint-staged": "^15.2.0",
    "prettier": "^3.1.1",
    "ts-jest": "^29.1.1",
    "typescript": "^5.3.3"
  }
}
```

**Acceptance Criteria**:
- [ ] All dependencies installed
- [ ] package-lock.json committed
- [ ] No vulnerabilities

**Estimated Time**: 30 min

---

#### Task 8: CI/CD Configuration ⏸️

**.github/workflows/test.yml**:
```yaml
name: Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18.x, 20.x]

    steps:
      - uses: actions/checkout@v3

      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Run tests
        run: npm test

      - name: Check coverage
        run: npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: unittests
          name: codecov-umbrella
```

**Acceptance Criteria**:
- [ ] CI workflow configured
- [ ] Tests run on push/PR
- [ ] Multiple Node versions tested
- [ ] Coverage uploaded

**Estimated Time**: 1 hour

---

## Checklist

- [ ] Task 1: Project initialized
- [ ] Task 2: TypeScript configured
- [ ] Task 3: Jest configured
- [ ] Task 4: ESLint & Prettier configured
- [ ] Task 5: Git hooks configured
- [ ] Task 6: Directory structure created
- [ ] Task 7: Dependencies installed
- [ ] Task 8: CI/CD configured

## Definition of Done

- ✅ All tasks completed
- ✅ `npm test` runs successfully
- ✅ `npm run lint` passes
- ✅ Directory structure matches architecture
- ✅ CI/CD pipeline runs
- ✅ README documents setup process
- ✅ All configuration committed to git

## Next Sprint

[Sprint 1: Domain Layer](./sprint-1-domain.md)

---

**Last Updated**: November 13, 2025
