import { ExecutionContext, Cookie } from '../../domain/interfaces';

/**
 * Manages execution context for test runs.
 *
 * The ExecutionContextManager provides a thread-safe, immutable way to manage
 * execution state during test runs. It maintains:
 * - Variables: Key-value pairs that can be passed between subtasks
 * - Cookies: Browser cookies from the current session
 * - Session ID: Unique identifier for the test execution
 * - Current URL: Last navigated URL
 * - Page Title: Current page title
 * - Metadata: Custom key-value pairs for extensibility
 *
 * ## Lifecycle
 *
 * 1. **Initialization**: Created at the start of test execution with a unique session ID
 * 2. **Population**: Variables and cookies are set during subtask execution
 * 3. **Propagation**: Context is passed between subtasks via clone() or merge()
 * 4. **Reset**: Can be reset while preserving session ID for new test runs
 *
 * ## Variable Scoping
 *
 * Variables have test-wide scope:
 * - Set in Subtask A → Available in Subtask B (if B depends on A or executes after A)
 * - Variables persist throughout the entire task execution
 * - Use reset() to clear variables between independent test runs
 *
 * ## Immutability Pattern
 *
 * All mutation methods create new context objects internally to prevent
 * accidental shared state between concurrent executions.
 *
 * ## Usage Examples
 *
 * ### Basic Usage
 * ```typescript
 * const manager = new ExecutionContextManager();
 * manager.setVariable('username', 'testuser');
 * manager.setVariable('userId', '12345');
 *
 * const username = manager.getVariable('username'); // 'testuser'
 * ```
 *
 * ### Sharing Context Between Subtasks
 * ```typescript
 * // Subtask A
 * const managerA = new ExecutionContextManager();
 * managerA.setVariable('authToken', 'abc123');
 *
 * // Subtask B (depends on A)
 * const managerB = managerA.clone();
 * const token = managerB.getVariable('authToken'); // 'abc123'
 * ```
 *
 * ### Merging Contexts
 * ```typescript
 * const manager1 = new ExecutionContextManager();
 * manager1.setVariable('var1', 'value1');
 *
 * const context2 = {
 *   variables: { var2: 'value2' },
 *   cookies: [],
 *   sessionId: 'other-session'
 * };
 *
 * manager1.merge(context2);
 * // manager1 now has both var1 and var2
 * // session ID remains unchanged
 * ```
 *
 * ### Resetting Between Tests
 * ```typescript
 * const manager = new ExecutionContextManager();
 * manager.setVariable('temp', 'data');
 *
 * // ... execute test ...
 *
 * manager.reset(); // Clear all variables and cookies, keep session ID
 * ```
 *
 * @see ExecutionContext for the underlying data structure
 * @see TestOrchestrator for usage in test orchestration
 */
export class ExecutionContextManager {
  private context: ExecutionContext;

  /**
   * Creates a new ExecutionContextManager with empty state.
   *
   * Automatically generates a unique session ID for tracking
   * this execution context across multiple operations.
   */
  constructor() {
    this.context = {
      variables: {},
      cookies: [],
      sessionId: this.generateSessionId(),
    };
  }

  /**
   * Gets a deep copy of the current execution context.
   *
   * Returns a new object with all fields cloned to prevent
   * external mutations from affecting the internal state.
   *
   * Use this when you need to:
   * - Pass context to external systems
   * - Snapshot context for logging/debugging
   * - Share context without mutation risk
   *
   * @returns Deep copy of execution context
   * @example
   * const context = manager.getContext();
   * console.log(context.variables); // { username: 'test' }
   * context.variables.newVar = 'value'; // Safe - doesn't affect manager
   */
  public getContext(): ExecutionContext {
    return {
      ...this.context,
      variables: { ...this.context.variables },
      cookies: [...this.context.cookies ],
      metadata: this.context.metadata ? { ...this.context.metadata } : undefined,
    };
  }

  /**
   * Sets a variable in the execution context.
   *
   * Variables are string key-value pairs that persist throughout
   * the test execution. Common use cases:
   * - Store authentication tokens
   * - Pass data between subtasks
   * - Cache extracted values for later assertions
   *
   * Note: Setting the same key multiple times overwrites the previous value.
   *
   * @param key Variable name (string identifier)
   * @param value Variable value (string data)
   * @example
   * manager.setVariable('authToken', 'eyJhbGc...');
   * manager.setVariable('userId', '12345');
   * manager.setVariable('lastResponse', JSON.stringify(data));
   */
  public setVariable(key: string, value: string): void {
    this.context = {
      ...this.context,
      variables: {
        ...this.context.variables,
        [key]: value,
      },
    };
  }

  /**
   * Gets a variable from the execution context.
   *
   * Retrieves a previously stored variable value.
   * Returns undefined if the variable doesn't exist.
   *
   * @param key Variable name to retrieve
   * @returns Variable value if exists, undefined otherwise
   * @example
   * const token = manager.getVariable('authToken');
   * if (token) {
   *   // Use token for authenticated request
   * }
   */
  public getVariable(key: string): string | undefined {
    return this.context.variables[key];
  }

  /**
   * Updates cookies in the execution context.
   *
   * IMPORTANT: This method replaces ALL existing cookies.
   * If you need to add cookies while preserving existing ones,
   * use merge() or manually combine cookies.
   *
   * Use cases:
   * - Sync cookies from browser after navigation
   * - Update authentication cookies
   * - Replace stale cookies with fresh ones
   *
   * @param cookies New cookies array (replaces all existing cookies)
   * @example
   * const newCookies = await page.context().cookies();
   * manager.updateCookies(newCookies);
   */
  public updateCookies(cookies: readonly Cookie[]): void {
    this.context = {
      ...this.context,
      cookies: [...cookies],
    };
  }

  /**
   * Sets the current URL in the context.
   *
   * Tracks the current page URL for debugging and reporting.
   * Typically called after navigation commands.
   *
   * @param url Current page URL (absolute URL string)
   * @example
   * await page.goto('https://example.com/dashboard');
   * manager.setCurrentUrl(page.url());
   */
  public setCurrentUrl(url: string): void {
    this.context = {
      ...this.context,
      currentUrl: url,
    };
  }

  /**
   * Sets the page title in the context.
   *
   * Stores the current page title for validation and reporting.
   * Useful for assertions about page navigation.
   *
   * @param title Current page title
   * @example
   * const title = await page.title();
   * manager.setPageTitle(title);
   *
   * // Later: Assert we're on the right page
   * expect(manager.getContext().pageTitle).toBe('Dashboard');
   */
  public setPageTitle(title: string): void {
    this.context = {
      ...this.context,
      pageTitle: title,
    };
  }

  /**
   * Sets a custom metadata entry.
   *
   * Metadata provides extensibility for storing arbitrary data
   * that doesn't fit into predefined fields. Use cases:
   * - Performance metrics (timing, memory usage)
   * - Test-specific data structures
   * - Third-party integration data
   *
   * @param key Metadata key (string identifier)
   * @param value Metadata value (any serializable type)
   * @example
   * manager.setMetadata('startTime', Date.now());
   * manager.setMetadata('testCategory', 'integration');
   * manager.setMetadata('customData', { foo: 'bar', count: 42 });
   */
  public setMetadata(key: string, value: unknown): void {
    this.context = {
      ...this.context,
      metadata: {
        ...this.context.metadata,
        [key]: value,
      },
    };
  }

  /**
   * Creates a deep copy of this context manager.
   *
   * Returns a new ExecutionContextManager instance with a complete
   * copy of the current context. The clone is fully independent:
   * - Changes to the clone don't affect the original
   * - Changes to the original don't affect the clone
   * - Session ID is preserved in the clone
   *
   * Primary use case: Passing context from one subtask to another
   *
   * @returns New ExecutionContextManager with copied context
   * @example
   * // In subtask orchestration:
   * const subtaskA = await executeSubtask(subtaskA, contextManager);
   * const subtaskBContext = contextManager.clone(); // Independent copy
   * const subtaskB = await executeSubtask(subtaskB, subtaskBContext);
   */
  public clone(): ExecutionContextManager {
    const cloned = new ExecutionContextManager();
    cloned.context = {
      variables: { ...this.context.variables },
      cookies: [...this.context.cookies],
      sessionId: this.context.sessionId,
      currentUrl: this.context.currentUrl,
      pageTitle: this.context.pageTitle,
      metadata: this.context.metadata ? { ...this.context.metadata } : undefined,
    };
    return cloned;
  }

  /**
   * Merges another execution context into this one.
   *
   * Merge Strategy:
   * - **Variables**: Other's variables override this manager's variables (last-write-wins)
   * - **Cookies**: Other's cookies are appended to existing cookies
   * - **Session ID**: This manager's session ID is preserved (not overridden)
   * - **URL/Title**: Other's values override if present, otherwise keep current
   * - **Metadata**: Other's metadata merged with this manager's (other wins conflicts)
   *
   * Use cases:
   * - Combining results from parallel subtask executions
   * - Importing external context into current execution
   * - Accumulating state across multiple operations
   *
   * @param other Context to merge into this manager
   * @example
   * const manager = new ExecutionContextManager();
   * manager.setVariable('baseUrl', 'https://example.com');
   *
   * const externalContext = {
   *   variables: { authToken: 'abc123' },
   *   cookies: [{ name: 'session', value: 'xyz' }],
   *   sessionId: 'external-session'
   * };
   *
   * manager.merge(externalContext);
   * // Result: variables = { baseUrl: '...', authToken: 'abc123' }
   * // Result: cookies include session cookie
   * // Result: sessionId unchanged (still this manager's session)
   */
  public merge(other: ExecutionContext): void {
    this.context = {
      variables: { ...this.context.variables, ...other.variables },
      cookies: [...this.context.cookies, ...other.cookies],
      sessionId: this.context.sessionId, // Preserve own session ID
      currentUrl: other.currentUrl || this.context.currentUrl,
      pageTitle: other.pageTitle || this.context.pageTitle,
      metadata: {
        ...this.context.metadata,
        ...other.metadata,
      },
    };
  }

  /**
   * Resets the execution context to initial state.
   *
   * Clears all data while preserving the session ID:
   * - Variables: Cleared (empty object)
   * - Cookies: Cleared (empty array)
   * - URL/Title: Cleared (undefined)
   * - Metadata: Cleared (undefined)
   * - Session ID: PRESERVED (same identifier)
   *
   * Use cases:
   * - Starting a new test with the same session
   * - Cleaning state between test iterations
   * - Resetting after test failure for retry
   *
   * @example
   * const manager = new ExecutionContextManager();
   * const sessionId = manager.getContext().sessionId;
   *
   * manager.setVariable('temp', 'value');
   * manager.reset();
   *
   * // After reset:
   * // - Variables are empty
   * // - Session ID is still the same
   * expect(manager.getContext().sessionId).toBe(sessionId);
   * expect(manager.getVariable('temp')).toBeUndefined();
   */
  public reset(): void {
    const sessionId = this.context.sessionId;
    this.context = {
      variables: {},
      cookies: [],
      sessionId,
    };
  }

  /**
   * Generates a unique session identifier.
   *
   * Format: `session-{timestamp}-{random}`
   * - Timestamp ensures temporal uniqueness
   * - Random suffix prevents collisions within same millisecond
   *
   * @returns Unique session ID string
   * @private
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}
