import { TestSuiteYaml } from './YamlSchema';

/**
 * Custom error for circular reference detection.
 */
export class CircularReferenceError extends Error {
  constructor(variableName: string, path: string[]) {
    super(`Circular reference detected: ${path.join(' -> ')} -> ${variableName}`);
    this.name = 'CircularReferenceError';
    Object.setPrototypeOf(this, CircularReferenceError.prototype);
  }
}

/**
 * Resolves environment variables in configuration files.
 * Supports ${VAR_NAME} and ${VAR_NAME:-default} syntax.
 */
export class EnvironmentResolver {
  /**
   * Resolves environment variables in a test suite configuration.
   * Creates a deep copy and does not mutate the original.
   *
   * Variable precedence (highest to lowest):
   * 1. Provided envVars parameter
   * 2. process.env
   * 3. config.env section
   * 4. Default values in ${VAR:-default} syntax
   */
  public resolve(config: TestSuiteYaml, envVars?: Record<string, string>): TestSuiteYaml {
    // Merge environment sources with proper precedence
    const mergedEnv = {
      ...config.env,
      ...process.env,
      ...envVars,
    };

    // Deep clone and resolve
    return JSON.parse(
      this.resolveString(JSON.stringify(config), mergedEnv as Record<string, string>)
    ) as TestSuiteYaml;
  }

  /**
   * Resolves variables in a single string.
   * Supports ${VAR} and ${VAR:-default} syntax.
   */
  public resolveString(value: string, envVars?: Record<string, string>): string {
    const env = envVars || (process.env as Record<string, string>);
    const resolvedVars = new Set<string>();

    return this.resolveStringRecursive(value, env, resolvedVars, []);
  }

  /**
   * Validates that all required environment variables are available.
   * Returns array of missing variable names (variables without defaults).
   */
  public validateRequiredVars(
    config: TestSuiteYaml,
    envVars?: Record<string, string>
  ): string[] {
    const mergedEnv = {
      ...config.env,
      ...process.env,
      ...envVars,
    };

    const configStr = JSON.stringify(config);
    const missing = new Set<string>();

    // Find all ${VAR} patterns without defaults
    const varPattern = /\$\{([^:}]+)(?::-[^}]*)?\}/g;
    let match;

    while ((match = varPattern.exec(configStr)) !== null) {
      const varName = match[1];
      const hasDefault = match[0].includes(':-');

      // Only report as missing if no default and not in env
      if (!hasDefault && !mergedEnv[varName]) {
        missing.add(varName);
      }
    }

    return Array.from(missing);
  }

  /**
   * Recursively resolves variables, detecting circular references.
   */
  private resolveStringRecursive(
    value: string,
    env: Record<string, string>,
    resolvedVars: Set<string>,
    resolutionPath: string[]
  ): string {
    // Pattern: ${VAR_NAME} or ${VAR_NAME:-default}
    const pattern = /\$\{([^:}]+)(:-([^}]*))?\}/g;

    return value.replace(pattern, (match, varName: string, _, defaultValue?: string) => {
      // Check for circular reference
      if (resolutionPath.includes(varName)) {
        throw new CircularReferenceError(varName, resolutionPath);
      }

      // Get variable value
      let varValue = env[varName];

      // Use default if variable not found
      if (varValue === undefined) {
        if (defaultValue !== undefined) {
          varValue = defaultValue;
        } else {
          console.warn(
            `Environment variable ${varName} is not defined and has no default value. Leaving as-is.`
          );
          return match; // Leave unresolved
        }
      }

      // Allow empty strings as valid values
      if (varValue === '') {
        return varValue;
      }

      // Mark as resolved to prevent infinite loops
      if (resolvedVars.has(varName)) {
        return varValue;
      }

      // Recursively resolve if value contains more variables
      if (varValue.includes('${')) {
        const newPath = [...resolutionPath, varName];
        const newResolved = new Set(resolvedVars);
        newResolved.add(varName);
        return this.resolveStringRecursive(varValue, env, newResolved, newPath);
      }

      return varValue;
    });
  }
}
